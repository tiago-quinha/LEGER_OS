"use client"

import React, { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Home, List, PieChart, BarChart3, Landmark, Shield, ShieldOff, Cpu, Activity, Database, Brain, LogOut, User, Sun, Moon, Sliders, Menu, X, ChevronRight, Tag } from "lucide-react"
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
  { name: "Dashboard", href: "/", icon: Home, id: "NODE_01", desc: "Global Overview" },
  { name: "LEGER AI", href: "/leger-ai", icon: Brain, id: "NODE_05", desc: "Neural Strategy" },
  { name: "Ledger", href: "/expenses", icon: List, id: "NODE_02", desc: "Transactional Audit" },
  { name: "Categories", href: "/categories", icon: Tag, id: "NODE_06", desc: "Category Analysis" },
  { name: "Budgets", href: "/budgets", icon: PieChart, id: "NODE_03", desc: "Constraint Matrix" },
  { name: "Analytics", href: "/analytics", icon: BarChart3, id: "NODE_04", desc: "Trend Synthesis" },
]

// Mobile bottom bar shows 4 core routes + 1 System/Menu trigger
const mobileNavigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Ledger", href: "/expenses", icon: List },
  { name: "Categories", href: "/categories", icon: Tag },
  { name: "Budgets", href: "/budgets", icon: PieChart },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
]

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { isPrivacyMode, setPrivacyMode, systemLatency, nodeStatus, profile, signOut, user, isPro, isSettingsOpen, setSettingsOpen, setSettingsActiveTab, setSubscriptionOnly } = useSystem()
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isPublicPage = pathname === '/login' || pathname === '/signup'
  if (isPublicPage) return null

  return (
    <>
      {/* Desktop Terminal Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-background border-r border-border z-40">
        <div className="flex flex-col h-full pt-6 pb-4">
          {/* Mainframe ID */}
          <div className="px-6 mb-6 space-y-4">
            <div className="flex items-center gap-3 group cursor-default">
              <div className="w-9 h-9 bg-foreground flex items-center justify-center ledger-border transition-transform group-hover:rotate-90 duration-500 shrink-0">
                <Landmark className="h-5 w-5 text-background" />
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
                    <p className="text-[11px] font-bold font-mono uppercase truncate text-foreground">{profile.username || "UNKNOWN_USER"}</p>
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
              const isActive = pathname === item.href
              return (
                <FloatingTooltipTrigger key={item.name} content={`${item.name} Node`} description={item.desc}>
                  <Link
                    href={item.href}
                    className={cn(
                      "group relative flex items-center justify-between px-4 py-3 transition-all duration-300 border border-transparent",
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
                  </Link>
                </FloatingTooltipTrigger>
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
                onClick={() => router.push("/system")}
                className="flex flex-col items-center justify-center py-2 px-1 border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground transition-all text-[8px] font-mono uppercase font-bold gap-1 select-none"
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

      {/* Mobile Terminal Bottom Bar (Exactly 5 spaced items, Portaled to document.body to guarantee viewport attachment) */}
      {mounted && typeof document !== "undefined" && createPortal(
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border z-[99999] px-1 max-w-full overflow-hidden shadow-2xl">
          <div className="flex justify-around items-center h-16 w-full max-w-full">
            {mobileNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center grow h-full transition-all relative min-w-0 px-2 py-1 select-none",
                    isActive ? "text-foreground font-bold" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="activeNavMobile"
                      className="absolute top-0 left-3 right-3 h-0.5 bg-foreground" 
                    />
                  )}
                  <item.icon className={cn("h-4 w-4 shrink-0 transition-transform", isActive && "scale-110 text-foreground")} />
                  <span className="text-[9px] mt-1.5 font-mono uppercase tracking-tight truncate w-full text-center">{item.name}</span>
                </Link>
              )
            })}

            {/* 5th Button: System / Menu Trigger */}
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className={cn(
                "flex flex-col items-center justify-center grow h-full text-muted-foreground hover:text-foreground transition-all min-w-0 px-2 py-1 select-none",
                mobileMenuOpen && "text-foreground font-bold"
              )}
            >
              <Sliders className="h-4 w-4 shrink-0" />
              <span className="text-[9px] mt-1.5 font-mono uppercase tracking-tight truncate w-full text-center">System</span>
            </button>
          </div>
        </nav>,
        document.body
      )}

      {/* Mobile System Menu Drawer Modal */}
      <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <DialogContent className="bg-card border border-border rounded-none p-6 font-mono text-xs max-w-sm w-[90vw] md:hidden shadow-2xl">
          <DialogHeader className="border-b border-border pb-4 mb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-foreground">
                <Landmark className="h-4 w-4" /> LEGER_OS
              </DialogTitle>
            </div>
            <DialogDescription className="text-[10px] uppercase tracking-wider text-muted-foreground">
              System settings and session actions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* AI Link */}
            <button
              onClick={() => { setMobileMenuOpen(false); router.push('/leger-ai'); }}
              className="w-full p-3 bg-secondary/30 border border-border flex items-center justify-between text-left hover:bg-secondary/60 transition-all group"
            >
              <div className="flex items-center gap-3">
                <Brain className="h-4 w-4 shrink-0" />
                <div>
                  <div className="font-bold uppercase text-xs text-foreground">LEGER AI</div>
                  <div className="text-[9px] text-muted-foreground font-sans">Neural Strategy & Wealth Query</div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </button>

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
              onClick={() => { setMobileMenuOpen(false); router.push('/system'); }}
              className="w-full p-3 bg-secondary/30 border border-border flex items-center justify-between text-left hover:bg-secondary/60 transition-all group"
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
                  Node: <span className="text-foreground font-bold">{profile.username || "USER"}</span>
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
