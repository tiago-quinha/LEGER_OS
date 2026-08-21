"use client"

import React, { useState, useEffect, useMemo } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  CreditCard, 
  X, 
  Check, 
  Tag, 
  Store, 
  ArrowRight, 
  Sparkles,
  AlertCircle,
  HelpCircle
} from "lucide-react"
import { toast } from "sonner"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useSystem } from "@/lib/SystemContext"

interface UnnamedTransactionResolverProps {
  expenses: any[]
  categories: any[]
  onTransactionUpdated?: (updatedTx: any) => void
}

const GENERIC_MERCHANT_NAMES = new Set([
  "UNKNOWN MERCHANT",
  "COMPRA CARTAO",
  "COMPRA",
  "MOVIMENTO",
  "PAGAMENTO",
  "PAGAMENTO SERVICOS",
  "TRANSFERENCIA",
  "DEBITO DIRECTO",
  "OPERACAO MB",
  "COMPRA CC"
])

export function isUnnamedTransaction(tx: any): boolean {
  if (!tx || parseFloat(tx.amount) >= 0) return false
  const m = (tx.merchant || "").trim().toUpperCase()
  if (!m) return true
  if (GENERIC_MERCHANT_NAMES.has(m)) return true
  if (m.startsWith("COMPRA CARTAO") || m.startsWith("COMPRA CC") || m.startsWith("MOVIMENTO CONTA")) return true
  return false
}

