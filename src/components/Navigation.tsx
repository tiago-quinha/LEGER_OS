"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, List, PieChart, BarChart3, Landmark, Shield, ShieldOff, Cpu, Activity, Database, Brain, LogOut, User, Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { useSystem } from "@/lib/SystemContext"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { MagneticButton } from "@/components/unlumen-ui/magnetic-button"
import { GlowingBadge } from "@/components/unlumen-ui/glowing-badge"
import { FloatingTooltipTrigger } from "@/components/unlumen-ui/floating-tooltip"

const navigation = [
  { name: "Dashboard", href: "/", icon: Home, id: "NODE_01", desc: "Global Overview" },
  { name: "LEGER AI", href: "/jarvis", icon: Brain, id: "NODE_05", desc: "Neural Strategy" },
  { name: "Ledger", href: "/expenses", icon: List, id: "NODE_02", desc: "Transactional Audit" },
  { name: "Budgets", href: "/budgets", icon: PieChart, id: "NODE_03", desc: "Constraint Matrix" },
  { name: "Analytics", href: "/analytics", icon: BarChart3, id: "NODE_04", desc: "Trend Synthesis" },
]

export function Navigation() {
  const pathname = usePathname()
  const { isPrivacyMode, setPrivacyMode, systemLatency, nodeStatus, profile, signOut, user } = useSystem()
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  const isPublicPage = pathname === '/login' || pathname === '/signup'
  if (isPublicPage) return null

  return (
    <>
      {/* Desktop Terminal Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-background border-r border-border">
        <div className="flex flex-col h-full pt-10 pb-6">
          {/* Mainframe ID */}
          <div className="px-8 mb-12 space-y-6">
            <div className="flex items-center gap-3 group cursor-default">
              <div className="w-10 h-10 bg-foreground flex items-center justify-center ledger-border transition-transform group-hover:rotate-90 duration-500">
                <Landmark className="h-6 w-6 text-background" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tighter uppercase leading-none text-foreground">LEGER_OS</h1>
                <p className="text-[9px] font-mono text-muted-foreground tracking-widest uppercase">Kernel v1.0.4.A</p>
              </div>
            </div>

            {/* User Identity Node */}
            {profile && (
              <div className="p-3 bg-secondary/30 border border-border ledger-border space-y-2">
                 <div className="flex items-center gap-2 technical-label opacity-60">
                    <User className="h-2.5 w-2.5" />
                    <span>Active Node ID</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <p className="text-[10px] font-bold font-mono uppercase truncate max-w-[120px]">{profile.username || "UNKNOWN_USER"}</p>
                    <button onClick={signOut} className="p-1 hover:text-destructive transition-colors" title="Disconnect Session">
                       <LogOut className="h-3 w-3" />
                    </button>
                 </div>
              </div>
            )}
            
            {/* Safe-Deposit Toggle */}
            <MagneticButton 
              onClick={() => setPrivacyMode(!isPrivacyMode)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 border ledger-border transition-all duration-300",
                isPrivacyMode ? "bg-foreground/5 border-foreground/20 text-foreground" : "bg-card border-border hover:bg-secondary"
              )}
              strength={0.2}
            >
              <div className="flex items-center gap-2">
                {isPrivacyMode ? <Shield className="h-3 w-3 text-emerald-500" /> : <ShieldOff className="h-3 w-3 opacity-50" />}
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider">Privacy Mode</span>
              </div>
              <div className={cn("w-1.5 h-1.5 rounded-none transition-all duration-500", isPrivacyMode ? "bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" : "bg-muted")} />
            </MagneticButton>

            {/* Theme Toggle */}
            <MagneticButton 
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-full flex items-center justify-between px-3 py-2 border border-border bg-card ledger-border transition-all duration-300 hover:bg-secondary text-foreground"
              strength={0.2}
            >
              <div className="flex items-center gap-2">
                {!mounted ? (
                  <div className="h-3 w-3 animate-pulse bg-muted rounded-none" />
                ) : theme === "dark" ? (
                  <Moon className="h-3 w-3" />
                ) : (
                  <Sun className="h-3 w-3" />
                )}
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider">
                  {!mounted ? "Theme Load" : theme === "dark" ? "Dark Mode" : "Light Mode"}
                </span>
              </div>
              <span className="text-[8px] font-mono opacity-40 uppercase">Toggle</span>
            </MagneticButton>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <FloatingTooltipTrigger key={item.name} content={`${item.name} Node`} description={item.desc}>
                  <Link
                    href={item.href}
                    className={cn(
                      "group relative flex flex-col px-8 py-4 transition-all duration-300 overflow-hidden",
                      isActive ? "bg-secondary/50" : "hover:bg-muted/30"
                    )}
                  >
                    {isActive && (
                      <motion.div 
                        layoutId="activeNav"
                        className="absolute left-0 top-0 bottom-0 w-1 bg-foreground" 
                      />
                    )}
                    <div className="flex items-center justify-between z-10">
                      <div className="flex items-center gap-4">
                        <item.icon className={cn("h-4 w-4 transition-colors", isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")} />
                        <span className={cn("text-[11px] font-bold uppercase tracking-[0.2em]", isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>
                          {item.name}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono opacity-20 group-hover:opacity-100 transition-opacity font-bold uppercase">{item.id}</span>
                    </div>
                    <p className="text-[8px] font-mono text-muted-foreground mt-1 tracking-wider opacity-0 group-hover:opacity-100 transition-all duration-500 pl-8 uppercase">
                      {item.desc}
                    </p>
                  </Link>
                </FloatingTooltipTrigger>
              )
            })}
          </nav>
          
          {/* Hardware Status */}
          <div className="px-8 pt-8 mt-auto space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between technical-label text-[8px] h-6">
                <div className="flex items-center gap-2">
                  <Cpu className="h-2.5 w-2.5" />
                  <span>Sub-System</span>
                </div>
                <GlowingBadge variant={nodeStatus === "ONLINE" ? "success" : "neutral"} pulse={nodeStatus === "ONLINE"} dot className="px-2 py-0.5 scale-75 origin-right">
                  {nodeStatus}
                </GlowingBadge>
              </div>
              <div className="flex items-center justify-between technical-label text-[8px] h-6">
                <div className="flex items-center gap-2">
                  <Activity className="h-2.5 w-2.5" />
                  <span>Latency</span>
                </div>
                <span>{systemLatency}ms</span>
              </div>
              <div className="flex items-center justify-between technical-label text-[8px] h-6">
                <div className="flex items-center gap-2">
                  <Database className="h-2.5 w-2.5" />
                  <span>Buffer</span>
                </div>
                <GlowingBadge variant="neutral" pulse dot className="px-2 py-0.5 scale-75 origin-right">
                  READY
                </GlowingBadge>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Terminal Bottom Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 px-0.5 overflow-hidden">
        <div className="flex justify-around items-center h-16 w-full max-w-full">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center grow h-full transition-all relative min-w-0 px-1",
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="activeNavMobile"
                    className="absolute top-0 left-1 right-1 h-0.5 bg-foreground" 
                  />
                )}
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="text-[7px] mt-1 font-bold uppercase tracking-tighter truncate w-full text-center">{item.name}</span>
              </Link>
            )
          })}
          
          {/* Mobile Theme Toggle */}
          <button 
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex flex-col items-center justify-center grow h-full text-muted-foreground hover:text-foreground transition-all min-w-0 px-1"
          >
            {!mounted ? (
              <div className="h-4 w-4 animate-pulse bg-muted rounded-none" />
            ) : theme === "dark" ? (
              <Moon className="h-4 w-4 shrink-0" />
            ) : (
              <Sun className="h-4 w-4 shrink-0" />
            )}
            <span className="text-[7px] mt-1 font-bold uppercase tracking-tighter truncate w-full text-center">
              {!mounted ? "Theme" : theme === "dark" ? "Dark" : "Light"}
            </span>
          </button>

          {profile && (
             <button 
               onClick={signOut}
               className="flex flex-col items-center justify-center grow h-full text-muted-foreground hover:text-destructive transition-all min-w-0 px-1"
             >
               <LogOut className="h-4 w-4 shrink-0" />
               <span className="text-[7px] mt-1 font-bold uppercase tracking-tighter truncate w-full text-center">Quit</span>
             </button>
          )}
        </div>
      </nav>
    </>
  )
}
