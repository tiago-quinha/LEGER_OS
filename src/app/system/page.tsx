"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSystem } from "@/lib/SystemContext"

export default function SystemRedirectPage() {
  const router = useRouter()
  const { setSettingsOpen } = useSystem()

  useEffect(() => {
    setSettingsOpen(true)
    router.replace("/")
  }, [router, setSettingsOpen])

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center font-mono text-xs text-muted-foreground space-y-2">
      <div className="h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      <p className="uppercase tracking-widest text-[10px]">Opening System Settings...</p>
    </div>
  )
}
