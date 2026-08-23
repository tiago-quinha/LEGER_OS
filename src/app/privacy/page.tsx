"use client"

import React from "react"
import Link from "next/link"
import { Landmark, ShieldCheck, Lock, EyeOff, CheckCircle2, Database, KeyRound, ArrowRight } from "lucide-react"

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-foreground selection:text-background">
      {/* Top Header */}
      <header className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1500px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 bg-foreground flex items-center justify-center ledger-border rotate-45 shrink-0 transition-transform group-hover:scale-105">
              <Landmark className="h-4 w-4 text-background -rotate-45" />
            </div>
            <div>
              <span className="text-sm font-bold uppercase tracking-tighter block leading-none">LEGER_OS</span>
              <span className="text-[8px] font-mono text-muted-foreground uppercase tracking-widest block mt-0.5">Privacy & GDPR</span>
            </div>
          </Link>

          <div className="flex items-center gap-3 font-mono text-xs">
            <Link
              href="/terms"
              className="px-3 py-1.5 text-muted-foreground hover:text-foreground uppercase text-[11px] font-bold transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 bg-foreground text-background hover:bg-foreground/90 uppercase text-[11px] font-bold tracking-wider transition-colors"
            >
              Launch Mainframe →
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-10 md:space-y-12 pb-36 md:pb-16 w-full">
        {/* Page Header */}
        <div className="space-y-3 max-w-4xl">
          <div className="flex items-center gap-3 text-[9px] md:text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-foreground" />
            <span>GDPR & Privacy Architecture</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase leading-none break-words">
            Privacy Policy
          </h1>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Last Updated: August 2026 · Compliant with EU GDPR (Regulation 2016/679) & CCPA/CPRA
          </p>
        </div>

        {/* Security Guarantee Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          <div className="p-6 bg-card/40 border border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="technical-label text-[9px] border-b border-dotted border-muted-foreground/30">
                CREDENTIAL PRIVACY
              </span>
              <KeyRound className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-foreground">
              0 BANK PASSWORDS
            </div>
            <p className="text-xs text-muted-foreground font-sans leading-relaxed">
              We never ask for, collect, or store your online banking credentials, passwords, or PINs.
            </p>
          </div>

          <div className="p-6 bg-card/40 border border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="technical-label text-[9px] border-b border-dotted border-muted-foreground/30">
                CIPHER STANDARD
              </span>
              <Lock className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-foreground">
              256-BIT SSL / TLS
            </div>
            <p className="text-xs text-muted-foreground font-sans leading-relaxed">
              All financial transactions and telemetry data are encrypted in transit and isolated with PostgreSQL RLS.
            </p>
          </div>

          <div className="p-6 bg-card/40 border border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="technical-label text-[9px] border-b border-dotted border-muted-foreground/30">
                DATA SOVEREIGNTY
              </span>
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-foreground">
              ZERO DATA BROKERS
            </div>
            <p className="text-xs text-muted-foreground font-sans leading-relaxed">
              Your financial logs are strictly private. We never monetize, sell, or license user telemetry to advertisers.
            </p>
          </div>
        </div>

        {/* Content Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Main Privacy Text */}
          <div className="lg:col-span-8 space-y-8 font-sans text-xs sm:text-sm leading-relaxed text-muted-foreground">
            {/* Section 1 */}
            <section className="space-y-3 p-6 bg-card/30 border border-border/70">
              <h2 className="text-base sm:text-lg font-bold uppercase tracking-tight text-foreground flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">01.</span> Data We Collect & How We Obtain It
              </h2>
              <p>
                We only collect data necessary to provide and calibrate personal finance projections on your behalf:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs">
                <li><strong>Account Identifiers:</strong> Email address, optional profile name, and encrypted authentication tokens managed through Supabase Auth.</li>
                <li><strong>Ledger & Transaction Data:</strong> Transaction dates, merchant names, signed numerical amounts, category assignments, and optional raw descriptions extracted from your uploaded files (PDF/TXT) or device push webhooks.</li>
                <li><strong>Portfolio Valuation Data:</strong> Asset symbols, asset classes, quantities, unit buy prices, and historical valuation snapshots for net worth tracking.</li>
                <li><strong>System Preferences:</strong> Preferred currency (EUR, USD, GBP), language, notification schedules, and custom AI provider configurations.</li>
              </ul>
            </section>

            {/* Section 2 */}
            <section className="space-y-3 p-6 bg-card/30 border border-border/70">
              <h2 className="text-base sm:text-lg font-bold uppercase tracking-tight text-foreground flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">02.</span> Legal Bases for Processing under GDPR (Article 6)
              </h2>
              <p>
                We process your personal data under the following GDPR legal bases:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs">
                <li><strong>Contractual Performance (Art. 6(1)(b)):</strong> Processing transactions and calculating paycheck cycle burn rates to deliver the core service you requested.</li>
                <li><strong>Legitimate Interests (Art. 6(1)(f)):</strong> Maintaining server security, diagnosing crash reports, and preventing brute-force abuse.</li>
                <li><strong>Consent (Art. 6(1)(a)):</strong> Delivering opt-in push notifications and executing automated AI transaction parsing.</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="space-y-3 p-6 bg-card/30 border border-border/70">
              <h2 className="text-base sm:text-lg font-bold uppercase tracking-tight text-foreground flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">03.</span> AI Ingestion & Multi-Provider Architecture
              </h2>
              <p>
                When you use AI statement extraction or conversational assistant queries, payload snippets (e.g. statement lines) are processed through your selected AI engine (Google Gemini, OpenAI, Groq, or local Ollama).
              </p>
              <p>
                <strong>Personal API Key Option:</strong> Users configuring a custom API key route queries directly under their personal provider contract. Your prompt data is never used to train global public foundational models without your explicit opt-in.
              </p>
            </section>

            {/* Section 4 */}
            <section className="space-y-3 p-6 bg-card/30 border border-border/70">
              <h2 className="text-base sm:text-lg font-bold uppercase tracking-tight text-foreground flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">04.</span> Payment Processing (Stripe)
              </h2>
              <p>
                All subscription billing is executed directly via Stripe Elements. Payment data (credit card numbers, bank routing numbers) is transmitted directly to Stripe under PCI-DSS Level 1 compliance. LEGER_OS only stores a customer reference ID (<code className="font-mono text-xs bg-secondary px-1 py-0.5">stripe_customer_id</code>) and active subscription status.
              </p>
            </section>

            {/* Section 5 */}
            <section className="space-y-3 p-6 bg-card/30 border border-border/70">
              <h2 className="text-base sm:text-lg font-bold uppercase tracking-tight text-foreground flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">05.</span> Your GDPR Rights (Articles 15, 17, 20)
              </h2>
              <p>
                Under EU Regulation 2016/679 and applicable global privacy legislation, you have absolute control over your personal records:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs">
                <li><strong>Right of Access & Portability (Arts. 15 & 20):</strong> Export your complete financial mainframe in JSON or CSV at any time via <em>System Settings &gt; Sovereign Vault Export</em>.</li>
                <li><strong>Right to Erasure (Art. 17):</strong> Permanently cascade-delete your account and all associated transactions, portfolios, and balance snapshots via <em>System Settings &gt; Purge All Data</em>.</li>
                <li><strong>Right to Rectification (Art. 16):</strong> Edit or correct any logged expense, budget limit, or category assignment directly in the Ledger.</li>
              </ul>
            </section>

            {/* Section 6 */}
            <section className="space-y-3 p-6 bg-card/30 border border-border/70">
              <h2 className="text-base sm:text-lg font-bold uppercase tracking-tight text-foreground flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">06.</span> Security, Storage & Data Retention
              </h2>
              <p>
                Data is hosted in isolated PostgreSQL database instances with Row Level Security (RLS) policies guaranteeing that authenticated tenants can only access records matching their verified <code className="font-mono text-xs bg-secondary px-1 py-0.5">auth.uid()</code>.
              </p>
              <p>
                When an account is deleted, all records are permanently deleted from database tables immediately.
              </p>
            </section>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className="p-6 bg-card border border-border space-y-4 font-mono text-xs">
              <span className="technical-label text-[9px] border-b border-dotted border-muted-foreground/30 w-fit">
                DATA PRIVACY CONTROLS
              </span>

              <div className="space-y-3 text-muted-foreground text-[11px]">
                <div className="flex items-start gap-2">
                  <Database className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>1-Click Export:</strong> Download all records in JSON or CSV at any time.</span>
                </div>
                <div className="flex items-start gap-2">
                  <EyeOff className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Privacy Mode:</strong> Built-in UI toggle masks balances in public.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Lock className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Instant Erasure:</strong> One-tap complete GDPR account wipeout.</span>
                </div>
              </div>

              <div className="pt-4 border-t border-border/60">
                <Link
                  href="/terms"
                  className="w-full py-2.5 px-4 bg-secondary hover:bg-secondary/80 text-foreground text-center font-bold uppercase tracking-wider block transition-colors border border-border"
                >
                  Read Terms of Service →
                </Link>
              </div>
            </div>

            <div className="p-6 bg-card/20 border border-border space-y-2 text-[11px] font-mono text-muted-foreground">
              <span className="text-foreground font-bold uppercase text-xs block">Data Protection Officer</span>
              <p>To exercise your statutory data rights or submit inquiries to our DPO, contact dpo@leger-os.com.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
