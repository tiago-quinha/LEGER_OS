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

  return null
}
