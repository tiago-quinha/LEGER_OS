"use client"

import React, { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  RefreshCcw, History, Calendar, 
  Clock, Plus, Trash2, Search, Sparkles, Brain
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useSystem } from "@/lib/SystemContext"
import { toast } from "sonner"
import { ProLockOverlay } from "@/components/ProLockOverlay"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select"

interface Memory {
  id: string
  content: string
  category: string
  categoryId?: number | string | null
  createdAt: string
  expiresAt: string | null
  status: "active" | "expired" | string
}

interface LegerAIPageViewProps {
  cycleData: any
  expenses: any[]
  categories: any[]
}

export function LegerAIPageView({ cycleData, expenses, categories }: LegerAIPageViewProps) {
  const { profile, user, refreshProfile, isPro, setSettingsOpen, setSettingsActiveTab, setSubscriptionOnly } = useSystem()
  
  // Memories Page States
  const [memories, setMemories] = useState<Memory[]>([])
  const [activeTab, setActiveTab] = useState<string>("all")
  const [newMemoryText, setNewMemoryText] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Feature: Text search
  const [searchQuery, setSearchQuery] = useState("")

  // Feature: Collapsed expired groups
  const [expandedExpiredGroups, setExpandedExpiredGroups] = useState<Set<string>>(new Set())

  // Clickable memory states (Edit Modal)
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)
  const [editContent, setEditContent] = useState("")
  const [editCategory, setEditCategory] = useState<Memory["category"]>("other")
  const [editExpiryOption, setEditExpiryOption] = useState<string>("keep")
  const [customDays, setCustomDays] = useState<string>("7")
  const [isUpdating, setIsUpdating] = useState(false)

  // Fetch all memories on mount/profile change
  const fetchMemories = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/leger-ai/memory")
      if (response.ok) {
        const data = await response.json()
        setMemories(data.memories || [])
      } else {
        const err = await response.json()
        console.error("Failed to load memories:", err.error)
      }
    } catch (err) {
      console.error("Mainframe error loading memories:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchMemories()
    }
  }, [user])

  // Handle adding a new memory
  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMemoryText.trim() || isSubmitting) return

    if (!isPro) {
      toast.error("Leger AI Context Memory is a LEGER_OS PRO feature.", {
        description: "Upgrade to PRO to unlock conversational routine tracking and active memory gates.",
      })
      setSettingsActiveTab("pro")
      setSubscriptionOnly(true)
      setSettingsOpen(true)
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/leger-ai/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newMemoryText })
      })

      if (response.ok) {
        const data = await response.json()
        setMemories(data.memories || [])
        setNewMemoryText("")
        toast.success("Context applied", {
          description: `AI successfully analyzed and registered: "${data.memory.content}"`
        })
        
        // Refresh system context profile
        await refreshProfile()
      } else {
        const err = await response.json()
        toast.error("Memory parsing failed", { description: err.error || "Neural model error." })
      }
    } catch (err) {
      console.error(err)
      toast.error("Connection lost", { description: "Mainframe query node disconnected." })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle updating an existing memory
  const handleUpdateMemory = async () => {
    if (!selectedMemory || isUpdating) return

    const originalMemories = [...memories]
    setIsUpdating(true)

    // Calculate new expiresAt locally
    let expiresAt = selectedMemory.expiresAt
    if (editExpiryOption === "permanent") {
      expiresAt = null
    } else if (editExpiryOption === "1day") {
      expiresAt = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString()
    } else if (editExpiryOption === "3days") {
      expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    } else if (editExpiryOption === "7days" || editExpiryOption === "extend7") {
      expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    } else if (editExpiryOption === "14days") {
      expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    } else if (editExpiryOption === "30days" || editExpiryOption === "extend30") {
      expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    } else if (editExpiryOption === "90days") {
      expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    } else if (editExpiryOption === "custom") {
      const days = parseInt(customDays) || 7
      expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
    }

    // Optimistically update local memories state immediately
    const updatedMemories = memories.map(m => {
      if (m.id === selectedMemory.id) {
        return {
          ...m,
          content: editContent,
          category: editCategory,
          expiresAt,
          status: (expiresAt && new Date(expiresAt) < new Date()) ? "expired" as const : "active" as const
        }
      }
      return m
    })
    setMemories(updatedMemories)

    // Instantly close dialog & show success feedback
    setSelectedMemory(null)
    toast.success("Memory updated", {
      description: "Mainframe context updated."
    })

    try {
      const response = await fetch("/api/leger-ai/memory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedMemory.id,
          content: editContent,
          category: editCategory,
          expiresAt
        })
      })

      if (!response.ok) {
        const err = await response.json()
        setMemories(originalMemories) // Rollback
        toast.error("Update failed", { description: err.error })
      } else {
        await refreshProfile()
      }
    } catch (err) {
      console.error(err)
      setMemories(originalMemories) // Rollback
      toast.error("Connection error", { description: "Failed to save changes to database." })
    } finally {
      setIsUpdating(false)
    }
  }

  // Handle quick-extending a memory by 7 days (no modal needed)
  const handleQuickExtend = async (mem: Memory, event: React.MouseEvent) => {
    event.stopPropagation()
    
    const originalMemories = [...memories]
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    // Optimistic update
    const updatedMemories = memories.map(m => {
      if (m.id === mem.id) {
        return { ...m, expiresAt: newExpiresAt, status: "active" as const }
      }
      return m
    })
    setMemories(updatedMemories)
    toast.success("Extended +7 days", { description: `"${mem.content}" extended.` })

    try {
      const response = await fetch("/api/leger-ai/memory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: mem.id,
          content: mem.content,
          category: mem.category,
          expiresAt: newExpiresAt
        })
      })

      if (!response.ok) {
        setMemories(originalMemories)
        toast.error("Extend failed", { description: "Could not save new expiry date." })
      } else {
        await refreshProfile()
      }
    } catch {
      setMemories(originalMemories)
      toast.error("Connection error", { description: "Failed to extend memory." })
    }
  }

  // Handle deleting a memory
  const handleDeleteMemory = async (id: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation() // Prevent opening modal
    }
    
    const originalMemories = [...memories]

    // Optimistically remove the memory card locally immediately
    const updatedMemories = memories.filter(m => m.id !== id)
    setMemories(updatedMemories)

    if (selectedMemory?.id === id) {
      setSelectedMemory(null)
    }

    toast.success("Memory forgotten", {
      description: "Context removed from queries."
    })

    try {
      const response = await fetch(`/api/leger-ai/memory?id=${id}`, {
        method: "DELETE"
      })

      if (!response.ok) {
        const err = await response.json()
        setMemories(originalMemories) // Rollback
        toast.error("Clear action failed", { description: err.error })
      } else {
        await refreshProfile()
      }
    } catch (err) {
      console.error(err)
      setMemories(originalMemories) // Rollback
      toast.error("Connection error", { description: "Failed to sync memory deletion." })
    }
  }

  // Open Edit Modal helper
  const handleCardClick = (mem: Memory) => {
    setSelectedMemory(mem)
    setEditContent(mem.content)
    setEditCategory(mem.category)
    setEditExpiryOption("keep")
  }

  // Compute available category tabs dynamically from user categories & registered memories
  const availableCategoryTabs = useMemo(() => {
    const set = new Set<string>()
    memories.forEach(m => {
      if (m.category) set.add(m.category)
    })
    if (categories && Array.isArray(categories)) {
      categories.forEach(c => {
        if (c.name) set.add(c.name)
      })
    }
    return ["all", ...Array.from(set)]
  }, [memories, categories])

  // Filter memories based on tab selection + text search
  const filteredMemories = useMemo(() => {
    let result = memories
    if (activeTab !== "all") {
      result = result.filter(m => m.category.toLowerCase() === activeTab.toLowerCase())
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(m => m.content.toLowerCase().includes(q))
    }
    return result
  }, [memories, activeTab, searchQuery])

  // Feature: Summary stats computed from all memories (not filtered)
  const memoryStats = useMemo(() => {
    const now = new Date()
    const soonThresholdMs = 2 * 24 * 60 * 60 * 1000 // 2 days
    let active = 0
    let expiringSoon = 0
    let expired = 0

    memories.forEach(mem => {
      if (mem.status === "expired") {
        expired++
      } else if (mem.expiresAt) {
        const diffMs = new Date(mem.expiresAt).getTime() - now.getTime()
        if (diffMs <= 0) {
          expired++
        } else if (diffMs <= soonThresholdMs) {
          expiringSoon++
          active++ // still active, just flagged
        } else {
          active++
        }
      } else {
        active++ // permanent
      }
    })

    return { active, expiringSoon, expired }
  }, [memories])

  // Group memories by date relative to today
  const groupedMemories = useMemo(() => {
    const groups: { [key: string]: Memory[] } = {}
    
    filteredMemories.forEach(mem => {
      const date = new Date(mem.createdAt)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      let key = ""
      if (date.toDateString() === today.toDateString()) {
        key = "TODAY"
      } else if (date.toDateString() === yesterday.toDateString()) {
        key = "YESTERDAY"
      } else {
        key = date.toLocaleDateString("en-GB", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric"
        }).toUpperCase()
      }

      if (!groups[key]) groups[key] = []
      groups[key].push(mem)
    })

    return groups
  }, [filteredMemories])

  // Map category helper matching /ledger dot + color style
  const getCategoryDetails = (cat: string) => {
    const matchedCategory = (categories || []).find(c => c.name?.toLowerCase() === cat?.toLowerCase())
    if (matchedCategory) {
      return {
        label: matchedCategory.name,
        color: matchedCategory.color || "#10b981"
      }
    }

    switch (cat?.toLowerCase()) {
      case "goal":
        return { label: "Goal", color: "#f59e0b" }
      case "health":
        return { label: "Health Condition", color: "#f43f5e" }
      case "financial":
        return { label: "Financial", color: "#10b981" }
      default:
        return { label: cat || "Other", color: "#71717a" }
    }
  }

  // Feature: Get projection override impact for a memory's category
  const getProjectionImpact = (mem: Memory): string | null => {
    if (mem.status === "expired") return null
    const overrides = profile?.projection_overrides || []
    if (!overrides.length || !mem.categoryId) return null

    const catIdStr = String(mem.categoryId)
    const match = overrides.find((ov: any) => ov.categoryId && String(ov.categoryId) === catIdStr)
    if (!match) return null

    // Determine impact description
    if (match.multiplier !== undefined && match.multiplier !== null && match.multiplier !== 1.0) {
      const pctChange = Math.round((match.multiplier - 1.0) * 100)
      const catDetails = getCategoryDetails(mem.category)
      if (pctChange < 0) {
        return `↓ ${Math.abs(pctChange)}% ${catDetails.label}`
      } else if (pctChange > 0) {
        return `↑ ${pctChange}% ${catDetails.label}`
      } else if (match.multiplier === 0) {
        return `⏸ ${catDetails.label} frozen`
      }
    }
    if (match.fixedDelta) {
      const delta = parseFloat(match.fixedDelta)
      const catDetails = getCategoryDetails(mem.category)
      if (delta < 0) {
        return `↓ €${Math.abs(delta).toFixed(0)} ${catDetails.label}`
      } else if (delta > 0) {
        return `↑ €${delta.toFixed(0)} ${catDetails.label}`
      }
    }
    return null
  }

  // Calculate remaining duration string
  const getDurationString = (expiresAt: string | null) => {
    if (!expiresAt) return "Permanent"
    
    const expiry = new Date(expiresAt)
    const diffTime = expiry.getTime() - Date.now()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) return "Expired"
    if (diffDays === 1) return "Expires tomorrow"
    return `Expires in ${diffDays}d`
  }

  // Feature: Check if memory is expiring soon (within 2 days)
  const isExpiringSoon = (mem: Memory): boolean => {
    if (mem.status === "expired" || !mem.expiresAt) return false
    const diffMs = new Date(mem.expiresAt).getTime() - Date.now()
    return diffMs > 0 && diffMs <= 2 * 24 * 60 * 60 * 1000
  }

  // Toggle expired group visibility
  const toggleExpiredGroup = (dateKey: string) => {
    setExpandedExpiredGroups(prev => {
      const next = new Set(prev)
      if (next.has(dateKey)) {
        next.delete(dateKey)
      } else {
        next.add(dateKey)
      }
      return next
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-10 md:space-y-12 pb-36 md:pb-8 w-full"
    >


      {/* 1. Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8 border-b border-foreground/10 pb-6 md:pb-8 relative">
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-[9px] md:text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
            <Brain className="h-3.5 w-3.5" />
            <span>Neural Context Memory</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase leading-none break-words">
            My Memory
          </h1>

          {/* Feature 5: Summary stats bar */}
          {memories.length > 0 && (
            <div className="flex items-center gap-3 text-[9px] md:text-[10px] font-mono tracking-wider text-muted-foreground pt-1 select-none">
              <span className="text-foreground/70 font-bold">{memoryStats.active} active</span>
              {memoryStats.expiringSoon > 0 && (
                <>
                  <span className="text-muted-foreground/30">·</span>
                  <span className="text-amber-500 font-bold">{memoryStats.expiringSoon} expiring soon</span>
                </>
              )}
              {memoryStats.expired > 0 && (
                <>
                  <span className="text-muted-foreground/30">·</span>
                  <span>{memoryStats.expired} expired</span>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Centered Content Column */}
      <div className="max-w-[900px] mx-auto w-full space-y-8 pt-4">

      {/* Quick Input Box */}
      {!isPro ? (
        <ProLockOverlay 
          title="LEGER_AI CONTEXT MEMORY (PRO)"
          description="Conversational routine tracking, hybrid work overrides, and dynamic active cycle memory gates are exclusive to LEGER_OS PRO nodes."
          className="rounded-none shadow-xl border border-emerald-500/30"
        />
      ) : (
        <div className="p-5 border border-border ledger-border bg-card/60 space-y-3">
          <h4 className="text-xs font-bold tracking-tight text-foreground">Add memory</h4>
          <form onSubmit={handleAddMemory} className="space-y-3">
            <textarea
              value={newMemoryText}
              onChange={(e) => setNewMemoryText(e.target.value)}
              placeholder="e.g. 'Going on vacation for 10 days', 'Hybrid work this week, less fuel spend'..."
              className="w-full min-h-[72px] p-3 text-xs bg-secondary/20 border border-border/80 rounded-none focus:outline-none focus:border-foreground/40 font-sans resize-none placeholder:text-muted-foreground/40 text-foreground leading-relaxed"
              disabled={isSubmitting}
            />
            <div className="flex items-center justify-end">
              <Button 
                type="submit"
                disabled={!newMemoryText.trim() || isSubmitting}
                className="h-8 rounded-none bg-foreground text-background hover:bg-muted font-mono text-[9px] uppercase font-bold tracking-wider px-5 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer"
              >
                {isSubmitting ? <RefreshCcw className="h-3 w-3 animate-spin mr-1.5" /> : <Plus className="h-3 w-3 mr-1.5" />}
                Save
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Feature 6: Search + Dynamic Filter Tabs */}
      <div className="space-y-3">
        {/* Search input */}
        {memories.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memories..."
              className="w-full h-8 pl-9 pr-3 text-xs bg-card border border-border/60 rounded-none focus:outline-none focus:border-foreground/30 font-sans text-foreground placeholder:text-muted-foreground/40"
            />
          </div>
        )}

        {/* Category tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-hide border-b border-border/30">
          {availableCategoryTabs.map(tab => {
            const isActive = activeTab.toLowerCase() === tab.toLowerCase()
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-3.5 py-1.5 text-[9px] font-mono font-bold uppercase tracking-wider border cursor-pointer select-none transition-all shrink-0",
                  isActive 
                    ? "bg-foreground border-foreground text-background font-black" 
                    : "bg-card border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                {tab === "all" ? "Timeline" : tab}
              </button>
            )
          })}
        </div>
      </div>

      {/* Timeline Feed */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3 font-mono text-xs text-muted-foreground">
          <RefreshCcw className="h-5 w-5 animate-spin text-emerald-500" />
          <p className="uppercase tracking-widest text-[10px]">Loading memories matrix...</p>
        </div>
      ) : memories.length === 0 ? (
        <div className="p-8 border border-border border-dashed bg-secondary/5 text-center font-mono space-y-2">
          <History className="h-6 w-6 text-muted-foreground/30 mx-auto" />
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">No active memories registered</p>
          <p className="text-[10px] text-muted-foreground/50 leading-relaxed font-sans max-w-sm mx-auto">
            Ask the Leger AI Assistant in the sidebar or type routines directly into the ingestion matrix above to record them.
          </p>
        </div>
      ) : filteredMemories.length === 0 ? (
        <div className="p-8 border border-border border-dashed bg-secondary/5 text-center font-mono space-y-2">
          <Search className="h-5 w-5 text-muted-foreground/30 mx-auto" />
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
            {searchQuery.trim() ? "No memories match your search" : "No matching category records found"}
          </p>
        </div>
      ) : (
        <div className="space-y-8 [content-visibility:auto] [contain-intrinsic-size:1px_400px]">
          {Object.keys(groupedMemories).map(dateKey => {
            const allGroupMemories = groupedMemories[dateKey]
            const activeGroupMemories = allGroupMemories.filter(m => m.status !== "expired")
            const expiredGroupMemories = allGroupMemories.filter(m => m.status === "expired")
            const isExpiredGroupExpanded = expandedExpiredGroups.has(dateKey)

            return (
              <div key={dateKey} className="space-y-4">
                {/* Timeline Date Divider */}
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-mono font-bold tracking-widest text-muted-foreground shrink-0 select-none">
                    {dateKey}
                  </span>
                  <div className="h-px bg-border/40 flex-grow" />
                </div>

                {/* Active Memories */}
                {activeGroupMemories.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeGroupMemories.map(mem => {
                      const catDetails = getCategoryDetails(mem.category)
                      const durationStr = getDurationString(mem.expiresAt)
                      const soon = isExpiringSoon(mem)
                      const projectionImpact = getProjectionImpact(mem)

                      return (
                        <div 
                          key={mem.id}
                          onClick={() => handleCardClick(mem)}
                          className={cn(
                            "group p-4 border ledger-border bg-card relative overflow-hidden flex flex-col justify-between transition-all duration-300 cursor-pointer",
                            soon 
                              ? "border-amber-500/40 hover:border-amber-500/60" 
                              : "border-border hover:border-foreground/30 hover:shadow-sm"
                          )}
                        >
                          <div className="space-y-3">
                            {/* Badges & Actions matching /ledger table styling */}
                            <div className="flex items-center justify-between gap-3 select-none">
                              <div className="flex items-center gap-1.5 overflow-hidden text-[9px] md:text-xs font-mono uppercase">
                                <div 
                                  className="h-1.5 w-1.5 rounded-full shrink-0" 
                                  style={{ backgroundColor: catDetails.color }} 
                                />
                                <span className="truncate uppercase font-bold text-foreground/80 tracking-wider text-[9px]">
                                  {catDetails.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {/* Feature 3: Quick extend button for expiring-soon cards */}
                                {soon && (
                                  <button
                                    onClick={(e) => handleQuickExtend(mem, e)}
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase border border-amber-500/30 text-amber-500 bg-amber-500/5 hover:bg-amber-500/15 transition-colors cursor-pointer"
                                    title="Extend 7 days"
                                  >
                                    +7d
                                  </button>
                                )}
                                <button 
                                  onClick={(e) => handleDeleteMemory(mem.id, e)}
                                  className="text-muted-foreground hover:text-destructive opacity-40 group-hover:opacity-100 transition-all cursor-pointer"
                                  title="Forget Fact"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Fact Content */}
                            <p className="text-xs font-bold text-foreground leading-relaxed">
                              {mem.content}
                            </p>
                          </div>

                          {/* Footer: date left, impact + duration stacked right */}
                          <div className="flex items-end justify-between gap-4 mt-6 pt-2 border-t border-border/20 text-[9px] font-mono text-muted-foreground/60 select-none">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(mem.createdAt).toLocaleDateString("en-GB")}
                            </span>
                            <div className="flex flex-col items-end gap-0.5">
                              {projectionImpact && (
                                <span className="font-mono font-bold text-[9px] text-foreground/80 tracking-tight">
                                  {projectionImpact}
                                </span>
                              )}
                              <span className={cn(
                                "flex items-center gap-1 font-bold",
                                soon ? "text-amber-500" : "text-foreground/75"
                              )}>
                                <Clock className="h-3 w-3" />
                                {durationStr}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Expired memories — always visible below active */}
                {expiredGroupMemories.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-40 hover:opacity-60 transition-opacity">
                    {expiredGroupMemories.map(mem => {
                      const catDetails = getCategoryDetails(mem.category)
                      return (
                        <div 
                          key={mem.id}
                          onClick={() => handleCardClick(mem)}
                          className="group p-4 border border-border/40 ledger-border bg-card flex flex-col justify-between cursor-pointer"
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3 select-none">
                              <div className="flex items-center gap-1.5 overflow-hidden text-[9px] font-mono uppercase">
                                <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: catDetails.color }} />
                                <span className="truncate uppercase font-bold text-foreground/60 tracking-wider text-[9px]">{catDetails.label}</span>
                              </div>
                              <button onClick={(e) => handleDeleteMemory(mem.id, e)} className="text-muted-foreground hover:text-destructive opacity-40 group-hover:opacity-100 transition-all cursor-pointer">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <p className="text-xs text-foreground/60 leading-relaxed line-through">{mem.content}</p>
                          </div>
                          <div className="flex items-center justify-between gap-4 mt-4 pt-2 border-t border-border/20 text-[9px] font-mono text-muted-foreground/50 select-none">
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(mem.createdAt).toLocaleDateString("en-GB")}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Expired</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Edit Memory Modal */}
      <Dialog open={selectedMemory !== null} onOpenChange={(open) => !open && setSelectedMemory(null)}>
        <DialogContent className="max-w-[420px] bg-background border border-border ledger-border p-6 rounded-none font-sans">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-sm font-bold font-mono uppercase tracking-wider text-foreground">
              Configure Memory
            </DialogTitle>
            <DialogDescription className="text-[11px] text-muted-foreground">
              Directly adjust contextual parameter tags or extend duration.
            </DialogDescription>
          </DialogHeader>

          {selectedMemory && (
            <div className="space-y-4 py-3">
              {/* Content input */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Fact Content</label>
                <input
                  type="text"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full p-2.5 text-xs bg-secondary/30 border border-border/80 focus:outline-none focus:border-foreground/35 rounded-none text-foreground font-medium"
                />
              </div>

              {/* Category Select */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Category Class</label>
                <Select value={editCategory} onValueChange={(val) => setEditCategory(val || "financial")}>
                  <SelectTrigger className="w-full h-9 p-2.5 text-xs bg-secondary/30 border border-border/80 rounded-none text-foreground font-mono uppercase">
                    {(() => {
                      const matchedFinancial = categories?.find((c: any) => c.name.toLowerCase() === editCategory.toLowerCase())
                      if (matchedFinancial) {
                        return (
                          <div className="flex items-center gap-2 overflow-hidden">
                            <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: matchedFinancial.color }} />
                            <span className="truncate">{matchedFinancial.name}</span>
                          </div>
                        )
                      }
                      return <span className="truncate">{editCategory}</span>
                    })()}
                  </SelectTrigger>
                  <SelectContent className="bg-[#121215] border border-border font-mono text-xs uppercase">
                    {categories && categories.length > 0 && (
                      <SelectGroup>
                        <SelectLabel className="text-[9px] text-muted-foreground uppercase tracking-widest px-2 py-1">Financial Categories</SelectLabel>
                        {categories.map((cat: any) => (
                          <SelectItem key={cat.id} value={cat.name}>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                              <span>{cat.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    )}
                    <SelectGroup>
                      <SelectLabel className="text-[9px] text-muted-foreground uppercase tracking-widest px-2 py-1">Context & Lifestyle Tags</SelectLabel>
                      <SelectItem value="goal">Goal</SelectItem>
                      <SelectItem value="health">Health Condition</SelectItem>
                      <SelectItem value="financial">Financial</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {/* Expiry Selector */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Context Duration / Expiration</label>
                <select
                  value={editExpiryOption}
                  onChange={(e) => setEditExpiryOption(e.target.value)}
                  className="w-full p-2.5 text-xs bg-secondary/30 border border-border/80 focus:outline-none focus:border-foreground/35 rounded-none text-foreground font-mono uppercase"
                >
                  <option value="keep">Keep Current ({selectedMemory.expiresAt ? `Expires: ${new Date(selectedMemory.expiresAt).toLocaleDateString("en-GB")}` : "Permanent"})</option>
                  <option value="1day">Set Active for 1 Day (24 hrs)</option>
                  <option value="3days">Set Active for 3 Days</option>
                  <option value="7days">Set Active for 7 Days (1 Week)</option>
                  <option value="14days">Set Active for 14 Days (2 Weeks)</option>
                  <option value="30days">Set Active for 30 Days (1 Month)</option>
                  <option value="90days">Set Active for 90 Days (3 Months)</option>
                  <option value="permanent">Make Permanent (No Expiration)</option>
                  <option value="custom">Custom Duration (In Days)...</option>
                </select>
              </div>

              {/* Custom Days Input */}
              {editExpiryOption === "custom" && (
                <div className="space-y-1.5 animate-fade-in">
                  <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Active Duration (Number of Days)</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={customDays}
                    onChange={(e) => setCustomDays(e.target.value)}
                    placeholder="Enter days (e.g. 14)"
                    className="w-full p-2.5 text-xs bg-secondary/30 border border-border/80 focus:outline-none focus:border-foreground/35 rounded-none text-foreground font-mono"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4 pt-3 border-t border-border/25">
            <Button
              variant="outline"
              onClick={(e) => selectedMemory && handleDeleteMemory(selectedMemory.id)}
              className="h-8 rounded-none border border-destructive/30 hover:bg-destructive/10 text-destructive font-mono text-[9px] uppercase font-bold tracking-wider px-4 sm:mr-auto cursor-pointer"
            >
              <Trash2 className="h-3 w-3 mr-1.5" />
              Forget
            </Button>
            <Button
              variant="ghost"
              onClick={() => setSelectedMemory(null)}
              className="h-8 rounded-none border border-border hover:bg-muted font-mono text-[9px] uppercase font-bold tracking-wider px-4 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateMemory}
              disabled={isUpdating || !editContent.trim()}
              className="h-8 rounded-none bg-foreground text-background hover:bg-muted font-mono text-[9px] uppercase font-bold tracking-wider px-5 cursor-pointer"
            >
              {isUpdating && <RefreshCcw className="h-3 w-3 animate-spin mr-1.5" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </motion.div>
  )
}
