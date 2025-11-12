'use client'

import { useState } from 'react'
import { NoteResponse } from '@/lib/types/api'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, StickyNote, Bot, User, MoreVertical, Trash2 } from 'lucide-react'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import { EmptyState } from '@/components/common/EmptyState'
import { Badge } from '@/components/ui/badge'
import { NoteEditorDialog } from './NoteEditorDialog'
import { formatDistanceToNow } from 'date-fns'
import { ContextToggle } from '@/components/common/ContextToggle'
import { ContextMode } from '../[id]/page'
import { useDeleteNote } from '@/lib/hooks/use-notes'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { motion } from 'framer-motion'

interface NotesColumnProps {
  notes?: NoteResponse[]
  isLoading: boolean
  notebookId: string
  contextSelections?: Record<string, ContextMode>
  onContextModeChange?: (noteId: string, mode: ContextMode) => void
}

export function NotesColumn({
  notes,
  isLoading,
  notebookId,
  contextSelections,
  onContextModeChange
}: NotesColumnProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingNote, setEditingNote] = useState<NoteResponse | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null)

  const deleteNote = useDeleteNote()

  const handleDeleteClick = (noteId: string) => {
    setNoteToDelete(noteId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!noteToDelete) return

    try {
      await deleteNote.mutateAsync(noteToDelete)
      setDeleteDialogOpen(false)
      setNoteToDelete(null)
    } catch (error) {
      console.error('Failed to delete note:', error)
    }
  }

  return (
    <>
      <div className="h-full flex flex-col overflow-hidden">
        <motion.div 
          className="flex-shrink-0 p-4 border-b border-primary/10"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.3,
            ease: [0.16, 1, 0.3, 1]
          }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Notes</h3>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => {
                  setEditingNote(null)
                  setShowAddDialog(true)
                }}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add
              </Button>
            </motion.div>
          </div>
        </motion.div>

        <div className="flex-1 overflow-y-auto min-h-0 p-4 scroll-smooth">
          {isLoading ? (
            <motion.div 
              className="flex items-center justify-center py-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <LoadingSpinner />
            </motion.div>
          ) : !notes || notes.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                type: "spring",
                stiffness: 300,
                damping: 25
              }}
            >
              <EmptyState
                icon={StickyNote}
                title="No notes yet"
                description="Create your first note to capture insights and observations."
              />
            </motion.div>
          ) : (
            <div className="space-y-3">
              {notes.map((note, index) => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 300,
                    damping: 25,
                    delay: index * 0.03
                  }}
                  whileHover={{ scale: 1.01, y: -2 }}
                  whileTap={{ scale: 0.99 }}
                  className="p-3 border rounded-lg card-hover group relative cursor-pointer transition-all duration-200"
                  onClick={() => setEditingNote(note)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {note.note_type === 'ai' ? (
                        <Bot className="h-4 w-4 text-primary" />
                      ) : (
                        <User className="h-4 w-4 text-muted-foreground" />
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {note.note_type === 'ai' ? 'AI Generated' : 'Human'}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(note.updated), { addSuffix: true })}
                      </span>

                      {/* Context toggle - only show if handler provided */}
                      {onContextModeChange && contextSelections?.[note.id] && (
                        <div onClick={(event) => event.stopPropagation()}>
                          <ContextToggle
                            mode={contextSelections[note.id]}
                            hasInsights={false}
                            onChange={(mode) => onContextModeChange(note.id, mode)}
                          />
                        </div>
                      )}

                      {/* Ellipsis menu for delete action */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <motion.div
                            initial={{ opacity: 0 }}
                            whileHover={{ opacity: 1 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </motion.div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteClick(note.id)
                            }}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Note
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  {note.title && (
                    <h4 className="text-sm font-medium mb-2">{note.title}</h4>
                  )}
                  
                      {note.content && (
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {note.content}
                        </p>
                      )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <NoteEditorDialog
        open={showAddDialog || Boolean(editingNote)}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false)
            setEditingNote(null)
          } else {
            setShowAddDialog(true)
          }
        }}
        notebookId={notebookId}
        note={editingNote ?? undefined}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Note"
        description="Are you sure you want to delete this note? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDeleteConfirm}
        isLoading={deleteNote.isPending}
        confirmVariant="destructive"
      />
    </>
  )
}
