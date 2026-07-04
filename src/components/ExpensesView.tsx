"use client"

import { useState, useMemo, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sparkles, Plus, Trash2, Search, Upload, FileText, Check, Loader2, Landmark } from "lucide-react"
import { cn } from "@/lib/utils"
import { AuditTracePanel } from "@/components/AuditTracePanel"
import { useSystem } from "@/lib/SystemContext"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"

import { MagneticButton } from "@/components/unlumen-ui/magnetic-button"
import { GlowingBadge } from "@/components/unlumen-ui/glowing-badge"
import { PrivacyValue } from "@/components/ui/privacy-value"

interface Category {
  id: number
  name: string
  color: string
  icon?: string
}

interface Rule {
  id: number
  keyword: string
  category_id: number
}

interface Expense {
  id: string
  amount: string | number
  merchant: string
  date: string
  source: string
  category_id?: number | null
  raw_text?: string
}

interface ExpensesViewProps {
  initialExpenses: Expense[]
  categories: Category[]
  initialRules: Rule[]
}

export function ExpensesView({ initialExpenses, categories, initialRules }: ExpensesViewProps) {
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem("moneytrack_cache_expenses")
      if (cached && initialExpenses.length === 0) {
        try { return JSON.parse(cached) } catch {}
      }
    }
    return initialExpenses
  })
  const [rules, setRules] = useState<Rule[]>(initialRules)
  const [isCategorizing, setIsCategorizing] = useState(false)
  
  const { setAuditPanelOpen, setActiveTransactionId, refreshData, profile } = useSystem()

  // Save to browser cache when expenses update
  useEffect(() => {
    if (typeof window !== "undefined" && expenses.length > 0) {
      try { sessionStorage.setItem("moneytrack_cache_expenses", JSON.stringify(expenses)) } catch {}
    }
  }, [expenses])

  // Pagination & High-Performance Memoization
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 40

  const totalPages = Math.ceil(expenses.length / pageSize)
  const paginatedExpenses = useMemo(() => {
    return expenses.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  }, [expenses, currentPage])

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])

  const summaryStats = useMemo(() => {
    let inflow = 0
    let outflow = 0
    for (let i = 0; i < expenses.length; i++) {
      const amt = parseFloat(expenses[i].amount.toString()) || 0
      if (amt > 0) inflow += amt
      else if (amt < 0) outflow += Math.abs(amt)
    }
    return {
      total: expenses.length,
      inflow: inflow.toFixed(2),
      outflow: outflow.toFixed(2)
    }
  }, [expenses])

  // New Rule State
  const [newRuleKeyword, setNewRuleKeyword] = useState("")
  const [newRuleCategoryId, setNewRuleCategoryId] = useState("")

  // Manual Ingestion State
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [manualAmount, setManualAmount] = useState("")
  const [manualMerchant, setManualMerchant] = useState("")
  const [manualCategoryId, setManualCategoryId] = useState("")
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0])
  const [isIncome, setIsIncome] = useState(false)
  const [isSavingManual, setIsSavingManual] = useState(false)

  // Ingestion Node State
  const [extractText, setExtractText] = useState("")
  const [parsedData, setParsedData] = useState<{
    startDate: string
    startBalance: number
    month: number
    year: number
    transactions: {
      id: string
      amount: number
      merchant: string
      date: string
      raw_text: string
      isIncome: boolean
      category_id: number | null
      checked: boolean
    }[]
  } | null>(null)
  const [isIngesting, setIsIngesting] = useState(false)
  const [isAiParsing, setIsAiParsing] = useState(false)

  const matchCategory = (merchantStr: string, rulesList: Rule[], categoriesList: Category[]) => {
    const lowerMerchant = merchantStr.toLowerCase()
    const matchedRule = rulesList.find(rule => lowerMerchant.includes(rule.keyword.toLowerCase()))
    if (matchedRule) {
      return matchedRule.category_id
    }
    
    // Check local hardcoded keywords
    const localCat = getLocalCategory(merchantStr)
    if (localCat) {
      return localCat.id
    }
    
    return null
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setExtractText(text)
      toast.success(`Loaded file: ${file.name}`)
    }
    reader.onerror = () => {
      toast.error("Error reading text file.")
    }
    reader.readAsText(file)
  }

  const handleParseExtract = () => {
    if (!extractText.trim()) {
      toast.error("Please paste bank statement text first.")
      return
    }

    try {
      const txPattern1 = /^(\d{2}-\d{2})\s+\d{2}-\d{2}\s+(.+?)\s+(-?\d+,\d{2})\s+(-?\d+,\d{2})$/
      const txPattern2 = /^(\d{2}-\d{2})\s+\d{2}-\d{2}\s+(.+?)\s+(-?\d+,\d{2})\s+\d+,\d{2}$/
      const balancePattern = /Saldo Inicial EUR ([\d.,]+)/
      const periodPattern = /PERÍODO DE (\d{4})-\d{2}-\d{2} A (\d{4})-\d{2}-\d{2}/

      const lines = extractText.split("\n")
      
      let startYear = new Date().getFullYear()
      let endYear = new Date().getFullYear()
      const periodMatch = extractText.match(periodPattern)
      if (periodMatch) {
        startYear = parseInt(periodMatch[1])
        endYear = parseInt(periodMatch[2])
      }

      let initialBalance = 0
      const balanceMatch = extractText.match(balancePattern)
      if (balanceMatch) {
        initialBalance = parseFloat(balanceMatch[1].replace(/\./g, "").replace(",", "."))
      }

      let detectedMonth = new Date().getMonth() + 1
      let detectedYear = startYear

      const txList: any[] = []

      lines.forEach((line, index) => {
        const trimmed = line.trim()
        const match = trimmed.match(txPattern1) || trimmed.match(txPattern2)
        if (match) {
          const [_, dateStr, merchant, amountStr] = match
          const amountVal = parseFloat(amountStr.replace(/\./g, "").replace(",", "."))
          const [dayStr, monthStr] = dateStr.split("-")
          const day = parseInt(dayStr)
          const month = parseInt(monthStr)
          const txYear = (month >= 11) ? startYear : endYear
          
          detectedMonth = month
          detectedYear = txYear

          const userPaycheckKw = profile?.paycheck_keyword || "SALARY"
          const isIncome = amountVal > 0 && (
            (userPaycheckKw !== "MONTHLY" && merchant.toLowerCase().includes(userPaycheckKw.toLowerCase())) ||
            merchant.toUpperCase().includes("SALARY") || 
            merchant.toUpperCase().includes("PAYROLL") || 
            merchant.toUpperCase().includes("DIRECT DEPOSIT") ||
            merchant.toUpperCase().includes("PAYCHECK") ||
            merchant.toUpperCase().includes("REWARDS")
          )

          const categoryId = matchCategory(merchant, rules, categories)

          txList.push({
            id: `temp-${index}-${Date.now()}`,
            amount: amountVal,
            merchant: merchant.trim(),
            date: new Date(Date.UTC(txYear, month - 1, day)).toISOString(),
            raw_text: trimmed,
            isIncome,
            category_id: categoryId,
            checked: true
          })
        }
      })

      const balanceDate = `${detectedYear}-${String(detectedMonth).padStart(2, '0')}-01`

      if (txList.length === 0) {
        toast.error("Could not parse any transactions. Check statement format.")
        return
      }

      setParsedData({
        startDate: balanceDate,
        startBalance: initialBalance,
        month: detectedMonth,
        year: detectedYear,
        transactions: txList
      })

      toast.success(`Parsed ${txList.length} transactions successfully.`)
    } catch (err: any) {
      console.error(err)
      toast.error(`Ingestion parsing failure: ${err.message}`)
    }
  }

  const handleAiSmartParse = async () => {
    if (!extractText.trim()) {
      toast.error("Please paste statement text or upload a file first.")
      return
    }

    setIsAiParsing(true)
    const toastId = toast.loading("🤖 Leger AI is analyzing statement structure across universal bank formats...")

    try {
      const res = await fetch("/api/ingest/ai-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: extractText })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "AI parsing failed")
      if (!data.transactions || data.transactions.length === 0) {
        throw new Error("AI could not detect valid transactions in this text.")
      }

      const userPaycheckKw = profile?.paycheck_keyword || "SALARY"
      const txList = data.transactions.map((tx: any, index: number) => {
        const amtVal = parseFloat(tx.amount) || 0
        const merch = tx.merchant || "Unknown Merchant"
        const isInc = amtVal > 0 && (
          (userPaycheckKw !== "MONTHLY" && merch.toLowerCase().includes(userPaycheckKw.toLowerCase())) ||
          merch.toUpperCase().includes("SALARY") || 
          merch.toUpperCase().includes("PAYROLL") || 
          merch.toUpperCase().includes("PAYCHECK")
        )
        const catId = matchCategory(merch, rules, categories)

        return {
          id: `ai-${index}-${Date.now()}`,
          amount: amtVal,
          merchant: merch.trim(),
          date: new Date(tx.date || new Date()).toISOString(),
          raw_text: tx.raw_text || merch,
          isIncome: isInc,
          category_id: catId,
          checked: true
        }
      })

      setParsedData({
        startDate: data.startDate || `${data.year}-${String(data.month).padStart(2, '0')}-01`,
        startBalance: data.startBalance || 0,
        month: data.month || new Date().getMonth() + 1,
        year: data.year || new Date().getFullYear(),
        transactions: txList
      })

      toast.success(`🤖 Leger AI extracted ${txList.length} transactions successfully!`, { id: toastId })
    } catch (err: any) {
      console.error(err)
      toast.error(`AI Parse error: ${err.message}`, { id: toastId })
    } finally {
      setIsAiParsing(false)
    }
  }

  const handleCommitIngestion = async () => {
    if (!parsedData) return
    setIsIngesting(true)
    
    try {
      const selectedTxs = parsedData.transactions.filter(t => t.checked)
      if (selectedTxs.length === 0) {
        toast.error("No transactions selected for ingestion.")
        setIsIngesting(false)
        return
      }

      // 1. Ingest account balance snapshot
      if (parsedData.startBalance > 0) {
        const { error: balError } = await supabase
          .from("account_balance")
          .upsert({
            amount: parsedData.startBalance.toString(),
            date: parsedData.startDate
          }, { onConflict: 'date' })
        
        if (balError) throw balError
      }

      // 2. Calculate and ingest income snapshot
      const incomeSum = selectedTxs
        .filter(t => t.isIncome)
        .reduce((sum, t) => sum + t.amount, 0)
      
      if (incomeSum > 0) {
        const { error: incError } = await supabase
          .from("income")
          .upsert({
            amount: incomeSum,
            month: parsedData.month,
            year: parsedData.year
          }, { onConflict: 'month,year' })
        
        if (incError) throw incError
      }

      // 3. Batch insert transaction records
      const txsToInsert = selectedTxs.map(t => ({
        amount: t.amount.toString(),
        merchant: t.merchant,
        date: t.date,
        source: "Santander Ingestion",
        raw_text: t.raw_text,
        category_id: t.category_id
      }))

      for (let i = 0; i < txsToInsert.length; i += 50) {
        const chunk = txsToInsert.slice(i, i + 50)
        const { error: txError } = await supabase
          .from("tracker_expense")
          .insert(chunk)
        
        if (txError) throw txError
      }

      toast.success(`Successfully committed ${selectedTxs.length} transactions to the database!`)
      setExtractText("")
      setParsedData(null)
      refreshData()
    } catch (err: any) {
      console.error(err)
      toast.error(`Mainframe ingestion commit failure: ${err.message}`)
    } finally {
      setIsIngesting(false)
    }
  }

  const openAudit = (id: string) => {
    setActiveTransactionId(id)
    setAuditPanelOpen(true)
  }

  const handleCategoryChange = async (expenseId: string, categoryId: string) => {
    const catId = categoryId === "none" ? null : parseInt(categoryId)
    const { error } = await supabase
      .from("tracker_expense")
      .update({ category_id: catId })
      .eq("id", expenseId)

    if (error) {
      toast.error("Failed to update category")
      console.error(error)
      return
    }

    setExpenses(prev =>
      prev.map(exp =>
        exp.id === expenseId ? { ...exp, category_id: catId } : exp
      )
    )
    toast.success("Category updated")
    refreshData()
  }

  const getLocalCategory = (merchant: string) => {
    const name = merchant.toLowerCase()
    
    if (name.includes("superfaro") || name.includes("galp") || name.includes("repsol") || 
        name.includes("bp") || name.includes("prio") || name.includes("cepsa") || 
        name.includes("gasoleo") || name.includes("combust")) {
      return categories.find(c => c.name === "Gas")
    }

    if (name.includes("eupago") || name.includes("betclic") || name.includes("betano") || 
        name.includes("keydrop") || name.includes("casino") || name.includes("jogos santa casa")) {
      return categories.find(c => c.name === "Gambling")
    }

    if (name.includes("trf.imed.") || name.includes("mbway") || name.includes("mb way") || 
        name.startsWith("p/ ") || name.startsWith("de ")) {
      return categories.find(c => c.name === "MB WAY")
    }

    if (name.includes("pingo doce") || name.includes("continente") || name.includes("lidl") || 
        name.includes("auchan") || name.includes("mercadona") || name.includes("mcdonalds") ||
        name.includes("uber eats") || name.includes("bolt food") || name.includes("supermercado") ||
        name.includes("restaurante") || name.includes("padaria") || name.includes("h3") ||
        name.includes("bk ") || name.includes("burger king")) {
      return categories.find(c => c.name === "Food")
    }

    if (name.includes("uber") || name.includes("bolt") || name.includes("cp -") || 
        name.includes("brisa") || name.includes("viva viagem") || name.includes("carris") || 
        name.includes("metro")) {
      return categories.find(c => c.name === "Transport")
    }

    if (name.includes("netflix") || name.includes("spotify") || name.includes("steam") || 
        name.includes("cinema") || name.includes("fnac") || name.includes("paddle.net")) {
      return categories.find(c => c.name === "Entertainment")
    }

    if (name.includes("edp") || name.includes("endesa") || name.includes("meo") || 
        name.includes("vodafone") || name.includes("nos") || name.includes("ikea") ||
        name.includes("leroy merlin")) {
      return categories.find(c => c.name === "Housing")
    }

    if (name.includes("farmacia") || name.includes("cuf") || name.includes("lusiadas") || 
        name.includes("hospital")) {
      return categories.find(c => c.name === "Health")
    }

    return null
  }

  const smartCategorize = async () => {
    const uncategorized = expenses.filter(e => !e.category_id)
    if (uncategorized.length === 0) {
      toast.info("No uncategorized expenses found")
      return
    }

    setIsCategorizing(true)
    let successCount = 0
    const localUpdates: any[] = []
    const remainingForAI: any[] = []

    uncategorized.forEach(expense => {
      const localCat = getLocalCategory(expense.merchant)
      if (localCat) {
        localUpdates.push({ id: expense.id, category_id: localCat.id })
      } else {
        remainingForAI.push(expense)
      }
    })

    if (localUpdates.length > 0) {
      const { error: localError } = await supabase.from("tracker_expense").upsert(localUpdates)
      if (!localError) {
        setExpenses(prev => prev.map(exp => {
          const update = localUpdates.find(u => u.id === exp.id)
          return update ? { ...exp, category_id: update.category_id } : exp
        }))
        successCount += localUpdates.length
        toast.success(`Locally categorized ${localUpdates.length} expenses!`)
      }
    }

    if (remainingForAI.length > 0) {
      toast.info(`Consulting Leger AI for ${remainingForAI.length} unknown merchants...`)
      
      try {
        const response = await fetch("/api/categorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expenses: remainingForAI, categories })
        })

        if (response.status === 429) {
          toast.error("Leger AI Quota Exceeded. Please try again later.")
        } else if (response.ok) {
          const data = await response.json()
          
          const updates: { id: string, category_id: number }[] = []
          for (let i = 0; i < remainingForAI.length; i++) {
            const predictedCategoryName = data.predictions[i]
            const category = categories.find(c => c.name === predictedCategoryName)
            if (category) {
              updates.push({ id: remainingForAI[i].id, category_id: category.id })
            }
          }

          if (updates.length > 0) {
            const { error: sbErr } = await supabase.from("tracker_expense").upsert(updates)
            if (!sbErr) {
              setExpenses(prev => prev.map(exp => {
                const update = updates.find(u => u.id === exp.id)
                return update ? { ...exp, category_id: update.category_id } : exp
              }))
              successCount += updates.length
              toast.success(`Leger AI categorized ${updates.length} additional expenses!`)
            }
          }
        } else {
          toast.error("AI categorization failed")
        }
      } catch (err) {
        console.error("AI Error:", err)
        toast.error("Failed to connect to AI service")
      }
    }

    setIsCategorizing(false)
    if (successCount > 0) {
      toast.success(`Total categorized: ${successCount}`)
      refreshData()
    }
  }

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRuleKeyword || !newRuleCategoryId) return

    const { data, error } = await supabase
      .from("merchant_rules")
      .insert({ keyword: newRuleKeyword, category_id: newRuleCategoryId })
      .select()

    if (error) {
      toast.error("Failed to add rule")
      console.error(error)
      return
    }

    if (data) {
      setRules([...rules, data[0]])
      setNewRuleKeyword("")
      setNewRuleCategoryId("")
      toast.success("Rule added")
    }
  }

  const handleDeleteRule = async (id: string) => {
    const { error } = await supabase
      .from("merchant_rules")
      .delete()
      .eq("id", id)

    if (error) {
      toast.error("Failed to delete rule")
      return
    }

    setRules(rules.filter(r => Number(r.id) !== Number(id)))
    toast.success("Rule deleted")
  }

  const handleDeleteExpense = async (id: string) => {
    const { error } = await supabase
      .from("tracker_expense")
      .delete()
      .eq("id", id)

    if (error) {
      toast.error("Failed to delete transaction")
      return
    }

    setExpenses(prev => prev.filter(exp => exp.id !== id))
    toast.success("Transaction deleted")
    refreshData()
  }

  const handleAddManualExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualAmount || !manualMerchant || isSavingManual) {
      toast.error("Merchant and Amount are required.")
      return
    }

    setIsSavingManual(true)
    try {
      const amtVal = parseFloat(manualAmount)
      const formattedAmount = isIncome ? Math.abs(amtVal) : -Math.abs(amtVal)
      
      const { data, error } = await supabase
        .from("tracker_expense")
        .insert({
          amount: formattedAmount.toString(),
          merchant: manualMerchant.toUpperCase(),
          date: manualDate,
          source: "Manual UI Ingest",
          raw_text: `Manual Entry: ${manualMerchant.toUpperCase()} [${manualDate}]`,
          category_id: manualCategoryId ? parseInt(manualCategoryId) : null
        })
        .select()

      if (error) throw error

      if (data && data[0]) {
        setExpenses(prev => [data[0] as Expense, ...prev])
        toast.success("Transaction committed successfully.")
        setIsAddOpen(false)
        setManualAmount("")
        setManualMerchant("")
        setManualCategoryId("")
        setManualDate(new Date().toISOString().split('T')[0])
        setIsIncome(false)
        refreshData()
      }
    } catch (err: any) {
      console.error(err)
      toast.error(`Manual insert failure: ${err.message}`)
    } finally {
      setIsSavingManual(false)
    }
  }

  return (
    <>
      <div className="mx-auto max-w-5xl p-4 md:p-8 space-y-6 w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
            <p className="text-muted-foreground">Manage your spending and automation rules.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
             <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                 <DialogTrigger className="rounded-none px-6 font-mono text-[10px] uppercase tracking-widest h-10 border border-border ledger-border bg-card hover:bg-secondary inline-flex items-center justify-center cursor-pointer select-none transition-all whitespace-nowrap outline-none w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" /> Add Entry
                 </DialogTrigger>
                 <DialogContent className="bg-card border border-border rounded-none p-6 font-mono text-xs w-[95vw] max-w-sm max-h-[90vh] overflow-y-auto">
                   <DialogHeader className="border-b border-border pb-4">
                      <DialogTitle className="text-xs uppercase tracking-widest font-mono flex items-center gap-2">
                         <Landmark className="h-4 w-4" /> Node_Ingestion_v1.0
                      </DialogTitle>
                      <DialogDescription className="text-[9px] uppercase font-mono tracking-wider opacity-60 text-muted-foreground">
                         Manual transaction ledger registration
                      </DialogDescription>
                   </DialogHeader>
                   
                   <form onSubmit={handleAddManualExpense} className="space-y-4 pt-4">
                      <div className="space-y-1.5">
                         <Label htmlFor="manualMerchant" className="technical-label">Merchant / Payee</Label>
                         <Input 
                            id="manualMerchant" 
                            type="text" 
                            required
                            placeholder="e.g. LIDL" 
                            value={manualMerchant}
                            onChange={(e) => setManualMerchant(e.target.value)}
                            className="rounded-none h-9 text-xs uppercase"
                         />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1.5">
                            <Label htmlFor="manualAmount" className="technical-label">Amount (€)</Label>
                            <Input 
                               id="manualAmount" 
                               type="number" 
                               step="0.01"
                               required
                               placeholder="15.50" 
                               value={manualAmount}
                               onChange={(e) => setManualAmount(e.target.value)}
                               className="rounded-none h-9 text-xs"
                            />
                         </div>
                         <div className="space-y-1.5">
                            <Label htmlFor="manualDate" className="technical-label">Value Date</Label>
                            <Input 
                               id="manualDate" 
                               type="date" 
                               required
                               value={manualDate}
                               onChange={(e) => setManualDate(e.target.value)}
                               className="rounded-none h-9 text-xs"
                            />
                         </div>
                      </div>

                      <div className="space-y-1.5">
                         <Label htmlFor="manualCategory" className="technical-label">Target Category</Label>
                         <select
                            id="manualCategory"
                            value={manualCategoryId}
                            onChange={(e) => setManualCategoryId(e.target.value)}
                            className="w-full h-9 px-2 border border-border bg-secondary/15 rounded-none text-xs uppercase text-foreground outline-none"
                         >
                            <option value="">Unclassified</option>
                            {categories.map((cat) => (
                               <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                         </select>
                      </div>

                      <div className="flex items-center gap-2 py-2">
                         <input 
                            id="isIncome" 
                            type="checkbox" 
                            checked={isIncome}
                            onChange={(e) => setIsIncome(e.target.checked)}
                            className="w-3.5 h-3.5 accent-foreground rounded-none border border-border"
                         />
                         <Label htmlFor="isIncome" className="technical-label cursor-pointer uppercase select-none text-[8px]">Flag as Inflow / Income</Label>
                      </div>

                      <Button 
                         type="submit" 
                         disabled={isSavingManual}
                         className="w-full rounded-none h-10 font-mono text-[9px] uppercase tracking-widest font-bold bg-foreground text-background hover:bg-foreground/80 mt-2"
                      >
                         {isSavingManual ? "COMMITTING..." : "EXECUTE INGEST"}
                      </Button>
                   </form>
                </DialogContent>
             </Dialog>

             <MagneticButton 
               onClick={smartCategorize} 
               disabled={isCategorizing}
               variant="none"
               className="bg-foreground text-background hover:bg-foreground/80 border border-transparent font-mono text-[10px] uppercase tracking-widest px-4 py-2 flex items-center justify-center rounded-none h-10 ledger-border w-full sm:w-auto"
               strength={0.2}
             >
               {isCategorizing ? (
                 "Categorizing..."
               ) : (
                 <>
                   <Sparkles className="mr-2 h-4 w-4" />
                   Smart Categorize
                 </>
               )}
             </MagneticButton>
          </div>
        </div>

        {/* 3 Executive Ledger Summary Cards Up Top */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 border border-border ledger-border divide-y sm:divide-y-0 sm:divide-x divide-border bg-card overflow-hidden">
          <div className="p-6 md:p-8 space-y-3 bg-card/40 hover:bg-secondary/35 transition-all duration-300 flex flex-col justify-between">
            <span className="technical-label text-[9px] border-b border-dotted border-muted-foreground/30 w-fit">01 / TOTAL LEDGER RECORDS</span>
            <div className="text-3xl md:text-5xl font-mono font-bold tracking-tighter">
              {summaryStats.total} <span className="text-xs font-normal text-muted-foreground">ENTRIES</span>
            </div>
          </div>
          <div className="p-6 md:p-8 space-y-3 bg-card/40 hover:bg-secondary/35 transition-all duration-300 flex flex-col justify-between">
            <span className="technical-label text-[9px] border-b border-dotted border-muted-foreground/30 w-fit">02 / TOTAL INFLOW</span>
            <div className="text-3xl md:text-5xl font-mono font-bold tracking-tighter">
              <PrivacyValue>€{summaryStats.inflow}</PrivacyValue>
            </div>
          </div>
          <div className="p-6 md:p-8 space-y-3 bg-card/40 hover:bg-secondary/35 transition-all duration-300 flex flex-col justify-between">
            <span className="technical-label text-[9px] border-b border-dotted border-muted-foreground/30 w-fit">03 / TOTAL OUTFLOW</span>
            <div className="text-3xl md:text-5xl font-mono font-bold tracking-tighter">
              <PrivacyValue>€{summaryStats.outflow}</PrivacyValue>
            </div>
          </div>
        </div>

        <Tabs defaultValue="history" className="space-y-4">
          <div className="w-full min-w-0">
            <TabsList className="bg-card/40 border border-border p-1 grid grid-cols-3 w-full gap-1">
              <TabsTrigger value="history" className="rounded-none px-1 sm:px-6 py-2.5 uppercase tracking-tighter sm:tracking-widest font-mono text-[11px] sm:text-xs font-bold truncate">History</TabsTrigger>
              <TabsTrigger value="rules" className="rounded-none px-1 sm:px-6 py-2.5 uppercase tracking-tighter sm:tracking-widest font-mono text-[11px] sm:text-xs font-bold truncate">Rules</TabsTrigger>
              <TabsTrigger value="ingest" className="rounded-none px-1 sm:px-6 py-2.5 uppercase tracking-widest font-mono text-[11px] sm:text-xs font-bold truncate">Ingest</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Transactions</CardTitle>
              </CardHeader>
              <CardContent className="p-0 sm:p-6">
                <div className="overflow-x-auto w-full">
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[65px] sm:w-[120px]">Date</TableHead>
                      <TableHead>Merchant</TableHead>
                      <TableHead className="hidden sm:table-cell">Category</TableHead>
                      <TableHead className="hidden lg:table-cell">Source</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-[40px] md:w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedExpenses.map((expense) => (
                      <TableRow 
                        key={expense.id} 
                        onClick={() => openAudit(expense.id)}
                        className="cursor-pointer group"
                      >
                        <TableCell className="text-[10px] md:text-xs text-muted-foreground group-hover:text-foreground">
                          {new Date(expense.date).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short"
                          })}
                        </TableCell>
                        <TableCell className="font-medium text-xs md:text-sm group-hover:pl-2 transition-all max-w-[110px] sm:max-w-none truncate">
                          {expense.merchant || "Unknown"}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell" onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={expense.category_id?.toString() || "none"}
                            onValueChange={(value) => expense.id && handleCategoryChange(expense.id.toString(), value || "none")}
                          >
                            <SelectTrigger className="w-[120px] md:w-[160px] h-8 text-[10px] md:text-xs">
                              <SelectValue placeholder="No category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Uncategorized</SelectItem>
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id.toString()}>
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="h-2 w-2 rounded-full" 
                                      style={{ backgroundColor: cat.color }} 
                                    />
                                    {cat.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <GlowingBadge variant="neutral" pulse={false} dot={false} className="text-[9px] md:text-[10px] uppercase tracking-wider">
                            {expense.source || "Direct"}
                          </GlowingBadge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-xs md:text-sm">
                          <PrivacyValue>
                            {parseFloat(expense.amount.toString()) > 0 ? "+" : ""}
                            €{Math.abs(parseFloat(expense.amount.toString())).toFixed(2)}
                          </PrivacyValue>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors md:opacity-0 group-hover:opacity-100"
                            onClick={() => handleDeleteExpense(expense.id.toString())}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {expenses.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                          No transactions found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                </div>
                {expenses.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-border bg-card/40">
                    <div className="text-xs font-mono text-muted-foreground">
                      Showing <span className="font-bold text-foreground">{(currentPage - 1) * pageSize + 1}</span> - <span className="font-bold text-foreground">{Math.min(expenses.length, currentPage * pageSize)}</span> of <span className="font-bold text-foreground">{expenses.length}</span> entries
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className="h-8 px-3 text-xs font-mono border border-border bg-background hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold uppercase"
                      >
                        Previous
                      </button>
                      <div className="text-xs font-mono font-bold px-3 py-1 border border-border bg-secondary/50">
                        Page {currentPage} / {totalPages || 1}
                      </div>
                      <button
                        type="button"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className="h-8 px-3 text-xs font-mono border border-border bg-background hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-all font-bold uppercase"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rules" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="md:col-span-1">
                <CardHeader>
                  <CardTitle>Add New Rule</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddRule} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="keyword">Merchant Keyword</Label>
                      <Input
                        id="keyword"
                        placeholder="e.g. Uber..."
                        value={newRuleKeyword}
                        onChange={(e) => setNewRuleKeyword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Default Category</Label>
                      <Select
                        value={newRuleCategoryId}
                        onValueChange={(val) => setNewRuleCategoryId(val || "")}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id.toString()}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full">Add Rule</Button>
                  </form>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Rules List</CardTitle>
                </CardHeader>
                <CardContent className="p-0 sm:p-6">
                  <div className="overflow-x-auto w-full">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Keyword</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rules.map((rule) => (
                          <TableRow key={rule.id}>
                            <TableCell className="font-mono text-xs">{rule.keyword}</TableCell>
                            <TableCell>{categories.find(c => c.id === rule.category_id)?.name}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteRule(rule.id.toString())}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ingest" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Text / File Input Column */}
              <Card className="lg:col-span-1 border-border ledger-border">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                    <Upload className="h-4 w-4" /> Import Source Node
                  </CardTitle>
                  <CardDescription className="font-mono text-[9px] uppercase">
                    Upload or paste Santander extract data
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border border-dashed border-border p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-secondary/10 transition-colors relative">
                    <input 
                      type="file" 
                      accept=".txt,.csv,.json,.pdf" 
                      onChange={handleFileUpload} 
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-[10px] font-mono font-bold uppercase">Select Statement (.txt, .csv, .pdf)</p>
                    <p className="text-[8px] font-mono text-muted-foreground uppercase mt-1">or drag & drop universal bank extract</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="extractText" className="technical-label opacity-60">Or Paste Extract / CSV Text</Label>
                    <textarea
                      id="extractText"
                      rows={12}
                      className="w-full p-4 border border-border ledger-border font-mono text-[10px] bg-secondary/5 focus:bg-card focus:outline-none transition-all resize-none"
                      placeholder="Paste text from any bank statement, CSV, or PDF extract..."
                      value={extractText}
                      onChange={(e) => setExtractText(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <MagneticButton 
                      onClick={handleParseExtract} 
                      variant="outline"
                      className="w-full uppercase font-mono text-[9px] py-3 font-bold tracking-widest justify-center border border-border"
                      strength={0.1}
                    >
                      ⚡ Fast Regex (.txt)
                    </MagneticButton>
                    <MagneticButton 
                      onClick={handleAiSmartParse} 
                      variant="none"
                      disabled={isAiParsing}
                      className="w-full uppercase font-mono text-[9px] py-3 bg-foreground text-background font-bold tracking-widest border border-transparent hover:bg-foreground/80 justify-center flex items-center gap-1.5"
                      strength={0.15}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {isAiParsing ? "AI Analyzing..." : "🤖 AI Universal Parse"}
                    </MagneticButton>
                  </div>
                </CardContent>
              </Card>

              {/* Parsed Preview Column */}
              <Card className="lg:col-span-2 border-border ledger-border">
                <CardHeader className="border-b border-border">
                  <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center justify-between">
                    <span>Parsed Preview Node</span>
                    {parsedData && (
                      <span className="font-mono text-[9px] text-muted-foreground uppercase">
                        Month: {parsedData.month}/{parsedData.year}
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription className="font-mono text-[9px] uppercase">
                    Verify transactions before database ingestion commit
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {!parsedData ? (
                    <div className="h-64 flex flex-col items-center justify-center text-center text-muted-foreground opacity-50 space-y-3 font-mono">
                      <Landmark className="h-10 w-10 text-muted-foreground" />
                      <p className="text-xs uppercase font-bold">Waiting for parse trigger...</p>
                      <p className="text-[9px] max-w-xs uppercase">No telemetry parsed. Provide input on the left panel to begin verification sequence.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Telemetry Summary */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 p-6 bg-secondary/20 border border-border border-dashed font-mono">
                        <div className="space-y-1">
                          <span className="technical-label text-[9px]">Est. Start Balance</span>
                          <p className="text-lg sm:text-xl font-bold">€{parsedData.startBalance.toFixed(2)}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="technical-label text-[9px]">Total Salary/Income</span>
                          <p className="text-lg sm:text-xl font-bold">
                            €{parsedData.transactions.filter(t => t.checked && t.isIncome).reduce((sum, t) => sum + t.amount, 0).toFixed(2)}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="technical-label text-[9px]">Parsed Records</span>
                          <p className="text-lg sm:text-xl font-bold">{parsedData.transactions.filter(t => t.checked).length} selected</p>
                        </div>
                      </div>

                      {/* Preview Table */}
                      <div className="border border-border max-h-[300px] overflow-y-auto overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-secondary/40 sticky top-0 z-10">
                            <TableRow>
                              <TableHead className="w-12 text-center"></TableHead>
                              <TableHead className="text-xs font-mono font-bold uppercase tracking-wider">Date</TableHead>
                              <TableHead className="text-xs font-mono font-bold uppercase tracking-wider">Merchant</TableHead>
                              <TableHead className="hidden md:table-cell text-xs font-mono font-bold uppercase tracking-wider">Category</TableHead>
                              <TableHead className="text-right text-xs font-mono font-bold uppercase tracking-wider">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {parsedData.transactions.map((tx, idx) => (
                              <TableRow key={tx.id} className={cn(!tx.checked && "opacity-40 bg-muted/10")}>
                                <TableCell className="text-center p-2">
                                  <input 
                                    type="checkbox" 
                                    checked={tx.checked}
                                    onChange={(e) => {
                                      const updatedTxs = [...parsedData.transactions]
                                      updatedTxs[idx].checked = e.target.checked
                                      setParsedData({ ...parsedData, transactions: updatedTxs })
                                    }}
                                    className="cursor-pointer"
                                  />
                                </TableCell>
                                <TableCell className="font-mono text-[9px] p-2">
                                  {new Date(tx.date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' })}
                                </TableCell>
                                <TableCell className="font-mono text-[9px] p-2 uppercase max-w-[100px] sm:max-w-[150px] truncate" title={tx.merchant}>
                                  {tx.merchant}
                                </TableCell>
                                <TableCell className="hidden md:table-cell p-2">
                                  <Select
                                    value={tx.category_id?.toString() || "none"}
                                    onValueChange={(val) => {
                                      const catId = (!val || val === "none") ? null : parseInt(val)
                                      const updatedTxs = [...parsedData.transactions]
                                      updatedTxs[idx].category_id = catId
                                      setParsedData({ ...parsedData, transactions: updatedTxs })
                                    }}
                                  >
                                    <SelectTrigger className="h-6 text-[8px] font-mono uppercase bg-transparent border-border rounded-none p-1 shrink-0 w-24">
                                      <SelectValue placeholder="Categorize" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">Uncategorized</SelectItem>
                                      {categories.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id.toString()}>
                                          {cat.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className={cn("text-right font-mono text-[10px] font-bold p-2", tx.isIncome ? "text-emerald-600" : "")}>
                                  {tx.amount > 0 ? "+" : ""}€{tx.amount.toFixed(2)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Commit button */}
                      <MagneticButton 
                        onClick={handleCommitIngestion} 
                        disabled={isIngesting}
                        variant="none"
                        className="w-full uppercase font-mono text-[10px] py-4 bg-foreground text-background font-bold tracking-widest hover:bg-foreground/80 justify-center gap-2"
                        strength={0.1}
                      >
                        {isIngesting ? (
                          <>
                            <Loader2 className="h-4.5 w-4.5 animate-spin" />
                            Ingesting Nodes to Mainframe...
                          </>
                        ) : (
                          <>
                            <Check className="h-4.5 w-4.5" />
                            Commit Ingestion Node (Ready)
                          </>
                        )}
                      </MagneticButton>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <AuditTracePanel expenses={expenses} categories={categories} />
    </>
  )
}
