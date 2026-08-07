"use client"

import React from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ShieldAlert, ArrowLeft, Sparkles, Sliders, Home, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GlowingBadge } from "@/components/unlumen-ui/glowing-badge"

export default function ForbiddenPage() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center font-mono">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-lg w-full bg-card border border-border p-6 sm:p-10 space-y-6 shadow-2xl relative"
      >
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            <span>SECURITY_GATEKEEPER</span>
          </div>
          <GlowingBadge variant="error" pulse dot className="text-[9px] uppercase">
            HTTP_403_DENIED
          </GlowingBadge>
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tighter uppercase text-destructive">
            403 Forbidden
          </h1>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">
            Access Restricted to Authorized Nodes
          </p>
        </div>

        <p className="text-xs text-muted-foreground font-sans leading-relaxed text-left bg-secondary/20 p-4 border border-border">
          The node or resource you are trying to access requires elevated **LEGER_OS PRO Tier** permissions or an active session key. If you were attempting to use automated bank push sync, neural simulations, or statement parsing, please upgrade your subscription tier below.
        </p>

        <div className="space-y-3 pt-2">
          <Link href="/system?tab=pro" className="block">
            <Button className="w-full h-11 rounded-none bg-emerald-500 hover:bg-emerald-400 text-black font-mono text-xs uppercase font-bold tracking-widest shadow-md transition-all cursor-pointer">
              <Sparkles className="h-4 w-4 mr-2" /> Upgrade to PRO Tier (€4.99/mo)
            </Button>
          </Link>

          <div className="grid grid-cols-2 gap-2">
            <Link href="/" className="w-full">
              <Button variant="outline" className="w-full h-10 rounded-none font-mono text-[10px] uppercase font-bold tracking-widest border-border hover:bg-secondary cursor-pointer">
                <Home className="h-3.5 w-3.5 mr-1.5" /> Dashboard
              </Button>
            </Link>

            <Link href="/system" className="w-full">
              <Button variant="outline" className="w-full h-10 rounded-none font-mono text-[10px] uppercase font-bold tracking-widest border-border hover:bg-secondary cursor-pointer">
                <Sliders className="h-3.5 w-3.5 mr-1.5" /> Settings
              </Button>
            </Link>
          </div>

          <Link href="/login" className="block pt-1">
            <span className="text-[10px] text-muted-foreground hover:text-foreground uppercase tracking-widest underline flex items-center justify-center gap-1 cursor-pointer">
              <LogIn className="h-3 w-3" /> Re-authenticate / Switch Account
            </span>
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
