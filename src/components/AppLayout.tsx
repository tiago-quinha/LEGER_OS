"use client"

import React from "react"
import { usePathname } from "next/navigation"
import { Navigation } from "@/components/Navigation"
import { Toaster } from "@/components/ui/sonner"
import { FloatingTooltipProvider } from "@/components/unlumen-ui/floating-tooltip"

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublicPage = pathname === '/login' || pathname === '/signup'

  if (isPublicPage) {
    return (
      <>
        {children}
        <Toaster />
      </>
    )
  }

  return (
    <FloatingTooltipProvider>
      <div className="flex flex-col md:flex-row flex-1 min-h-screen min-w-0 max-w-full overflow-x-hidden">
        <Navigation />
        <main className="flex-1 min-w-0 max-w-full md:pl-64 p-3 sm:p-6 md:p-12 pb-24 md:pb-12 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
        <Toaster />
      </div>
    </FloatingTooltipProvider>
  )
}
