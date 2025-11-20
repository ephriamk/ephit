'use client'

import React, { useMemo, useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Plus, RefreshCw, Search, FileText, Clock, TrendingUp, Archive, Grid3x3, List, Zap, Activity, Layers, ArrowRight, Sparkles, MoreVertical, Trash2 } from 'lucide-react'
import { useNotebooks, useDeleteNotebook } from '@/lib/hooks/use-notebooks'
import { CreateNotebookDialog, NOTEBOOK_CREATED_EVENT } from '@/components/notebooks/CreateNotebookDialog'
import { Input } from '@/components/ui/input'
import { formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { OnboardingDialog } from '@/components/onboarding/OnboardingDialog'
import { useAuthStore } from '@/lib/stores/auth-store'
import { completeOnboarding } from '@/lib/api/onboarding'
import type { NotebookResponse } from '@/lib/types/api'
import { motion, AnimatePresence } from 'framer-motion'

type ViewMode = 'grid' | 'list'

// Completely new card design - Dashboard widget style
function NotebookCard({ notebook, archived = false, index, onDelete }: { notebook: NotebookResponse, archived?: boolean, index: number, onDelete: (id: string) => void }) {
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className="group h-full"
    >
      <div className="relative h-full min-h-[240px] rounded-xl border-2 border-primary/20 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl overflow-hidden transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/20">
        {/* Content */}
        <Link href={`/notebooks/${notebook.id}`} className="block p-6 h-full">
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold mb-1.5 line-clamp-2 group-hover:text-primary transition-colors">
                  {notebook.name}
                </h3>
                {notebook.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {notebook.description}
                  </p>
                )}
              </div>
              {archived && (
                <Badge variant="secondary" className="ml-3 shrink-0 bg-primary/20 border-primary/30 text-primary text-xs">
                  <Archive className="h-3 w-3 mr-1" />
                </Badge>
              )}
            </div>
            
            {/* Stats section */}
            <div className="flex items-center gap-4 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="text-lg font-bold text-primary">{notebook.source_count || 0}</div>
                  <div className="text-xs text-muted-foreground">Sources</div>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="mt-auto pt-4 border-t border-primary/10 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>{formatDistanceToNow(new Date(notebook.updated), { addSuffix: true }).split(' ')[0]}</span>
              </div>
              <motion.div
                animate={{ x: 0 }}
                whileHover={{ x: 4 }}
                transition={{ duration: 0.2 }}
              >
                <ArrowRight className="h-4 w-4 text-primary" />
              </motion.div>
            </div>
          </div>
        </Link>
        
        {/* Actions Menu - positioned absolutely */}
        <div className="absolute top-3 right-3 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg bg-background/80 backdrop-blur-sm hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.preventDefault()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => {
                  e.preventDefault()
                  setShowDeleteDialog(true)
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{notebook.name}&quot;? This action cannot be undone and will remove all associated sources and data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(notebook.id)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}

// New list item - Compact and clean
function NotebookListItem({ notebook, archived = false, index, onDelete }: { notebook: NotebookResponse, archived?: boolean, index: number, onDelete: (id: string) => void }) {
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      className="group"
    >
      <div className="relative">
        <Link href={`/notebooks/${notebook.id}`}>
          <div className="relative p-4 rounded-xl border-2 border-primary/20 bg-gradient-to-r from-card/90 to-card/60 backdrop-blur-xl overflow-hidden cursor-pointer transition-all duration-300 hover:border-primary/50 hover:shadow-lg">
          <div className="flex items-center gap-4">
            {/* Icon */}
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border-2 border-primary/30 shrink-0 group-hover:border-primary/60 transition-colors">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 mb-1.5">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold mb-0.5 truncate group-hover:text-primary transition-colors">
                    {notebook.name}
                  </h3>
                  {notebook.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {notebook.description}
                    </p>
                  )}
                </div>
                {archived && (
                  <Badge variant="secondary" className="shrink-0 bg-primary/20 border-primary/30 text-primary text-xs">
                    <Archive className="h-3 w-3 mr-1" />
                  </Badge>
                )}
              </div>
              
              {/* Metadata */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-primary" />
                  <span className="font-medium">{notebook.source_count || 0} sources</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span>{formatDistanceToNow(new Date(notebook.updated), { addSuffix: true })}</span>
                </div>
              </div>
            </div>
            
            {/* Arrow */}
            <motion.div
              initial={{ opacity: 0.5 }}
              whileHover={{ opacity: 1, x: 4 }}
              className="flex-shrink-0"
            >
              <ArrowRight className="h-5 w-5 text-primary" />
            </motion.div>
          </div>
        </div>
      </Link>
      
      {/* Actions Menu - positioned absolutely */}
      <div className="absolute top-3 right-3 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg bg-background/80 backdrop-blur-sm hover:bg-background opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.preventDefault()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(e) => {
                e.preventDefault()
                setShowDeleteDialog(true)
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    {/* Delete Confirmation Dialog */}
    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Project?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{notebook.name}&quot;? This action cannot be undone and will remove all associated sources and data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onDelete(notebook.id)}
            className="bg-destructive hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </motion.div>
  )
}

