"use client"

import React, { useState } from "react"
import { 
  Smartphone, Download, ShieldCheck, Check, Sparkles, 
  Layers, Copy, ExternalLink, ArrowRight, Bell, Terminal, RefreshCw
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tilt } from "@/components/unlumen-ui/tilt"
import { ClippedCircle } from "@/components/unlumen-ui/clipped-circle"
import { toast } from "sonner"

function AndroidIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="currentColor"
    >
      <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4483.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5802 8.4111 13.8402 8 12 8s-3.5802.4111-5.1368 1.0504L4.841 5.5474a.416.416 0 00-.5676-.1521.416.416 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867 0 14.887 0 19.2h24c0-4.313-2.6889-8.0133-6.1185-9.8786" />
    </svg>
  )
}

export function DownloadView() {
  const [isDownloading, setIsDownloading] = useState(false)
  const apkDownloadUrl = "/downloads/leger-os.apk"

  const handleCopyLink = () => {
    const fullUrl = typeof window !== "undefined" ? `${window.location.origin}${apkDownloadUrl}` : apkDownloadUrl
    navigator.clipboard.writeText(fullUrl)
    toast.success("Direct APK download link copied to clipboard!")
  }

  const handleDownloadClick = () => {
    setIsDownloading(true)
    toast.success("Starting LEGER_OS Android APK download...")
    setTimeout(() => setIsDownloading(false), 2000)
  }

  return (
    <div className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-10 md:space-y-12 pb-36 md:pb-8 w-full">
      {/* Header Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-3 text-[9px] md:text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
          <AndroidIcon className="h-3.5 w-3.5 text-emerald-500" />
          <span>Mobile Client Distribution // Native Node</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase leading-none break-words font-sans">
          Download LEGER_OS Android
        </h1>
        <p className="text-sm font-mono text-muted-foreground max-w-3xl">
          Deploy the high-precision LEGER_OS Android APK directly to your device for autonomous real-time bank push notification ingestion, instant expense categorization, and background projection telemetry.
        </p>
      </div>

      {/* Hero Download Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8 p-6 md:p-8 bg-card/40 border border-border ledger-border relative overflow-hidden flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-foreground text-background flex items-center justify-center font-mono font-black text-sm">
                  APK
                </div>
                <div>
                  <h2 className="text-lg font-mono font-bold uppercase tracking-tight text-foreground">
                    LEGER_OS Android APK
                  </h2>
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">
                    Version 1.2.0 · Universal ARM64/x86_64 · Android 8.0+
                  </span>
                </div>
              </div>
              <span className="text-[9px] font-mono uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 px-2.5 py-1 font-bold">
                Production Release
              </span>
            </div>

            <p className="text-xs md:text-sm text-foreground/85 leading-relaxed font-sans">
              The native Android application intercepts bank push notifications from MB WAY, Santander, Revolut, Caixa Geral de Depósitos, Millennium BCP, and 100+ European financial institutions with zero bank password requirements.
            </p>

            {/* Badges / Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 bg-secondary/30 border border-border space-y-0.5">
                <span className="text-[9px] font-mono text-muted-foreground uppercase font-bold block">Size</span>
                <span className="text-xs font-mono font-bold text-foreground">~9.8 MB</span>
              </div>
              <div className="p-3 bg-secondary/30 border border-border space-y-0.5">
                <span className="text-[9px] font-mono text-muted-foreground uppercase font-bold block">Security</span>
                <span className="text-xs font-mono font-bold text-foreground">256-Bit SSL</span>
              </div>
              <div className="p-3 bg-secondary/30 border border-border space-y-0.5 col-span-2 sm:col-span-1">
                <span className="text-[9px] font-mono text-muted-foreground uppercase font-bold block">Telemetry</span>
                <span className="text-xs font-mono font-bold text-emerald-400">Autonomous Sync</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-border/50">
            <a
              href={apkDownloadUrl}
              download="leger-os.apk"
              onClick={handleDownloadClick}
              className="w-full sm:w-auto flex-1 h-12 bg-foreground text-background hover:bg-foreground/90 font-mono text-xs uppercase font-extrabold tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-md cursor-pointer"
            >
              <Download className="h-4 w-4 stroke-[2.5]" />
              <span>{isDownloading ? "Downloading APK..." : "Download Android APK (.apk)"}</span>
            </a>

            <Button
              type="button"
              variant="outline"
              onClick={handleCopyLink}
              className="w-full sm:w-auto h-12 rounded-none border-border bg-card hover:bg-secondary/40 font-mono text-xs uppercase font-bold tracking-wider flex items-center justify-center gap-2 cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Copy Link</span>
            </Button>
          </div>
        </div>

        {/* Security & System Specs */}
        <div className="lg:col-span-4 p-6 md:p-8 bg-card/20 border border-border relative overflow-hidden flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <span className="technical-label text-[9px] border-b border-dotted border-muted-foreground/30 w-fit">
              Security Specifications
            </span>
            <div className="space-y-2 text-xs font-mono text-muted-foreground">
              <div className="flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Zero Storage of Bank Credentials or Login Tokens</span>
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Runs On-Device Memory Notification Filtering</span>
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>Personal chats, SMS & 2FA codes are 100% ignored</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-secondary/20 border border-border/80 space-y-1 font-mono text-[9px]">
            <span className="text-muted-foreground uppercase font-bold block">Package Name:</span>
            <span className="text-foreground break-all">com.legeros.app</span>
            <span className="text-muted-foreground uppercase font-bold block pt-1">Build Target:</span>
            <span className="text-foreground">Android SDK 35 (Android 15 Ready)</span>
          </div>
        </div>
      </div>

      {/* Feature Highlights Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <Tilt rotationFactor={6} className="p-6 md:p-8 space-y-3 bg-card/20 border border-border relative group overflow-hidden flex flex-col justify-between glow-card">
          <div className="space-y-2 z-10">
            <div className="w-8 h-8 rounded-none bg-secondary border border-border flex items-center justify-center text-foreground mb-3">
              <Smartphone className="h-4 w-4" />
            </div>
            <span className="technical-label text-[9px] border-b border-dotted border-muted-foreground/30 w-fit">
              Autonomous Ingestion
            </span>
            <h3 className="text-lg font-mono font-bold uppercase tracking-tight text-foreground">
              Real-Time Push Capture
            </h3>
            <p className="text-xs font-sans text-muted-foreground leading-relaxed">
              Interceps debit and payment notifications instantly as you tap your card or send an MB WAY, auto-parsing merchant and amount.
            </p>
          </div>
          <ClippedCircle circleClassName="bg-foreground/5" circleSize={300} />
        </Tilt>

        <Tilt rotationFactor={6} className="p-6 md:p-8 space-y-3 bg-card/20 border border-border relative group overflow-hidden flex flex-col justify-between glow-card">
          <div className="space-y-2 z-10">
            <div className="w-8 h-8 rounded-none bg-secondary border border-border flex items-center justify-center text-foreground mb-3">
              <Bell className="h-4 w-4" />
            </div>
            <span className="technical-label text-[9px] border-b border-dotted border-muted-foreground/30 w-fit">
              Telemetry Dispatch
            </span>
            <h3 className="text-lg font-mono font-bold uppercase tracking-tight text-foreground">
              Daily Morning & Evening Briefs
            </h3>
            <p className="text-xs font-sans text-muted-foreground leading-relaxed">
              Receives daily 08:30 AM morning variable spending outlooks and 21:30 evening market portfolio wraps directly on your lock screen.
            </p>
          </div>
          <ClippedCircle circleClassName="bg-foreground/5" circleSize={300} />
        </Tilt>

        <Tilt rotationFactor={6} className="p-6 md:p-8 space-y-3 bg-card/20 border border-border relative group overflow-hidden flex flex-col justify-between glow-card">
          <div className="space-y-2 z-10">
            <div className="w-8 h-8 rounded-none bg-secondary border border-border flex items-center justify-center text-foreground mb-3">
              <RefreshCw className="h-4 w-4" />
            </div>
            <span className="technical-label text-[9px] border-b border-dotted border-muted-foreground/30 w-fit">
              Zero Maintenance
            </span>
            <h3 className="text-lg font-mono font-bold uppercase tracking-tight text-foreground">
              Self-Annealing Projection
            </h3>
            <p className="text-xs font-sans text-muted-foreground leading-relaxed">
              Every captured transaction recalibrates your active cycle's recency decay burn curve without manual CSV uploads.
            </p>
          </div>
          <ClippedCircle circleClassName="bg-foreground/5" circleSize={300} />
        </Tilt>
      </div>

      {/* Installation Instructions */}
      <div className="p-6 md:p-8 bg-card/30 border border-border space-y-6">
        <div className="space-y-1">
          <span className="technical-label text-[9px] border-b border-dotted border-muted-foreground/30 w-fit">
            Installation Walkthrough
          </span>
          <h2 className="text-xl font-mono font-bold uppercase tracking-tight text-foreground">
            3-Step Android Installation Guide
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          <div className="p-4 bg-secondary/20 border border-border space-y-2">
            <span className="text-emerald-500 font-bold uppercase text-[10px]">01 // Download</span>
            <p className="font-bold text-foreground">Download APK</p>
            <p className="text-[11px] font-sans text-muted-foreground leading-relaxed">
              Tap the download button above. If Chrome prompts "File might be harmful", select <strong className="text-foreground">Download anyway</strong>.
            </p>
          </div>

          <div className="p-4 bg-secondary/20 border border-border space-y-2">
            <span className="text-emerald-500 font-bold uppercase text-[10px]">02 // Install</span>
            <p className="font-bold text-foreground">Enable Unknown Apps</p>
            <p className="text-[11px] font-sans text-muted-foreground leading-relaxed">
              Open the downloaded file and enable <strong className="text-foreground">Allow from this source</strong> in your browser security settings, then tap <strong className="text-foreground">Install</strong>.
            </p>
          </div>

          <div className="p-4 bg-secondary/20 border border-border space-y-2">
            <span className="text-emerald-500 font-bold uppercase text-[10px]">03 // Connect</span>
            <p className="font-bold text-foreground">Grant Notification Access</p>
            <p className="text-[11px] font-sans text-muted-foreground leading-relaxed">
              Launch LEGER_OS, log in, and grant <strong className="text-foreground">Notification Access</strong> in System Settings so the listener can capture bank push notifications.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
