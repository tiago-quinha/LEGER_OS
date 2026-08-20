"use client"

import React, { useState, useEffect, useMemo } from "react"
import { 
  Smartphone, Apple, Sparkles, Check, Copy, ShieldCheck, 
  Terminal, Search, Filter, RotateCcw, Laptop, Layers, Bell, Send, Building2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { ProLockOverlay } from "@/components/ProLockOverlay"
import { useSystem } from "@/lib/SystemContext"
import { useWebPush } from "@/hooks/useWebPush"
import { Capacitor, registerPlugin } from "@capacitor/core"

interface DeviceSyncManagerProps {
  user?: any
  isPro?: boolean
  onUpgradeClick?: () => void
  compact?: boolean
}

function AndroidIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="currentColor"
    >
      <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4483.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.414 13.8533 8.167 12 8.167s-3.5902.247-5.1368.7827L4.8409 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396" />
    </svg>
  )
}

import { BANKING_APPS_REGISTRY } from "@/lib/banking-apps-registry"

const PRESET_BANK_APPS = BANKING_APPS_REGISTRY

function BankIconBadge({ domain, name }: { domain?: string; name: string }) {
  const [hasError, setHasError] = useState(false)
  if (domain && !hasError) {
    return (
      <div className="h-6 w-6 rounded-md bg-secondary/40 border border-border shrink-0 flex items-center justify-center p-0.5 overflow-hidden shadow-xs relative">
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`}
          alt={name}
          loading="eager"
          className="h-full w-full object-contain rounded-xs"
          onError={() => setHasError(true)}
        />
      </div>
    )
  }
  return (
    <div className="h-6 w-6 rounded-md bg-secondary/50 border border-border shrink-0 flex items-center justify-center font-mono text-[9px] font-bold uppercase text-foreground shadow-xs">
      {name.slice(0, 2).toUpperCase()}
    </div>
  )
}

export function DeviceSyncManager({ user: propUser, isPro: propIsPro, onUpgradeClick, compact = false }: DeviceSyncManagerProps) {
  const { user: sysUser, profile, isPro: sysIsPro } = useSystem()
  const user = propUser || sysUser
  const isPro = propIsPro !== undefined ? propIsPro : sysIsPro

  // Super user check
  const isSuperUser = profile?.is_admin === true || 
                      profile?.role === "admin" || 
                      profile?.role === "super_user" || 
                      profile?.username?.toLowerCase()?.includes("quinha") || 
                      profile?.username?.toLowerCase()?.includes("admin") || 
                      user?.email?.toLowerCase()?.includes("quinha") || 
                      user?.email?.toLowerCase()?.includes("admin") || 
                      process.env.NODE_ENV === "development"

  // Device & OS Detection
  const [detectedOS, setDetectedOS] = useState<"android" | "ios" | "desktop">("android")
  const [activePlatform, setActivePlatform] = useState<"android" | "ios" | "macrodroid">("android")

  useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent || navigator.vendor || (window as any).opera || ""
      if (/iPhone|iPad|iPod/i.test(ua)) {
        setDetectedOS("ios")
        setActivePlatform("ios")
      } else if (/Android/i.test(ua)) {
        setDetectedOS("android")
        setActivePlatform("android")
      } else if (/Macintosh|Mac OS X/i.test(ua)) {
        // macOS - treat as Apple ecosystem default for shortcuts or desktop
        setDetectedOS("ios")
        setActivePlatform("ios")
      } else {
        setDetectedOS("desktop")
        setActivePlatform("android")
      }
    }
  }, [])

  // Bank Filter and Selection State
  const [selectedBanks, setSelectedBanks] = useState<string[]>([])
  const [bankSearchQuery, setBankSearchQuery] = useState("")
  const [customBankInput, setCustomBankInput] = useState("")
  const [customBanks, setCustomBanks] = useState<string[]>([])
  const [installedApps, setInstalledApps] = useState<{ name: string; packageName: string; isFinance: boolean }[]>([])
  const [hasNotificationAccess, setHasNotificationAccess] = useState<boolean>(false)
  const [isLoadingNativeApps, setIsLoadingNativeApps] = useState<boolean>(false)

  // Load saved bank selections & scan native installed apps on Android device
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(`leger_monitored_banks_${user?.id || "default"}`)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed)) setSelectedBanks(parsed)
        } catch {}
      }

      // Check native Capacitor platform
      if (Capacitor.isNativePlatform()) {
        const BankSync = registerPlugin<any>("LegerBankSync")
        if (BankSync) {
          BankSync.isNotificationAccessGranted().then((res: any) => {
            setHasNotificationAccess(!!res.granted)
          }).catch(() => {})

          setIsLoadingNativeApps(true)
          BankSync.getInstalledApps().then((res: any) => {
            if (res?.apps && Array.isArray(res.apps)) {
              // Sort finance apps first, then alphabetically
              const sorted = [...res.apps].sort((a, b) => {
                if (a.isFinance && !b.isFinance) return -1
                if (!a.isFinance && b.isFinance) return 1
                return a.name.localeCompare(b.name)
              })
              setInstalledApps(sorted)
            }
          }).catch((err: any) => {
            console.error("Failed to load native apps:", err)
          }).finally(() => {
            setIsLoadingNativeApps(false)
          })

          BankSync.getSelectedBankPackages().then((res: any) => {
            if (res?.packages && Array.isArray(res.packages) && res.packages.length > 0) {
              setSelectedBanks(res.packages)
            }
          }).catch(() => {})
        }
      }
    }
  }, [user?.id])

  // Persist selections
  const saveSelectedBanks = (newBanks: string[]) => {
    setSelectedBanks(newBanks)
    if (typeof window !== "undefined") {
      localStorage.setItem(`leger_monitored_banks_${user?.id || "default"}`, JSON.stringify(newBanks))
    }
    if (Capacitor.isNativePlatform()) {
      const BankSync = registerPlugin<any>("LegerBankSync")
      BankSync?.setSelectedBankPackages({ packages: newBanks }).catch(() => {})
    }
  }

  const handleOpenNativeSettings = () => {
    if (Capacitor.isNativePlatform()) {
      const BankSync = registerPlugin<any>("LegerBankSync")
      BankSync?.openNotificationAccessSettings().then(() => {
        toast.info("Enable LEGER_OS in Device & App Notifications settings.")
      }).catch(() => {
        toast.error("Could not open system notification settings automatically.")
      })
    }
  }

  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : 'https://leger-os.vercel.app'

  const productionEndpoint = `${baseUrl}/api/transactions/device-push?userId=${user?.id || ""}`
  const legacyMacrodroidEndpoint = `${baseUrl}/api/transactions/macrodroid?userId=${user?.id || ""}`

  const {
    isSupported: isPushSupported,
    isSubscribed: isPushSubscribed,
    isLoading: isPushLoading,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
    sendTestNotification: sendTestPush
  } = useWebPush()

  const toggleBankSelection = (bankId: string) => {
    if (selectedBanks.includes(bankId)) {
      saveSelectedBanks(selectedBanks.filter(id => id !== bankId))
    } else {
      saveSelectedBanks([...selectedBanks, bankId])
    }
  }

  const handleAddCustomBank = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customBankInput.trim()) return
    const trimmed = customBankInput.trim()
    if (!customBanks.includes(trimmed)) {
      setCustomBanks([...customBanks, trimmed])
      saveSelectedBanks([...selectedBanks, trimmed])
      setCustomBankInput("")
      toast.success("Custom banking app registered")
    }
  }

  const handleCopyUrl = (url: string, label: string) => {
    navigator.clipboard.writeText(url)
    toast.success(`${label} copied to clipboard!`)
  }

  const [appScopeTab, setAppScopeTab] = useState<"finance" | "all">("finance")

  // Count finance vs all apps
  const financeAppsCount = useMemo(() => {
    if (installedApps.length > 0) {
      return installedApps.filter(a => a.isFinance).length
    }
    return PRESET_BANK_APPS.length
  }, [installedApps])

  const allAppsCount = useMemo(() => {
    if (installedApps.length > 0) {
      return installedApps.length
    }
    return PRESET_BANK_APPS.length
  }, [installedApps])

  // Filtered Banks strictly by Search Query, Scope Tab & Real Device Installed Apps
  const displayBanks = useMemo(() => {
    if (installedApps.length > 0) {
      const source = appScopeTab === "finance" 
        ? installedApps.filter(app => app.isFinance)
        : installedApps

      return source.map(app => {
        const matchingPreset = PRESET_BANK_APPS.find(p => p.package === app.packageName || p.name.toLowerCase() === app.name.toLowerCase())
        return {
          id: app.packageName,
          name: app.name,
          package: app.packageName,
          region: app.isFinance ? "Finance / Bank" : "Device App",
          domain: matchingPreset?.domain || "app",
          isFinance: app.isFinance,
          isInstalledOnDevice: true
        }
      })
    }
    return PRESET_BANK_APPS.map(b => ({ ...b, isFinance: true, isInstalledOnDevice: false }))
  }, [installedApps, appScopeTab])

  const filteredBanks = useMemo(() => {
    if (!bankSearchQuery.trim()) return displayBanks
    const q = bankSearchQuery.toLowerCase()
    return displayBanks.filter(bank => 
      bank.name.toLowerCase().includes(q) || 
      bank.package.toLowerCase().includes(q)
    )
  }, [bankSearchQuery, displayBanks])

  const handleSelectAllVisible = () => {
    const visibleIds = filteredBanks.map(b => b.id)
    const combined = Array.from(new Set([...selectedBanks, ...visibleIds]))
    saveSelectedBanks(combined)
    toast.success(`Selected all ${visibleIds.length} visible banking apps`)
  }

  const handleClearSelection = () => {
    saveSelectedBanks([])
    toast.info("Cleared bank app selection")
  }

  const showPlatformSwitcher = isSuperUser || detectedOS === "desktop"

  return (
    <div className="space-y-4">
      {showPlatformSwitcher ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 bg-secondary/30 p-1 border border-border">
          <button
            type="button"
            onClick={() => setActivePlatform("android")}
            className={cn(
              "h-9 px-2 text-[10px] font-mono uppercase font-bold tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer",
              activePlatform === "android"
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            )}
          >
            <AndroidIcon className="h-3.5 w-3.5" />
            <span>Android Native</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePlatform("ios")}
            className={cn(
              "h-9 px-2 text-[10px] font-mono uppercase font-bold tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer",
              activePlatform === "ios"
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            )}
          >
            <Apple className="h-3.5 w-3.5" />
            <span>iOS Shortcuts</span>
          </button>

          {isSuperUser && (
            <button
              type="button"
              onClick={() => setActivePlatform("macrodroid")}
              className={cn(
                "h-9 px-2 text-[10px] font-mono uppercase font-bold tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer col-span-2 sm:col-span-1",
                activePlatform === "macrodroid"
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>MacroDroid (Dev)</span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between p-2.5 bg-secondary/20 border border-border text-[10px] font-mono">
          <div className="flex items-center gap-2">
            {detectedOS === "ios" ? (
              <>
                <Apple className="h-4 w-4 text-foreground" />
                <span className="font-bold text-foreground uppercase">Apple iOS Ecosystem Detected</span>
              </>
            ) : (
              <>
                <AndroidIcon className="h-4 w-4 text-emerald-500" />
                <span className="font-bold text-foreground uppercase">Android Device Detected</span>
              </>
            )}
          </div>
          <span className="text-[9px] uppercase px-2 py-0.5 bg-secondary border border-border text-muted-foreground font-bold">
            Auto-Configured
          </span>
        </div>
      )}

      {!isPro ? (
        <ProLockOverlay 
          title="AUTONOMOUS DEVICE PUSH SYNC (PRO)"
          description="Real-time bank notification listening, automatic expense logging, and background projection recalculation are exclusive to LEGER_OS PRO."
        />
      ) : (
        <div className="space-y-4">
          {activePlatform === "android" && (
            <div className="space-y-4">
              <div className="p-4 bg-secondary/15 border border-border space-y-3">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-foreground block">
                      Google Play In-App Permission Disclosure
                    </span>
                    <p className="text-[10px] font-sans text-muted-foreground leading-relaxed">
                      LEGER_OS utilizes Android’s <code className="font-mono text-foreground bg-secondary px-1">NotificationListenerService</code> solely to detect payment confirmations and debit transactions from your selected banking applications in real-time.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[9px] font-mono pt-1">
                  <div className="p-2 bg-background border border-border/70 flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span>Zero Storage: Raw push texts are processed in memory and discarded.</span>
                  </div>
                  <div className="p-2 bg-background border border-border/70 flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span>Zero Snooping: Personal chats, 2FA codes, and OTPs are 100% ignored.</span>
                  </div>
                </div>
              </div>

              {Capacitor.isNativePlatform() && (
                <div className={cn(
                  "p-3 border flex items-center justify-between gap-3 text-xs font-mono transition-all",
                  hasNotificationAccess
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                )}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Bell className="h-4 w-4 shrink-0" />
                    <div className="min-w-0">
                      <span className="font-bold uppercase tracking-wider block">
                        {hasNotificationAccess ? "Notification Listener Active" : "Notification Access Required"}
                      </span>
                      <span className="text-[10px] text-muted-foreground block truncate">
                        {hasNotificationAccess
                          ? "LEGER_OS is monitoring selected bank push notifications in real time."
                          : "Enable LEGER_OS in Android device settings to allow auto-ingestion."}
                      </span>
                    </div>
                  </div>
                  {!hasNotificationAccess && (
                    <Button
                      size="sm"
                      onClick={handleOpenNativeSettings}
                      className="h-7 text-[10px] font-mono uppercase bg-amber-500 text-black hover:bg-amber-400 font-bold shrink-0 rounded-none cursor-pointer"
                    >
                      Grant Access
                    </Button>
                  )}
                </div>
              )}

              <div className="p-4 bg-card border border-border space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-3">
                  <div>
                    <span className="text-xs uppercase font-mono font-bold text-foreground block">
                      {installedApps.length > 0 ? "Installed Apps on Your Device" : "Select Your Banking & Payment Apps"}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-sans">
                      {installedApps.length > 0 
                        ? `Scanned ${installedApps.length} apps installed on your phone. Finance apps prioritized.`
                        : "Choose which banking apps to monitor on this device."}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono uppercase bg-secondary px-2 py-1 border border-border text-foreground font-bold">
                      {selectedBanks.length} Monitored
                    </span>
                    {selectedBanks.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearSelection}
                        className="text-[9px] font-mono uppercase text-muted-foreground hover:text-destructive underline cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <div className="relative pt-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                  <Input
                    placeholder="Search bank name or app (Santander, Revolut, MB WAY, CGD, N26...)"
                    value={bankSearchQuery}
                    onChange={(e) => setBankSearchQuery(e.target.value)}
                    className="pl-8 text-xs h-8 rounded-none font-mono bg-background"
                  />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setAppScopeTab("finance")}
                    className={cn(
                      "px-3.5 py-1.5 text-[9px] font-mono font-bold uppercase tracking-wider border cursor-pointer select-none transition-all shrink-0",
                      appScopeTab === "finance"
                        ? "bg-foreground border-foreground text-background font-black"
                        : "bg-card border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                    )}
                  >
                    Finance & Banking ({financeAppsCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAppScopeTab("all")}
                    className={cn(
                      "px-3.5 py-1.5 text-[9px] font-mono font-bold uppercase tracking-wider border cursor-pointer select-none transition-all shrink-0",
                      appScopeTab === "all"
                        ? "bg-foreground border-foreground text-background font-black"
                        : "bg-card border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                    )}
                  >
                    All Installed Apps ({allAppsCount})
                  </button>
                </div>

                {filteredBanks.length === 0 ? (
                  <div className="p-6 border border-dashed border-border/80 bg-secondary/10 text-center space-y-3">
                    <div className="mx-auto w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-mono font-bold uppercase text-foreground">
                        {appScopeTab === "finance" ? "No Banking Apps Detected" : "No Apps Match Search"}
                      </p>
                      <p className="text-[10px] text-muted-foreground max-w-sm mx-auto font-sans">
                        {appScopeTab === "finance"
                          ? "None of the installed applications on this device were automatically recognized as banking or payment services."
                          : `No applications matching "${bankSearchQuery}" were found.`}
                      </p>
                    </div>
                    {appScopeTab === "finance" && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAppScopeTab("all")}
                        className="text-[9px] font-mono uppercase tracking-wider font-bold h-7 rounded-none border-border cursor-pointer"
                      >
                        Select from All {allAppsCount} Apps on Phone &rarr;
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1 max-h-[280px] overflow-y-auto pr-1">
                    {filteredBanks.map((bank) => {
                      const isSelected = selectedBanks.includes(bank.id)
                      return (
                        <div
                          key={bank.id}
                          onClick={() => toggleBankSelection(bank.id)}
                          className={cn(
                            "p-2.5 border cursor-pointer transition-all flex flex-col justify-between space-y-1.5",
                            isSelected
                              ? "bg-foreground/5 border-foreground ring-1 ring-foreground"
                              : "bg-card border-border hover:bg-secondary/20 opacity-70"
                          )}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-2 min-w-0 pr-1 truncate">
                              <BankIconBadge domain={bank.domain} name={bank.name} />
                              <span className="font-bold text-[10px] font-mono text-foreground uppercase truncate">
                                {bank.name}
                              </span>
                            </div>
                            <div className={cn(
                              "w-3.5 h-3.5 flex items-center justify-center border shrink-0",
                              isSelected ? "bg-foreground text-background border-foreground" : "border-border bg-background"
                            )}>
                              {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-[8px] font-mono text-muted-foreground">
                            <span className="truncate max-w-[130px]">{bank.package}</span>
                            <span className="opacity-80 font-semibold">{bank.region}</span>
                          </div>
                        </div>
                      )
                    })}

                    {customBanks.map((customName) => {
                      const isSelected = selectedBanks.includes(customName)
                      return (
                        <div
                          key={customName}
                          onClick={() => toggleBankSelection(customName)}
                          className={cn(
                            "p-2.5 border cursor-pointer flex flex-col justify-between space-y-1.5",
                            isSelected ? "border-foreground bg-foreground/5" : "border-border bg-card opacity-70"
                          )}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-[10px] font-mono text-foreground uppercase truncate">
                              {customName}
                            </span>
                            <div className={cn(
                              "w-3.5 h-3.5 flex items-center justify-center border shrink-0",
                              isSelected ? "bg-foreground text-background border-foreground" : "border-border bg-background"
                            )}>
                              {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                            </div>
                          </div>
                          <span className="text-[8px] font-mono text-muted-foreground">Custom App Filter</span>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-border/40">
                  <button
                    type="button"
                    onClick={handleSelectAllVisible}
                    className="text-[9px] font-mono uppercase text-muted-foreground hover:text-foreground underline cursor-pointer"
                  >
                    Select All Filtered ({filteredBanks.length})
                  </button>

                  <span className="text-[9px] font-mono text-muted-foreground">
                    On native Android APK, installed packages are auto-detected.
                  </span>
                </div>

                <form onSubmit={handleAddCustomBank} className="flex gap-2 pt-2 border-t border-border/40">
                  <Input
                    placeholder="Add unlisted bank package (e.g. com.mybank.app)"
                    value={customBankInput}
                    onChange={(e) => setCustomBankInput(e.target.value)}
                    className="rounded-none text-xs h-9 font-mono bg-background"
                  />
                  <Button
                    type="submit"
                    className="rounded-none uppercase font-mono text-[9px] font-bold h-9 px-4 bg-foreground text-background hover:bg-foreground/90 shrink-0 cursor-pointer"
                  >
                    Add Bank
                  </Button>
                </form>
              </div>
            </div>
          )}

          {activePlatform === "ios" && (
            <div className="space-y-4">
              <div className="p-4 bg-card border border-border space-y-4">
                <div className="flex items-center justify-between border-b border-border/40 pb-3">
                  <div className="space-y-0.5">
                    <span className="text-xs uppercase font-mono font-bold text-foreground flex items-center gap-1.5">
                      <Apple className="h-4 w-4 text-foreground" /> Apple Shortcuts Automation (iOS 17+)
                    </span>
                    <p className="text-[10px] text-muted-foreground font-sans">
                      Apple iOS isolates apps from notification drawers. Connect Apple Wallet to stream transactions autonomously in real-time.
                    </p>
                  </div>
                  <span className="text-[9px] font-mono uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 px-2 py-0.5 font-bold shrink-0">
                    Active Node
                  </span>
                </div>

                {/* 1-Tap Open Shortcuts Button */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <Button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        window.location.href = "shortcuts://"
                      }
                    }}
                    className="w-full rounded-none uppercase font-mono text-[10px] font-bold tracking-wider h-10 bg-foreground text-background hover:bg-foreground/90 cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                  >
                    <Apple className="h-3.5 w-3.5" />
                    <span>Open Apple Shortcuts App</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      if (!user?.id) return
                      const toastId = toast.loading("Sending test Apple Pay transaction...")
                      try {
                        const res = await fetch("/api/transactions/device-push", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            userId: user.id,
                            amount: -3.80,
                            merchant: "Apple Pay Test Merchant",
                            bank_app: "Apple Wallet",
                            source: "apple-shortcuts-test",
                            raw_text: "Payment of €3.80 at Apple Pay Test Merchant",
                            date: new Date().toISOString()
                          })
                        })
                        const data = await res.json()
                        toast.dismiss(toastId)
                        if (res.ok && data.success) {
                          toast.success("Test transaction ingested into Ledger (-€3.80)!")
                        } else {
                          toast.error(data.error || "Test dispatch failed")
                        }
                      } catch (err: any) {
                        toast.dismiss(toastId)
                        toast.error(err.message || "Failed to send test payload")
                      }
                    }}
                    className="w-full rounded-none uppercase font-mono text-[10px] font-bold tracking-wider h-10 bg-card border-border hover:bg-secondary/40 text-foreground cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Test Webhook Payload</span>
                  </Button>
                </div>

                {/* Pre-authenticated Webhook URL */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[9px] font-mono uppercase font-bold text-muted-foreground">
                      Your Private Pre-Authenticated Webhook URL
                    </Label>
                    <span className="text-[8px] font-mono text-emerald-500 uppercase font-bold">
                      256-Bit SSL Encrypted
                    </span>
                  </div>
                  <div className="bg-secondary/40 border border-border p-2.5 font-mono text-[9px] break-all select-all flex items-center justify-between gap-2 text-foreground">
                    <span className="truncate">{productionEndpoint}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyUrl(productionEndpoint, "iOS Webhook URL")}
                      className="hover:text-emerald-500 shrink-0 p-1 cursor-pointer"
                      title="Copy URL"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* 3-Step Setup Guide */}
                <div className="space-y-2 pt-2 border-t border-border/40 text-[10px] font-sans text-muted-foreground leading-relaxed">
                  <p className="font-mono text-[9px] font-bold text-foreground uppercase">1-Minute Setup in Apple Shortcuts:</p>
                  <ol className="list-decimal list-inside space-y-1.5">
                    <li>Open <strong className="text-foreground">Shortcuts</strong> on your iPhone $\rightarrow$ Tap the <strong className="text-foreground">Automation</strong> tab at the bottom $\rightarrow$ Tap <strong className="text-foreground">+</strong>.</li>
                    <li>Create Personal Automation $\rightarrow$ Choose <strong className="text-foreground">Transaction</strong> (Apple Pay / Wallet) $\rightarrow$ Card: <strong className="text-foreground">Any</strong>.</li>
                    <li>Select <strong className="text-foreground">Run Immediately</strong> and disable "Notify When Run".</li>
                    <li>Add Action: <strong className="text-foreground">Get Contents of URL</strong> $\rightarrow$ Set Method to <strong className="text-foreground">POST</strong> $\rightarrow$ Paste your URL above $\rightarrow$ Set Request Body to <strong className="text-foreground">Shortcut Input</strong>.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {activePlatform === "macrodroid" && isSuperUser && (
            <div className="space-y-4">
              <div className="p-4 bg-card border border-border space-y-3">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <div className="space-y-0.5">
                    <span className="text-xs uppercase font-mono font-bold text-foreground flex items-center gap-1.5">
                      <Terminal className="h-3.5 w-3.5" /> MacroDroid / Tasker Development Bridge
                    </span>
                    <p className="text-[10px] text-muted-foreground font-sans">
                      Active developer webhook for MacroDroid and external Android automation runners. (Internal / Dev accounts only).
                    </p>
                  </div>
                  <span className="text-[9px] font-mono uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 px-2 py-0.5 font-bold">
                    Dev Active
                  </span>
                </div>

                <div className="space-y-1.5 pt-1">
                  <Label className="text-[9px] font-mono uppercase font-bold text-muted-foreground">
                    MacroDroid Ingestion Endpoint
                  </Label>
                  <div className="bg-secondary/40 border border-border p-2.5 font-mono text-[9px] break-all select-all flex items-center justify-between gap-2 text-foreground">
                    <span className="truncate">{legacyMacrodroidEndpoint}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyUrl(legacyMacrodroidEndpoint, "MacroDroid URL")}
                      className="hover:text-emerald-500 shrink-0 p-1 cursor-pointer"
                      title="Copy URL"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-border/40 text-[10px] font-sans text-muted-foreground leading-relaxed">
                  <p className="font-mono text-[9px] font-bold text-foreground uppercase">MacroDroid Configuration Parameters:</p>
                  <ul className="list-disc list-inside space-y-1 font-mono text-[9px]">
                    <li>Trigger: <span className="text-foreground">Notification Received (Select Bank Apps)</span></li>
                    <li>Action: <span className="text-foreground">HTTP Request (POST)</span></li>
                    <li>Content Body: <span className="text-foreground">{"{\"raw_text\": \"[not_title] - [not_text]\"}"}</span></li>
                    <li>Content-Type: <span className="text-foreground">application/json</span></li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="p-4 bg-card border border-border space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 bg-foreground/10 border border-border flex items-center justify-center shrink-0 mt-0.5">
              <Bell className="h-4 w-4 text-foreground" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
                  Push Notification Alerts
                </h4>
                {isPushSubscribed ? (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 font-bold uppercase">
                    Active
                  </span>
                ) : (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 bg-secondary text-muted-foreground border border-border font-bold uppercase">
                    Disabled
                  </span>
                )}
              </div>
              <p className="text-[10px] font-sans text-muted-foreground leading-relaxed">
                Receive instant notifications when new card transactions occur, allowing 1-tap merchant renaming and live safe daily burn updates.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {isPushSubscribed ? (
              <>
                {isSuperUser && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={sendTestPush}
                    className="h-8 rounded-none border-border font-mono text-[10px] uppercase cursor-pointer flex items-center gap-1.5"
                  >
                    <Send className="h-3 w-3" /> Test Alert
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPushLoading}
                  onClick={unsubscribePush}
                  className="h-8 rounded-none border-border font-mono text-[10px] uppercase text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Disable
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={isPushLoading}
                onClick={subscribePush}
                className="h-8 px-4 rounded-none bg-foreground text-background hover:bg-foreground/90 font-mono text-[10px] uppercase font-bold tracking-wider cursor-pointer shadow-xs"
              >
                {isPushLoading ? "Enabling..." : "Enable Push Alerts"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
