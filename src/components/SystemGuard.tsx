"use client"

import React, { useEffect } from "react"
import { useSystem } from "@/lib/SystemContext"
import { useRouter, usePathname } from "next/navigation"

export function SystemGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useSystem()
  const router = useRouter()
  const pathname = usePathname()

  const isPublicPage = 
    pathname === '/login' || 
    pathname === '/signup' || 
    pathname?.startsWith('/shortcuts') || 
    pathname === '/terms' || 
    pathname === '/privacy'

  useEffect(() => {
    if (!isLoading && !user && !isPublicPage) {
      router.push('/login')
    }
  }, [user, isLoading, isPublicPage, router])

  // Allow route-specific skeletons and page content to mount instantly
  // while Supabase verifies the session in the background
  return <>{children}</>
}
