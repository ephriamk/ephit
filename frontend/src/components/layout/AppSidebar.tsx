'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/hooks/use-auth'
import { useSidebarStore } from '@/lib/stores/sidebar-store'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { AddSourceDialog } from '@/components/sources/AddSourceDialog'
import { CreateNotebookDialog } from '@/components/notebooks/CreateNotebookDialog'
import { GeneratePodcastDialog } from '@/components/podcasts/GeneratePodcastDialog'
import { Separator } from '@/components/ui/separator'
import {
  Book,
  Search,
  Mic,
  Bot,
  Shuffle,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  FileText,
  Plus,
  Wrench,
} from 'lucide-react'

const navigation = [
  {
    title: 'Collect',
    items: [
      { name: 'Sources', href: '/sources', icon: FileText },
    ],
  },
  {
    title: 'Process',
    items: [
      { name: 'Notebooks', href: '/notebooks', icon: Book },
      { name: 'Ask and Search', href: '/search', icon: Search },
    ],
  },
  {
    title: 'Create',
    items: [
      { name: 'Podcasts', href: '/podcasts', icon: Mic },
    ],
  },
  {
    title: 'Manage',
    items: [
      { name: 'Models', href: '/models', icon: Bot },
      { name: 'Transformations', href: '/transformations', icon: Shuffle },
      { name: 'Settings', href: '/settings', icon: Settings },
      { name: 'Advanced', href: '/advanced', icon: Wrench },
    ],
  },
] as const

type CreateTarget = 'source' | 'notebook' | 'podcast'

