'use client'

import { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { sourceChatApi } from '@/lib/api/source-chat'
import {
  SourceChatSession,
  SourceChatMessage,
  SourceChatContextIndicator,
  CreateSourceChatSessionRequest,
  UpdateSourceChatSessionRequest
} from '@/lib/types/api'
import { parseApiKeyError, formatApiKeyError } from '@/lib/utils/api-errors'

export function useSourceChat(sourceId: string) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<SourceChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [contextIndicators, setContextIndicators] = useState<SourceChatContextIndicator | null>(null)
  const [currentReader, setCurrentReader] = useState<ReadableStreamDefaultReader<Uint8Array> | null>(null)

  // Fetch sessions
  const { data: sessions = [], isLoading: loadingSessions, refetch: refetchSessions } = useQuery<SourceChatSession[]>({
    queryKey: ['sourceChatSessions', sourceId],
    queryFn: () => sourceChatApi.listSessions(sourceId),
    enabled: !!sourceId
  })

  // Fetch current session with messages
  const { data: currentSession, refetch: refetchCurrentSession } = useQuery({
    queryKey: ['sourceChatSession', sourceId, currentSessionId],
    queryFn: () => sourceChatApi.getSession(sourceId, currentSessionId!),
    enabled: !!sourceId && !!currentSessionId
  })

  // Update messages when session changes
  useEffect(() => {
    if (currentSession?.messages) {
      setMessages(currentSession.messages)
    }
  }, [currentSession])

  // Auto-select most recent session when sessions are loaded
  useEffect(() => {
    if (sessions.length > 0 && !currentSessionId) {
      // Find most recent session (sessions are sorted by created date desc from API)
      const mostRecentSession = sessions[0]
      setCurrentSessionId(mostRecentSession.id)
    }
  }, [sessions, currentSessionId])

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: (data: Omit<CreateSourceChatSessionRequest, 'source_id'>) => 
      sourceChatApi.createSession(sourceId, data),
    onSuccess: (newSession) => {
      queryClient.invalidateQueries({ queryKey: ['sourceChatSessions', sourceId] })
      setCurrentSessionId(newSession.id)
      toast.success('Chat session created')
    },
    onError: () => {
      toast.error('Failed to create chat session')
    }
  })

  // Update session mutation
  const updateSessionMutation = useMutation({
    mutationFn: ({ sessionId, data }: { sessionId: string, data: UpdateSourceChatSessionRequest }) =>
      sourceChatApi.updateSession(sourceId, sessionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sourceChatSessions', sourceId] })
      queryClient.invalidateQueries({ queryKey: ['sourceChatSession', sourceId, currentSessionId] })
      toast.success('Session updated')
    },
    onError: () => {
      toast.error('Failed to update session')
    }
  })

  // Delete session mutation
  const deleteSessionMutation = useMutation({
    mutationFn: (sessionId: string) => 
      sourceChatApi.deleteSession(sourceId, sessionId),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['sourceChatSessions', sourceId] })
      if (currentSessionId === deletedId) {
        setCurrentSessionId(null)
        setMessages([])
      }
      toast.success('Session deleted')
    },
    onError: () => {
      toast.error('Failed to delete session')
    }
  })

  // Cancel streaming
  const stopStream = useCallback(() => {
    if (currentReader) {
      currentReader.cancel()
      setCurrentReader(null)
      setIsStreaming(false)
      toast.info('Message generation stopped')
    }
  }, [currentReader])

  // Send message with streaming
  const sendMessage = useCallback(async (message: string, modelOverride?: string) => {
    // Cancel any existing stream before starting a new one
    if (currentReader) {
      await currentReader.cancel()
      setCurrentReader(null)
    }

    let sessionId = currentSessionId

    // Auto-create session if none exists
    if (!sessionId) {
      try {
        const defaultTitle = message.length > 30 ? `${message.substring(0, 30)}...` : message
        const newSession = await sourceChatApi.createSession(sourceId, { title: defaultTitle })
        sessionId = newSession.id
        setCurrentSessionId(sessionId)
        queryClient.invalidateQueries({ queryKey: ['sourceChatSessions', sourceId] })
      } catch (error) {
        console.error('Failed to create chat session:', error)
        toast.error('Failed to create chat session')
        return
      }
    }

    // Add user message optimistically
    const userMessage: SourceChatMessage = {
      id: `temp-${Date.now()}`,
      type: 'human',
      content: message,
      timestamp: new Date().toISOString()
    }
    setMessages(prev => [...prev, userMessage])
    setIsStreaming(true)

    try {
      const response = await sourceChatApi.sendMessage(sourceId, sessionId, {
        message,
        model_override: modelOverride
      })

      if (!response) {
        throw new Error('No response body')
      }

      const reader = response.getReader()
      setCurrentReader(reader)
      const decoder = new TextDecoder()
      let aiMessage: SourceChatMessage | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value)
        const lines = text.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.type === 'ai_message') {
                // Create AI message on first content chunk to avoid empty bubble
                if (!aiMessage) {
                  aiMessage = {
                    id: `ai-${Date.now()}`,
                    type: 'ai',
                    content: data.content || '',
                    timestamp: new Date().toISOString()
                  }
                  setMessages(prev => [...prev, aiMessage!])
                } else {
                  aiMessage.content += data.content || ''
                  setMessages(prev =>
                    prev.map(msg => msg.id === aiMessage!.id
                      ? { ...msg, content: aiMessage!.content }
                      : msg
                    )
                  )
                }
              } else if (data.type === 'context_indicators') {
                setContextIndicators(data.data)
              } else if (data.type === 'error') {
                // Parse error to check if it's an API key issue
                const errorInfo = parseApiKeyError({ message: data.message })
                if (errorInfo.isApiKeyError) {
                  // Show detailed API key error
                  toast.error(formatApiKeyError(errorInfo), {
                    description: errorInfo.actionText 
                      ? `Click to ${errorInfo.actionText.toLowerCase()}`
                      : undefined,
                    action: errorInfo.actionUrl ? {
                      label: errorInfo.actionText || 'Go to Settings',
                      onClick: () => router.push(errorInfo.actionUrl!)
                    } : undefined,
                    duration: 8000,
                  })
                  throw new Error(data.message || 'API key error')
                }
                throw new Error(data.message || 'Stream error')
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e)
            }
          }
        }
      }
    } catch (error: any) {
      // Don't show error toast if it was a cancellation
      if (error?.name !== 'AbortError') {
        console.error('Error sending message:', error)
        
        // Parse error to check if it's an API key issue
        const errorInfo = parseApiKeyError(error)
        
        if (errorInfo.isApiKeyError) {
          // Show detailed API key error with action button
          toast.error(formatApiKeyError(errorInfo), {
            description: errorInfo.actionText 
              ? `Click to ${errorInfo.actionText.toLowerCase()}`
              : undefined,
            action: errorInfo.actionUrl ? {
              label: errorInfo.actionText || 'Go to Settings',
              onClick: () => router.push(errorInfo.actionUrl!)
            } : undefined,
            duration: 8000,
          })
        } else {
          // Generic error
          toast.error('Failed to send message', {
            description: error?.message || 'An unexpected error occurred',
            duration: 5000,
          })
        }
      }
      // Remove optimistic messages on error (but not on cancellation)
      if (error?.name !== 'AbortError') {
        setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp-')))
      }
    } finally {
      setIsStreaming(false)
      setCurrentReader(null)
      // Refetch session to get persisted messages
      refetchCurrentSession()
    }
  }, [sourceId, currentSessionId, currentReader, refetchCurrentSession, queryClient, router])

  // Switch session
  const switchSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId)
    setContextIndicators(null)
  }, [])

  // Create session
  const createSession = useCallback((data: Omit<CreateSourceChatSessionRequest, 'source_id'>) => {
    return createSessionMutation.mutate(data)
  }, [createSessionMutation])

  // Update session
  const updateSession = useCallback((sessionId: string, data: UpdateSourceChatSessionRequest) => {
    return updateSessionMutation.mutate({ sessionId, data })
  }, [updateSessionMutation])

  // Delete session
  const deleteSession = useCallback((sessionId: string) => {
    return deleteSessionMutation.mutate(sessionId)
  }, [deleteSessionMutation])

  return {
    // State
    sessions,
    currentSession: sessions.find(s => s.id === currentSessionId),
    currentSessionId,
    messages,
    isStreaming,
    contextIndicators,
    loadingSessions,
    
    // Actions
    createSession,
    updateSession,
    deleteSession,
    switchSession,
    sendMessage,
    stopStream,
    refetchSessions
  }
}
