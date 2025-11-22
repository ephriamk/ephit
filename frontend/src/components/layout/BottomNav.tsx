'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useState, useMemo } from 'react'
import {
  Book,
  FileText,
  Search,
  Mic,
  Bot,
  Settings,
  Menu,
  Plus,
  LogOut,
  Shuffle,
  Wrench,
  Shield
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/lib/hooks/use-auth'
import { useAuthStore } from '@/lib/stores/auth-store'
import { AddSourceDialog } from '@/components/sources/AddSourceDialog'
import { CreateNotebookDialog } from '@/components/notebooks/CreateNotebookDialog'
import { GeneratePodcastDialog } from '@/components/podcasts/GeneratePodcastDialog'

type CreateTarget = 'source' | 'notebook' | 'podcast'

export function BottomNav() {
  const pathname = usePathname()
  const { logout } = useAuth()
  const isAdmin = useAuthStore((state) => state.user?.is_admin ?? false)
  const [createMenuOpen, setCreateMenuOpen] = useState(false)
  const [sourceDialogOpen, setSourceDialogOpen] = useState(false)
  const [notebookDialogOpen, setNotebookDialogOpen] = useState(false)
  const [podcastDialogOpen, setPodcastDialogOpen] = useState(false)

  // Memoize pathname checks to reduce re-renders
  const activeRoutes = useMemo(() => ({
    notebooks: pathname.startsWith('/notebooks'),
    sources: pathname.startsWith('/sources'),
    search: pathname.startsWith('/search'),
    admin: pathname.startsWith('/admin'),
    podcasts: pathname.startsWith('/podcasts'),
    models: pathname.startsWith('/models'),
    transformations: pathname.startsWith('/transformations'),
    settings: pathname.startsWith('/settings'),
  }), [pathname])

  const handleCreateSelection = (target: CreateTarget) => {
    setCreateMenuOpen(false)
    if (target === 'source') {
      setSourceDialogOpen(true)
    } else if (target === 'notebook') {
      setNotebookDialogOpen(true)
    } else if (target === 'podcast') {
      setPodcastDialogOpen(true)
    }
  }

  return (
    <>
      {/* Floating Bottom Navigation Bar - Liquid Glass */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bottom-nav">
        <div className="mx-auto px-3 sm:px-4 lg:px-6 py-2 max-w-7xl">
          <div className="flex items-center justify-between gap-1 sm:gap-2 h-14 lg:h-16">
            {/* Logo */}
            <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 shrink-0">
              <div className="p-1.5 sm:p-2 rounded-xl sm:rounded-2xl bg-primary/15 border border-primary/20 liquid-glass">
                <img
                  src="/datara.jpg"
                  alt="Datara"
                  width={20}
                  height={20}
                  className="rounded-md"
                  loading="eager"
                />
              </div>
              <span className="text-sm sm:text-base font-semibold tracking-tight hidden sm:inline-flex">
                Datara
              </span>
            </div>

            {/* Main Navigation - Center */}
            <nav className="flex items-center gap-1 sm:gap-2 flex-1 justify-center min-w-0">
              {/* Primary Actions - Liquid Glass */}
              <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-2xl sm:rounded-3xl liquid-glass shrink-0">
                <Button
                  asChild
                  variant={activeRoutes.notebooks ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    "rounded-xl sm:rounded-2xl h-9 sm:h-10 px-2 sm:px-4 gap-1 sm:gap-2 transition-colors duration-200",
                    activeRoutes.notebooks && "shadow-xl shadow-primary/30"
                  )}
                >
                  <Link href="/notebooks" prefetch>
                    <Book className="h-4 w-4" />
                    <span className="hidden lg:inline">Library</span>
                  </Link>
                </Button>

                <Button
                  asChild
                  variant={activeRoutes.sources ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    "rounded-xl sm:rounded-2xl h-9 sm:h-10 px-2 sm:px-4 gap-1 sm:gap-2 transition-colors duration-200",
                    activeRoutes.sources && "shadow-xl shadow-primary/30"
                  )}
                >
                  <Link href="/sources" prefetch>
                    <FileText className="h-4 w-4" />
                    <span className="hidden lg:inline">Documents</span>
                  </Link>
                </Button>

                <Button
                  asChild
                  variant={activeRoutes.search ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    "rounded-xl sm:rounded-2xl h-9 sm:h-10 px-2 sm:px-4 gap-1 sm:gap-2 transition-colors duration-200",
                    activeRoutes.search && "shadow-xl shadow-primary/30"
                  )}
                >
                  <Link href="/search" prefetch>
                    <Search className="h-4 w-4" />
                    <span className="hidden lg:inline">Discover</span>
                  </Link>
                </Button>
              </div>

              {/* Create Button */}
              <DropdownMenu open={createMenuOpen} onOpenChange={setCreateMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    className="rounded-full h-10 w-10 sm:h-11 sm:w-11 shadow-xl shadow-primary/30 hover:shadow-primary/40 liquid-glass transition-colors duration-200 hover:scale-110"
                  >
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Create New</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => handleCreateSelection('notebook')}>
                    <Book className="mr-2 h-4 w-4" />
                    Notebook
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleCreateSelection('source')}>
                    <FileText className="mr-2 h-4 w-4" />
                    Document
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleCreateSelection('podcast')}>
                    <Mic className="mr-2 h-4 w-4" />
                    Audio
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Secondary Actions - Visible on all screens */}
              <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-2xl sm:rounded-3xl liquid-glass">
                {isAdmin && (
                  <Button
                    asChild
                    variant={activeRoutes.admin ? 'default' : 'ghost'}
                    size="icon"
                    className="rounded-xl sm:rounded-2xl h-9 w-9 sm:h-10 sm:w-10 transition-colors duration-200"
                    title="Admin"
                  >
                    <Link href="/admin" prefetch>
                      <Shield className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
                <Button
                  asChild
                  variant={activeRoutes.podcasts ? 'default' : 'ghost'}
                  size="icon"
                  className="rounded-xl sm:rounded-2xl h-9 w-9 sm:h-10 sm:w-10 transition-colors duration-200"
                  title="Audio"
                >
                  <Link href="/podcasts" prefetch>
                    <Mic className="h-4 w-4" />
                  </Link>
                </Button>

                <Button
                  asChild
                  variant={activeRoutes.models ? 'default' : 'ghost'}
                  size="icon"
                  className="rounded-xl sm:rounded-2xl h-9 w-9 sm:h-10 sm:w-10 transition-colors duration-200"
                  title="AI Models"
                >
                  <Link href="/models" prefetch>
                    <Bot className="h-4 w-4" />
                  </Link>
                </Button>

                <Button
                  asChild
                  variant={activeRoutes.transformations ? 'default' : 'ghost'}
                  size="icon"
                  className="rounded-xl sm:rounded-2xl h-9 w-9 sm:h-10 sm:w-10 transition-colors duration-200"
                  title="Transformations"
                >
                  <Link href="/transformations" prefetch>
                    <Shuffle className="h-4 w-4" />
                  </Link>
                </Button>

                <Button
                  asChild
                  variant={activeRoutes.settings ? 'default' : 'ghost'}
                  size="icon"
                  className="rounded-xl sm:rounded-2xl h-9 w-9 sm:h-10 sm:w-10 transition-colors duration-200"
                  title="Preferences"
                >
                  <Link href="/settings" prefetch>
                    <Settings className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </nav>

            {/* More Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-xl sm:rounded-2xl h-9 w-9 sm:h-10 sm:w-10 liquid-glass transition-colors duration-200 shrink-0">
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>More Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/advanced" className="flex items-center">
                    <Wrench className="mr-2 h-4 w-4" />
                    Advanced
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <AddSourceDialog open={sourceDialogOpen} onOpenChange={setSourceDialogOpen} />
      <CreateNotebookDialog open={notebookDialogOpen} onOpenChange={setNotebookDialogOpen} />
      <GeneratePodcastDialog open={podcastDialogOpen} onOpenChange={setPodcastDialogOpen} />
    </>
  )
}
