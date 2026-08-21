"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Store, 
  X, 
  Check, 
  Tag, 
  ArrowRight,
  Sparkles
} from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface DedicatedPushResolverProps {
  transaction: any
  categories: any[]
  frequentMerchants: { name: string; categoryId: number | null }[]
  currencySymbol?: string
}

export function DedicatedPushResolver({
  transaction,
  categories,
  frequentMerchants,
  currencySymbol = "€"
}: DedicatedPushResolverProps) {
  const router = useRouter()
  const [merchantInput, setMerchantInput] = useState(
    transaction.merchant && !transaction.merchant.toUpperCase().startsWith("COMPRA") && !transaction.merchant.toUpperCase().startsWith("UNKNOWN")
      ? transaction.merchant
      : ""
  )
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(transaction.category_id || null)
  const [createRule, setCreateRule] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Navigate to full dashboard
  const handleDismiss = () => {
    window.location.href = "/"
  }

  // 1-Tap Frequent Store Selection
  const handleSelectMerchantName = (name: string, defaultCatId?: number | null) => {
    setMerchantInput(name)
    if (defaultCatId) {
      setSelectedCategoryId(defaultCatId)
      return
    }

    const found = frequentMerchants.find((m) => m.name.toLowerCase() === name.toLowerCase())
    if (found?.categoryId) {
      setSelectedCategoryId(found.categoryId)
      return
    }

    // Heuristics
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

  // Confirm and Save
  const handleSave = async () => {
    if (!merchantInput.trim()) {
      toast.error("Please enter a merchant name")
      return
    }

    setIsSaving(true)
    const cleanMerchant = merchantInput.trim()
    const cleanCategoryId = selectedCategoryId || transaction.category_id || null

    try {
      if (transaction.id !== "demo") {
        const { error: txError } = await supabase
          .from("tracker_expense")
          .update({
            merchant: cleanMerchant,
            category_id: cleanCategoryId
          })
          .eq("id", transaction.id)

        if (txError) throw txError

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
      }

      toast.success(`Saved: ${cleanMerchant}`)
      // Smoothly navigate to main application
      window.location.href = "/"
    } catch (err: any) {
      console.error("[Push Resolver] Save failed:", err)
      toast.error("Failed to update transaction.")
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[9999999] bg-[#09090b] flex flex-col p-4 sm:p-6 md:p-8 overflow-y-auto">
      <div className="max-w-md w-full mx-auto flex flex-col flex-1 min-h-0 justify-between gap-3 sm:gap-4">
        {/* Top Header (Anchored to top) */}
        <div className="flex items-center justify-between border-b border-border/40 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-secondary/60 border border-border flex items-center justify-center">
              <Store className="h-4 w-4 text-foreground" />
            </div>
            <div>
              <h1 className="text-base font-bold font-mono uppercase tracking-tight text-foreground">
                Identify Merchant
              </h1>
              <p className="text-[10px] font-mono text-muted-foreground uppercase">
                Push Notification Capture
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="h-8 w-8 rounded-lg bg-secondary/40 hover:bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Dismiss to Dashboard"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Main Body (Anchored directly below header, dynamically sized) */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="flex-1 min-h-0 flex flex-col gap-2.5 sm:gap-3 py-1 font-mono text-xs overflow-y-auto"
        >
          {/* Amount Banner */}
          <div className="p-3.5 bg-card/60 border border-border rounded-xl flex items-center justify-between shadow-sm shrink-0">
            <div className="space-y-0.5">
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">
                Captured Amount
              </span>
              <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                -{currencySymbol}{Math.abs(parseFloat(transaction.amount || 0)).toFixed(2)}
              </div>
            </div>
            <div className="text-right space-y-0.5">
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">
                Date
              </span>
              <div className="text-foreground font-semibold">
                {new Date(transaction.date || Date.now()).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
              </div>
            </div>
          </div>

          {/* Raw Push Notification Snippet */}
          {transaction.raw_text && (
            <div className="text-[10px] text-muted-foreground/80 bg-secondary/20 p-2.5 rounded-lg border border-border/40 truncate shrink-0">
              <span className="text-muted-foreground uppercase text-[9px] block mb-0.5 font-bold">
                Notification Text:
              </span>
              {transaction.raw_text}
            </div>
          )}

          {/* 1-Tap Frequent Stores */}
          {frequentMerchants.length > 0 && (
            <div className="space-y-1.5 shrink-0">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
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
                      className={`px-3 py-1.5 text-xs font-mono border rounded-lg transition-all cursor-pointer ${
                        isSelected
                          ? "bg-foreground text-background border-foreground font-bold shadow-md scale-[1.02]"
                          : "bg-secondary/40 hover:bg-secondary border-border text-foreground active:scale-95"
                      }`}
                    >
                      {m.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Store Name Input (No autoFocus so keyboard doesn't cover options) */}
          <div className="space-y-1 shrink-0">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground block font-bold">
              Store / Recipient Name:
            </label>
            <Input
              type="text"
              value={merchantInput}
              onChange={(e) => handleSelectMerchantName(e.target.value)}
              placeholder="e.g. Continente, Pingo Doce, Uber, Galp..."
              className="h-10 rounded-lg font-mono text-xs sm:text-sm bg-secondary/30 border-border focus-visible:ring-1 focus-visible:ring-foreground"
            />
          </div>

          {/* Category Grid */}
          <div className="space-y-1 flex-1 min-h-0 flex flex-col">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground block font-bold shrink-0">
              Expense Category:
            </label>
            <div className="grid grid-cols-2 gap-1.5 overflow-y-auto p-1 border border-border/40 rounded-lg bg-secondary/10 max-h-[140px] sm:max-h-[180px]">
              {categories.map((c) => {
                const isSelected = selectedCategoryId === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(c.id)}
                    className={`p-2 text-left text-xs font-mono border rounded-md flex items-center gap-2 transition-all cursor-pointer truncate ${
                      isSelected
                        ? "bg-foreground text-background border-foreground font-bold"
                        : "bg-secondary/20 hover:bg-secondary/50 border-border/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div 
                      className="h-2 w-2 rounded-full shrink-0" 
                      style={{ backgroundColor: c.color || "#10b981" }} 
                    />
                    <span className="truncate">{c.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Remember future checkbox */}
          <div className="flex items-center gap-2 pt-0.5 cursor-pointer select-none shrink-0" onClick={() => setCreateRule(!createRule)}>
            <input
              type="checkbox"
              checked={createRule}
              onChange={(e) => setCreateRule(e.target.checked)}
              className="rounded border-border bg-secondary/40 text-foreground cursor-pointer h-4 w-4"
            />
            <span className="text-[11px] text-muted-foreground">
              Always categorize future charges from this store
            </span>
          </div>
        </motion.div>

        {/* Bottom Actions (Anchored cleanly at bottom) */}
        <div className="pt-3 border-t border-border/40 flex items-center gap-2.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleDismiss}
            className="w-1/3 h-10 sm:h-11 rounded-lg border-border font-mono text-xs uppercase font-bold cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!merchantInput.trim() || isSaving}
            onClick={handleSave}
            className="w-2/3 h-10 sm:h-11 rounded-lg bg-foreground text-background hover:bg-foreground/90 font-mono text-xs uppercase font-bold tracking-wider cursor-pointer flex items-center justify-center gap-2 shadow-lg"
          >
            <Check className="h-4 w-4 stroke-[2.5]" />
            {isSaving ? "Saving..." : "Confirm & Save"}
          </Button>
        </div>
      </div>
    </div>
  )
}
