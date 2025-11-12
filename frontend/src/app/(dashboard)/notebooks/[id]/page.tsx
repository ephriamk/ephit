'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { NotebookHeader } from '../components/NotebookHeader'
import { SourcesColumn } from '../components/SourcesColumn'
import { NotesColumn } from '../components/NotesColumn'
import { ChatColumn } from '../components/ChatColumn'
import { useNotebook } from '@/lib/hooks/use-notebooks'
import { useSources } from '@/lib/hooks/use-sources'
import { useNotes } from '@/lib/hooks/use-notes'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { motion, AnimatePresence } from 'framer-motion'
import { PanelLeftClose, PanelLeftOpen, FileText, StickyNote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type ContextMode = 'off' | 'insights' | 'full'

export interface ContextSelections {
  sources: Record<string, ContextMode>
  notes: Record<string, ContextMode>
}

export default function NotebookPage() {
  const params = useParams()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<'sources' | 'notes'>('sources')

  // Ensure the notebook ID is properly decoded from URL
  const notebookId = decodeURIComponent(params.id as string)

  const { data: notebook, isLoading: notebookLoading } = useNotebook(notebookId)
  const { data: sources, isLoading: sourcesLoading, refetch: refetchSources } = useSources(notebookId)
  const { data: notes, isLoading: notesLoading } = useNotes(notebookId)

  // Context selection state
  const [contextSelections, setContextSelections] = useState<ContextSelections>({
    sources: {},
    notes: {}
  })

  // Initialize default selections when sources/notes load
  useEffect(() => {
    if (sources && sources.length > 0) {
      setContextSelections(prev => {
        const newSourceSelections = { ...prev.sources }
        sources.forEach(source => {
          if (!(source.id in newSourceSelections)) {
            newSourceSelections[source.id] = source.insights_count > 0 ? 'insights' : 'full'
          }
        })
        return { ...prev, sources: newSourceSelections }
      })
    }
  }, [sources])

  useEffect(() => {
    if (notes && notes.length > 0) {
      setContextSelections(prev => {
        const newNoteSelections = { ...prev.notes }
        notes.forEach(note => {
          if (!(note.id in newNoteSelections)) {
            newNoteSelections[note.id] = 'full'
          }
        })
        return { ...prev, notes: newNoteSelections }
      })
    }
  }, [notes])

  // Handler to update context selection
  const handleContextModeChange = (itemId: string, mode: ContextMode, type: 'source' | 'note') => {
    setContextSelections(prev => ({
      ...prev,
      [type === 'source' ? 'sources' : 'notes']: {
        ...(type === 'source' ? prev.sources : prev.notes),
        [itemId]: mode
      }
    }))
  }

  // Keyboard shortcut for sidebar toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        setSidebarOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (notebookLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!notebook) {
    return (
      <AppShell>
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4">Notebook Not Found</h1>
          <p className="text-muted-foreground">The requested notebook could not be found.</p>
        </div>
      </AppShell>
    )
  }

  const totalSources = sources?.length ?? 0
  const totalNotes = notes?.length ?? 0

  return (
    <AppShell>
      <div className="flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-primary/20 bg-background/80 backdrop-blur-xl">
          <div className="max-w-full mx-auto px-6 py-4">
          <NotebookHeader notebook={notebook} />
            
            {/* Quick Stats */}
            <motion.div 
              className="flex items-center justify-between mt-4"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.4,
                ease: [0.16, 1, 0.3, 1] // Apple-like ease-out
              }}
            >
              <div className="flex items-center gap-6">
                <motion.div 
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <motion.div
                    animate={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <FileText className="h-4 w-4 text-primary" />
                  </motion.div>
                  <span className="font-medium">{totalSources} {totalSources === 1 ? 'source' : 'sources'}</span>
                </motion.div>
                <motion.div 
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <motion.div
                    animate={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  >
                    <StickyNote className="h-4 w-4 text-primary" />
                  </motion.div>
                  <span className="font-medium">{totalNotes} {totalNotes === 1 ? 'note' : 'notes'}</span>
                </motion.div>
              </div>
              
              {/* Sidebar Toggle */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="shrink-0 transition-all duration-200"
                >
                  <motion.div
                    animate={{ rotate: sidebarOpen ? 0 : 180 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  >
                    {sidebarOpen ? (
                      <PanelLeftClose className="h-4 w-4 mr-2" />
                    ) : (
                      <PanelLeftOpen className="h-4 w-4 mr-2" />
                    )}
                  </motion.div>
                  {sidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Sidebar */}
          <AnimatePresence>
            {sidebarOpen && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 320, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ 
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                  mass: 0.8
                }}
                className="flex-shrink-0 border-r border-primary/20 bg-background/50 backdrop-blur-xl overflow-hidden flex flex-col"
              >
                {/* Sidebar Tabs */}
                <div className="flex-shrink-0 border-b border-primary/20 p-2">
                  <div className="flex gap-2">
                    <motion.button
                      onClick={() => setActiveTab('sources')}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className={cn(
                        "flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 relative",
                        activeTab === 'sources'
                          ? "bg-primary/20 text-primary border-2 border-primary/30"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border-2 border-transparent"
                      )}
                    >
                      <motion.div
                        layout
                        className="flex items-center justify-center gap-2"
                      >
                        <motion.div
                          animate={{ rotate: activeTab === 'sources' ? [0, -5, 5, 0] : 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <FileText className="h-4 w-4" />
                        </motion.div>
                        <span>Sources</span>
                        {totalSources > 0 && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 20 }}
                            className="px-1.5 py-0.5 rounded-full bg-primary/20 text-xs font-bold text-primary"
                          >
                            {totalSources}
                          </motion.span>
                        )}
                      </motion.div>
                    </motion.button>
                    <motion.button
                      onClick={() => setActiveTab('notes')}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className={cn(
                        "flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 relative",
                        activeTab === 'notes'
                          ? "bg-primary/20 text-primary border-2 border-primary/30"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border-2 border-transparent"
                      )}
                    >
                      <motion.div
                        layout
                        className="flex items-center justify-center gap-2"
                      >
                        <motion.div
                          animate={{ rotate: activeTab === 'notes' ? [0, -5, 5, 0] : 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <StickyNote className="h-4 w-4" />
                        </motion.div>
                        <span>Notes</span>
                        {totalNotes > 0 && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 20 }}
                            className="px-1.5 py-0.5 rounded-full bg-primary/20 text-xs font-bold text-primary"
                          >
                            {totalNotes}
                          </motion.span>
                        )}
                      </motion.div>
                    </motion.button>
                  </div>
                </div>

                {/* Sidebar Content */}
                <div className="flex-1 overflow-hidden min-h-0">
                  <AnimatePresence mode="wait">
                    {activeTab === 'sources' ? (
                      <motion.div
                        key="sources"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ 
                          type: "spring",
                          stiffness: 300,
                          damping: 30,
                          mass: 0.5
                        }}
                        className="h-full overflow-hidden"
                      >
                <SourcesColumn
                  sources={sources}
                  isLoading={sourcesLoading}
                  notebookId={notebookId}
                  notebookName={notebook?.name}
                  onRefresh={refetchSources}
                  contextSelections={contextSelections.sources}
                  onContextModeChange={(sourceId, mode) => handleContextModeChange(sourceId, mode, 'source')}
                />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="notes"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ 
                          type: "spring",
                          stiffness: 300,
                          damping: 30,
                          mass: 0.5
                        }}
                        className="h-full overflow-hidden"
                      >
                <NotesColumn
                  notes={notes}
                  isLoading={notesLoading}
                  notebookId={notebookId}
                  contextSelections={contextSelections.notes}
                  onContextModeChange={(noteId, mode) => handleContextModeChange(noteId, mode, 'note')}
                />
                      </motion.div>
                    )}
                  </AnimatePresence>
              </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Chat Area - Main Focus */}
          <motion.div
            layout
            transition={{ 
              type: "spring",
              stiffness: 300,
              damping: 30
            }}
            className="flex-1 flex flex-col overflow-hidden min-w-0"
          >
              <ChatColumn
                notebookId={notebookId}
                contextSelections={contextSelections}
              />
          </motion.div>
        </div>
      </div>
    </AppShell>
  )
}
