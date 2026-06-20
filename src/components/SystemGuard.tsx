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

  if (isLoading && !isPublicPage) {
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
