"use client"

import React, { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Home, List, PieChart, BarChart3, Landmark, Shield, ShieldOff, Cpu, Activity, Database, LogOut, User, Sun, Moon, Sliders, Menu, X, ChevronRight, Tag, Brain } from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { useSystem } from "@/lib/SystemContext"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { GlowingBadge } from "@/components/unlumen-ui/glowing-badge"
import { FloatingTooltipTrigger } from "@/components/unlumen-ui/floating-tooltip"
import { SystemSettingsModal } from "@/components/SystemSettingsModal"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

const navigation = [
  { name: "Dashboard", href: "/", icon: Home, desc: "Global Overview" },
  { name: "Ledger", href: "/expenses", icon: List, desc: "Transaction history" },
  { name: "Categories", href: "/categories", icon: Tag, desc: "Category analysis" },
  { name: "Budgets", href: "/budgets", icon: PieChart, desc: "Budget planning" },
  { name: "Analytics", href: "/analytics", icon: BarChart3, desc: "Cash flow trends" },
  { name: "Memory", href: "/memory", icon: Brain, desc: "AI Context Memory" },
]

// Mobile bottom bar shows 5 core routes
const mobileNavigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Ledger", href: "/expenses", icon: List },
  { name: "Memory", href: "/memory", icon: Brain },
  { name: "Categories", href: "/categories", icon: Tag },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
]

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const cycleId = searchParams ? searchParams.get("cycleId") : null
  const { isPrivacyMode, setPrivacyMode, systemLatency, nodeStatus, profile, signOut, user, isPro, isSettingsOpen, setSettingsOpen, setSettingsActiveTab, setSubscriptionOnly } = useSystem()
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const prevMobileIndexRef = useRef<number>(-1)

  const activeHref = (pendingHref?.split('?')[0]) ?? pathname
  const mobileActiveIndex = (() => {
    const navIdx = mobileNavigation.findIndex(i => i.href === activeHref);
    if (navIdx >= 0) return navIdx;
    // System button appears after mobileNavigation items
    return activeHref === '/system' ? mobileNavigation.length : -1;
  })();

  useEffect(() => {
    setMounted(true)
  }, [])

  // Clear optimistic active state once real navigation completes
  useEffect(() => {
    setPendingHref(null)
  }, [pathname])

  // Track previous active index for sliding stagger — update after animation has started
  useEffect(() => {
    const t = setTimeout(() => {
      prevMobileIndexRef.current = mobileActiveIndex
    }, 350)
    return () => clearTimeout(t)
  }, [mobileActiveIndex])

  const navigateTo = (href: string) => {
    setPendingHref(href)
    router.push(href)
  }

  const getMobileScale = (idx: number) => {
    if (mobileActiveIndex < 0) return 1
    const dist = Math.abs(idx - mobileActiveIndex)
    if (dist === 0) return 1.22
    if (dist === 1) return 1.08
    return 1
  }

  const getMobileTransition = (idx: number) => {
    const prev = prevMobileIndexRef.current
    const curr = mobileActiveIndex
    const base = { type: "spring" as const, stiffness: 380, damping: 26 }
    if (prev < 0 || prev === curr) return base
    const min = Math.min(prev, curr)
    const max = Math.max(prev, curr)
    // Only stagger buttons along the travel path
    if (idx < min || idx > max) return base
    return { ...base, delay: Math.abs(idx - prev) * 0.055 }
  }

  const isPublicPage = pathname === '/login' || pathname === '/signup'
  if (isPublicPage) return null

  return (
    <>
      {/* Desktop Terminal Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 left-0 bg-background border-r border-border z-40">
        <div className="flex flex-col h-full pt-6 pb-4">
          {/* Mainframe ID */}
          <div className="px-6 mb-6 space-y-4">
            <div className="flex items-center gap-4 group cursor-default">
              <div className="w-8 h-8 bg-foreground flex items-center justify-center ledger-border rotate-45 shrink-0 my-1 transition-transform group-hover:scale-105">
                <Landmark className="h-4 w-4 text-background -rotate-45" />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tighter uppercase leading-none text-foreground">LEGER_OS</h1>
                <p className="text-[9px] font-mono text-muted-foreground tracking-widest uppercase mt-0.5">Personal Finance Mainframe</p>
              </div>
            </div>

            {/* User Identity Node */}
            {profile && (
              <div className="p-2.5 bg-secondary/30 border border-border ledger-border space-y-1.5">
                  <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground">
                    <span className="flex items-center gap-1.5 uppercase"><User className="h-2.5 w-2.5" /> User</span>
                    <button onClick={signOut} className="hover:text-destructive transition-colors text-[9px] uppercase font-bold flex items-center gap-1" title="Disconnect Session">
                       <span>Sign Out</span> <LogOut className="h-2.5 w-2.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-bold font-mono uppercase truncate text-foreground">{profile.username || "USER"}</p>
                    {isPro ? (
                       <GlowingBadge variant="success" pulse dot className="px-1.5 py-0.5 text-[8px] uppercase font-mono">PRO</GlowingBadge>
                    ) : (
                       <button 
                         onClick={() => {
                           setSettingsActiveTab("pro");
                           setSubscriptionOnly(true);
                           setSettingsOpen(true);
                         }} 
                         className="px-1.5 py-0.5 bg-foreground text-background text-[8px] uppercase font-mono font-bold tracking-tighter hover:bg-emerald-500 hover:text-white transition-colors shrink-0"
                       >
                         Upgrade
                       </button>
                    )}
                  </div>
              </div>
            )}
          </div>

          {/* Core Navigation Links */}
          <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const targetHref = cycleId ? `${item.href}?cycleId=${cycleId}` : item.href
              const isActive = (pendingHref ?? pathname) === item.href
              return (
                <div key={item.name}>
                  <button
                    onClick={() => navigateTo(targetHref)}
                    className={cn(
                      "group relative flex items-center justify-between w-full px-4 py-3 transition-all duration-300 border border-transparent",
                      isActive ? "bg-secondary/70 border-border/50 text-foreground" : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                    )}
                  >
                    {isActive && (
                      <motion.div 
                        layoutId="activeNavDesktop"
                        className="absolute left-0 top-0 bottom-0 w-1 bg-foreground" 
                      />
                    )}
                    <div className="flex items-center gap-3">
                      <item.icon className={cn("h-4 w-4 transition-colors shrink-0", isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                      <span className="text-[11px] font-bold uppercase tracking-[0.15em]">
                        {item.name}
                      </span>
                    </div>
                  </button>
                </div>
              )
            })}
          </nav>
          
          {/* Quick Controls & Hardware Status Footer */}
          <div className="px-6 pt-4 border-t border-border mt-auto space-y-4">
            {/* Compact 3-Button Control Grid */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => setPrivacyMode(!isPrivacyMode)}
                className={cn(
                  "flex flex-col items-center justify-center py-2 px-1 border transition-all text-[8px] font-mono uppercase font-bold gap-1 select-none",
                  isPrivacyMode ? "bg-foreground/10 border-foreground text-foreground shadow-sm" : "bg-card border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
                title="Toggle Safe-Deposit Privacy Mode"
              >
                {isPrivacyMode ? <Shield className="h-3.5 w-3.5" /> : <ShieldOff className="h-3.5 w-3.5 opacity-60" />}
                <span>{isPrivacyMode ? "Secure" : "Privacy"}</span>
              </button>

              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex flex-col items-center justify-center py-2 px-1 border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground transition-all text-[8px] font-mono uppercase font-bold gap-1 select-none"
                title="Switch Theme"
              >
                {!mounted ? (
                  <div className="h-3.5 w-3.5 animate-pulse bg-muted" />
                ) : theme === "dark" ? (
                  <Moon className="h-3.5 w-3.5" />
                ) : (
                  <Sun className="h-3.5 w-3.5" />
                )}
                <span>{!mounted ? "Theme" : theme === "dark" ? "Dark" : "Light"}</span>
              </button>

              <button
                onClick={() => setSettingsOpen(true)}
                className="flex flex-col items-center justify-center py-2 px-1 border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground transition-all text-[8px] font-mono uppercase font-bold gap-1 select-none cursor-pointer"
                title="System Configuration Matrix"
              >
                <Sliders className="h-3.5 w-3.5" />
                <span>Config</span>
              </button>
            </div>

            {/* Telemetry Removed */}
          </div>
        </div>
      </aside>

      {/* Mobile Terminal Bottom Bar — rendered inline, fixed positioning handles placement */}
      {mounted && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border z-[99999] px-1 shadow-2xl">
          {/* Persistent sliding indicator */}
          <motion.div
            className="absolute top-0 left-0 h-0.5 bg-foreground z-50 pointer-events-none"
            style={{ width: `${100 / (mobileNavigation.length + 1)}%` }}
            initial={false}
            animate={{ x: mobileActiveIndex >= 0 ? `${mobileActiveIndex * 100}%` : "0%" }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />

          <div className="flex justify-around items-center h-14 w-full">
            {mobileNavigation.map((item, idx) => {
              const targetHref = cycleId ? `${item.href}?cycleId=${cycleId}` : item.href;
              const isActive = activeHref === item.href;
              return (
                <button
                  key={item.name}
                  onClick={() => navigateTo(targetHref)}
                  className={cn(
                    "flex flex-col items-center justify-center flex-1 w-0 h-full transition-colors relative min-w-0 px-2 py-1 select-none",
                    isActive ? "text-foreground font-bold" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <motion.div
                    className="flex items-center justify-center"
                    animate={{ scale: getMobileScale(idx) }}
                    transition={getMobileTransition(idx)}
                  >
                    <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-foreground")} />
                  </motion.div>
                </button>
              );
            })}

            {/* System / Menu Trigger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 w-0 h-full text-muted-foreground hover:text-foreground transition-colors min-w-0 px-2 py-1 select-none",
                mobileMenuOpen && "text-foreground font-bold"
              )}
            >
              <motion.div
                className="flex items-center justify-center"
                animate={{ scale: getMobileScale(mobileNavigation.length) }}
                transition={getMobileTransition(mobileNavigation.length)}
              >
                <Sliders className="h-5 w-5 shrink-0" />
              </motion.div>
            </button>
          </div>
        </nav>
      )}


      {/* Mobile System Menu Drawer Modal */}
      <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <DialogContent className="bg-card border border-border rounded-none p-6 font-mono text-xs max-w-sm w-[90vw] md:hidden shadow-2xl">
          <DialogHeader className="border-b border-border pb-4 mb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-3 text-foreground">
                <div className="w-5 h-5 bg-foreground flex items-center justify-center ledger-border rotate-45 shrink-0">
                  <Landmark className="h-2.5 w-2.5 text-background -rotate-45" />
                </div>
                <span>LEGER_OS</span>
              </DialogTitle>
            </div>
            <DialogDescription className="text-[10px] uppercase tracking-wider text-muted-foreground">
              System settings and session actions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* Categories Link */}
            <button
              onClick={() => { setMobileMenuOpen(false); router.push('/categories'); }}
              className="w-full p-3 bg-secondary/30 border border-border flex items-center justify-between text-left hover:bg-secondary/60 transition-all group"
            >
              <div className="flex items-center gap-3">
                <Tag className="h-4 w-4 shrink-0" />
                <div>
                  <div className="font-bold uppercase text-xs text-foreground">Categories</div>
                  <div className="text-[9px] text-muted-foreground font-sans">Category Explorer & Profit Analytics</div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </button>

            {/* System Config Link */}
            <button
              onClick={() => { setMobileMenuOpen(false); setSettingsOpen(true); }}
              className="w-full p-3 bg-secondary/30 border border-border flex items-center justify-between text-left hover:bg-secondary/60 transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Sliders className="h-4 w-4 shrink-0" />
                <div>
                  <div className="font-bold uppercase text-xs text-foreground">System Config</div>
                  <div className="text-[9px] text-muted-foreground font-sans">Paycheck keywords, habits & rules</div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Privacy Toggle */}
            <button
              onClick={() => setPrivacyMode(!isPrivacyMode)}
              className={cn(
                "w-full p-3 border flex items-center justify-between text-left transition-all",
                isPrivacyMode ? "bg-foreground/10 border-foreground text-foreground" : "bg-card border-border hover:bg-secondary/40"
              )}
            >
              <div className="flex items-center gap-3">
                {isPrivacyMode ? <Shield className="h-4 w-4 shrink-0" /> : <ShieldOff className="h-4 w-4 text-muted-foreground shrink-0" />}
                <div>
                  <div className="font-bold uppercase text-xs text-foreground">Privacy Mode</div>
                  <div className="text-[9px] text-muted-foreground font-sans">Obfuscate balances across screens</div>
                </div>
              </div>
              <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 bg-secondary border border-border">
                {isPrivacyMode ? "ACTIVE" : "OFF"}
              </span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-full p-3 bg-card border border-border flex items-center justify-between text-left hover:bg-secondary/40 transition-all"
            >
              <div className="flex items-center gap-3">
                {theme === "dark" ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
                <div>
                  <div className="font-bold uppercase text-xs text-foreground">Theme Switcher</div>
                  <div className="text-[9px] text-muted-foreground font-sans">Toggle dark / light environment</div>
                </div>
              </div>
              <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 bg-secondary border border-border">
                {theme === "dark" ? "DARK" : "LIGHT"}
              </span>
            </button>

            {/* User Profile & Sign Out */}
            {profile && (
              <div className="pt-3 border-t border-border flex items-center justify-between">
                <div className="text-[10px] font-mono text-muted-foreground">
                  User: <span className="text-foreground font-bold">{profile.username || "USER"}</span>
                </div>
                <button
                  onClick={() => { setMobileMenuOpen(false); signOut(); }}
                  className="px-3 py-1.5 bg-destructive/10 border border-destructive/30 text-destructive hover:bg-destructive hover:text-background transition-all font-mono text-[10px] uppercase font-bold flex items-center gap-1.5"
                >
                  <LogOut className="h-3 w-3" /> Disconnect
                </button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <SystemSettingsModal open={isSettingsOpen} onOpenChange={setSettingsOpen} />
    </>
  )
}
