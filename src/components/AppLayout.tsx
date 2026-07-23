"use client"

import React from "react"
import { usePathname } from "next/navigation"
import { Navigation } from "@/components/Navigation"
import { Toaster } from "@/components/ui/sonner"
import { FloatingTooltipProvider } from "@/components/unlumen-ui/floating-tooltip"
import { LegerAIAssistant } from "@/components/LegerAIAssistant"

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
      <div className="flex flex-col md:flex-row flex-1 h-dvh md:h-screen overflow-hidden min-w-0 max-w-full relative">
        <Navigation />
        <main className="flex-1 min-w-0 max-w-full md:pl-64 p-3 sm:p-6 md:p-12 h-[calc(100dvh-64px)] md:h-full pb-6 md:pb-12 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
        <Toaster />
        <LegerAIAssistant />
      </div>
    </FloatingTooltipProvider>
  )
}