export function UnnamedTransactionResolver({
  expenses,
  categories,
  onTransactionUpdated
}: UnnamedTransactionResolverProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { currencySymbol } = useSystem()

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // 1. Identify all transactions needing a store name
  const unnamedList = useMemo(() => {
    return expenses.filter(isUnnamedTransaction)
  }, [expenses])

  const [activeTx, setActiveTx] = useState<any | null>(null)
  const [merchantInput, setMerchantInput] = useState("")
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [createRule, setCreateRule] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // 2. Compute user's most frequent known merchants for 1-tap suggestion chips
  const frequentMerchants = useMemo(() => {
    const counts = new Map<string, { count: number; categoryId: number | null }>()
    expenses.forEach((tx) => {
      if (!isUnnamedTransaction(tx)) {
        const name = (tx.merchant || "").trim()
        if (name && name.length > 2 && !GENERIC_MERCHANT_NAMES.has(name.toUpperCase())) {
          const current = counts.get(name) || { count: 0, categoryId: tx.category_id }
          counts.set(name, { count: current.count + 1, categoryId: tx.category_id || current.categoryId })
        }
      }
    })

    return Array.from(counts.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 8)
      .map(([name, meta]) => ({ name, categoryId: meta.categoryId }))
  }, [expenses])

  // 3. Handle query param trigger `?resolveTxId=...`
  useEffect(() => {
    const resolveTxId = searchParams.get("resolveTxId")
    if (resolveTxId) {
      if (resolveTxId === "demo") {
        openResolver({
          id: "demo",
          amount: -14.50,
          merchant: "Santander Outflow",
          date: new Date().toISOString().split("T")[0],
          category_id: null
        })
      } else {
        const match = expenses.find((e) => String(e.id) === String(resolveTxId))
        if (match) {
          openResolver(match)
        }
      }
    }
  }, [searchParams, expenses])

  const openResolver = (tx: any) => {
    setActiveTx(tx)
    setMerchantInput("")
    setSelectedCategoryId(tx.category_id || null)
  }

  const closeResolver = () => {
    setActiveTx(null)
    setMerchantInput("")
    // Remove query param if present
    if (searchParams.get("resolveTxId")) {
      const params = new URLSearchParams(searchParams.toString())
      params.delete("resolveTxId")
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }
  }

  // 4. Smart Auto-Category matching when merchant name is typed or selected
  const handleSelectMerchantName = (name: string, defaultCatId?: number | null) => {
    setMerchantInput(name)
    if (defaultCatId) {
      setSelectedCategoryId(defaultCatId)
      return
    }

    // Attempt match with frequent merchants
    const found = frequentMerchants.find((m) => m.name.toLowerCase() === name.toLowerCase())
    if (found?.categoryId) {
      setSelectedCategoryId(found.categoryId)
      return
    }

    // Keyword heuristics
    const lower = name.toLowerCase()
    const matchedCategory = categories.find((c) => {
      const cName = c.name.toLowerCase()
      if (lower.includes("continente") || lower.includes("pingo doce") || lower.includes("auchan") || lower.includes("lidl") || lower.includes("supermercado")) {
        return cName.includes("aliment") || cName.includes("food") || cName.includes("grocer")
      }
      if (lower.includes("uber") || lower.includes("bolt") || lower.includes("galp") || lower.includes("repsol") || lower.includes("bp") || lower.includes("combust")) {
        return cName.includes("transp") || cName.includes("car") || cName.includes("fuel")
      }
      if (lower.includes("restaurante") || lower.includes("cafe") || lower.includes("mcdonald") || lower.includes("burger")) {
        return cName.includes("restaur") || cName.includes("dining") || cName.includes("food")
      }
      return false
    })

    if (matchedCategory) {
      setSelectedCategoryId(matchedCategory.id)
    }
  }

  // 5. Submit & Persist to Supabase
  const handleSave = async () => {
    if (!activeTx || !merchantInput.trim()) {
      toast.error("Please enter a merchant name")
      return
    }

    setIsSaving(true)
    const cleanMerchant = merchantInput.trim()
    const cleanCategoryId = selectedCategoryId || activeTx.category_id || null

    try {
      // Update transaction
      const { error: txError } = await supabase
        .from("tracker_expense")
        .update({
          merchant: cleanMerchant,
          category_id: cleanCategoryId
        })
        .eq("id", activeTx.id)

      if (txError) throw txError

      // Optionally create auto-categorization rule
      if (createRule && cleanCategoryId && cleanMerchant.length >= 3) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase
            .from("merchant_rules")
            .upsert({
              user_id: user.id,
              keyword: cleanMerchant.toLowerCase(),
              category_id: cleanCategoryId
            }, { onConflict: "user_id,keyword" })
        }
      }

      const updatedTx = {
        ...activeTx,
        merchant: cleanMerchant,
        category_id: cleanCategoryId
      }

      if (onTransactionUpdated) {
        onTransactionUpdated(updatedTx)
      }

      toast.success(`Updated transaction: ${cleanMerchant}`)
      closeResolver()
    } catch (err: any) {
      console.error("[Unnamed Resolver] Save failed:", err)
      toast.error("Failed to update transaction.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      {/* Top Banner Indicator (Only renders if there are transactions needing store names) */}
      {unnamedList.length > 0 && !activeTx && (
        <div className="w-full">
          <button
            onClick={() => openResolver(unnamedList[0])}
            className="w-full flex items-center justify-between p-3.5 md:p-4 bg-card/60 hover:bg-card border border-amber-500/30 hover:border-amber-500/60 rounded-none transition-all cursor-pointer group text-left shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-none bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Store className="h-4 w-4 text-amber-500" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
                    {unnamedList.length} Unnamed Bank {unnamedList.length === 1 ? "Transaction" : "Transactions"}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 bg-amber-500/15 text-amber-500 border border-amber-500/30 font-bold uppercase">
                    Needs Merchant
                  </span>
                </div>
                <p className="text-[11px] font-sans text-muted-foreground">
                  Latest: <span className="font-mono font-bold text-foreground">{currencySymbol}{Math.abs(parseFloat(unnamedList[0].amount)).toFixed(2)}</span> ({unnamedList[0].merchant || "Card debit"}) · Tap to name store & auto-categorize
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground group-hover:text-foreground transition-colors shrink-0">
              <span className="hidden sm:inline">Resolve</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        </div>
      )}

      {/* Pure Isolated Notification Resolve Modal (Portaled directly to document.body) */}
      {mounted && typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {activeTx && (
            <div className="fixed inset-0 z-[999999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/95 backdrop-blur-2xl">
              {/* Backdrop Click Dismiss */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeResolver}
                className="absolute inset-0 cursor-pointer"
              />

              {/* Bottom Drawer Card */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 120) {
                    closeResolver()
                  }
                }}
                className="relative w-full max-w-lg bg-[#09090b] border-t sm:border border-border/80 p-5 md:p-6 rounded-t-2xl sm:rounded-2xl shadow-[0_-10px_50px_rgba(0,0,0,0.9)] z-10 space-y-4 max-h-[92dvh] sm:max-h-[85vh] overflow-y-auto flex flex-col font-mono text-xs"
              >
                {/* Top Drag Handle Indicator */}
                <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto my-1 cursor-grab active:cursor-grabbing shrink-0" />

                {/* Header */}
                <div className="flex items-center justify-between border-b border-border/50 pb-3">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-foreground" />
                    <h3 className="text-base font-bold font-mono tracking-tight uppercase text-foreground">
                      Identify Merchant
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={closeResolver}
                    className="h-8 w-8 rounded-none text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Transaction Amount Highlight */}
                <div className="p-3.5 bg-secondary/20 border border-border flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-mono uppercase text-muted-foreground">TRANSACTION AMOUNT</span>
                    <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-foreground">
                      -{currencySymbol}{Math.abs(parseFloat(activeTx.amount)).toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right space-y-0.5 font-mono text-xs">
                    <span className="text-[9px] uppercase text-muted-foreground">CAPTURED DATE</span>
                    <div className="text-foreground font-semibold">
                      {new Date(activeTx.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </div>
                  </div>
                </div>

                {/* Raw Statement / Push Snippet */}
                {activeTx.raw_text && (
                  <div className="text-[10px] font-mono text-muted-foreground/80 bg-secondary/10 p-2.5 border border-border/40 truncate">
                    <span className="text-muted-foreground uppercase text-[9px] block mb-0.5 font-bold">Push Notification Text:</span>
                    {activeTx.raw_text}
                  </div>
                )}

                {/* 1-Tap Quick Suggestion Chips */}
                {frequentMerchants.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold">
                      Frequent Stores (1-Tap):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {frequentMerchants.map((m) => {
                        const isSelected = merchantInput.toLowerCase() === m.name.toLowerCase()
                        return (
                          <button
                            key={m.name}
                            type="button"
                            onClick={() => handleSelectMerchantName(m.name, m.categoryId)}
                            className={`px-3 py-1.5 text-xs font-mono border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-foreground text-background border-foreground font-bold shadow-sm"
                                : "bg-secondary/40 hover:bg-secondary border-border text-foreground"
                            }`}
                          >
                            {m.name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Manual Merchant Input Field (NO autoFocus so keyboard doesn't cover 1-tap options) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block font-bold">
                    Store / Recipient Name:
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      value={merchantInput}
                      onChange={(e) => handleSelectMerchantName(e.target.value)}
                      placeholder="e.g. Continente, Pingo Doce, Uber, Galp..."
                      className="h-10 rounded-none font-mono text-xs bg-secondary/30 border-border focus-visible:ring-1 focus-visible:ring-foreground"
                    />
                  </div>
                </div>

                {/* Category Selector */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block font-bold">
                    Expense Category:
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:gap-2.5 max-h-48 sm:max-h-56 overflow-y-auto p-2 border border-border/50 bg-secondary/15 rounded-xl">
                    {categories.map((c) => {
                      const isSelected = selectedCategoryId === c.id
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedCategoryId(c.id)}
                          className={`p-2.5 sm:p-3 text-left text-xs sm:text-[13px] font-mono border rounded-lg flex items-center gap-2.5 transition-all cursor-pointer truncate ${
                            isSelected
                              ? "bg-foreground text-background border-foreground font-bold shadow-sm scale-[1.01]"
                              : "bg-secondary/30 hover:bg-secondary/60 border-border/70 text-muted-foreground hover:text-foreground active:scale-95"
                          }`}
                        >
                          <div 
                            className="h-2.5 w-2.5 rounded-full shrink-0 shadow-xs" 
                            style={{ backgroundColor: c.color || "#10b981" }} 
                          />
                          <span className="truncate">{c.name}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Checkbox: Remember for future auto-categorization */}
                <div className="flex items-center gap-2 pt-1 cursor-pointer" onClick={() => setCreateRule(!createRule)}>
                  <input
                    type="checkbox"
                    checked={createRule}
                    onChange={(e) => setCreateRule(e.target.checked)}
                    className="rounded-none border-border bg-secondary/40 text-foreground cursor-pointer h-4 w-4"
                  />
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Always categorize future transactions from this store
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeResolver}
                    className="w-1/3 h-10 rounded-none border-border font-mono text-xs uppercase cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={!merchantInput.trim() || isSaving}
                    onClick={handleSave}
                    className="w-2/3 h-10 rounded-none bg-foreground text-background hover:bg-foreground/90 font-mono text-xs uppercase font-bold tracking-wider cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Check className="h-4 w-4" />
                    {isSaving ? "Saving..." : "Confirm & Save"}
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
