'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Bot, User, Send, Loader2, FileText, Lightbulb, StickyNote, Clock, Sparkles, Zap } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import {
  SourceChatMessage,
  SourceChatContextIndicator,
  BaseChatSession
} from '@/lib/types/api'
import { ModelSelector } from './ModelSelector'
import { ContextIndicator } from '@/components/common/ContextIndicator'
import { SessionManager } from '@/components/source/SessionManager'
import { MessageActions } from '@/components/source/MessageActions'
import { convertReferencesToCompactMarkdown, createCompactReferenceLinkComponent } from '@/lib/utils/source-references'
import { useModalManager } from '@/lib/hooks/use-modal-manager'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface NotebookContextStats {
  sourcesInsights: number
  sourcesFull: number
  notesCount: number
  tokenCount?: number
  charCount?: number
}

interface ChatPanelProps {
  messages: SourceChatMessage[]
  isStreaming: boolean
  contextIndicators: SourceChatContextIndicator | null
  onSendMessage: (message: string, modelOverride?: string) => void
  modelOverride?: string
  onModelChange?: (model?: string) => void
  sessions?: BaseChatSession[]
  currentSessionId?: string | null
  onCreateSession?: (title: string) => void
  onSelectSession?: (sessionId: string) => void
  onDeleteSession?: (sessionId: string) => void
  onUpdateSession?: (sessionId: string, title: string) => void
  loadingSessions?: boolean
  title?: string
  contextType?: 'source' | 'notebook'
  notebookContextStats?: NotebookContextStats
  notebookId?: string
}