export default function NotebooksPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const { data: notebooks, isLoading, refetch } = useNotebooks(false)
  const { data: archivedNotebooks } = useNotebooks(true)
  const deleteNotebook = useDeleteNotebook()
  const mainContentRef = useRef<HTMLDivElement>(null)
  const { user, setSession, accessToken } = useAuthStore()
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    if (user && !user.has_completed_onboarding) {
      setShowOnboarding(true)
    } else if (user && user.has_completed_onboarding) {
      setShowOnboarding(false)
    }
  }, [user])

  const handleOnboardingComplete = async () => {
    setShowOnboarding(false)
    try {
      await completeOnboarding()
      if (user && accessToken) {
        const updatedUser = { ...user, has_completed_onboarding: true }
        setSession({
          access_token: accessToken,
          token_type: 'bearer',
          user: updatedUser
        })
      }
    } catch (error) {
      console.error('Failed to complete onboarding:', error)
      setShowOnboarding(false)
    }
  }

  const normalizedQuery = searchTerm.trim().toLowerCase()

  useEffect(() => {
    const handleNotebookCreated = () => {
      // Immediately refetch notebooks to show the new one
      refetch()
      
      // Then scroll to content after a short delay
      setTimeout(() => {
        if (mainContentRef.current) {
          mainContentRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
          })
        }
      }, 500)
    }

    window.addEventListener(NOTEBOOK_CREATED_EVENT, handleNotebookCreated)
    return () => {
      window.removeEventListener(NOTEBOOK_CREATED_EVENT, handleNotebookCreated)
    }
  }, [refetch])

  const filteredActive = useMemo(() => {
    if (!notebooks) return undefined
    if (!normalizedQuery) return notebooks
    return notebooks.filter((notebook) =>
      notebook.name.toLowerCase().includes(normalizedQuery) ||
      notebook.description?.toLowerCase().includes(normalizedQuery)
    )
  }, [notebooks, normalizedQuery])

  const filteredArchived = useMemo(() => {
    if (!archivedNotebooks) return undefined
    if (!normalizedQuery) return archivedNotebooks
    return archivedNotebooks.filter((notebook) =>
      notebook.name.toLowerCase().includes(normalizedQuery) ||
      notebook.description?.toLowerCase().includes(normalizedQuery)
    )
  }, [archivedNotebooks, normalizedQuery])

  const hasArchived = (archivedNotebooks?.length ?? 0) > 0
  const isSearching = normalizedQuery.length > 0
  const totalNotebooks = (notebooks?.length ?? 0) + (archivedNotebooks?.length ?? 0)
  const totalSources = notebooks?.reduce((sum, nb) => sum + (nb.source_count || 0), 0) ?? 0

  const handleDelete = (id: string) => {
    deleteNotebook.mutate(id)
  }

  return (
    <AppShell>
      <div className="relative min-h-screen">
        {/* Header */}
        <div className="relative border-b border-primary/20 bg-background/80 backdrop-blur-xl sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex flex-col gap-6">
              {/* Title Row */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-start justify-between gap-4"
              >
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                    Research Workspace
                  </h1>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Manage your crypto research projects
                  </p>
                </div>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button 
                    onClick={() => setCreateDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Project
                  </Button>
                </motion.div>
              </motion.div>

              {/* Stats Dashboard */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-4"
              >
                {[
                  { label: 'Projects', value: totalNotebooks, icon: Layers },
                  { label: 'Active', value: notebooks?.length ?? 0, icon: Activity },
                  { label: 'Sources', value: totalSources, icon: FileText },
                  { label: 'Archived', value: archivedNotebooks?.length ?? 0, icon: Archive },
                ].map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: 0.2 + index * 0.1 }}
                    whileHover={{ scale: 1.05, y: -4 }}
                    className="relative p-4 rounded-xl border-2 border-primary/20 bg-gradient-to-br from-card/80 via-card/60 to-card/40 backdrop-blur-xl overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/10 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-2">
                        <stat.icon className="h-5 w-5 text-primary" />
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.3 + index * 0.1, type: 'spring' }}
                          className="text-2xl font-bold text-primary"
                        >
                          {stat.value}
                        </motion.div>
                      </div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                        {stat.label}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Search and Controls */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
              >
                <div className="flex-1 relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search projects..."
                    className="pl-11 bg-background/50 border-primary/20 focus:border-primary/50 focus:ring-primary/20"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="icon"
                      onClick={() => setViewMode('grid')}
                      className="shrink-0"
                    >
                      <Grid3x3 className="h-4 w-4" />
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="icon"
                      onClick={() => setViewMode('list')}
                      className="shrink-0"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ rotate: 180 }} transition={{ duration: 0.3 }}>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => refetch()}
                      className="shrink-0"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div ref={mainContentRef} className="max-w-7xl mx-auto px-6 py-8">
          <div className="space-y-10">
            {/* Active Projects - New Layout */}
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              {/* Section Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 border-2 border-primary/30 flex items-center justify-center">
                      <Activity className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <span>Active Projects</span>
                        {filteredActive && filteredActive.length > 0 && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring' }}
                            className="px-2 py-0.5 rounded-full bg-primary/20 border border-primary/30 text-xs font-bold text-primary"
                          >
                            {filteredActive.length}
                          </motion.span>
                        )}
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {filteredActive?.length ?? 0} {filteredActive?.length === 1 ? 'project' : 'projects'} currently active
                      </p>
                    </div>
                  </div>
                  
                  {filteredActive && filteredActive.length > 0 && (
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20"
                    >
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <span className="text-xs font-semibold text-primary">Live</span>
                    </motion.div>
                  )}
                </div>
                
                {/* Progress bar */}
                {filteredActive && filteredActive.length > 0 && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-1 bg-gradient-to-r from-primary via-primary/50 to-transparent rounded-full"
                  />
                )}
              </div>
              
              {isLoading ? (
                <div className={viewMode === 'grid' 
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
                  : "space-y-3"
                }>
                  {[1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className={`${viewMode === 'grid' ? 'h-64' : 'h-20'} rounded-xl bg-muted/30 border-2 border-primary/10 animate-pulse`}
                    />
                  ))}
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  {filteredActive && filteredActive.length > 0 ? (
                    <motion.div
                      key="active-list"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={viewMode === 'grid' 
                        ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
                        : "space-y-3"
                      }
                    >
                      {filteredActive.map((notebook, index) => (
                        viewMode === 'grid' ? (
                          <NotebookCard key={notebook.id} notebook={notebook} index={index} onDelete={handleDelete} />
                        ) : (
                          <NotebookListItem key={notebook.id} notebook={notebook} index={index} onDelete={handleDelete} />
                        )
                      ))}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="py-16 text-center border-2 border-dashed border-primary/30 rounded-xl bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-xl"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', duration: 0.6, delay: 0.2 }}
                        className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 border-2 border-primary/30 mb-4"
                      >
                        <Sparkles className="h-8 w-8 text-primary" />
                      </motion.div>
                      <h3 className="text-lg font-semibold mb-2">
                        {isSearching ? 'No projects match your search' : 'No active projects'}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-6">
                        {isSearching ? 'Try a different search term' : 'Create your first research project to get started'}
                      </p>
                      {!isSearching && (
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button onClick={() => setCreateDialogOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Project
                          </Button>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </motion.section>

            {/* Archived Projects */}
            {hasArchived && (
              <motion.section
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <div className="mb-6">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Archive className="h-5 w-5 text-primary" />
                    Archived Projects
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    {filteredArchived?.length ?? 0} {filteredArchived?.length === 1 ? 'project' : 'projects'} archived
                  </p>
                </div>
                
                <AnimatePresence>
                  <div className={viewMode === 'grid' 
                    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
                    : "space-y-3"
                  }>
                    {filteredArchived && filteredArchived.length > 0 ? (
                      filteredArchived.map((notebook, index) => (
                        viewMode === 'grid' ? (
                          <NotebookCard key={notebook.id} notebook={notebook} archived index={index} onDelete={handleDelete} />
                        ) : (
                          <NotebookListItem key={notebook.id} notebook={notebook} archived index={index} onDelete={handleDelete} />
                        )
                      ))
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="col-span-full py-8 text-center text-sm text-muted-foreground border-2 border-dashed border-primary/30 rounded-xl bg-card/30"
                      >
                        No archived projects match your search
                      </motion.div>
                    )}
                  </div>
                </AnimatePresence>
              </motion.section>
            )}
          </div>
        </div>
      </div>

      <CreateNotebookDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      <OnboardingDialog
        open={showOnboarding}
        onComplete={handleOnboardingComplete}
      />
    </AppShell>
  )
}
