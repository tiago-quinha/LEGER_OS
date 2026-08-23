"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { 
  Apple, Smartphone, Zap, ShieldCheck, ArrowRight, Copy, Check, 
  Terminal, Sparkles, ExternalLink, Cpu, ChevronRight, Play, RefreshCw, Landmark
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tilt } from "@/components/unlumen-ui/tilt"
import { ClippedCircle } from "@/components/unlumen-ui/clipped-circle"
import Link from "next/link"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function ApplePayShortcutsPage() {
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<"setup" | "simulator" | "schema">("setup")
  const [simStep, setSimStep] = useState<0 | 1 | 2>(0)
  const [isSimulating, setIsSimulating] = useState(false)

  const sampleEndpoint = "https://leger-os.vercel.app/api/transactions/device-push?userId=YOUR_USER_ID"

  const copyEndpoint = () => {
    navigator.clipboard.writeText(sampleEndpoint)
    setCopied(true)
    toast.success("Webhook endpoint template copied!")
    setTimeout(() => setCopied(false), 2000)
  }

  const runSimulation = () => {
    setIsSimulating(true)
    setSimStep(0)
    setTimeout(() => setSimStep(1), 600)
    setTimeout(() => {
      setSimStep(2)
      setIsSimulating(false)
    }, 1400)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Public Navigation Bar */}
      <header className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1500px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 bg-foreground flex items-center justify-center ledger-border rotate-45 shrink-0 transition-transform group-hover:scale-105">
              <Landmark className="h-4 w-4 text-background -rotate-45" />
            </div>
            <div>
              <span className="text-sm font-bold uppercase tracking-tighter block leading-none">LEGER_OS</span>
              <span className="text-[8px] font-mono text-muted-foreground uppercase tracking-widest block mt-0.5">Shortcuts Gateway</span>
            </div>
          </Link>

          <div className="flex items-center gap-3 font-mono text-xs">
            <Link
              href="/login"
              className="px-3 py-1.5 text-muted-foreground hover:text-foreground uppercase text-[11px] font-bold transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 bg-foreground text-background hover:bg-foreground/90 uppercase text-[11px] font-bold tracking-wider transition-colors shadow-xs"
            >
              Launch Mainframe →
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container normalized to standard padding */}
      <main className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-10 md:space-y-12 pb-36 md:pb-12 w-full">
        {/* Subpage Header (Strict Subpage UI Invariant #13) */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-[9px] md:text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
            <Apple className="h-3.5 w-3.5 text-foreground" />
            <span>Shortcuts & Automation Integration</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase leading-none break-words">
            Apple Pay Real-Time Ingestion
          </h1>
          <p className="text-sm md:text-base text-muted-foreground font-sans max-w-3xl leading-relaxed">
            Eliminate fragile Open Banking aggregators and manual expense logging. Connect Apple Wallet with zero credentials to stream card transactions into your paycheck cycle in real time.
          </p>
        </div>

        {/* Executive Metric Cards (Strict Subpage UI Invariant #13) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          <Tilt rotationFactor={6} className="p-6 md:p-8 space-y-3 bg-card/20 border border-border relative group overflow-hidden flex flex-col justify-between glow-card">
            <span className="technical-label text-[9px] border-b border-dotted border-muted-foreground/30 w-fit z-10">
              AGGREGATOR-FREE
            </span>
            <div className="text-3xl md:text-5xl font-mono font-bold tracking-tighter z-10 text-foreground">
              0 CREDENTIALS
            </div>
            <p className="text-xs text-muted-foreground font-sans z-10 leading-relaxed">
              Never share bank usernames or passwords with third-party data aggregators.
            </p>
            <ClippedCircle circleClassName="bg-foreground/5" circleSize={400} />
          </Tilt>

          <Tilt rotationFactor={6} className="p-6 md:p-8 space-y-3 bg-card/20 border border-border relative group overflow-hidden flex flex-col justify-between glow-card">
            <span className="technical-label text-[9px] border-b border-dotted border-muted-foreground/30 w-fit z-10">
              DISPATCH LATENCY
            </span>
            <div className="text-3xl md:text-5xl font-mono font-bold tracking-tighter z-10 text-foreground">
              &lt; 180 MS
            </div>
            <p className="text-xs text-muted-foreground font-sans z-10 leading-relaxed">
              Apple Wallet triggers on tap, updating your safe daily burn before your receipt prints.
            </p>
            <ClippedCircle circleClassName="bg-foreground/5" circleSize={400} />
          </Tilt>

          <Tilt rotationFactor={6} className="p-6 md:p-8 space-y-3 bg-card/20 border border-border relative group overflow-hidden flex flex-col justify-between glow-card">
            <span className="technical-label text-[9px] border-b border-dotted border-muted-foreground/30 w-fit z-10">
              MODEL GROUNDING
            </span>
            <div className="text-3xl md:text-5xl font-mono font-bold tracking-tighter z-10 text-foreground">
              λ = 0.12 DECAY
            </div>
            <p className="text-xs text-muted-foreground font-sans z-10 leading-relaxed">
              Transactions instantly recalculate your paycheck forecast using recency-weighted decay.
            </p>
            <ClippedCircle circleClassName="bg-foreground/5" circleSize={400} />
          </Tilt>
        </div>

        {/* Tab Controls (Strict Subpage UI Invariant #13) */}
        <div className="space-y-6">
          <div className="flex border border-border bg-card/20 text-xs font-mono w-fit overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveTab("setup")}
              className={cn(
                "px-5 py-3 uppercase tracking-wider font-bold transition-colors cursor-pointer select-none whitespace-nowrap",
                activeTab === "setup"
                  ? "bg-secondary text-foreground border-b-2 border-b-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              1. Step-by-Step Setup
            </button>
            <button
              onClick={() => setActiveTab("simulator")}
              className={cn(
                "px-5 py-3 uppercase tracking-wider font-bold transition-colors cursor-pointer select-none whitespace-nowrap",
                activeTab === "simulator"
                  ? "bg-secondary text-foreground border-b-2 border-b-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              2. Interactive Simulation
            </button>
            <button
              onClick={() => setActiveTab("schema")}
              className={cn(
                "px-5 py-3 uppercase tracking-wider font-bold transition-colors cursor-pointer select-none whitespace-nowrap",
                activeTab === "schema"
                  ? "bg-secondary text-foreground border-b-2 border-b-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              3. Webhook Schema
            </button>
          </div>

          {/* TAB 1: STEP BY STEP SETUP */}
          {activeTab === "setup" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-card/40 border border-border space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase bg-secondary px-2 py-0.5 border border-border font-bold">
                      Step 01
                    </span>
                    <Apple className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <h3 className="text-base font-bold uppercase tracking-tight text-foreground">
                    Open Apple Shortcuts
                  </h3>
                  <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                    On your iPhone (iOS 17+), open the <strong>Shortcuts</strong> app. Tap the <strong>Automation</strong> tab at the bottom, then tap the <strong>+</strong> button in the top right.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        window.location.href = "shortcuts://"
                      }
                    }}
                    className="w-full mt-2 py-2 px-3 bg-foreground text-background text-[10px] font-mono uppercase font-bold tracking-wider hover:bg-foreground/90 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Apple className="h-3 w-3" />
                    <span>Open Shortcuts App</span>
                  </button>
                </div>
                <div className="p-3 bg-secondary/20 border border-border/60 text-[10px] font-mono text-muted-foreground">
                  Trigger: Transaction → Card: Any
                </div>
              </div>

              <div className="p-6 bg-card/40 border border-border space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase bg-secondary px-2 py-0.5 border border-border font-bold">
                      Step 02
                    </span>
                    <Zap className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <h3 className="text-base font-bold uppercase tracking-tight text-foreground">
                    Select Run Immediately
                  </h3>
                  <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                    Choose <strong>Transaction</strong> as the trigger. Select <strong>Any Card</strong>, and make sure to toggle <strong>Run Immediately</strong> and disable "Notify When Run" for zero friction.
                  </p>
                </div>
                <div className="p-3 bg-secondary/20 border border-border/60 text-[10px] font-mono text-muted-foreground">
                  Mode: Zero-touch background execution
                </div>
              </div>

              <div className="p-6 bg-card/40 border border-border space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase bg-secondary px-2 py-0.5 border border-border font-bold">
                      Step 03
                    </span>
                    <Terminal className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <h3 className="text-base font-bold uppercase tracking-tight text-foreground">
                    POST to LEGER_OS
                  </h3>
                  <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                    Add the <strong>Get Contents of URL</strong> action. Set Method to <strong>POST</strong>, paste your private webhook endpoint, and pass <strong>Shortcut Input</strong> in the body.
                  </p>
                </div>
                <div className="p-3 bg-secondary/20 border border-border/60 text-[10px] font-mono text-muted-foreground flex items-center justify-between">
                  <span>Method: POST</span>
                  <span className="text-emerald-500 font-bold">SSL 256-BIT</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INTERACTIVE SIMULATION */}
          {activeTab === "simulator" && (
            <div className="p-6 md:p-8 bg-card/40 border border-border space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
                <div>
                  <h3 className="text-lg font-bold uppercase tracking-tight text-foreground">
                    Live Point-of-Sale Simulation
                  </h3>
                  <p className="text-xs text-muted-foreground font-sans">
                    Simulate an in-person Apple Pay transaction and watch real-time stream ingestion.
                  </p>
                </div>
                <Button
                  onClick={runSimulation}
                  disabled={isSimulating}
                  className="rounded-none uppercase font-mono text-xs tracking-wider h-11 px-6 bg-foreground text-background hover:bg-foreground/90 cursor-pointer flex items-center gap-2 font-bold shadow-sm"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>{isSimulating ? "Processing Tap..." : "Simulate Apple Pay Tap (€24.50)"}</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                {/* Step 1: Device Tap */}
                <div className={cn("p-4 border transition-all space-y-2", simStep >= 0 ? "bg-card border-foreground/60" : "bg-card/20 border-border/40 opacity-40")}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">1. Wallet Broadcast</span>
                    <Apple className="h-4 w-4 text-foreground" />
                  </div>
                  <div className="text-foreground font-bold text-sm">
                    Apple Pay Tap Executed
                  </div>
                  <div className="text-[10px] text-muted-foreground space-y-1">
                    <p>Merchant: Blue Bottle Coffee</p>
                    <p>Amount: -€24.50 (EUR)</p>
                    <p>Token: Visa Contactless</p>
                  </div>
                </div>

                {/* Step 2: Mainframe Ingestion */}
                <div className={cn("p-4 border transition-all space-y-2", simStep >= 1 ? "bg-card border-foreground/60" : "bg-card/20 border-border/40 opacity-40")}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">2. Node Ingestion</span>
                    <Zap className="h-4 w-4 text-foreground" />
                  </div>
                  <div className="text-foreground font-bold text-sm">
                    {simStep >= 1 ? "Webhook Ingested (14ms)" : "Awaiting Packet..."}
                  </div>
                  <div className="text-[10px] text-muted-foreground space-y-1">
                    <p>Category: Dining & Food</p>
                    <p>Rule: Auto-Categorized</p>
                    <p>Dedup: Verified Unique</p>
                  </div>
                </div>

                {/* Step 3: Burn Recalibration */}
                <div className={cn("p-4 border transition-all space-y-2", simStep >= 2 ? "bg-card border-emerald-500/80 shadow-xs" : "bg-card/20 border-border/40 opacity-40")}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-emerald-500">3. Burn Recalibration</span>
                    <Sparkles className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div className="text-foreground font-bold text-sm">
                    {simStep >= 2 ? "Safe Daily Burn: €38.20" : "Awaiting Delta..."}
                  </div>
                  <div className="text-[10px] text-muted-foreground space-y-1">
                    <p>Decay Factor: λ = 0.12</p>
                    <p>Cycle Delta: -€24.50</p>
                    <p className="text-emerald-500 font-bold">Push Sent to Watch / Phone</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: WEBHOOK SCHEMA */}
          {activeTab === "schema" && (
            <div className="p-6 md:p-8 bg-card/40 border border-border space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold uppercase tracking-tight text-foreground">
                  Payload Specification
                </span>
                <button
                  type="button"
                  onClick={copyEndpoint}
                  className="text-[10px] uppercase hover:text-foreground text-muted-foreground flex items-center gap-1 cursor-pointer"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copied" : "Copy Template"}
                </button>
              </div>

              <div className="p-4 bg-background border border-border overflow-x-auto text-[11px] text-muted-foreground leading-relaxed">
                <pre>{`// HTTP POST: https://leger-os.vercel.app/api/transactions/device-push?userId=YOUR_USER_ID
// Headers: Content-Type: application/json

{
  "amount": -24.50,
  "merchant": "Blue Bottle Coffee",
  "bank_app": "Apple Pay",
  "source": "apple-shortcuts",
  "raw_text": "Payment of €24.50 to Blue Bottle Coffee via Apple Pay",
  "date": "${new Date().toISOString()}"
}`}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Banner Call to Action */}
        <div className="p-8 md:p-12 bg-card border border-border relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
          <div className="space-y-2 z-10 text-center md:text-left">
            <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-tight text-foreground">
              Ready to automate your personal finance?
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground font-sans max-w-xl">
              Initialize your LEGER_OS node in 45 seconds. Core Base Tier is 100% free with unlimited manual tracking and CSV exports.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 z-10 w-full md:w-auto">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-8 py-4 bg-foreground text-background hover:bg-foreground/90 uppercase font-mono text-xs font-bold tracking-widest transition-colors text-center shadow-lg"
            >
              Get Started Free →
            </Link>
          </div>

          <ClippedCircle circleClassName="bg-foreground/5" circleSize={600} />
        </div>
      </main>
    </div>
  )
}
