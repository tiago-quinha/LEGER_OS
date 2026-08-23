"use client"

import React, { Suspense } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { Navigation } from "@/components/Navigation"
import { Toaster } from "@/components/ui/sonner"
import { FloatingTooltipProvider } from "@/components/unlumen-ui/floating-tooltip"
import { LegerAIAssistant } from "@/components/LegerAIAssistant"
import { useSystem } from "@/lib/SystemContext"
import { cn } from "@/lib/utils"

function LayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { profile, isSidebarCollapsed } = useSystem()

  const isPublicPage = 
    pathname === '/login' || 
    pathname === '/signup' || 
    pathname?.startsWith('/shortcuts') || 
    pathname === '/terms' || 
    pathname === '/privacy'
  const isOnboarding = searchParams.get('onboarding') === 'true' || 
                       searchParams.get('force_onboarding') === 'true' || 
                       (pathname === '/' && profile && profile.onboarding_completed === false)

  if (isPublicPage || isOnboarding) {
    return (
      <main id="main-content" className="w-full min-h-screen h-auto overflow-y-auto bg-background">
        {children}
        <Toaster />
      </main>
    )
  }

  return (
    <FloatingTooltipProvider>
      <div className="flex flex-col md:flex-row flex-1 h-dvh md:h-screen overflow-hidden min-w-0 max-w-full relative">
        <Suspense fallback={<div className="hidden md:flex md:w-64 bg-background border-r border-border shrink-0" />}>
          <Navigation />
        </Suspense>
        <main 
          id="main-content" 
          className={cn(
            "flex-1 min-w-0 max-w-full p-3 sm:p-6 md:p-12 h-[calc(100dvh-64px)] md:h-full pb-36 md:pb-12 overflow-y-auto overflow-x-hidden transition-[padding] duration-300",
            isSidebarCollapsed ? "md:pl-16" : "md:pl-64"
          )}
        >
          {children}
        </main>
        <Toaster />
        <LegerAIAssistant />
      </div>
    </FloatingTooltipProvider>
  )
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LayoutInner>{children}</LayoutInner>
    </Suspense>
  )
}
