'use client'

import { BottomNav } from './BottomNav'

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden relative">
      {/* Background decorative gradient - Static Datara blue */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-br from-[#4A90E2]/15 via-[#2E66B5]/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-[#2E66B5]/15 via-[#1C3E75]/10 to-transparent rounded-full blur-3xl opacity-70" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-gradient-to-r from-[#4A90E2]/8 via-[#2E66B5]/8 to-[#1C3E75]/8 rounded-full blur-3xl" />
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
