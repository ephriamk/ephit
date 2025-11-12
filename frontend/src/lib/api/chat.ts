import apiClient from './client'
import { getApiUrl } from '@/lib/config'
import {
  NotebookChatSession,
  NotebookChatSessionWithMessages,
  CreateNotebookChatSessionRequest,
  UpdateNotebookChatSessionRequest,
  SendNotebookChatMessageRequest,
  NotebookChatMessage,
  BuildContextRequest,
  BuildContextResponse,
} from '@/lib/types/api'

export const chatApi = {
  // Session management
  listSessions: async (notebookId: string) => {
    const response = await apiClient.get<NotebookChatSession[]>(
      `/chat/sessions`,
      { params: { notebook_id: notebookId } }
    )
    return response.data
  },

  createSession: async (data: CreateNotebookChatSessionRequest) => {
    const response = await apiClient.post<NotebookChatSession>(
      `/chat/sessions`,
      data
    )
    return response.data
  },

  getSession: async (sessionId: string) => {
    const response = await apiClient.get<NotebookChatSessionWithMessages>(
      `/chat/sessions/${sessionId}`
    )
    return response.data
  },

  updateSession: async (sessionId: string, data: UpdateNotebookChatSessionRequest) => {
    const response = await apiClient.put<NotebookChatSession>(
      `/chat/sessions/${sessionId}`,
      data
    )
    return response.data
  },

  deleteSession: async (sessionId: string) => {
    await apiClient.delete(`/chat/sessions/${sessionId}`)
  },

  // Messaging (synchronous, no streaming)
  sendMessage: async (data: SendNotebookChatMessageRequest) => {
    const response = await apiClient.post<{
      session_id: string
      messages: NotebookChatMessage[]
    }>(
      `/chat/execute`,
      data
    )
    return response.data
  },

  // Streaming messaging
  sendMessageStream: async (data: SendNotebookChatMessageRequest): Promise<ReadableStream<Uint8Array>> => {
    // Get the API URL dynamically (same as apiClient interceptor)
    const apiUrl = await getApiUrl()
    const baseURL = apiUrl ? `${apiUrl}/api` : '/api'
    const url = `${baseURL}/chat/execute/stream`
    
    // Get auth token from localStorage (same as apiClient interceptor)
    let authToken: string | undefined
    if (typeof window !== 'undefined') {
      const authStorage = localStorage.getItem('auth-storage')
      if (authStorage) {
        try {
          const { state } = JSON.parse(authStorage)
          authToken = state?.accessToken ?? state?.token
        } catch (error) {
          console.error('Error parsing auth storage:', error)
        }
      }
    }
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    }
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Network error' }))
      throw new Error(error.detail || 'Failed to send message')
    }

    if (!response.body) {
      throw new Error('Response body is null')
    }

    return response.body
  },

  buildContext: async (data: BuildContextRequest) => {
    const response = await apiClient.post<BuildContextResponse>(
      `/chat/context`,
      data
    )
    return response.data
  },
}

export default chatApi
