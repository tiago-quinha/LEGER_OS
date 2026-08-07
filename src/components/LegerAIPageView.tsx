"use client"

import React, { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Brain, Cpu, Zap, X, ShieldCheck, Sparkles, MessageSquare, 
  RefreshCcw, History, TrendingUp, AlertTriangle, Calendar, 
  Clock, Plus, Trash2, HelpCircle, Activity, Award, Heart, 
  DollarSign, Globe, Settings, Eye, Sliders
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useSystem } from "@/lib/SystemContext"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"

interface Memory {
  id: string
  content: string
  category: "lifestyle" | "goal" | "health" | "financial" | "other"
  createdAt: string
  expiresAt: string | null
  status: "active" | "expired"
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
  const [activeTab, setActiveTab] = useState<"all" | "goal" | "lifestyle" | "health" | "financial" | "other">("all")
  const [newMemoryText, setNewMemoryText] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showUpdatedBanner, setShowUpdatedBanner] = useState(false)

  // Clickable memory states (Edit Modal)
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)
  const [editContent, setEditContent] = useState("")
  const [editCategory, setEditCategory] = useState<Memory["category"]>("other")
  const [editExpiryOption, setEditExpiryOption] = useState<"keep" | "extend7" | "extend30" | "permanent">("keep")
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
        setShowUpdatedBanner(true)
        toast.success("Context applied", {
          description: `AI successfully analyzed and registered: "${data.memory.content}"`
        })
        
        // Hide update banner after 5 seconds
        setTimeout(() => setShowUpdatedBanner(false), 6000)
        
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
    } else if (editExpiryOption === "extend7") {
      expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    } else if (editExpiryOption === "extend30") {
      expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
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

  // Filter memories based on tab selection
  const filteredMemories = useMemo(() => {
    if (activeTab === "all") return memories
    return memories.filter(m => m.category === activeTab)
  }, [memories, activeTab])

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

  // Map category helper
  const getCategoryDetails = (cat: string) => {
    switch (cat) {
      case "lifestyle":
        return { label: "Lifestyle", color: "text-blue-400 bg-blue-500/10 border-blue-500/20", icon: Heart }
      case "goal":
        return { label: "Goal", color: "text-amber-400 bg-amber-500/10 border-amber-500/20", icon: Award }
      case "health":
        return { label: "Health Condition", color: "text-rose-400 bg-rose-500/10 border-rose-500/20", icon: Activity }
      case "financial":
        return { label: "Financial", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: DollarSign }
      default:
        return { label: "Other", color: "text-muted-foreground bg-muted/10 border-border/40", icon: HelpCircle }
    }
  }

  // Calculate remaining duration string
  const getDurationString = (expiresAt: string | null) => {
    if (!expiresAt) return "Permanent Context"
    
    const expiry = new Date(expiresAt)
    const diffTime = expiry.getTime() - Date.now()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) return "Expired Context"
    if (diffDays === 1) return "Expires Tomorrow"
    return `Expires in ${diffDays} days`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-10 md:space-y-12 pb-24 md:pb-8 w-full"
    >
      {/* Dynamic Success Notification Banner */}
      <AnimatePresence>
        {showUpdatedBanner && (
          <motion.div 
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            className="flex items-center gap-3 p-4 border border-emerald-500/20 bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.05)] text-xs font-mono w-full relative mb-6"
          >
            <div className="w-5 h-5 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
              <ShieldCheck className="h-3.5 w-3.5" />
            </div>
            <div className="space-y-0.5">
              <p className="font-bold text-emerald-500 uppercase tracking-wider">Context updated</p>
              <p className="text-[10px] text-muted-foreground">New active lifestyle parameter applied to strategic forecasting.</p>
            </div>
            <button 
              onClick={() => setShowUpdatedBanner(false)}
              className="absolute right-4 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8 border-b border-foreground/10 pb-6 md:pb-8 relative">
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-[9px] md:text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
            <Brain className="h-3.5 w-3.5" />
            <span>AI Context</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase leading-none break-words">
            My Memory
          </h1>
        </div>
      </header>

      {/* Centered Content Column */}
      <div className="max-w-[900px] mx-auto w-full space-y-8 pt-4">

      {/* Quick Input Box */}
      <div className="p-5 border border-border ledger-border bg-card/60 backdrop-blur-sm relative overflow-hidden space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">Mainframe Ingestion</label>
            <h4 className="text-sm font-bold tracking-tight text-foreground">Anything impacting your budget or routine this cycle?</h4>
          </div>
          <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Brain className="h-4.5 w-4.5 text-emerald-500 animate-pulse" />
          </div>
        </div>

        <form onSubmit={handleAddMemory} className="space-y-3">
          <textarea
            value={newMemoryText}
            onChange={(e) => setNewMemoryText(e.target.value)}
            placeholder="Examples: 'I'm going on vacation for 10 days', 'Starting hybrid work, reducing fuel spend by 30%', 'Saving €300 for a weekend trip next month'..."
            className="w-full min-h-[80px] p-3 text-xs bg-secondary/20 border border-border/80 rounded-none focus:outline-none focus:border-foreground/40 font-sans resize-none placeholder:text-muted-foreground/50 text-foreground leading-relaxed"
            disabled={isSubmitting}
          />
          <div className="flex items-center justify-end gap-2.5">
            <Button 
              type="submit"
              disabled={!newMemoryText.trim() || isSubmitting}
              className="h-8 rounded-none bg-foreground text-background hover:bg-muted font-mono text-[9px] uppercase font-bold tracking-wider px-5 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer"
            >
              {isSubmitting ? (
                <RefreshCcw className="h-3 w-3 animate-spin mr-1.5" />
              ) : (
                <Plus className="h-3 w-3 mr-1.5" />
              )}
              Apply Context
            </Button>
          </div>
        </form>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-hide border-b border-border/30">
        {(["all", "lifestyle", "goal", "health", "financial", "other"] as const).map(tab => {
          const isActive = activeTab === tab
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-3.5 py-1.5 text-[9px] font-mono font-bold uppercase tracking-wider border cursor-pointer select-none transition-all",
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
        <div className="p-8 border border-border border-dashed bg-secondary/5 text-center font-mono">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">No matching category records found</p>
        </div>
      ) : (
        <div className="space-y-8 [content-visibility:auto] [contain-intrinsic-size:1px_400px]">
          {Object.keys(groupedMemories).map(dateKey => (
            <div key={dateKey} className="space-y-4">
              {/* Timeline Date Divider */}
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-mono font-bold tracking-widest text-muted-foreground shrink-0 select-none">
                  {dateKey}
                </span>
                <div className="h-px bg-border/40 flex-grow" />
              </div>

              {/* Group Memories */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupedMemories[dateKey].map(mem => {
                  const catDetails = getCategoryDetails(mem.category)
                  const Icon = catDetails.icon
                  const durationStr = getDurationString(mem.expiresAt)
                  const isExpired = mem.status === "expired"

                  return (
                    <div 
                      key={mem.id}
                      onClick={() => handleCardClick(mem)}
                      className={cn(
                        "group p-4 border ledger-border bg-card relative overflow-hidden flex flex-col justify-between transition-all duration-300 cursor-pointer",
                        isExpired ? "opacity-50 border-border/40" : "border-border hover:border-foreground/30 hover:shadow-sm"
                      )}
                    >
                      <div className="space-y-3">
                        {/* Badges & Actions */}
                        <div className="flex items-center justify-between gap-3 select-none">
                          <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider border", catDetails.color)}>
                            <Icon className="h-2.5 w-2.5" />
                            {catDetails.label}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "inline-flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase border",
                              isExpired 
                                ? "text-muted-foreground border-border/40 bg-muted/10" 
                                : "text-emerald-500 border-emerald-500/20 bg-emerald-500/10"
                            )}>
                              {!isExpired && <span className="w-1 h-1 bg-emerald-500 animate-pulse inline-block rounded-full" />}
                              {mem.status}
                            </span>
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

                      {/* Time Details */}
                      <div className="flex items-center justify-between gap-4 mt-6 pt-2 border-t border-border/20 text-[9px] font-mono text-muted-foreground/60 select-none">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(mem.createdAt).toLocaleDateString("en-GB")}
                        </span>
                        <span className={cn(
                          "flex items-center gap-1 font-bold",
                          isExpired ? "text-muted-foreground" : "text-foreground/75"
                        )}>
                          <Clock className="h-3 w-3" />
                          {durationStr}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
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
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as any)}
                  className="w-full p-2.5 text-xs bg-secondary/30 border border-border/80 focus:outline-none focus:border-foreground/35 rounded-none text-foreground font-mono uppercase"
                >
                  <option value="lifestyle">Lifestyle</option>
                  <option value="goal">Goal</option>
                  <option value="health">Health Condition</option>
                  <option value="financial">Financial</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Expiry Selector */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">Context Expiration</label>
                <select
                  value={editExpiryOption}
                  onChange={(e) => setEditExpiryOption(e.target.value as any)}
                  className="w-full p-2.5 text-xs bg-secondary/30 border border-border/80 focus:outline-none focus:border-foreground/35 rounded-none text-foreground font-mono uppercase"
                >
                  <option value="keep">Keep Current (Expiry: {selectedMemory.expiresAt ? new Date(selectedMemory.expiresAt).toLocaleDateString("en-GB") : "Permanent"})</option>
                  <option value="extend7">Set/Extend for 7 Days</option>
                  <option value="extend30">Set/Extend for 30 Days</option>
                  <option value="permanent">Make Permanent (No Expiration)</option>
                </select>
              </div>
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
