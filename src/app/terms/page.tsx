"use client"

import React from "react"
import Link from "next/link"
import { Landmark, ShieldAlert, Scale, CheckCircle2 } from "lucide-react"

export default function TermsOfServicePage() {
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
              <span className="text-[8px] font-mono text-muted-foreground uppercase tracking-widest block mt-0.5">Legal & Compliance</span>
            </div>
          </Link>

          <div className="flex items-center gap-3 font-mono text-xs">
            <Link
              href="/privacy"
              className="px-3 py-1.5 text-muted-foreground hover:text-foreground uppercase text-[11px] font-bold transition-colors"
            >
              Privacy Policy
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

      {/* Main Content Area */}
      <main className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-10 md:space-y-12 pb-36 md:pb-16 w-full">
        {/* Page Header */}
        <div className="space-y-3 max-w-4xl">
          <div className="flex items-center gap-3 text-[9px] md:text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
            <Scale className="h-3.5 w-3.5 text-foreground" />
            <span>Binding Legal Agreement</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase leading-none break-words">
            Terms of Service
          </h1>
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
            Last Updated: August 2026 · Version 2.4 · Effective Globally
          </p>
        </div>

        {/* Prominent Legal Advice Disclaimer Banner */}
        <div className="p-6 md:p-8 bg-card/60 border border-amber-500/40 relative overflow-hidden space-y-3">
          <div className="flex items-center gap-2.5 text-amber-500 font-mono text-xs font-bold uppercase tracking-widest">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>Important Notice · Non-Financial Advice Disclaimer</span>
          </div>
          <p className="text-xs sm:text-sm text-foreground/90 font-sans leading-relaxed">
            LEGER_OS is an automated software application and mathematical modeling tool designed exclusively for personal budgeting and cash flow simulation. <strong>LEGER_OS is not a licensed financial advisor, certified public accountant (CPA), registered investment broker, or banking institution.</strong> All mathematical projections, burn rates, and AI-generated suggestions are deterministic or probabilistic estimates based on past records and user inputs. You are solely responsible for your own financial, investment, and budgetary decisions.
          </p>
        </div>

        {/* Terms Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Main Legal Text */}
          <div className="lg:col-span-8 space-y-8 font-sans text-xs sm:text-sm leading-relaxed text-muted-foreground">
            {/* Section 1 */}
            <section className="space-y-3 p-6 bg-card/30 border border-border/70">
              <h2 className="text-base sm:text-lg font-bold uppercase tracking-tight text-foreground flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">01.</span> Acceptance of Terms & Age Requirement
              </h2>
              <p>
                By creating an account, accessing, or using <strong>LEGER_OS</strong> (the "Service", "Platform", or "Mainframe"), you agree to be bound by these Terms of Service and our Privacy Policy.
              </p>
              <p className="font-medium text-foreground">
                <strong>Age Gate Requirement:</strong> You must be at least <strong>18 years of age</strong> (or the legal age of majority in your jurisdiction) to create an account or use LEGER_OS. If you are under 18 years of age, you are strictly prohibited from accessing or using the Service.
              </p>
            </section>

            {/* Section 2 */}
            <section className="space-y-3 p-6 bg-card/30 border border-border/70">
              <h2 className="text-base sm:text-lg font-bold uppercase tracking-tight text-foreground flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">02.</span> Scope of Service & Zero-Credential Architecture
              </h2>
              <p>
                LEGER_OS provides personal ledger management, paycheck-synchronized cash flow projections (recency decay modeling), recurring subscription radar, and portfolio valuation audits.
              </p>
              <p>
                <strong>Zero-Credential Guarantee:</strong> LEGER_OS operates without requiring your banking passwords or credentials. Data ingestion occurs exclusively via client-uploaded file extracts (PDF/TXT) or user-configured device push automation webhooks.
              </p>
            </section>

            {/* Section 3 */}
            <section className="space-y-3 p-6 bg-card/30 border border-border/70">
              <h2 className="text-base sm:text-lg font-bold uppercase tracking-tight text-foreground flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">03.</span> User Accounts & Multi-Tenant Security
              </h2>
              <p>
                You are responsible for safeguarding your login credentials (passwords, Google OAuth tokens, and personal API keys). You agree not to share your account or use the Platform for any unauthorized or illegal purpose.
              </p>
              <p>
                All account data is isolated using PostgreSQL Row Level Security (RLS) policies and encrypted in transit via 256-bit SSL/TLS.
              </p>
            </section>

            {/* Section 4 */}
            <section className="space-y-3 p-6 bg-card/30 border border-border/70">
              <h2 className="text-base sm:text-lg font-bold uppercase tracking-tight text-foreground flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">04.</span> Paid Subscriptions, Billing & Cancellation
              </h2>
              <p>
                LEGER_OS provides a free <strong>Core Base Tier</strong> (unlimited manual expense tracking, CSV exports, paycheck cycle tracking) and an optional <strong>PRO Tier</strong> offering real-time AI neural ingestion, automated device webhooks, and multi-cycle predictive simulations.
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs">
                <li><strong>Transparent Inclusive Pricing:</strong> All advertised subscription fees include applicable VAT and sales taxes. No surprise fees are added at checkout.</li>
                <li><strong>Billing Processing:</strong> All subscription payments are processed securely via Stripe. LEGER_OS does not store or process raw credit card numbers.</li>
                <li><strong>Cancellation & Data Retention:</strong> You may cancel your subscription at any time via the in-app Stripe billing portal. Upon cancellation, you retain full PRO access through the end of the paid billing cycle, after which your account reverts to Core Free tier with a 90-day grace retention period for PRO neural memories.</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section className="space-y-3 p-6 bg-card/30 border border-border/70">
              <h2 className="text-base sm:text-lg font-bold uppercase tracking-tight text-foreground flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">05.</span> Multi-Provider AI & User API Keys
              </h2>
              <p>
                LEGER_OS provides a multi-provider neural bridge connecting to Google Gemini, OpenAI, Groq, or self-hosted Ollama. PRO users receive monthly quota allowances. Users may also provide their own personal API keys for unmetered local access, in which case API requests are routed directly to the provider under the user's individual provider terms.
              </p>
            </section>

            {/* Section 6 */}
            <section className="space-y-3 p-6 bg-card/30 border border-border/70">
              <h2 className="text-base sm:text-lg font-bold uppercase tracking-tight text-foreground flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">06.</span> Limitation of Liability & Warranty Disclaimer
              </h2>
              <p>
                THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. IN NO EVENT SHALL LEGER_OS, ITS AUTHORS, OR OPERATORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA LOSS, FINANCIAL MISCALCULATIONS, OR BANK CHARGES ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICE.
              </p>
              <p>
                OUR TOTAL AGGREGATE LIABILITY UNDER THESE TERMS SHALL NOT EXCEED THE TOTAL AMOUNT PAID BY YOU TO LEGER_OS IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
              </p>
            </section>

            {/* Section 7 */}
            <section className="space-y-3 p-6 bg-card/30 border border-border/70">
              <h2 className="text-base sm:text-lg font-bold uppercase tracking-tight text-foreground flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">07.</span> GDPR Rights & Sovereign Data Portability
              </h2>
              <p>
                In compliance with the General Data Protection Regulation (GDPR), you retain absolute sovereignty over your financial data. You may at any time export your complete JSON/CSV records (Article 20) or execute permanent database erasure (Article 17) via System Settings.
              </p>
            </section>
          </div>

          {/* Quick Summary Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className="p-6 bg-card border border-border space-y-4 font-mono text-xs">
              <span className="technical-label text-[9px] border-b border-dotted border-muted-foreground/30 w-fit">
                EXECUTIVE SUMMARY
              </span>
              
              <div className="space-y-3 text-muted-foreground text-[11px]">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>18+ Age Requirement:</strong> Legal adulthood required for registration.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Not Financial Advice:</strong> Informational mathematical tool only.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Zero Bank Passwords:</strong> We never ask for or store banking credentials.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Full Data Portability:</strong> 1-click JSON & CSV export + GDPR erasure.</span>
                </div>
              </div>

              <div className="pt-4 border-t border-border/60">
                <Link
                  href="/privacy"
                  className="w-full py-2.5 px-4 bg-secondary hover:bg-secondary/80 text-foreground text-center font-bold uppercase tracking-wider block transition-colors border border-border"
                >
                  Read Privacy Policy →
                </Link>
              </div>
            </div>

            <div className="p-6 bg-card/20 border border-border space-y-2 text-[11px] font-mono text-muted-foreground">
              <span className="text-foreground font-bold uppercase text-xs block">Contact Support</span>
              <p>For legal, compliance, or regulatory inquiries, contact us directly via the in-app support drawer or email support@leger-os.com.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
