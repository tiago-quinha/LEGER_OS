"use client"

import React, { useEffect } from "react"
import { useSystem } from "@/lib/SystemContext"
import { useRouter, usePathname } from "next/navigation"
import { Cpu, Brain } from "lucide-react"

export function SystemGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useSystem()
  const router = useRouter()
  const pathname = usePathname()

  const isPublicPage = pathname === '/login' || pathname === '/signup'

  useEffect(() => {
    if (!isLoading && !user && !isPublicPage) {
      router.push('/login')
    }
  }, [user, isLoading, isPublicPage, router])

  // Optimize hydration behavior: check if a session token exists in local storage
  // to avoid flashing the boot screen for already-logged-in users.
  const [hasToken, setHasToken] = React.useState<boolean>(true)

  useEffect(() => {
    try {
      const hasLocalToken = Object.keys(localStorage).some(
        key => key.startsWith("sb-") && key.endsWith("-auth-token")
      )
      const hasCookieToken = document.cookie.split(";").some(
        c => c.trim().startsWith("sb-")
      )
      if (!hasLocalToken && !hasCookieToken) {
        setHasToken(false)
      }
    } catch (e) {
      // Fallback if storage/cookies are blocked
      setHasToken(false)
    }
  }, [])

  if (isLoading && !isPublicPage && !hasToken) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-[9999] space-y-8">
        <div className="relative flex items-center justify-center w-16 h-16">
           <Cpu className="h-12 w-12 text-foreground animate-spin-slow opacity-20 absolute" />
           <Brain className="h-12 w-12 text-foreground animate-pulse absolute" />
        </div>
        <p className="technical-label animate-pulse tracking-[0.3em] uppercase text-[10px]">Booting LEGER_OS // Session_Init</p>
      </div>
    )
  }

  return <>{children}</>
}
