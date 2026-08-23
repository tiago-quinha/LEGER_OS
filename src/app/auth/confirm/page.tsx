"use client"

import React, { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ShieldCheck, Terminal, ArrowRight, CheckCircle2 } from "lucide-react"
import { GlowingBadge } from "@/components/unlumen-ui/glowing-badge"
import { MagneticButton } from "@/components/unlumen-ui/magnetic-button"
import Link from "next/link"
import { toast } from "sonner"

export default function AuthConfirmPage() {
  const router = useRouter()

  useEffect(() => {
    toast.success("Welcome to LEGER_OS")
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background relative overflow-hidden">
      {/* Background scanline effect */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background pointer-events-none" />

      <Card className="w-full max-w-md border border-border bg-card/80 backdrop-blur-md shadow-2xl relative z-10 rounded-none overflow-hidden">
        {/* Top technical accent bar */}
        <div className="h-1 w-full bg-emerald-600 dark:bg-emerald-500" />
        
        <CardHeader className="space-y-4 pt-8 pb-6 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
              <Terminal className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              <span>Session Security Protocol</span>
            </div>
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground bg-secondary/80 border border-border px-2 py-0.5">
              Verified
            </span>
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center justify-center p-3 bg-emerald-500/10 border border-emerald-500/30 mb-2">
              <ShieldCheck className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <CardTitle className="text-2xl font-mono font-bold tracking-tight uppercase">
              Account Confirmed
            </CardTitle>
            <CardDescription className="text-xs font-mono text-muted-foreground">
              Your email address has been verified. Your personal financial workspace is synchronized and ready.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-6 pb-8 space-y-6">
          <div className="p-4 bg-secondary/30 border border-border space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <span className="text-muted-foreground">Status:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">Authenticated</span>
            </div>
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <span className="text-muted-foreground">Data Privacy:</span>
              <span className="font-bold">Active</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Workspace:</span>
              <span className="font-bold">Ready</span>
            </div>
          </div>

          <Link href="/" className="block w-full">
            <MagneticButton 
              variant="default" 
              className="w-full rounded-none font-mono text-xs uppercase tracking-widest py-6 bg-foreground text-background hover:opacity-90 transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              Enter LEGER_OS Dashboard
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </MagneticButton>
          </Link>
        </CardContent>
      </Card>

      {/* Footer technical signature */}
      <div className="absolute bottom-6 left-6 font-mono text-[9px] text-muted-foreground uppercase tracking-widest pointer-events-none hidden sm:block">
        Secure Authentication
      </div>
      <div className="absolute bottom-6 right-6 font-mono text-[9px] text-muted-foreground uppercase tracking-widest pointer-events-none hidden sm:block">
        Connected
      </div>
    </div>
  )
}
