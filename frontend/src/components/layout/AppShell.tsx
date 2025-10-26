'use client'

import { BottomNav } from './BottomNav'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden relative">
      {/* Background decorative gradient - Vibrant & Animated */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-br from-purple-500/20 via-blue-500/15 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-pink-500/20 via-purple-500/15 to-transparent rounded-full blur-3xl opacity-70" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-full blur-3xl" />
      </div>
      
      {/* Main layout with bottom nav */}
      <div className="flex-1 flex flex-col min-h-0 relative w-full">
        {/* Main content - with bottom padding for nav bar */}
        <main className="flex-1 flex flex-col min-h-0 overflow-y-auto relative z-10 pb-16 sm:pb-20 lg:pb-24">
          {children}
        </main>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  )
}