export function ChatPanel({
  messages,
  isStreaming,
  contextIndicators,
  onSendMessage,
  modelOverride,
  onModelChange,
  sessions = [],
  currentSessionId,
  onCreateSession,
  onSelectSession,
  onDeleteSession,
  onUpdateSession,
  loadingSessions = false,
  title = 'Chat with Source',
  contextType = 'source',
  notebookContextStats,
  notebookId
}: ChatPanelProps) {
  const [input, setInput] = useState('')
  const [sessionManagerOpen, setSessionManagerOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { openModal } = useModalManager()

  const handleReferenceClick = (type: string, id: string) => {
    const modalType = type === 'source_insight' ? 'insight' : type as 'source' | 'note' | 'insight'

    try {
      openModal(modalType, id)
    } catch {
      const typeLabel = type === 'source_insight' ? 'insight' : type
      toast.error(`This ${typeLabel} could not be found`)
    }
  }

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [input])

  const handleSend = () => {
    if (input.trim() && !isStreaming) {
      onSendMessage(input.trim(), modelOverride)
      setInput('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const isMac = typeof navigator !== 'undefined' && navigator.userAgent.toUpperCase().indexOf('MAC') >= 0
    const isModifierPressed = isMac ? e.metaKey : e.ctrlKey

    if (e.key === 'Enter' && isModifierPressed) {
      e.preventDefault()
      handleSend()
    }
  }

  const isMac = typeof navigator !== 'undefined' && navigator.userAgent.toUpperCase().indexOf('MAC') >= 0
  const keyHint = isMac ? '⌘+Enter' : 'Ctrl+Enter'

  return (
    <>
      <div className="flex flex-col h-full flex-1 overflow-hidden bg-background/50 backdrop-blur-xl">
        {/* Header */}
        <motion.div 
          className="flex-shrink-0 border-b border-primary/20 px-6 py-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: [0, -5, 5, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 border-2 border-primary/30 flex items-center justify-center"
              >
                <Sparkles className="h-5 w-5 text-primary" />
              </motion.div>
              <div>
                <h2 className="text-lg font-semibold">{title}</h2>
                {notebookContextStats && (
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {notebookContextStats.sourcesInsights + notebookContextStats.sourcesFull} sources
                    </span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">
                      {notebookContextStats.notesCount} notes
                    </span>
                    {notebookContextStats.tokenCount && (
                      <>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(notebookContextStats.tokenCount / 1000)}k tokens
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            {onSelectSession && onCreateSession && onDeleteSession && (
              <Dialog open={sessionManagerOpen} onOpenChange={setSessionManagerOpen}>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setSessionManagerOpen(true)}
                    disabled={loadingSessions}
                  >
                    <Clock className="h-4 w-4" />
                    <span className="text-xs">Sessions</span>
                  </Button>
                </motion.div>
                <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden">
                  <DialogTitle className="sr-only">Chat Sessions</DialogTitle>
                  <SessionManager
                    sessions={sessions}
                    currentSessionId={currentSessionId ?? null}
                    onCreateSession={(title) => onCreateSession?.(title)}
                    onSelectSession={(sessionId) => {
                      onSelectSession(sessionId)
                      setSessionManagerOpen(false)
                    }}
                    onUpdateSession={(sessionId, title) => onUpdateSession?.(sessionId, title)}
                    onDeleteSession={(sessionId) => onDeleteSession?.(sessionId)}
                    loadingSessions={loadingSessions}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </motion.div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto min-h-0 scroll-smooth">
          <div className="px-6 py-6 space-y-6">
            <AnimatePresence>
              {messages.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="flex flex-col items-center justify-center py-16 text-center"
                >
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 2 }}
                    className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 border-2 border-primary/30 flex items-center justify-center mb-6"
                  >
                    <Bot className="h-10 w-10 text-primary" />
                  </motion.div>
                  <h3 className="text-lg font-semibold mb-2">Start a conversation</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Ask questions about your {contextType} to get insights and analysis powered by AI
                  </p>
                  {notebookContextStats && notebookContextStats.sourcesInsights + notebookContextStats.sourcesFull > 0 && (
                    <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                      <Zap className="h-3.5 w-3.5 text-primary" />
                      <span>Using {notebookContextStats.sourcesInsights + notebookContextStats.sourcesFull} sources as context</span>
                    </div>
                  )}
                </motion.div>
              ) : (
                messages.map((message, index) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    index={index}
                    onReferenceClick={handleReferenceClick}
                    notebookId={notebookId}
                  />
                ))
              )}
            </AnimatePresence>
            
            {isStreaming && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="flex gap-3 justify-start"
              >
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border-2 border-primary/30 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-xl border border-primary/20">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Context Indicators */}
        {(contextIndicators || notebookContextStats) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-shrink-0 border-t border-primary/20 px-6 py-3 bg-background/30 backdrop-blur-xl"
          >
            {notebookContextStats ? (
              <ContextIndicator
                sourcesInsights={notebookContextStats.sourcesInsights}
                sourcesFull={notebookContextStats.sourcesFull}
                notesCount={notebookContextStats.notesCount}
                tokenCount={notebookContextStats.tokenCount}
                charCount={notebookContextStats.charCount}
              />
            ) : contextIndicators && (
              <div className="flex flex-wrap gap-2 text-xs">
                {contextIndicators.sources?.length > 0 && (
                  <Badge variant="outline" className="gap-1.5 bg-primary/10 border-primary/30">
                    <FileText className="h-3 w-3 text-primary" />
                    {contextIndicators.sources.length} source{contextIndicators.sources.length > 1 ? 's' : ''}
                  </Badge>
                )}
                {contextIndicators.insights?.length > 0 && (
                  <Badge variant="outline" className="gap-1.5 bg-primary/10 border-primary/30">
                    <Lightbulb className="h-3 w-3 text-primary" />
                    {contextIndicators.insights.length} insight{contextIndicators.insights.length > 1 ? 's' : ''}
                  </Badge>
                )}
                {contextIndicators.notes?.length > 0 && (
                  <Badge variant="outline" className="gap-1.5 bg-primary/10 border-primary/30">
                    <StickyNote className="h-3 w-3 text-primary" />
                    {contextIndicators.notes.length} note{contextIndicators.notes.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Input Area */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-shrink-0 border-t border-primary/20 p-4 bg-background/50 backdrop-blur-xl"
        >
          {onModelChange && (
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground font-medium">Model</span>
              <ModelSelector
                currentModel={modelOverride}
                onModelChange={onModelChange}
                disabled={isStreaming}
              />
            </div>
          )}

          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask a question... (${keyHint} to send)`}
                disabled={isStreaming}
                className={cn(
                  "min-h-[44px] max-h-[120px] resize-none py-3 px-4",
                  "bg-card/80 backdrop-blur-xl border-2 border-primary/20",
                  "rounded-2xl focus:border-primary/50 focus:ring-2 focus:ring-primary/20",
                  "transition-all duration-200",
                  "placeholder:text-muted-foreground/60"
                )}
                rows={1}
              />
            </div>
            <motion.div
              whileHover={{ scale: input.trim() ? 1.05 : 1 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isStreaming}
                size="icon"
                className={cn(
                  "h-[44px] w-[44px] flex-shrink-0 rounded-xl",
                  "bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10",
                  "border-2 border-primary/30",
                  "hover:from-primary/40 hover:via-primary/30 hover:to-primary/20",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "transition-all duration-200"
                )}
              >
                {isStreaming ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </>
  )
}

// Message Bubble Component
function MessageBubble({
  message,
  index,
  onReferenceClick,
  notebookId
}: {
  message: SourceChatMessage
  index: number
  onReferenceClick: (type: string, id: string) => void
  notebookId?: string
}) {
  const isHuman = message.type === 'human'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 25,
        delay: index * 0.03
      }}
      className={cn(
        "flex gap-3",
        isHuman ? "justify-end" : "justify-start"
      )}
    >
      {!isHuman && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20, delay: index * 0.03 }}
          className="flex-shrink-0"
        >
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border-2 border-primary/30 flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary" />
          </div>
        </motion.div>
      )}
      
      <div className={cn(
        "flex flex-col gap-2",
        isHuman ? "items-end" : "items-start",
        "max-w-[75%] sm:max-w-[65%]"
      )}>
        <motion.div
          whileHover={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className={cn(
            "rounded-2xl px-4 py-3",
            "backdrop-blur-xl transition-all duration-200",
            isHuman
              ? "bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10 border-2 border-primary/30 text-foreground"
              : "bg-gradient-to-br from-card/80 via-card/60 to-card/40 border-2 border-primary/20"
          )}
        >
          {isHuman ? (
            <p className="text-sm break-words overflow-wrap-anywhere leading-relaxed">
              {message.content}
            </p>
          ) : (
            <AIMessageContent
              content={message.content}
              onReferenceClick={onReferenceClick}
            />
          )}
        </motion.div>
        
        {!isHuman && (
          <MessageActions
            content={message.content}
            notebookId={notebookId}
          />
        )}
      </div>

      {isHuman && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20, delay: index * 0.03 }}
          className="flex-shrink-0"
        >
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary/20 border-2 border-primary/30 flex items-center justify-center">
            <User className="h-5 w-5 text-primary-foreground" />
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

// Helper component to render AI messages with clickable references
function AIMessageContent({
  content,
  onReferenceClick
}: {
  content: string
  onReferenceClick: (type: string, id: string) => void
}) {
  const markdownWithCompactRefs = convertReferencesToCompactMarkdown(content)
  const LinkComponent = createCompactReferenceLinkComponent(onReferenceClick)

  return (
    <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none break-words prose-headings:font-semibold prose-a:text-primary prose-a:no-underline prose-a:border-b prose-a:border-primary/30 prose-a:hover:border-primary prose-code:bg-primary/10 prose-code:text-primary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-p:mb-3 prose-p:leading-relaxed prose-p:text-sm prose-li:mb-1 prose-ul:mb-3 prose-ol:mb-3">
      <ReactMarkdown
        components={{
          a: LinkComponent,
          p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
          h1: ({ children }) => <h1 className="mb-3 mt-4 text-lg font-semibold">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-2 mt-3 text-base font-semibold">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-2 mt-3 text-sm font-semibold">{children}</h3>,
          h4: ({ children }) => <h4 className="mb-2 mt-2 text-sm font-semibold">{children}</h4>,
          h5: ({ children }) => <h5 className="mb-1 mt-2 text-xs font-semibold">{children}</h5>,
          h6: ({ children }) => <h6 className="mb-1 mt-2 text-xs font-semibold">{children}</h6>,
          li: ({ children }) => <li className="mb-1">{children}</li>,
          ul: ({ children }) => <ul className="mb-3 space-y-1 ml-4">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 space-y-1 ml-4">{children}</ol>,
          code: ({ children, className }) => {
            const isInline = !className
            return isInline ? (
              <code className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-xs">{children}</code>
            ) : (
              <code className={className}>{children}</code>
            )
          },
        }}
      >
        {markdownWithCompactRefs}
      </ReactMarkdown>
    </div>
  )
}
