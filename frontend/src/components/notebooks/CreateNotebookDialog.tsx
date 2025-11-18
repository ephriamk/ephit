'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useCreateNotebook } from '@/lib/hooks/use-notebooks'
import { BookOpen, Loader2, Sparkles } from 'lucide-react'

// Custom event to trigger scroll after notebook creation
export const NOTEBOOK_CREATED_EVENT = 'notebook-created'

const createNotebookSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
})

type CreateNotebookFormData = z.infer<typeof createNotebookSchema>

const MAX_NAME_LENGTH = 100
const MAX_DESCRIPTION_LENGTH = 500

interface CreateNotebookDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateNotebookDialog({ open, onOpenChange }: CreateNotebookDialogProps) {
  const createNotebook = useCreateNotebook()
  const [nameLength, setNameLength] = useState(0)
  const [descriptionLength, setDescriptionLength] = useState(0)
  
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    watch,
  } = useForm<CreateNotebookFormData>({
    resolver: zodResolver(createNotebookSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
    },
  })

  const closeDialog = () => onOpenChange(false)

  const onSubmit = async (data: CreateNotebookFormData) => {
    try {
      await createNotebook.mutateAsync(data)
      // Small delay to ensure React Query processes cache invalidation
      // This ensures the list updates before dialog closes
      await new Promise(resolve => setTimeout(resolve, 100))
      closeDialog()
      reset()
      // Dispatch event as backup to trigger scroll (can be removed if React Query handles it)
      window.dispatchEvent(new CustomEvent(NOTEBOOK_CREATED_EVENT))
    } catch (error) {
      // Error is already handled in mutation's onError callback
      // Don't close dialog on error so user can retry
    }
  }

  useEffect(() => {
    if (!open) {
      reset()
      setNameLength(0)
      setDescriptionLength(0)
    }
  }, [open, reset])

  // Watch form values for character count
  useEffect(() => {
    const subscription = watch((value) => {
      setNameLength(value.name?.length || 0)
      setDescriptionLength(value.description?.length || 0)
    })
    return () => subscription.unsubscribe()
  }, [watch])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="group overflow-hidden border border-primary/40 bg-gradient-to-br from-background via-background/80 to-primary/10 shadow-[0_40px_80px_-40px_rgba(59,130,246,0.55)] backdrop-blur-2xl sm:max-w-[540px] max-h-[90vh]">
        {/* Animated decorative background elements */}
        <motion.div 
          className="pointer-events-none absolute inset-0 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ duration: 0.8 }}
        >
          <motion.div 
            className="absolute top-0 right-0 h-64 w-64 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 blur-3xl"
            animate={{ 
              x: ['25%', '30%', '25%'],
              y: ['-25%', '-20%', '-25%'],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              duration: 8,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />
          <motion.div 
            className="absolute bottom-0 left-0 h-56 w-56 rounded-full bg-gradient-to-tr from-purple-500/20 to-muted/30 blur-2xl"
            animate={{ 
              x: ['-25%', '-30%', '-25%'],
              y: ['25%', '30%', '25%'],
              scale: [1, 1.15, 1]
            }}
            transition={{ 
              duration: 10,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 1
            }}
          />
        </motion.div>

        <div className="relative z-10 space-y-6">
          <DialogHeader className="space-y-4">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="inline-flex items-center gap-2 self-start rounded-full border border-primary/30 bg-gradient-to-r from-primary/20 to-primary/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.15em] text-primary shadow-lg shadow-primary/10"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Research Project
            </motion.div>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <DialogTitle className="flex items-center gap-3 text-3xl font-bold tracking-tight">
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  <Sparkles className="h-7 w-7 text-primary" />
                </motion.div>
                Create New Project
              </DialogTitle>
            </motion.div>

            {/* Description */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                Start a new research project. Give it a clear name and brief description to help you stay organized.
              </DialogDescription>
            </motion.div>
          </DialogHeader>

          <motion.form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {/* Name Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="notebook-name" className="text-xs font-semibold uppercase tracking-wide text-foreground/80">
                  Project Name <span className="text-destructive">*</span>
                </Label>
                <span className={`text-xs tabular-nums transition-colors ${
                  nameLength > MAX_NAME_LENGTH ? 'text-destructive font-semibold' : 'text-muted-foreground'
                }`}>
                  {nameLength}/{MAX_NAME_LENGTH}
                </span>
              </div>
              <motion.div
                whileFocus={{ scale: 1.01 }}
                transition={{ duration: 0.2 }}
              >
                <Input
                  id="notebook-name"
                  {...register('name')}
                  placeholder="e.g., AI Research 2025, Market Analysis Q1..."
                  autoFocus
                  maxLength={MAX_NAME_LENGTH}
                  className="rounded-2xl border-2 border-primary/20 bg-background/60 backdrop-blur-sm transition-all duration-300 focus-visible:border-primary/70 focus-visible:shadow-[0_0_0_4px_rgba(59,130,246,0.25)] focus-visible:bg-background/80"
                />
              </motion.div>
              <AnimatePresence mode="wait">
                {errors.name && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="flex items-center gap-1.5 text-sm font-medium text-destructive"
                  >
                    <span className="inline-block h-1 w-1 rounded-full bg-destructive" />
                    {errors.name.message}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Description Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="notebook-description" className="text-xs font-semibold uppercase tracking-wide text-foreground/80">
                  Description <span className="text-muted-foreground text-[10px]">(Optional)</span>
                </Label>
                <span className={`text-xs tabular-nums transition-colors ${
                  descriptionLength > MAX_DESCRIPTION_LENGTH ? 'text-destructive font-semibold' : 'text-muted-foreground'
                }`}>
                  {descriptionLength}/{MAX_DESCRIPTION_LENGTH}
                </span>
              </div>
              <motion.div
                whileFocus={{ scale: 1.01 }}
                transition={{ duration: 0.2 }}
              >
                <Textarea
                  id="notebook-description"
                  {...register('description')}
                  placeholder="What's this project about? Any specific goals or areas of focus..."
                  rows={4}
                  maxLength={MAX_DESCRIPTION_LENGTH}
                  className="rounded-2xl border-2 border-primary/20 bg-background/60 backdrop-blur-sm transition-all duration-300 focus-visible:border-primary/70 focus-visible:shadow-[0_0_0_4px_rgba(59,130,246,0.25)] focus-visible:bg-background/80 resize-none"
                />
              </motion.div>
              <AnimatePresence mode="wait">
                {errors.description && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="flex items-center gap-1.5 text-sm font-medium text-destructive"
                  >
                    <span className="inline-block h-1 w-1 rounded-full bg-destructive" />
                    {errors.description.message}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <DialogFooter className="gap-3 pt-4 sm:flex-row">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 sm:flex-none"
              >
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={closeDialog}
                  disabled={createNotebook.isPending}
                  className="w-full rounded-xl border-2 border-muted-foreground/30 bg-background/40 backdrop-blur-sm transition-all duration-300 hover:border-muted-foreground/50 hover:bg-background/60 sm:w-auto"
                >
                  Cancel
                </Button>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 sm:flex-none"
              >
                <Button
                  type="submit"
                  disabled={!isValid || createNotebook.isPending}
                  className="group/btn relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-primary via-primary to-primary/90 shadow-[0_20px_30px_-20px_rgba(59,130,246,0.85)] transition-all duration-300 hover:shadow-[0_30px_45px_-20px_rgba(59,130,246,0.95)] hover:from-primary hover:via-primary/95 hover:to-primary/85 disabled:opacity-50 disabled:shadow-none sm:w-auto"
                >
                  {/* Button glow effect */}
                  <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover/btn:translate-x-[200%] transition-transform duration-1000" />
                  
                  <span className="relative flex items-center justify-center gap-2">
                    {createNotebook.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Create Project
                      </>
                    )}
                  </span>
                </Button>
              </motion.div>
            </DialogFooter>
          </motion.form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