export function AppSidebar() {
  const pathname = usePathname()
  const { logout } = useAuth()
  const { isCollapsed, toggleCollapse } = useSidebarStore()

  const [createMenuOpen, setCreateMenuOpen] = useState(false)
  const [sourceDialogOpen, setSourceDialogOpen] = useState(false)
  const [notebookDialogOpen, setNotebookDialogOpen] = useState(false)
  const [podcastDialogOpen, setPodcastDialogOpen] = useState(false)

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
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          'app-sidebar flex h-full flex-col bg-sidebar/80 backdrop-blur-xl border-sidebar-border border-r transition-all duration-500 ease-in-out shadow-2xl',
          isCollapsed ? 'w-16' : 'w-72'
        )}
      >
        {/* Modern header with gradient accent */}
        <div
          className={cn(
            'flex items-center relative overflow-hidden',
            isCollapsed ? 'justify-center h-16' : 'justify-between px-5 h-20'
          )}
        >
          {/* Gradient accent line */}
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          
          {isCollapsed ? (
            <div className="relative flex items-center justify-center w-full group">
              <div className="relative z-10 p-2 rounded-xl bg-primary/10 backdrop-blur-sm">
                <img
                  src="/datara.jpg"
                  alt="Datara"
                  width={24}
                  height={24}
                  className="transition-all duration-300 rounded-md"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleCollapse}
                className="absolute inset-0 w-full h-full rounded-none opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-accent/50"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 z-10">
                <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 backdrop-blur-sm shadow-lg">
                  <img src="/datara.jpg" alt="Datara" width={28} height={28} className="relative z-10 rounded-md" />
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-bold text-sidebar-foreground tracking-tight">
                    Datara
                  </span>
                  <span className="text-xs text-muted-foreground">Crypto Research</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleCollapse}
                className="text-sidebar-foreground hover:bg-accent/50 hover:text-accent-foreground rounded-lg transition-all duration-300 hover:scale-110"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        <nav
          className={cn(
            'flex-1 space-y-2 py-4 overflow-y-auto scrollbar-thin',
            isCollapsed ? 'px-2' : 'px-4'
          )}
        >
          {/* Modern Create Button */}
          <div className={cn('mb-4', isCollapsed ? 'px-0' : 'px-1')}>
            <DropdownMenu open={createMenuOpen} onOpenChange={setCreateMenuOpen}>
              {isCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        onClick={() => setCreateMenuOpen(true)}
                        size="icon"
                        className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 hover:from-primary hover:via-primary hover:to-primary/90 text-primary-foreground border-0 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:scale-105"
                        aria-label="Create"
                      >
                        <Plus className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="right">Create</TooltipContent>
                </Tooltip>
              ) : (
                <DropdownMenuTrigger asChild>
                  <Button
                    onClick={() => setCreateMenuOpen(true)}
                    size="lg"
                    className="w-full justify-start bg-gradient-to-r from-primary via-primary/95 to-primary hover:from-primary hover:via-primary hover:to-primary/90 text-primary-foreground border-0 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 rounded-xl transition-all duration-300 hover:scale-[1.02] group"
                  >
                    <Plus className="h-5 w-5 mr-3 group-hover:rotate-90 transition-transform duration-300" />
                    <span className="font-semibold">Create New</span>
                  </Button>
                </DropdownMenuTrigger>
              )}

              <DropdownMenuContent
                align={isCollapsed ? 'end' : 'start'}
                side={isCollapsed ? 'right' : 'bottom'}
                className="w-48"
              >
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault()
                    handleCreateSelection('source')
                  }}
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Source
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault()
                    handleCreateSelection('notebook')
                  }}
                  className="gap-2"
                >
                  <Book className="h-4 w-4" />
                  Notebook
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault()
                    handleCreateSelection('podcast')
                  }}
                  className="gap-2"
                >
                  <Mic className="h-4 w-4" />
                  Podcast
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {navigation.map((section, index) => (
            <div key={section.title} className="space-y-2">
              {index > 0 && (
                <Separator className="my-4 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
              )}
              <div className="space-y-1.5">
                {!isCollapsed && (
                  <h3 className="mb-2 px-3 text-xs font-bold uppercase tracking-widest text-primary/60">
                    {section.title}
                  </h3>
                )}

                {section.items.map((item) => {
                  const isActive = pathname.startsWith(item.href)
                  const button = (
                    <Button
                      variant="ghost"
                      className={cn(
                        'w-full gap-3 text-sidebar-foreground relative group overflow-hidden',
                        isActive 
                          ? 'bg-gradient-to-r from-primary/20 via-primary/15 to-transparent text-primary font-semibold' 
                          : 'hover:bg-accent/50',
                        isCollapsed ? 'justify-center px-2 h-11 rounded-xl' : 'justify-start h-11 rounded-xl'
                      )}
                    >
                      {/* Active indicator */}
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full shadow-lg shadow-primary/50" />
                      )}
                      
                      <item.icon className={cn(
                        "h-5 w-5 transition-all duration-300",
                        isActive ? "text-primary" : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground"
                      )} />
                      
                      {!isCollapsed && (
                        <span className={cn(
                          "transition-all duration-300",
                          isActive && "font-semibold"
                        )}>
                          {item.name}
                        </span>
                      )}
                    </Button>
                  )

                  if (isCollapsed) {
                    return (
                      <Tooltip key={item.name}>
                        <TooltipTrigger asChild>
                          <Link href={item.href}>
                            {button}
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">{item.name}</TooltipContent>
                      </Tooltip>
                    )
                  }

                  return (
                    <Link key={item.name} href={item.href}>
                      {button}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Modern footer with gradient accent */}
        <div className="border-t border-sidebar-border/50 bg-sidebar/50 backdrop-blur-xl">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          
          <div
            className={cn(
              'p-4 space-y-2',
              isCollapsed ? 'px-2' : 'px-4'
            )}
          >
            <div
              className={cn(
                'flex items-center',
                isCollapsed ? 'justify-center' : 'justify-start'
              )}
            >
              {isCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-2 rounded-xl hover:bg-accent/50 transition-colors duration-200">
                      <ThemeToggle iconOnly />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">Theme</TooltipContent>
                </Tooltip>
              ) : (
                <div className="w-full">
                  <ThemeToggle />
                </div>
              )}
            </div>

            {/* Modern sign out button */}
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-full h-11 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-all duration-300"
                    onClick={logout}
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Sign Out</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                size="lg"
                className="w-full justify-start gap-3 hover:bg-destructive/10 hover:text-destructive rounded-xl transition-all duration-300 group"
                onClick={logout}
              >
                <LogOut className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                <span className="font-medium">Sign Out</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <AddSourceDialog open={sourceDialogOpen} onOpenChange={setSourceDialogOpen} />
      <CreateNotebookDialog
        open={notebookDialogOpen}
        onOpenChange={setNotebookDialogOpen}
      />
      <GeneratePodcastDialog
        open={podcastDialogOpen}
        onOpenChange={setPodcastDialogOpen}
      />
    </TooltipProvider>
  )
}
