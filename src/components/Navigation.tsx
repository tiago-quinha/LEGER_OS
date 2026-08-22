"use client"

import React, { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Home, List, PieChart, Briefcase, Landmark, Shield, ShieldOff, Cpu, Activity, Database, LogOut, User, Sun, Moon, Sliders, Menu, X, ChevronRight, Tag, Brain, Radio, PanelLeftClose, PanelLeftOpen } from "lucide-react"
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
  { name: "Radar", href: "/radar", icon: Radio, desc: "Subscription Radar" },
  { name: "Portfolio", href: "/portfolio", icon: Briefcase, desc: "Investments & Net Worth" },
  { name: "Categories", href: "/categories", icon: Tag, desc: "Category analysis" },
  { name: "Budgets", href: "/budgets", icon: PieChart, desc: "Budget planning" },
  { name: "Memory", href: "/memory", icon: Brain, desc: "AI Context Memory" },
]

// Mobile bottom bar routes
const mobileNavigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Ledger", href: "/expenses", icon: List },
  { name: "Radar", href: "/radar", icon: Radio },
  { name: "Portfolio", href: "/portfolio", icon: Briefcase },
  { name: "Categories", href: "/categories", icon: Tag },
  { name: "Budgets", href: "/budgets", icon: PieChart },
  { name: "Memory", href: "/memory", icon: Brain },
]

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const cycleId = searchParams ? searchParams.get("cycleId") : null
  const { 
    isPrivacyMode, 
    setPrivacyMode, 
    systemLatency, 
    nodeStatus, 
    profile, 
    signOut, 
    user, 
    isPro, 
    isSettingsOpen, 
    setSettingsOpen, 
    setSettingsActiveTab, 
    setSubscriptionOnly,
    isSidebarCollapsed,
    toggleSidebar
  } = useSystem()
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()
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
      {/* Desktop / Tablet Terminal Sidebar */}
      <aside className={cn(
        "hidden md:flex md:flex-col md:fixed md:inset-y-0 left-0 bg-background border-r border-border z-40 transition-all duration-300",
        isSidebarCollapsed ? "md:w-16" : "md:w-64"
      )}>
        <div className="flex flex-col h-full pt-5 pb-4">
          {/* Mainframe ID & Collapse Toggle */}
          <div className={cn("mb-5 space-y-3", isSidebarCollapsed ? "px-2.5" : "px-5")}>
            <div className={cn("flex items-center", isSidebarCollapsed ? "flex-col gap-2 justify-center" : "justify-between")}>
              <div className="flex items-center gap-3 group cursor-default min-w-0">
                <div className="w-8 h-8 bg-foreground flex items-center justify-center ledger-border rotate-45 shrink-0 my-1 transition-transform group-hover:scale-105">
                  <Landmark className="h-4 w-4 text-background -rotate-45" />
                </div>
                {!isSidebarCollapsed && (
                  <div className="min-w-0">
                    <h1 className="text-base font-bold tracking-tighter uppercase leading-none text-foreground truncate">LEGER_OS</h1>
                    <p className="text-[8.5px] font-mono text-muted-foreground tracking-widest uppercase mt-0.5 truncate">Finance Mainframe</p>
                  </div>
                )}
              </div>

              {/* Collapse / Expand Toggle Button */}
              <button
                type="button"
                onClick={toggleSidebar}
                className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors border border-border/40 cursor-pointer shrink-0"
                title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                {isSidebarCollapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
              </button>
            </div>

            {/* User Identity Node */}
            {profile && (
              !isSidebarCollapsed ? (
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
                      <span className="px-2 py-0.5 text-[8px] uppercase font-mono font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/30">PRO</span>
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
              ) : (
                <div className="flex flex-col items-center justify-center py-1.5 bg-secondary/30 border border-border/60 ledger-border" title={`${profile.username || "USER"} (${isPro ? "PRO" : "CORE"})`}>
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  {isPro && <span className="text-[7px] font-mono font-bold text-emerald-500 mt-0.5">PRO</span>}
                </div>
              )
            )}
          </div>

          {/* Core Navigation Links */}
          <nav className={cn("flex-1 space-y-1 overflow-y-auto", isSidebarCollapsed ? "px-1.5" : "px-2")}>
            {navigation.map((item) => {
              const targetHref = cycleId ? `${item.href}?cycleId=${cycleId}` : item.href
              const isActive = (pendingHref ?? pathname) === item.href
              return (
                <div key={item.name}>
                  <button
                    onClick={() => navigateTo(targetHref)}
                    data-tour={item.name === "Ledger" ? "nav-ledger" : undefined}
                    title={isSidebarCollapsed ? item.name : undefined}
                    className={cn(
                      "group relative flex items-center w-full transition-all duration-300 border border-transparent cursor-pointer select-none",
                      isSidebarCollapsed 
                        ? "justify-center py-3 px-1" 
                        : "justify-between px-4 py-3",
                      isActive ? "bg-secondary/70 border-border/50 text-foreground" : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                    )}
                  >
                    {isActive && (
                      <motion.div 
                        layoutId="activeNavDesktop"
                        className="absolute left-0 top-0 bottom-0 w-1 bg-foreground" 
                      />
                    )}
                    <div className={cn("flex items-center", isSidebarCollapsed ? "justify-center" : "gap-3")}>
                      <item.icon data-tour={item.name === "Ledger" ? "nav-ledger-icon" : undefined} className={cn("h-4 w-4 transition-colors shrink-0", isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                      {!isSidebarCollapsed && (
                        <span className="text-[11px] font-bold uppercase tracking-[0.15em] truncate">
                          {item.name}
                        </span>
                      )}
                    </div>
                  </button>
                </div>
              )
            })}
          </nav>
          
          {/* Quick Controls & Hardware Status Footer */}
          <div className={cn("border-t border-border mt-auto pt-3", isSidebarCollapsed ? "px-2" : "px-5")}>
            {!isSidebarCollapsed ? (
              <div className="grid grid-cols-3 border border-border/80 bg-card/60 divide-x divide-border/60 shadow-xs">
                <button
                  type="button"
                  onClick={() => setPrivacyMode(!isPrivacyMode)}
                  className={cn(
                    "flex items-center justify-center py-2 px-1 transition-all text-[8px] font-mono uppercase font-bold gap-1 select-none cursor-pointer",
                    isPrivacyMode
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                  )}
                  title="Toggle Safe-Deposit Privacy Mode"
                >
                  {isPrivacyMode ? <Shield className="h-3 w-3 shrink-0" /> : <ShieldOff className="h-3 w-3 shrink-0 opacity-60" />}
                  <span>{isPrivacyMode ? "Secure" : "Privacy"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="flex items-center justify-center py-2 px-1 text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-all text-[8px] font-mono uppercase font-bold gap-1 select-none cursor-pointer"
                  title="Switch Theme"
                >
                  {!mounted ? (
                    <div className="h-3 w-3 animate-pulse bg-muted rounded-full" />
                  ) : theme === "dark" ? (
                    <Moon className="h-3 w-3 shrink-0" />
                  ) : (
                    <Sun className="h-3 w-3 shrink-0" />
                  )}
                  <span>{!mounted ? "Theme" : theme === "dark" ? "Dark" : "Light"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  className="flex items-center justify-center py-2 px-1 text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-all text-[8px] font-mono uppercase font-bold gap-1 select-none cursor-pointer"
                  title="System Configuration Matrix"
                >
                  <Sliders className="h-3 w-3 shrink-0" />
                  <span>Config</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 items-center">
                <button
                  type="button"
                  onClick={() => setPrivacyMode(!isPrivacyMode)}
                  className={cn(
                    "h-8 w-8 flex items-center justify-center border transition-all text-[8px] font-mono cursor-pointer select-none",
                    isPrivacyMode
                      ? "bg-foreground text-background border-foreground"
                      : "border-border/60 bg-card/60 text-muted-foreground hover:text-foreground"
                  )}
                  title={isPrivacyMode ? "Privacy Mode Active (Click to disable)" : "Enable Safe-Deposit Privacy"}
                >
                  {isPrivacyMode ? <Shield className="h-3.5 w-3.5" /> : <ShieldOff className="h-3.5 w-3.5 opacity-60" />}
                </button>

                <button
                  type="button"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="h-8 w-8 flex items-center justify-center border border-border/60 bg-card/60 text-muted-foreground hover:text-foreground transition-all cursor-pointer select-none"
                  title="Toggle Theme"
                >
                  {theme === "dark" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  className="h-8 w-8 flex items-center justify-center border border-border/60 bg-card/60 text-muted-foreground hover:text-foreground transition-all cursor-pointer select-none"
                  title="System Settings"
                >
                  <Sliders className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
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
                  data-tour={item.name === "Ledger" ? "nav-ledger-mobile" : undefined}
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
              onClick={() => setSettingsOpen(true)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 w-0 h-full text-muted-foreground hover:text-foreground transition-colors min-w-0 px-2 py-1 select-none",
                isSettingsOpen && "text-foreground font-bold"
              )}
              title="System Settings"
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

      <SystemSettingsModal open={isSettingsOpen} onOpenChange={setSettingsOpen} />
    </>
  )
}
