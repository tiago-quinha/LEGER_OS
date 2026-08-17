"use client"

import { useState, useMemo, useEffect, useTransition } from "react"
import { useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "@/lib/supabase"
import { Skeleton } from "@/components/ui/skeleton"
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
import { Sparkles, Plus, Trash2, Search, Upload, FileText, Check, Loader2, Landmark, Edit2, X, ChevronDown, SlidersHorizontal, Filter, AlertTriangle, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { AuditTracePanel } from "@/components/AuditTracePanel"
import { useSystem } from "@/lib/SystemContext"
import { getAIHeaders } from "@/lib/ai-client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"

import { MagneticButton } from "@/components/unlumen-ui/magnetic-button"
import { GlowingBadge } from "@/components/unlumen-ui/glowing-badge"
import { PrivacyValue } from "@/components/ui/privacy-value"
import { Tilt } from "@/components/unlumen-ui/tilt"
import { ClippedCircle } from "@/components/unlumen-ui/clipped-circle"
import { UnnamedTransactionResolver } from "@/components/UnnamedTransactionResolver"
import { SubscriptionRadar } from "@/components/SubscriptionRadar"

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
  is_anomaly?: boolean
}

interface Cycle {
  id: string
  label: string
  startDate: string
  endDate: string | null
  paycheckAmount: number
}

interface ExpensesViewProps {
  initialExpenses: Expense[]
  categories: Category[]
  initialRules: Rule[]
  cycles?: Cycle[]
  currentCycleId?: string
}

export function ExpensesView({ initialExpenses, categories: initialCategories, initialRules, cycles, currentCycleId }: ExpensesViewProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories)

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    if (typeof window !== "undefined") {
      const cached = sessionStorage.getItem("leger_os_cache_expenses")
      if (cached && initialExpenses.length === 0) {
        try { return JSON.parse(cached) } catch {}
      }
    }
    return initialExpenses
  })
  const [rules, setRules] = useState<Rule[]>(initialRules)
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(() => searchParams?.get("tab") || "history")

  useEffect(() => {
    const tabParam = searchParams?.get("tab")
    if (tabParam && (tabParam === "history" || tabParam === "rules" || tabParam === "ingest")) {
      setActiveTab(tabParam)
    }
  }, [searchParams])
  const [isCategorizing, setIsCategorizing] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [editingMerchantId, setEditingMerchantId] = useState<string | null>(null)
  const [editingMerchantValue, setEditingMerchantValue] = useState("")
  const [editingDateId, setEditingDateId] = useState<string | null>(null)
  const [editingDateValue, setEditingDateValue] = useState("")
  
  const { setAuditPanelOpen, setActiveTransactionId, refreshData, profile, currencySymbol, aiProvider, customApiKey, isPro, setSettingsOpen, setSettingsActiveTab, setSubscriptionOnly, user } = useSystem()

  // Save to browser cache when expenses update
  useEffect(() => {
    if (typeof window !== "undefined" && expenses.length > 0) {
      try { sessionStorage.setItem("leger_os_cache_expenses", JSON.stringify(expenses)) } catch {}
    }
  }, [expenses])

  // Sync state when parent server components re-fetch and refresh props
  useEffect(() => {
    setExpenses(initialExpenses)
  }, [initialExpenses])

  useEffect(() => {
    if (initialCategories && initialCategories.length > 0) {
      setCategories(initialCategories)
    } else {
      supabase
        .from("categories")
        .select("*")
        .order("name")
        .then(({ data }) => {
          if (data && data.length > 0) setCategories(data)
        })
    }
  }, [initialCategories])

  useEffect(() => {
    setRules(initialRules)
  }, [initialRules])

  const [selectedCycleId, setSelectedCycleId] = useState<string>(currentCycleId || cycles?.[0]?.id || "")

  useEffect(() => {
    if (currentCycleId) {
      setSelectedCycleId(currentCycleId)
    }
  }, [currentCycleId])

  const currentCycle = useMemo(() => {
    if (!cycles || cycles.length === 0) return null
    const activeId = selectedCycleId || currentCycleId
    if (activeId) {
      return cycles.find(c => c.id === activeId) || cycles[0]
    }
    return cycles[0]
  }, [cycles, currentCycleId, selectedCycleId])

  const cycleExpenses = useMemo(() => {
    if (!currentCycle) return []
    const start = new Date(currentCycle.startDate)
    const end = currentCycle.endDate ? new Date(currentCycle.endDate) : null
    
    return expenses.filter(e => {
      const d = new Date(e.date)
      const dTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
      const sTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()
      const eTime = end ? new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime() : null
      
      return dTime >= sTime && (!eTime || dTime <= eTime)
    })
  }, [expenses, currentCycle])

  const totalOut = useMemo(() => cycleExpenses
    .filter(e => parseFloat(e.amount as string) < 0)
    .reduce((sum, e) => sum + Math.abs(parseFloat(e.amount as string)), 0), [cycleExpenses])

  const totalIn = useMemo(() => cycleExpenses
    .filter(e => parseFloat(e.amount as string) > 0)
    .reduce((sum, e) => sum + parseFloat(e.amount as string), 0), [cycleExpenses])

  const daysElapsed = useMemo(() => {
    if (!currentCycle) return 1
    const today = new Date()
    const start = new Date(currentCycle.startDate)
    return Math.max(1, Math.floor((today.getTime() - start.getTime()) / 86400000))
  }, [currentCycle])

  const spendingLimit = profile?.target_monthly_spend || 1500

  useEffect(() => {
    if (typeof window !== "undefined") {
      const unclassifiedCount = expenses.filter(e => !e.category_id).length;
      
      const spendingByCategory: { name: string; value: number }[] = categories.map(cat => {
        const spent = cycleExpenses
          .filter(exp => exp.category_id === cat.id && parseFloat(exp.amount as string) < 0)
          .reduce((sum, exp) => sum + Math.abs(parseFloat(exp.amount as string) || 0), 0)
        return { name: cat.name, value: spent }
      }).filter(c => c.value > 0).sort((a, b) => b.value - a.value);

      const topExpenses = cycleExpenses
        .filter(e => parseFloat(e.amount as string) < 0)
        .sort((a, b) => parseFloat(a.amount as string) - parseFloat(b.amount as string))
        .slice(0, 10)
        .map(e => ({ date: e.date, merchant: e.merchant, amount: e.amount, category_id: e.category_id }));

      const recentExpenses = [...cycleExpenses]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10)
        .map(e => ({ date: e.date, merchant: e.merchant, amount: e.amount, category_id: e.category_id }));

      (window as any).__leger_cycle_telemetry = {
        totalIn,
        totalOut,
        currentBalance: totalIn - totalOut, // net delta
        velocity: 1.0,
        daysElapsed,
        spendingLimit,
        categories: spendingByCategory,
        netDelta: totalIn - totalOut,
        totalExpenses: expenses.length,
        unclassifiedCount,
        recentExpense: expenses[0] || null,
        categoriesCount: categories.length,
        topExpenses,
        recentExpenses
      };
      window.dispatchEvent(new Event("leger_telemetry_updated"));
    }
  }, [expenses, categories, cycleExpenses, totalIn, totalOut, daysElapsed, spendingLimit, profile])

  // --- Filtering States ---
  const [isFiltersVisible, setIsFiltersVisible] = useState(false)
  const [filterSearch, setFilterSearch] = useState("")
  const [filterCategory, setFilterCategory] = useState<string>("ALL")
  const [filterType, setFilterType] = useState<"all" | "inflow" | "outflow">("all")
  const [filterSource, setFilterSource] = useState<string>("ALL")
  const [filterDatePreset, setFilterDatePreset] = useState<string>("all")
  const [filterStartDate, setFilterStartDate] = useState("")
  const [filterEndDate, setFilterEndDate] = useState("")
  const [filterMinAmount, setFilterMinAmount] = useState("")
  const [filterMaxAmount, setFilterMaxAmount] = useState("")

  const uniqueSources = useMemo(() => {
    const sources = new Set<string>()
    expenses.forEach(e => {
      if (e.source) sources.add(e.source)
    })
    return Array.from(sources).sort()
  }, [expenses])

  const activeCycle = currentCycle

  const dateBoundaries = useMemo(() => {
    const today = new Date()
    let start = new Date(0)
    let end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)

    if (filterDatePreset === "cycle" && activeCycle) {
      start = new Date(activeCycle.startDate)
      if (activeCycle.endDate) {
        end = new Date(activeCycle.endDate)
      } else {
        end = new Date()
        end.setDate(end.getDate() + 1)
      }
    } else if (filterDatePreset === "30days") {
      start = new Date()
      start.setDate(today.getDate() - 30)
    } else if (filterDatePreset === "90days") {
      start = new Date()
      start.setDate(today.getDate() - 90)
    } else if (filterDatePreset === "ytd") {
      start = new Date(today.getFullYear(), 0, 1)
    } else if (filterDatePreset === "custom") {
      if (filterStartDate) start = new Date(filterStartDate)
      if (filterEndDate) {
        end = new Date(filterEndDate)
        end.setHours(23, 59, 59, 999)
      }
    }

    return { start, end }
  }, [filterDatePreset, activeCycle, filterStartDate, filterEndDate])

  useEffect(() => {
    if (selectedIds.size > 0) {
      document.body.setAttribute("data-bulk-active", "true")
    } else {
      document.body.removeAttribute("data-bulk-active")
    }
    return () => {
      document.body.removeAttribute("data-bulk-active")
    }
  }, [selectedIds.size])

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      // 1. Search Query
      if (filterSearch.trim() !== "") {
        const query = filterSearch.toLowerCase()
        const merchantMatch = exp.merchant?.toLowerCase().includes(query)
        const rawTextMatch = exp.raw_text?.toLowerCase().includes(query)
        if (!merchantMatch && !rawTextMatch) return false
      }

      // 2. Category
      if (filterCategory !== "ALL") {
        if (filterCategory === "UNCATEGORIZED") {
          if (exp.category_id !== null && exp.category_id !== undefined) return false
        } else {
          if (exp.category_id?.toString() !== filterCategory) return false
        }
      }

      // 3. Record Type
      const amt = parseFloat(exp.amount.toString()) || 0
      if (filterType === "inflow" && amt <= 0) return false
      if (filterType === "outflow" && amt >= 0) return false

      // 4. Source
      if (filterSource !== "ALL") {
        if (exp.source !== filterSource) return false
      }

      // 5. Date Boundaries
      const expDate = new Date(exp.date)
      if (expDate < dateBoundaries.start || expDate > dateBoundaries.end) return false

      // 6. Amount Range
      if (filterMinAmount !== "") {
        const minVal = parseFloat(filterMinAmount)
        if (!isNaN(minVal) && Math.abs(amt) < minVal) return false
      }
      if (filterMaxAmount !== "") {
        const maxVal = parseFloat(filterMaxAmount)
        if (!isNaN(maxVal) && Math.abs(amt) > maxVal) return false
      }

      return true
    })
  }, [expenses, filterSearch, filterCategory, filterType, filterSource, dateBoundaries, filterMinAmount, filterMaxAmount])

  const hasActiveFilters = useMemo(() => {
    return (
      filterSearch !== "" ||
      filterCategory !== "ALL" ||
      filterType !== "all" ||
      filterSource !== "ALL" ||
      filterDatePreset !== "all" ||
      filterMinAmount !== "" ||
      filterMaxAmount !== ""
    )
  }, [filterSearch, filterCategory, filterType, filterSource, filterDatePreset, filterMinAmount, filterMaxAmount])

  const handleResetFilters = () => {
    setFilterSearch("")
    setFilterCategory("ALL")
    setFilterType("all")
    setFilterSource("ALL")
    setFilterDatePreset("all")
    setFilterStartDate("")
    setFilterEndDate("")
    setFilterMinAmount("")
    setFilterMaxAmount("")
    setCurrentPage(1)
  }

  // Pagination & High-Performance Memoization
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 40

  const totalPages = Math.ceil(filteredExpenses.length / pageSize)
  const paginatedExpenses = useMemo(() => {
    return filteredExpenses.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  }, [filteredExpenses, currentPage])

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages)
    }
  }, [totalPages, currentPage])

  const summaryStats = useMemo(() => {
    let inflow = 0
    let outflow = 0
    for (let i = 0; i < filteredExpenses.length; i++) {
      const amt = parseFloat(filteredExpenses[i].amount.toString()) || 0
      if (amt > 0) inflow += amt
      else if (amt < 0) outflow += Math.abs(amt)
    }
    return {
      total: filteredExpenses.length,
      inflow: inflow.toFixed(2),
      outflow: outflow.toFixed(2)
    }
  }, [filteredExpenses])

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

  // Deletion confirmation custom dialog states (Jakob's Law UX alignment)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: "transaction" | "rule" } | null>(null)

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.name.endsWith(".pdf")) {
      const toastId = toast.loading(`Extracting text from PDF: ${file.name}...`)
      try {
        const arrayBuffer = await file.arrayBuffer()
        const res = await fetch("/api/ingest/parse-pdf", {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream"
          },
          body: arrayBuffer
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to extract PDF text")
        
        setExtractText(data.text)
        toast.success(`Successfully loaded and extracted PDF text!`, { id: toastId })
        
        // Auto-run the regex parser immediately for instant feedback
        setTimeout(() => {
          handleParseExtract(data.text)
        }, 100)
      } catch (err: any) {
        console.error(err)
        toast.error(`PDF Import error: ${err.message}`, { id: toastId })
      }
    } else {
      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target?.result as string
        setExtractText(text)
        toast.success(`Loaded file: ${file.name}`)
        
        // Auto-run the regex parser immediately for instant feedback
        setTimeout(() => {
          handleParseExtract(text)
        }, 100)
      }
      reader.onerror = () => {
        toast.error("Error reading text file.")
      }
      reader.readAsText(file)
    }
  }

  const MULTI_LANG_OUTFLOW_KW = [
    'saída', 'saida', 'débito', 'debito', 'levantamento', 'compra', 'pagamento', 'trf.imed. p/', 'transferência p/', 'transferencia p/', 'cargo', 'despesa', 'enviado', 'imposto', 'comissão', 'comissao', 'tarifa', 'anuidade', 'retirada', 'retirado',
    'outflow', 'exit', 'debit', 'withdrawal', 'charge', 'spent', 'paid out', 'money out', 'expense', 'purchase', 'payment', 'transfer to', 'fee', 'sent', 'bill', 'atm',
    'salida', 'cargo', 'retiro', 'gasto', 'pago', 'transferencia a', 'comisión', 'comision', 'reintegro',
    'sortie', 'débit', 'debit', 'retrait', 'dépense', 'depense', 'achat', 'paiement', 'virement vers', 'frais', 'prélèvement', 'prelevement',
    'ausgang', 'ausgabe', 'ausgaben', 'lastschrift', 'abhebung', 'kauf', 'zahlung', 'überweisung an', 'uberweisung an', 'soll', 'entnahme', 'gebühr', 'gebuehr',
    'uscita', 'uscite', 'addebito', 'prelievo', 'spesa', 'acquisto', 'pagamento', 'bonifico a', 'dare',
    'uitgaand', 'uitgaven', 'af', 'debet', 'opname', 'betaling', 'overboeking naar', 'aankoop', 'kosten'
  ]

  const MULTI_LANG_INFLOW_KW = [
    'entrada', 'crédito', 'credito', 'depósito', 'deposito', 'ordenado', 'salário', 'salario', 'vencimento', 'recebido', 'reembolso', 'devolução', 'devolucao', 'prémio', 'premio', 'rewards', 'trf.imed. de', 'transferência de', 'transferencia de', 'abono', 'rendimento',
    'inflow', 'entry', 'credit', 'deposit', 'income', 'salary', 'payroll', 'paycheck', 'received', 'paid in', 'money in', 'refund', 'reimbursement', 'reward', 'topup', 'top-up', 'transfer from', 'interest', 'cashback',
    'abono', 'ingreso', 'nómina', 'nomina', 'sueldo', 'salario', 'recibido', 'reembolso', 'devolución', 'devolucion', 'intereses',
    'entrée', 'entree', 'crédit', 'credit', 'dépôt', 'depot', 'revenu', 'salaire', 'paye', 'reçu', 'recu', 'remboursement', 'virement de', 'intérêts',
    'eingang', 'einnahme', 'einnahmen', 'gutschrift', 'einzahlung', 'gehalt', 'lohn', 'erhalten', 'erstattung', 'rückzahlung', 'haben', 'zinsen',
    'entrata', 'entrate', 'accredito', 'deposito', 'stipendio', 'salario', 'ricevuto', 'rimborso', 'bonifico da', 'avere',
    'inkomend', 'inkomsten', 'bij', 'credit', 'storting', 'salaris', 'loon', 'ontvangen', 'terugbetaling', 'rente'
  ]

  const handleParseExtract = (inputText?: string | React.MouseEvent) => {
    const textToParse = typeof inputText === "string" ? inputText : extractText
    if (!textToParse.trim()) {
      toast.error("Please paste bank statement text first.")
      return
    }

    try {
      // Regex patterns capturing date, merchant, amount, optional trailing balance
      const txPatternA = /^(\d{2}[-\/]\d{2}(?:[-\/]\d{4})?)(?:\s+\d{2}[-\/]\d{2}(?:[-\/]\d{4})?)?\s+(.+?)\s*([+-]?[\d.]+,\d{2}|\b[+-]?\d+\.\d{2}\b)(?:\s*(?:EUR|[\w$€£]+))?(?:\s+(-?[\d.]+(?:[.,]\d{2})?)(?:\s*(?:EUR|[\w$€£]+))?)?$/
      const balancePattern = /(?:Saldo(?:\s+(?:Inicial|Anterior|Abertura|Transitado|Partida|Anterior\s+em|de\s+Abertura))?|Initial\s+Balance|Opening\s+Balance|Balance\s+Forward|Solde(?:\s+Initial)?|Anfangsbestand)\s*(?:EUR|[\w$€£]+)?\s*[:=]?\s*([+-]?[\d.,]+)/i
      const periodPattern = /(?:PERÍODO DE|PERIOD|PERIODO DE)\s*(\d{4})[-\/]\d{2}[-\/]\d{2}\s*(?:A|TO)\s*(\d{4})[-\/]\d{2}[-\/]\d{2}/i

      const rawLines = textToParse.split("\n")
      const lines: string[] = []
      let currentTxLine = ""

      for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i].trim()
        if (!line) continue

        if (/^\d{2}[-\/]\d{2}/.test(line)) {
          if (currentTxLine) {
            lines.push(currentTxLine)
          }
          currentTxLine = line
        } else {
          if (currentTxLine) {
            if (txPatternA.test(currentTxLine)) {
              // Line complete
            } else {
              currentTxLine += " " + line
            }
          } else {
            lines.push(line)
          }
        }
      }
      if (currentTxLine) {
        lines.push(currentTxLine)
      }
      
      let startYear = new Date().getFullYear()
      let endYear = new Date().getFullYear()
      const periodMatch = textToParse.match(periodPattern)
      if (periodMatch) {
        startYear = parseInt(periodMatch[1])
        endYear = parseInt(periodMatch[2])
      }

      let initialBalance = 0
      const balanceMatch = textToParse.match(balancePattern)
      if (balanceMatch) {
        initialBalance = parseFloat(balanceMatch[1].replace(/\./g, "").replace(",", "."))
      }

      let detectedMonth = new Date().getMonth() + 1
      let detectedYear = startYear

      const txList: any[] = []
      let runningPrevBalance: number | null = initialBalance > 0 ? initialBalance : null

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        const matchA = line.match(txPatternA)
        if (matchA) {
          const [_, dateStr, merchant, amountStr, balanceStr] = matchA
          let rawAmountVal = parseFloat(amountStr.replace(/\./g, "").replace(",", "."))
          const hasExplicitMinus = amountStr.includes("-") || line.includes(" -")
          const hasExplicitPlus = amountStr.includes("+")

          const dateParts = dateStr.split(/[-\/]/)
          const day = parseInt(dateParts[0])
          const month = parseInt(dateParts[1])
          const txYear = dateParts.length === 3 ? parseInt(dateParts[2]) : ((month >= 11) ? startYear : endYear)
          
          detectedMonth = month
          detectedYear = txYear

          let currentLineBalance: number | null = null
          if (balanceStr) {
            const parsedBal = parseFloat(balanceStr.replace(/\./g, "").replace(",", "."))
            if (!isNaN(parsedBal)) {
              currentLineBalance = parsedBal
            }
          }

          // If initialBalance was not found in header, set runningPrevBalance from first line balance
          if (runningPrevBalance === null && currentLineBalance !== null) {
            runningPrevBalance = currentLineBalance
            if (initialBalance === 0) {
              initialBalance = currentLineBalance
            }
          }

          // 3-TIER SIGN DETERMINATION ENGINE
          let finalAmount = rawAmountVal

          // Tier 1: Mathematical Balance Delta Verification
          if (runningPrevBalance !== null && currentLineBalance !== null) {
            const delta = currentLineBalance - runningPrevBalance
            if (Math.abs(delta) > 0.001) {
              finalAmount = delta < 0 ? -Math.abs(rawAmountVal) : Math.abs(rawAmountVal)
            }
          } 
          // Tier 2: Explicit Sign Markers
          else if (hasExplicitMinus) {
            finalAmount = -Math.abs(rawAmountVal)
          } else if (hasExplicitPlus) {
            finalAmount = Math.abs(rawAmountVal)
          }
          // Tier 3: Action-First Multi-Lingual Keyword Recognition
          else {
            const lowerLine = line.toLowerCase()
            const hasOutflowAction = [
              'compra', 'pagamento', 'levantamento', 'retirada', 'retirado', 'saída', 'saida', 'débito', 'debito', 
              'purchase', 'payment', 'withdrawal', 'charge', 'spent', 'cargo', 'salida', 'gasto', 'pago', 
              'sortie', 'achat', 'ausgabe', 'kauf', 'zahlung', 'spesa', 'addebito', 'af', 'debet'
            ].some(kw => lowerLine.includes(kw))

            const hasInflowAction = [
              'ordenado', 'salário', 'salario', 'vencimento', 'recebido', 'reembolso', 'devolução', 'devolucao', 
              'salary', 'payroll', 'paycheck', 'deposit', 'received', 'refund', 'reimbursement', 'ingreso', 'nómina', 
              'nomina', 'sueldo', 'recibido', 'revenu', 'salaire', 'gehalt', 'lohn', 'erstattung', 'stipendio', 'rimborso', 'bij'
            ].some(kw => lowerLine.includes(kw))

            if (hasOutflowAction) {
              finalAmount = -Math.abs(rawAmountVal)
            } else if (hasInflowAction) {
              finalAmount = Math.abs(rawAmountVal)
            } else {
              const isOutflow = MULTI_LANG_OUTFLOW_KW.some(kw => lowerLine.includes(kw))
              const isInflow = MULTI_LANG_INFLOW_KW.some(kw => lowerLine.includes(kw))

              if (isOutflow && !isInflow) {
                finalAmount = -Math.abs(rawAmountVal)
              } else if (isInflow && !isOutflow) {
                finalAmount = Math.abs(rawAmountVal)
              } else {
                // Default fallback: if un-signed and no keywords, default to negative (expense)
                finalAmount = -Math.abs(rawAmountVal)
              }
            }
          }

          if (currentLineBalance !== null) {
            runningPrevBalance = currentLineBalance
          }

          const categoryId = matchCategory(merchant, rules, categories)

          txList.push({
            id: `temp-${i}-${Date.now()}`,
            amount: finalAmount,
            merchant: merchant.trim(),
            date: new Date(Date.UTC(txYear, month - 1, day)).toISOString(),
            raw_text: line,
            isIncome: finalAmount > 0,
            category_id: categoryId,
            checked: true
          })
        }
      }

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

      toast.success(`Parsed ${txList.length} transactions successfully across universal statement formats.`)
    } catch (err: any) {
      console.error(err)
      toast.error(`Ingestion parsing failure: ${err.message}`)
    }
  }

  const handleAiSmartParse = async () => {
    if (!isPro) {
      toast.error("AI Smart Ingestion is a LEGER_OS PRO feature.", {
        description: "Upgrade to PRO to unlock neural extraction of statements.",
      })
      setSettingsActiveTab("pro")
      setSubscriptionOnly(true)
      setSettingsOpen(true)
      return
    }

    if (!extractText.trim()) {
      toast.error("Please paste statement text or upload a file first.")
      return
    }

    setIsAiParsing(true)
    const toastId = toast.loading("Leger AI is analyzing statement structure across universal bank formats...")

    try {
      const res = await fetch("/api/ingest/ai-parse", {
        method: "POST",
        headers: getAIHeaders(aiProvider, customApiKey),
        body: JSON.stringify({ text: extractText })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "AI parsing failed")
      if (!data.transactions || data.transactions.length === 0) {
        throw new Error("AI could not detect valid transactions in this text.")
      }

      const txList = data.transactions.map((tx: any, index: number) => {
        let amtVal = parseFloat(tx.amount) || 0
        const merch = tx.merchant || "Unknown Merchant"
        const rawLower = (tx.raw_text || merch).toLowerCase()

        // Multi-lingual keyword sign check safety net
        if (amtVal > 0 && MULTI_LANG_OUTFLOW_KW.some(kw => rawLower.includes(kw) || merch.toLowerCase().includes(kw))) {
          if (!MULTI_LANG_INFLOW_KW.some(kw => rawLower.includes(kw) || merch.toLowerCase().includes(kw))) {
            amtVal = -amtVal
          }
        }

        const isInc = amtVal > 0
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

      toast.success(`Leger AI extracted ${txList.length} transactions successfully!`, { id: toastId })
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
            date: parsedData.startDate,
            user_id: user?.id
          }, { onConflict: 'user_id,date' })
        
        if (balError) throw balError
      }

      // 2. Calculate and ingest income snapshot (all positive selected items)
      const incomeSum = selectedTxs
        .filter(t => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0)
      
      if (incomeSum > 0) {
        const { error: incError } = await supabase
          .from("income")
          .upsert({
            amount: incomeSum,
            month: parsedData.month,
            year: parsedData.year,
            user_id: user?.id
          }, { onConflict: 'user_id,month,year' })
        
        if (incError) throw incError
      }

      // 3. Batch insert transaction records
      const txsToInsert = selectedTxs.map(t => ({
        amount: t.amount.toString(),
        merchant: t.merchant,
        date: t.date,
        source: "Statement Ingestion",
        raw_text: t.raw_text,
        category_id: t.category_id,
        user_id: user?.id
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
    if (!isPro) {
      toast.error("Forensic Transaction Auditing is a LEGER_OS PRO feature.", {
        description: "Upgrade to PRO to inspect transaction anomalies and edit record balances.",
      })
      setSettingsActiveTab("pro")
      setSubscriptionOnly(true)
      setSettingsOpen(true)
      return
    }
    setActiveTransactionId(id)
    setAuditPanelOpen(true)
  }

  const handleCategoryChange = async (expenseId: string, categoryId: string) => {
    const catId = categoryId === "none" ? null : parseInt(categoryId)
    
    // Optimistically update list state instantly
    const previousExpenses = [...expenses]
    setExpenses(prev =>
      prev.map(exp =>
        exp.id.toString() === expenseId.toString() ? { ...exp, category_id: catId } : exp
      )
    )
    toast.success("Category updated")

    const { error } = await supabase
      .from("tracker_expense")
      .update({ category_id: catId })
      .eq("id", expenseId)

    if (error) {
      toast.error("Failed to update category")
      setExpenses(previousExpenses)
      console.error(error)
      return
    }
  }

  const handleBulkCategoryChange = async (categoryId: string | null) => {
    if (!categoryId || selectedIds.size === 0) return
    const catId = categoryId === "none" ? null : parseInt(categoryId)
    const idsArray = Array.from(selectedIds)
    
    // Optimistically update lists and clear selection instantly
    const previousExpenses = [...expenses]
    setExpenses(prev =>
      prev.map(exp =>
        selectedIds.has(exp.id.toString()) ? { ...exp, category_id: catId } : exp
      )
    )
    const selectedCopy = new Set(selectedIds)
    setSelectedIds(new Set())
    toast.success("Bulk categories updated")

    const { error } = await supabase
      .from("tracker_expense")
      .update({ category_id: catId })
      .in("id", idsArray)

    if (error) {
      toast.error("Failed to bulk update categories")
      setExpenses(previousExpenses)
      setSelectedIds(selectedCopy)
      console.error(error)
      return
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} selected transactions?`)) return
    const idsArray = Array.from(selectedIds)
    const previousExpenses = [...expenses]
    const selectedCopy = new Set(selectedIds)

    // Optimistically update state instantly
    setExpenses(prev => prev.filter(exp => !selectedIds.has(exp.id.toString())))
    setSelectedIds(new Set())
    toast.success(`Deleted ${selectedCopy.size} transactions`)

    const { error } = await supabase
      .from("tracker_expense")
      .delete()
      .in("id", idsArray)

    if (error) {
      toast.error("Failed to delete transactions")
      setExpenses(previousExpenses)
      setSelectedIds(selectedCopy)
      console.error(error)
      return
    }
  }

  const handleSaveMerchant = async (expenseId: string, newMerchant: string) => {
    const trimmed = newMerchant.trim()
    const originalExpense = expenses.find(e => e.id.toString() === expenseId.toString())
    if (!trimmed || trimmed === originalExpense?.merchant) {
      setEditingMerchantId(null)
      return
    }

    const previousExpenses = [...expenses]

    // Optimistically update state and close editor instantly
    setExpenses(prev =>
      prev.map(exp => exp.id.toString() === expenseId.toString() ? { ...exp, merchant: trimmed } : exp)
    )
    setEditingMerchantId(null)
    toast.success("Merchant updated")

    const { error } = await supabase
      .from("tracker_expense")
      .update({ merchant: trimmed })
      .eq("id", expenseId)

    if (error) {
      toast.error("Failed to update merchant")
      setExpenses(previousExpenses)
      console.error(error)
      return
    }
  }

  const handleSaveDate = async (expenseId: string, newDateStr: string) => {
    if (!newDateStr) {
      setEditingDateId(null)
      return
    }

    const originalExpense = expenses.find(e => e.id.toString() === expenseId.toString())
    if (!originalExpense) {
      setEditingDateId(null)
      return
    }

    const [year, month, day] = newDateStr.split("-").map(Number)
    if (!year || !month || !day) {
      setEditingDateId(null)
      return
    }

    const dateObj = new Date(originalExpense.date)
    dateObj.setFullYear(year, month - 1, day)
    const formattedIsoDate = dateObj.toISOString()

    const origD = new Date(originalExpense.date)
    const origYyyy = origD.getFullYear()
    const origMm = String(origD.getMonth() + 1).padStart(2, '0')
    const origDd = String(origD.getDate()).padStart(2, '0')
    const origDateStr = `${origYyyy}-${origMm}-${origDd}`

    if (newDateStr === origDateStr) {
      setEditingDateId(null)
      return
    }

    const previousExpenses = [...expenses]

    // Optimistically update state and close editor instantly
    setExpenses(prev =>
      prev.map(exp => exp.id.toString() === expenseId.toString() ? { ...exp, date: formattedIsoDate } : exp)
    )
    setEditingDateId(null)
    toast.success("Transaction date updated")

    const { error } = await supabase
      .from("tracker_expense")
      .update({ date: formattedIsoDate })
      .eq("id", expenseId)

    if (error) {
      toast.error("Failed to update date")
      setExpenses(previousExpenses)
      console.error(error)
      return
    }
  }

  const handleSelectAll = () => {
    const pageIds = paginatedExpenses.map(e => e.id)
    const allSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id))
    if (allSelected) {
      const next = new Set(selectedIds)
      pageIds.forEach(id => next.delete(id))
      setSelectedIds(next)
    } else {
      const next = new Set(selectedIds)
      pageIds.forEach(id => next.add(id))
      setSelectedIds(next)
    }
  }

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredExpenses.map(e => e.id)
    const allFilteredSelected = filteredIds.length > 0 && filteredIds.every(id => selectedIds.has(id))
    if (allFilteredSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredIds))
    }
  }

  const handleSelectOne = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const getLocalCategory = (merchant: string) => {
    const name = merchant.toLowerCase()
    
    if (name.includes("superfaro") || name.includes("galp") || name.includes("repsol") || 
        name.includes("bp") || name.includes("prio") || name.includes("cepsa") || 
        name.includes("gasoleo") || name.includes("combust")) {
      return categories.find(c => c.name === "Gas")
    }

    if (
      name.includes("eupago - inst") || name.includes("eupago- inst") ||
      name.includes("eu pago - inst") || name.includes("eu pago- inst") ||
      name.includes("trf.imed.") || name.includes("trf imed") ||
      name.includes("betclic") || name.includes("betano") || 
      name.includes("keydrop") || name.includes("casino") || 
      name.includes("jogos santa casa")
    ) {
      return categories.find(c => c.name === "Gambling")
    }

    if (name.includes("eupago") || name.includes("eu pago")) {
      return categories.find(c => c.name === "Other")
    }

    if (name.includes("mbway") || name.includes("mb way") || 
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
    if (!isPro) {
      toast.error("AI Cleanse & Categorize is a LEGER_OS PRO feature.", {
        description: "Upgrade to PRO to unlock neural transaction cleansing and automated categorization.",
      })
      setSettingsActiveTab("pro")
      setSubscriptionOnly(true)
      setSettingsOpen(true)
      return
    }
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
          headers: getAIHeaders(aiProvider, customApiKey),
          body: JSON.stringify({ expenses: remainingForAI, categories })
        })

        if (response.status === 429) {
          toast.error("Leger AI Quota Exceeded. Please try again later.")
        } else if (response.ok) {
          const data = await response.json()
          
          const updates: { id: string, category_id?: number, merchant?: string }[] = []
          for (let i = 0; i < remainingForAI.length; i++) {
            const predictedCategoryName = data.predictions[i]
            const cleanedMerchant = data.cleanedMerchants ? data.cleanedMerchants[i] : null
            const category = categories.find(c => c.name === predictedCategoryName)
            if (category || (cleanedMerchant && typeof cleanedMerchant === 'string')) {
              const u: { id: string, category_id?: number, merchant?: string } = { id: remainingForAI[i].id }
              if (category) u.category_id = category.id
              if (cleanedMerchant && typeof cleanedMerchant === 'string') u.merchant = cleanedMerchant
              updates.push(u)
            }
          }

          if (updates.length > 0) {
            await Promise.all(
              updates.map(u => supabase.from("tracker_expense").update(u).eq("id", u.id))
            )
            setExpenses(prev => prev.map(exp => {
              const update = updates.find(u => u.id === exp.id)
              return update ? { ...exp, ...update } : exp
            }))
            successCount += updates.length
            toast.success(`Leger AI cleansed & categorized ${updates.length} additional expenses!`)
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
      toast.success(`Total processed: ${successCount}`)
      refreshData()
    }
  }

  const handleBulkAiCleanse = async () => {
    if (!isPro) {
      toast.error("AI Cleanse & Categorize is a LEGER_OS PRO feature.", {
        description: "Upgrade to PRO to unlock neural transaction cleansing and automated categorization.",
      })
      setSettingsActiveTab("pro")
      setSubscriptionOnly(true)
      setSettingsOpen(true)
      return
    }
    if (selectedIds.size === 0) return
    const selectedTxs = expenses.filter(e => selectedIds.has(e.id))
    if (selectedTxs.length === 0) return

    setIsCategorizing(true)
    toast.info(`Consulting Leger AI to cleanse & categorize ${selectedTxs.length} selected items...`)

    try {
      const response = await fetch("/api/categorize", {
        method: "POST",
        headers: getAIHeaders(aiProvider, customApiKey),
        body: JSON.stringify({ expenses: selectedTxs, categories })
      })

      if (response.status === 429) {
        toast.error("Leger AI Quota Exceeded. Please try again later.")
      } else if (response.ok) {
        const data = await response.json()
        const updates: { id: string, category_id?: number, merchant?: string }[] = []
        for (let i = 0; i < selectedTxs.length; i++) {
          const predictedCategoryName = data.predictions[i]
          const cleanedMerchant = data.cleanedMerchants ? data.cleanedMerchants[i] : null
          const category = categories.find(c => c.name === predictedCategoryName)
          if (category || (cleanedMerchant && typeof cleanedMerchant === 'string')) {
            const u: { id: string, category_id?: number, merchant?: string } = { id: selectedTxs[i].id }
            if (category) u.category_id = category.id
            if (cleanedMerchant && typeof cleanedMerchant === 'string') u.merchant = cleanedMerchant
            updates.push(u)
          }
        }

        if (updates.length > 0) {
          await Promise.all(
            updates.map(u => supabase.from("tracker_expense").update(u).eq("id", u.id))
          )
          setExpenses(prev => prev.map(exp => {
            const update = updates.find(u => u.id === exp.id)
            return update ? { ...exp, ...update } : exp
          }))
          toast.success(`Leger AI cleansed & categorized ${updates.length} transactions!`)
          setSelectedIds(new Set())
          refreshData()
        } else {
          toast.info("No new updates generated for selected items.")
        }
      } else {
        toast.error("AI cleansing failed")
      }
    } catch (err) {
      console.error("AI Error:", err)
      toast.error("Failed to connect to AI service")
    } finally {
      setIsCategorizing(false)
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

  const handleDeleteRule = (id: string) => {
    setDeleteTarget({ id, type: "rule" })
    setDeleteConfirmOpen(true)
  }

  const handleDeleteExpense = (id: string) => {
    setDeleteTarget({ id, type: "transaction" })
    setDeleteConfirmOpen(true)
  }

  const handleToggleAnomaly = async (id: string, currentStatus?: boolean) => {
    const newStatus = !currentStatus

    // Optimistically update local list state
    const previousExpenses = [...expenses]
    setExpenses(prev =>
      prev.map(exp => 
        exp.id.toString() === id.toString() 
          ? { ...exp, is_anomaly: newStatus } 
          : exp
      )
    )

    toast.success(newStatus ? "Flagged as anomaly (excluded from burn rate)" : "Removed anomaly flag")

    const { error } = await supabase
      .from("tracker_expense")
      .update({ is_anomaly: newStatus })
      .eq("id", id)

    if (error) {
      toast.error("Failed to update transaction status")
      setExpenses(previousExpenses)
      return
    }

    refreshData()
  }

  const executeDelete = async () => {
    if (!deleteTarget) return
    const { id, type } = deleteTarget
    setDeleteConfirmOpen(false)
    setDeleteTarget(null)

    if (type === "rule") {
      const previousRules = [...rules]
      setRules(rules.filter(r => Number(r.id) !== Number(id)))
      toast.success("Rule deleted")

      const { error } = await supabase
        .from("merchant_rules")
        .delete()
        .eq("id", id)

      if (error) {
        toast.error("Failed to delete rule")
        setRules(previousRules)
        return
      }
    } else {
      const previousExpenses = [...expenses]
      setExpenses(prev => prev.filter(exp => exp.id.toString() !== id.toString()))
      toast.success("Transaction deleted")

      const { error } = await supabase
        .from("tracker_expense")
        .delete()
        .eq("id", id)

      if (error) {
        toast.error("Failed to delete transaction")
        setExpenses(previousExpenses)
        return
      }
    }
  }

  const handleAddManualExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualAmount || !manualMerchant || isSavingManual) {
      toast.error("Merchant and Amount are required.")
      return
    }

    const amtVal = parseFloat(manualAmount)
    if (isNaN(amtVal) || amtVal <= 0) {
      toast.error("Please enter a valid positive number for the amount.")
      return
    }
    if (amtVal > 1000000) {
      toast.error("Amount exceeds realistic limits (max €1,000,000 per transaction).")
      return
    }
    const formattedAmount = isIncome ? Math.abs(amtVal) : -Math.abs(amtVal)
    const tempId = `temp-${Date.now()}`
    
    const newTx: Expense = {
      id: tempId,
      amount: formattedAmount,
      merchant: manualMerchant.toUpperCase(),
      date: manualDate,
      source: "Manual UI Ingest",
      raw_text: `Manual Entry: ${manualMerchant.toUpperCase()} [${manualDate}]`,
      category_id: manualCategoryId ? parseInt(manualCategoryId) : null
    }

    // Optimistically update list state and close overlay drawer instantly
    setExpenses(prev => [newTx, ...prev])
    setIsAddOpen(false)
    setManualAmount("")
    setManualMerchant("")
    setManualCategoryId("")
    setManualDate(new Date().toISOString().split('T')[0])
    setIsIncome(false)
    toast.success("Transaction committed successfully.")

    setIsSavingManual(true)
    try {
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
        // Swap temp state item with the resolved DB response data item
        setExpenses(prev => prev.map(exp => exp.id.toString() === tempId.toString() ? (data[0] as Expense) : exp))
      }
    } catch (err: any) {
      console.error(err)
      toast.error(`Manual insert failure: ${err.message}`)
      setExpenses(prev => prev.filter(exp => exp.id.toString() !== tempId.toString()))
    } finally {
      setIsSavingManual(false)
    }
  }

  return (
    <>
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
              <Landmark className="h-3.5 w-3.5" />
              <span>Transaction ledger</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase leading-none break-words">
              Ledger
            </h1>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              <Button
                onClick={() => setIsAddOpen(true)}
                className="hidden sm:inline-flex rounded-none px-6 font-mono text-[10px] uppercase tracking-widest h-10 border border-border ledger-border bg-card hover:bg-secondary items-center justify-center cursor-pointer select-none transition-all whitespace-nowrap outline-none w-full sm:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" /> Add Entry
              </Button>

              <AnimatePresence mode="wait">
                {isAddOpen && (
                  <motion.div
                    key="expenses-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    onClick={() => setIsAddOpen(false)}
                    className="fixed inset-0 z-[100010] bg-background/80 backdrop-blur-sm flex items-end justify-center font-mono p-0 sm:p-6 select-none"
                  >
                    <motion.div
                      key="expenses-drawer"
                      onClick={(e) => e.stopPropagation()}
                      initial={{ y: "100%", opacity: 0.95 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: "100%", opacity: 0 }}
                      transition={{ type: "spring", damping: 25, stiffness: 300 }}
                      drag="y"
                      dragConstraints={{ top: 0, bottom: 0 }}
                      dragElastic={{ top: 0, bottom: 0.6 }}
                      onDragEnd={(_, info) => {
                        if (info.offset.y > 80 || info.velocity.y > 250) {
                          setIsAddOpen(false);
                        }
                      }}
                      className="w-full max-w-md bg-[#09090b] border-t sm:border border-border text-foreground shadow-2xl flex flex-col overflow-hidden max-h-[92vh] rounded-t-2xl sm:rounded-2xl"
                    >
                      {/* Top Drag Handle */}
                      <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto my-2.5 cursor-grab active:cursor-grabbing shrink-0" />

                      {/* Drawer Header */}
                      <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-card/40 shrink-0">
                        <div>
                          <h3 className="text-xs uppercase tracking-widest font-mono font-bold">
                            Add Entry
                          </h3>
                          <p className="text-[10px] text-muted-foreground uppercase font-mono mt-0.5">
                            Register transaction details manually
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsAddOpen(false)}
                          className="p-1.5 hover:bg-secondary border border-transparent hover:border-border transition-all cursor-pointer rounded"
                        >
                          <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                        </button>
                      </div>

                      <form onSubmit={handleAddManualExpense} className="p-5 overflow-y-auto space-y-4 font-mono text-xs">
                        {/* Segmented Transaction Type Selector */}
                        <div className="grid grid-cols-2 gap-1 bg-secondary/15 border border-border/80 p-0.5 font-mono text-[9px] uppercase tracking-wider">
                          <button
                            type="button"
                            onClick={() => setIsIncome(false)}
                            className={cn(
                              "py-2 px-3 text-center transition-all cursor-pointer font-bold select-none border",
                              !isIncome 
                                ? "bg-foreground text-background border-foreground" 
                                : "text-muted-foreground hover:text-foreground border-transparent hover:bg-secondary/20"
                            )}
                          >
                            Outflow (Debit)
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsIncome(true)}
                            className={cn(
                              "py-2 px-3 text-center transition-all cursor-pointer font-bold select-none border",
                              isIncome 
                                ? "bg-emerald-500 text-white border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.2)]" 
                                : "text-muted-foreground hover:text-foreground border-transparent hover:bg-secondary/20"
                            )}
                          >
                            Inflow (Income)
                          </button>
                        </div>

                        <div className="space-y-1.5">
                           <Label htmlFor="manualMerchant" className="technical-label">Merchant / Payee</Label>
                           <Input 
                              id="manualMerchant" 
                              type="text" 
                              required
                              placeholder="e.g. LIDL" 
                              value={manualMerchant}
                              onChange={(e) => setManualMerchant(e.target.value)}
                              className="rounded-none h-10 sm:h-9 text-base sm:text-xs uppercase"
                           />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1.5">
                              <Label htmlFor="manualAmount" className="technical-label">Amount ({currencySymbol})</Label>
                              <Input 
                                 id="manualAmount" 
                                 type="number" 
                                 step="0.01"
                                 inputMode="decimal"
                                 pattern="[0-9]*"
                                 required
                                 placeholder="15.50" 
                                 value={manualAmount}
                                 onChange={(e) => setManualAmount(e.target.value)}
                                 className="rounded-none h-10 sm:h-9 text-base sm:text-xs"
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
                                 className="rounded-none h-10 sm:h-9 text-base sm:text-xs"
                              />
                           </div>
                        </div>

                        <div className="space-y-1.5">
                           <Label htmlFor="manualCategory" className="technical-label">Target Category</Label>
                           <div className="relative">
                              <select
                                 id="manualCategory"
                                 value={manualCategoryId}
                                 onChange={(e) => setManualCategoryId(e.target.value)}
                                 className="w-full h-10 sm:h-9 px-2 pr-8 border border-border bg-secondary/15 rounded-none text-base sm:text-xs uppercase text-foreground outline-none appearance-none"
                              >
                                 <option value="">Unclassified</option>
                                 {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                 ))}
                              </select>
                              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                           </div>
                        </div>

                        <Button 
                           type="submit" 
                           disabled={isSavingManual}
                           className="w-full rounded-none h-10 font-mono text-[9px] uppercase tracking-widest font-bold bg-foreground text-background hover:bg-foreground/80 mt-2"
                        >
                           {isSavingManual ? "Saving..." : "Add Entry"}
                        </Button>
                      </form>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

             <MagneticButton 
               onClick={smartCategorize} 
               disabled={isCategorizing}
               variant="none"
               className="hidden md:flex bg-foreground text-background hover:bg-foreground/80 border border-transparent font-mono text-[10px] uppercase tracking-widest px-4 py-2 items-center justify-center rounded-none h-10 ledger-border w-full sm:w-auto"
               strength={0.2}
             >
               {isCategorizing ? (
                 "Cleansing..."
               ) : (
                 <>
                   <Sparkles className="mr-2 h-4 w-4" />
                   AI Cleanse & Categorize
                 </>
               )}
             </MagneticButton>
           </div>
        </header>

        {/* Unnamed Bank Transaction Resolver & Push Alert Banner */}
        <UnnamedTransactionResolver 
          expenses={expenses} 
          categories={categories} 
          onTransactionUpdated={(updatedTx) => setExpenses(prev => prev.map(e => e.id === updatedTx.id ? { ...e, ...updatedTx } : e))}
        />

        {/* 3 Executive Ledger Summary Cards Up Top */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Tilt rotationFactor={6} className="p-6 md:p-8 space-y-3 bg-card/20 border border-border relative group overflow-hidden flex flex-col justify-between glow-card">
            <span className="technical-label text-[9px] border-b border-dotted border-muted-foreground/30 w-fit z-10">Total Ledger Entries</span>
            <div className="text-3xl md:text-5xl font-mono font-bold tracking-tighter z-10">
              {summaryStats.total} <span className="text-xs font-normal text-muted-foreground">ENTRIES</span>
            </div>
            <ClippedCircle circleClassName="bg-foreground/5" circleSize={400} />
          </Tilt>
          <Tilt rotationFactor={6} className="p-6 md:p-8 space-y-3 bg-card/20 border border-border relative group overflow-hidden flex flex-col justify-between glow-card">
            <span className="technical-label text-[9px] border-b border-dotted border-muted-foreground/30 w-fit z-10">Total Inflow</span>
            <div className="text-3xl md:text-5xl font-mono font-bold tracking-tighter z-10">
              <PrivacyValue>{currencySymbol}{summaryStats.inflow}</PrivacyValue>
            </div>
            <ClippedCircle circleClassName="bg-foreground/5" circleSize={400} />
          </Tilt>
          <Tilt rotationFactor={6} className="p-6 md:p-8 space-y-3 bg-card/20 border border-border relative group overflow-hidden flex flex-col justify-between glow-card">
            <span className="technical-label text-[9px] border-b border-dotted border-muted-foreground/30 w-fit z-10">Total Outflow</span>
            <div className="text-3xl md:text-5xl font-mono font-bold tracking-tighter z-10">
              <PrivacyValue>{currencySymbol}{summaryStats.outflow}</PrivacyValue>
            </div>
            <ClippedCircle circleClassName="bg-foreground/5" circleSize={400} />
          </Tilt>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="w-full min-w-0">
            <TabsList className="bg-card/40 border border-border p-1 grid grid-cols-4 w-full gap-1">
              <TabsTrigger value="history" className="rounded-none px-1 sm:px-4 py-2.5 uppercase tracking-tighter sm:tracking-widest font-mono text-[10px] sm:text-xs font-bold truncate">History</TabsTrigger>
              <TabsTrigger value="radar" className="rounded-none px-1 sm:px-4 py-2.5 uppercase tracking-tighter sm:tracking-widest font-mono text-[10px] sm:text-xs font-bold truncate">Radar</TabsTrigger>
              <TabsTrigger value="rules" className="rounded-none px-1 sm:px-4 py-2.5 uppercase tracking-tighter sm:tracking-widest font-mono text-[10px] sm:text-xs font-bold truncate">Rules</TabsTrigger>
              <TabsTrigger value="ingest" data-tour="ingest-tab" className="rounded-none px-1 sm:px-4 py-2.5 uppercase tracking-tighter sm:tracking-widest font-mono text-[10px] sm:text-xs font-bold truncate">Ingest</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="history" className="space-y-4">
            {/* Full-width Glassmorphism Bulk Action Dock (Flush with Bottom Navbar) */}
            {selectedIds.size > 0 && (
              <div className="fixed bottom-14 md:bottom-0 left-0 right-0 z-[99990] w-full bg-card/98 dark:bg-zinc-950/98 backdrop-blur-xl border-t border-b sm:border-b-0 border-border shadow-[0_-12px_40px_rgba(0,0,0,0.5)] px-3 py-2 sm:px-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
                <div className="mx-auto max-w-[1500px] flex items-center justify-between gap-1.5 sm:gap-3">
                  
                  {/* Left: Selection Count & Filtered Select Box */}
                  <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      className={cn(
                        "h-4 w-4 sm:h-5 sm:w-5 border flex items-center justify-center transition-all cursor-pointer rounded-none shrink-0",
                        filteredExpenses.length > 0 && filteredExpenses.every(e => selectedIds.has(e.id))
                          ? "bg-foreground border-foreground text-background shadow-sm"
                          : "border-border/80 bg-card/40 hover:border-foreground/50 text-transparent"
                      )}
                      title="Toggle select all matching active filter"
                    >
                      <Check className="h-3 w-3 stroke-[3]" />
                    </button>

                    <div className="flex items-center gap-1.5 font-mono text-xs">
                      <span className="bg-foreground text-background px-1.5 py-0.5 font-bold text-[11px] sm:text-xs">{selectedIds.size}</span>
                      <span className="text-muted-foreground uppercase tracking-wider text-[10px] sm:text-[11px] hidden sm:inline">Selected</span>

                      {filteredExpenses.length > 0 && (
                        <Select
                          value={
                            filteredExpenses.every(e => selectedIds.has(e.id))
                              ? "all_filtered"
                              : paginatedExpenses.every(e => selectedIds.has(e.id))
                              ? "current_page"
                              : "custom"
                          }
                          onValueChange={(val: string | null) => {
                            if (val === "all_filtered") {
                              setSelectedIds(new Set(filteredExpenses.map(e => e.id)))
                            } else if (val === "current_page") {
                              setSelectedIds(new Set(paginatedExpenses.map(e => e.id)))
                            } else if (val === "none") {
                              setSelectedIds(new Set())
                            }
                          }}
                        >
                          <SelectTrigger className="h-7 text-[10px] font-mono uppercase tracking-wider bg-secondary/40 border-border/60 hover:bg-secondary/70 rounded-none cursor-pointer px-1.5 w-[90px] xs:w-[110px] sm:w-[160px]">
                            <SelectValue placeholder="Scope..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all_filtered">
                              All {filteredExpenses.length} Filtered
                            </SelectItem>
                            <SelectItem value="current_page">
                              Current Page ({paginatedExpenses.length})
                            </SelectItem>
                            <SelectItem value="none">
                              Clear Selection
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions (AI Cleanse, Categorize Dropdown, Delete, Close) */}
                  <div className="flex items-center gap-1 sm:gap-2 justify-end shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 sm:h-8 rounded-none text-[11px] sm:text-xs font-mono text-foreground hover:bg-secondary transition-colors cursor-pointer px-1.5 sm:px-3 shrink-0 border border-border/60"
                      onClick={handleBulkAiCleanse}
                      disabled={isCategorizing}
                      title="AI Cleanse & Categorize selected"
                    >
                      <Sparkles className="h-3 w-3 text-emerald-500 sm:mr-1" />
                      <span className="hidden sm:inline">AI Cleanse</span>
                    </Button>

                    <Select onValueChange={(val: string | null) => {
                      handleBulkCategoryChange(val)
                    }}>
                      <SelectTrigger className="w-[100px] sm:w-[170px] h-7 sm:h-8 text-[10px] sm:text-xs font-mono bg-secondary/60 border-border hover:bg-secondary transition-colors rounded-none cursor-pointer px-1.5">
                        <SelectValue placeholder="Categorize..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Uncategorized</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id.toString()}>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />
                              {cat.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 sm:h-8 rounded-none text-xs font-mono text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer px-1.5 sm:px-3 shrink-0"
                      onClick={handleBulkDelete}
                      title="Delete selected"
                    >
                      <Trash2 className="h-3.5 w-3.5 sm:mr-1" />
                      <span className="hidden sm:inline">Delete</span>
                    </Button>

                    <div className="h-4 w-px bg-border hidden sm:block" />

                    <Button
                      size="icon-xs"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                      onClick={() => setSelectedIds(new Set())}
                      title="Clear selection"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
            <Card className="rounded-none border-border ledger-border">
              <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/40 gap-2 flex-wrap sm:flex-nowrap">
                <CardTitle className="text-base sm:text-lg font-mono tracking-tight flex items-center gap-2 shrink-0">
                  Transactions
                </CardTitle>
                <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 shrink-0 max-w-full">
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      onClick={handleResetFilters}
                      className="h-8 text-[9px] uppercase font-mono tracking-widest text-amber-500 hover:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-none border border-amber-500/30 px-2 sm:px-3 cursor-pointer shrink-0 flex items-center gap-1"
                      title="Reset active filters"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span className="hidden xs:inline">Clear Filters</span>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    onClick={smartCategorize}
                    disabled={isCategorizing}
                    className="md:hidden h-8 text-[9px] uppercase font-mono tracking-widest border border-border hover:bg-secondary/20 text-muted-foreground hover:text-foreground rounded-none px-2 sm:px-3 cursor-pointer flex items-center gap-1.5 transition-all select-none shrink-0"
                  >
                    <Sparkles className="h-3 w-3 text-emerald-500" />
                    <span className="hidden xs:inline">{isCategorizing ? "Cleansing..." : "AI Cleanse"}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setIsFiltersVisible(!isFiltersVisible)}
                    className={cn(
                      "h-8 text-[9px] uppercase font-mono tracking-widest rounded-none border px-2 sm:px-3 cursor-pointer flex items-center gap-1 sm:gap-1.5 transition-all select-none shrink-0",
                      isFiltersVisible 
                        ? "border-foreground bg-secondary/35 text-foreground" 
                        : "border-border hover:bg-secondary/20 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Filter className="h-3.5 w-3.5" />
                    <span className="hidden xs:inline">Filters {isFiltersVisible ? "[Close]" : "[Open]"}</span>
                  </Button>
                </div>
              </CardHeader>
              
              {/* Clean, minimalist and hideable filter panel */}
              {isFiltersVisible && (
                <div className="p-4 sm:p-6 bg-secondary/15 border-b border-border space-y-4 animate-in fade-in slide-in-from-top-4 duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 font-mono text-[10px] uppercase">
                    {/* Search Matcher */}
                    <div className="space-y-1.5">
                      <label htmlFor="filter-search" className="text-muted-foreground font-bold tracking-wider">Search Matcher</label>
                      <div className="relative">
                        <Input
                          id="filter-search"
                          placeholder="E.g. Uber, Lidl..."
                          value={filterSearch}
                          onChange={(e) => setFilterSearch(e.target.value)}
                          className="h-9 rounded-none pl-8 text-[11px] placeholder:opacity-50"
                        />
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                      </div>
                    </div>

                    {/* Category */}
                    <div className="space-y-1.5">
                      <label htmlFor="filter-category" className="text-muted-foreground font-bold tracking-wider">Category</label>
                      <div className="relative">
                        <select
                          id="filter-category"
                          value={filterCategory}
                          onChange={(e) => setFilterCategory(e.target.value)}
                          className="w-full h-9 px-3 pr-8 border border-border bg-card rounded-none outline-none focus:border-foreground appearance-none text-[11px] uppercase text-foreground"
                        >
                          <option value="ALL" className="bg-[#121215] text-foreground font-mono py-1">All Categories</option>
                          <option value="UNCATEGORIZED" className="bg-[#121215] text-foreground font-mono py-1">Uncategorized</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.id.toString()} className="bg-[#121215] text-foreground font-mono py-1">{cat.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>

                    {/* Record Type */}
                    <div className="space-y-1.5">
                      <label htmlFor="filter-type" className="text-muted-foreground font-bold tracking-wider">Record Type</label>
                      <div className="relative">
                        <select
                          id="filter-type"
                          value={filterType}
                          onChange={(e) => setFilterType(e.target.value as any)}
                          className="w-full h-9 px-3 pr-8 border border-border bg-card rounded-none outline-none focus:border-foreground appearance-none text-[11px] uppercase text-foreground"
                        >
                          <option value="all" className="bg-[#121215] text-foreground font-mono py-1">All Types</option>
                          <option value="inflow" className="bg-[#121215] text-foreground font-mono py-1">Inflow (Credits)</option>
                          <option value="outflow" className="bg-[#121215] text-foreground font-mono py-1">Outflow (Debits)</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>

                    {/* Source */}
                    <div className="space-y-1.5">
                      <label htmlFor="filter-source" className="text-muted-foreground font-bold tracking-wider">Source</label>
                      <div className="relative">
                        <select
                          id="filter-source"
                          value={filterSource}
                          onChange={(e) => setFilterSource(e.target.value)}
                          className="w-full h-9 px-3 pr-8 border border-border bg-card rounded-none outline-none focus:border-foreground appearance-none text-[11px] uppercase text-foreground"
                        >
                          <option value="ALL" className="bg-[#121215] text-foreground font-mono py-1">All Sources</option>
                          {uniqueSources.map(src => (
                            <option key={src} value={src} className="bg-[#121215] text-foreground font-mono py-1">{src}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 font-mono text-[10px] uppercase">
                    {/* Date Preset */}
                    <div className="space-y-1.5">
                      <label htmlFor="filter-preset" className="text-muted-foreground font-bold tracking-wider">Temporal Window</label>
                      <div className="relative">
                        <select
                          id="filter-preset"
                          value={filterDatePreset}
                          onChange={(e) => setFilterDatePreset(e.target.value)}
                          className="w-full h-9 px-3 pr-8 border border-border bg-card rounded-none outline-none focus:border-foreground appearance-none text-[11px] uppercase text-foreground"
                        >
                          <option value="all" className="bg-[#121215] text-foreground font-mono py-1">All Time</option>
                          {cycles && cycles.length > 0 && <option value="cycle" className="bg-[#121215] text-foreground font-mono py-1">Paycheck Cycle</option>}
                          <option value="30days" className="bg-[#121215] text-foreground font-mono py-1">Last 30 Days</option>
                          <option value="90days" className="bg-[#121215] text-foreground font-mono py-1">Last 90 Days</option>
                          <option value="ytd" className="bg-[#121215] text-foreground font-mono py-1">Year to Date (YTD)</option>
                          <option value="custom" className="bg-[#121215] text-foreground font-mono py-1">Custom Range</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>

                    {/* Custom Range start and end dates */}
                    {filterDatePreset === "custom" ? (
                      <>
                        <div className="space-y-1.5">
                          <label htmlFor="filter-start-date" className="text-muted-foreground font-bold tracking-wider">Start Date</label>
                          <Input
                            id="filter-start-date"
                            type="date"
                            value={filterStartDate}
                            onChange={(e) => setFilterStartDate(e.target.value)}
                            className="h-9 rounded-none text-[11px]"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label htmlFor="filter-end-date" className="text-muted-foreground font-bold tracking-wider">End Date</label>
                          <Input
                            id="filter-end-date"
                            type="date"
                            value={filterEndDate}
                            onChange={(e) => setFilterEndDate(e.target.value)}
                            className="h-9 rounded-none text-[11px]"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Min Amount */}
                        <div className="space-y-1.5">
                          <label htmlFor="filter-min-amount" className="text-muted-foreground font-bold tracking-wider">Min Absolute Amount</label>
                          <Input
                            id="filter-min-amount"
                            type="number"
                            placeholder={currencySymbol}
                            value={filterMinAmount}
                            onChange={(e) => setFilterMinAmount(e.target.value)}
                            className="h-9 rounded-none text-[11px]"
                          />
                        </div>
                        {/* Max Amount */}
                        <div className="space-y-1.5">
                          <label htmlFor="filter-max-amount" className="text-muted-foreground font-bold tracking-wider">Max Absolute Amount</label>
                          <Input
                            id="filter-max-amount"
                            type="number"
                            placeholder={currencySymbol}
                            value={filterMaxAmount}
                            onChange={(e) => setFilterMaxAmount(e.target.value)}
                            className="h-9 rounded-none text-[11px]"
                          />
                        </div>
                        {/* Empty spacer grid col to maintain layout */}
                        <div className="hidden md:block" />
                      </>
                    )}
                  </div>
                </div>
              )}
              <CardContent className="p-0 sm:p-6">
                {/* Desktop View: Table */}
                <div className="hidden md:block overflow-x-auto w-full">
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px] pl-3 sm:pl-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSelectAll()
                          }}
                          className={cn(
                            "h-5 w-5 sm:h-4 sm:w-4 border flex items-center justify-center transition-all cursor-pointer",
                            paginatedExpenses.length > 0 && paginatedExpenses.every(e => selectedIds.has(e.id))
                              ? "bg-foreground border-foreground text-background shadow-sm"
                              : "border-border/80 bg-card/40 hover:border-foreground/50 text-transparent"
                          )}
                          title="Select all on page"
                        >
                          <Check className="h-3.5 w-3.5 sm:h-3 sm:w-3 stroke-[3]" />
                        </button>
                      </TableHead>
                      <TableHead className="w-[60px] sm:w-[100px] px-1 sm:px-2">Date</TableHead>
                      <TableHead className="px-1 sm:px-2">Merchant</TableHead>
                      <TableHead className="w-[105px] sm:min-w-[110px] px-1 sm:px-2">Category</TableHead>
                      <TableHead className="min-w-[80px] hidden md:table-cell">Source</TableHead>
                      <TableHead className="text-right px-1 sm:px-2">Amount</TableHead>
                      <TableHead className="w-[40px] md:w-[50px] hidden md:table-cell"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedExpenses.map((expense) => (
                      <TableRow 
                        key={expense.id} 
                        onClick={() => openAudit(expense.id)}
                        className={cn("cursor-pointer group", selectedIds.has(expense.id) && "bg-secondary/40")}
                      >
                        <TableCell className="pl-3 sm:pl-4 py-2.5 sm:py-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSelectOne(expense.id)
                            }}
                            className={cn(
                              "h-5 w-5 sm:h-4 sm:w-4 border flex items-center justify-center transition-all cursor-pointer",
                              selectedIds.has(expense.id)
                                ? "bg-foreground border-foreground text-background shadow-sm"
                                : "border-border/80 bg-card/40 hover:border-foreground/50 text-transparent"
                            )}
                          >
                            <Check className="h-3.5 w-3.5 sm:h-3 sm:w-3 stroke-[3]" />
                          </button>
                        </TableCell>
                        <TableCell className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground group-hover:text-foreground px-1 sm:px-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          {editingDateId === expense.id ? (
                            <Input
                              type="date"
                              value={editingDateValue}
                              onChange={(e) => setEditingDateValue(e.target.value)}
                              onBlur={() => handleSaveDate(expense.id, editingDateValue)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveDate(expense.id, editingDateValue)
                                if (e.key === "Escape") setEditingDateId(null)
                              }}
                              className="h-7 sm:h-6 text-[10px] font-mono bg-background border-foreground/50 px-1 py-0 rounded-none w-28 sm:w-32 shadow-sm focus-visible:ring-1 focus-visible:ring-foreground"
                              autoFocus
                            />
                          ) : (
                            <div 
                              onClick={() => {
                                setEditingDateId(expense.id)
                                const d = new Date(expense.date)
                                const yyyy = d.getFullYear()
                                const mm = String(d.getMonth() + 1).padStart(2, '0')
                                const dd = String(d.getDate()).padStart(2, '0')
                                setEditingDateValue(`${yyyy}-${mm}-${dd}`)
                              }}
                              className="flex items-center gap-1 group/date cursor-pointer w-fit py-0.5 px-1 -ml-1 rounded hover:bg-secondary/60 transition-colors"
                              title="Click to edit date inline"
                            >
                              <span>
                                {new Date(expense.date).toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric"
                                })}
                              </span>
                              <Edit2 className="h-2.5 w-2.5 text-muted-foreground opacity-60 sm:opacity-0 sm:group-hover/date:opacity-100 transition-opacity flex-shrink-0" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-[11px] sm:text-xs md:text-sm max-w-[90px] sm:max-w-none truncate px-1 sm:px-2" onClick={(e) => e.stopPropagation()}>
                          {editingMerchantId === expense.id ? (
                            <Input
                              value={editingMerchantValue}
                              onChange={(e) => setEditingMerchantValue(e.target.value)}
                              onBlur={() => handleSaveMerchant(expense.id, editingMerchantValue)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveMerchant(expense.id, editingMerchantValue)
                                if (e.key === "Escape") setEditingMerchantId(null)
                              }}
                              className="h-7 sm:h-6 text-xs font-mono bg-background border-foreground/50 px-1.5 py-0 rounded-none w-full shadow-sm focus-visible:ring-1 focus-visible:ring-foreground"
                              autoFocus
                            />
                          ) : (
                            <div 
                              onClick={() => {
                                setEditingMerchantId(expense.id)
                                setEditingMerchantValue(expense.merchant || "")
                              }}
                              className="flex items-center gap-1.5 group/merch cursor-pointer w-fit py-1 sm:py-0.5 px-1 -ml-1 rounded hover:bg-secondary/60 transition-colors"
                              title="Click to rename merchant inline"
                            >
                              <span className="truncate">{expense.merchant || "Unknown"}</span>
                              <Edit2 className="h-3 w-3 sm:h-2.5 sm:w-2.5 text-muted-foreground opacity-60 sm:opacity-0 sm:group-hover/merch:opacity-100 transition-opacity flex-shrink-0" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="p-1 sm:p-2" onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={expense.category_id?.toString() || "none"}
                            onValueChange={(value: string | null) => {
                              if (expense.id) handleCategoryChange(expense.id.toString(), value || "none")
                            }}
                          >
                            <SelectTrigger className="w-full min-w-0 max-w-[105px] sm:max-w-none sm:w-[130px] md:w-[160px] h-7 sm:h-8 text-[9px] md:text-xs px-1 sm:px-1.5">
                              {expense.category_id ? (
                                (() => {
                                  const cat = categories.find(c => c.id === expense.category_id)
                                  if (!cat) return <span className="truncate text-muted-foreground">No category</span>
                                  return (
                                    <div className="flex items-center gap-1.5 overflow-hidden w-full text-[9px] md:text-xs">
                                      <div 
                                        className="h-1.5 w-1.5 rounded-full shrink-0" 
                                        style={{ backgroundColor: cat.color }} 
                                      />
                                      <span className="truncate uppercase">{cat.name}</span>
                                    </div>
                                  )
                                })()
                              ) : (
                                <span className="truncate text-muted-foreground">No category</span>
                              )}
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
                        <TableCell className="text-[10px] md:text-xs hidden md:table-cell">
                          <GlowingBadge variant="neutral" pulse={false} dot={false} className="text-[9px] md:text-[10px] uppercase tracking-wider">
                            {expense.source || "Direct"}
                          </GlowingBadge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-[11px] sm:text-xs md:text-sm px-1 sm:px-2">
                          <PrivacyValue>
                            {parseFloat(expense.amount.toString()) > 0 ? "+" : ""}
                            {currencySymbol}{Math.abs(parseFloat(expense.amount.toString())).toFixed(2)}
                          </PrivacyValue>
                        </TableCell>
                        <TableCell className="hidden md:table-cell" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className={cn(
                                "h-8 w-8 transition-colors md:opacity-0 group-hover:opacity-100 cursor-pointer",
                                expense.is_anomaly 
                                  ? "text-amber-500 hover:text-amber-600 bg-amber-500/5 border border-amber-500/20" 
                                  : "text-muted-foreground hover:text-amber-500"
                              )}
                              onClick={() => handleToggleAnomaly(expense.id, expense.is_anomaly)}
                              title={expense.is_anomaly ? "Flagged as anomaly (excluded from burn rate)" : "Flag as anomaly"}
                            >
                              <AlertTriangle className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors md:opacity-0 group-hover:opacity-100 cursor-pointer"
                              onClick={() => handleDeleteExpense(expense.id.toString())}
                              aria-label="Delete transaction"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredExpenses.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                          {expenses.length === 0 ? (
                            <div className="max-w-md mx-auto space-y-4 py-4">
                              <div className="space-y-1">
                                <p className="text-sm font-bold uppercase font-mono text-foreground">
                                  No Transactions Recorded Yet
                                </p>
                                <p className="text-xs font-sans text-muted-foreground">
                                  Ingest your first bank extract or record a transaction to initialize your ledger archive.
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                                <Button
                                  type="button"
                                  onClick={() => setActiveTab("ingest")}
                                  className="h-10 rounded-none bg-foreground text-background hover:bg-foreground/90 uppercase font-mono text-xs font-bold tracking-wider cursor-pointer flex items-center gap-2"
                                >
                                  <Upload className="h-3.5 w-3.5" /> Upload Statement
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => setIsAddOpen(true)}
                                  className="h-10 rounded-none border-border bg-secondary/30 hover:bg-secondary text-foreground uppercase font-mono text-xs font-bold tracking-wider cursor-pointer flex items-center gap-2"
                                >
                                  <Plus className="h-3.5 w-3.5" /> Add Transaction
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <span className="font-mono text-xs uppercase">No transactions match current filters.</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                </div>

                {/* Mobile View: Stacked List */}
                <div className="md:hidden space-y-3 px-3 py-4">
                  <AnimatePresence initial={false}>
                    {paginatedExpenses.map((expense) => {
                      const isIncome = parseFloat(expense.amount.toString()) > 0
                      return (
                        <motion.div 
                          key={expense.id}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.22, ease: "easeOut" }}
                          onClick={() => openAudit(expense.id)}
                          className={cn(
                            "p-4 border border-border bg-card/25 flex flex-col gap-3 relative glow-card cursor-pointer",
                            selectedIds.has(expense.id) && "bg-secondary/40 border-foreground/30"
                          )}
                        >
                          <div className="flex items-center justify-between min-w-0 gap-3 w-full">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleSelectOne(expense.id)
                                }}
                                className={cn(
                                  "h-8 w-8 border flex items-center justify-center transition-all cursor-pointer shrink-0 ledger-border",
                                  selectedIds.has(expense.id)
                                    ? "bg-foreground border-foreground text-background shadow-sm"
                                    : "border-border/80 bg-card/40 hover:border-foreground/50 text-transparent"
                                )}
                              >
                                <Check className="h-4.5 w-4.5 stroke-[3]" />
                              </button>
                              <div className="flex flex-col min-w-0">
                                {editingMerchantId === expense.id ? (
                                  <Input
                                    value={editingMerchantValue}
                                    onChange={(e) => setEditingMerchantValue(e.target.value)}
                                    onBlur={() => handleSaveMerchant(expense.id, editingMerchantValue)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleSaveMerchant(expense.id, editingMerchantValue)
                                      if (e.key === "Escape") setEditingMerchantId(null)
                                    }}
                                    className="h-7 text-xs font-mono bg-background border-foreground/50 px-1.5 py-0 rounded-none w-full shadow-sm focus-visible:ring-1 focus-visible:ring-foreground"
                                    autoFocus
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                ) : (
                                  <div 
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setEditingMerchantId(expense.id)
                                      setEditingMerchantValue(expense.merchant || "")
                                    }}
                                    className="font-mono text-xs font-bold uppercase hover:underline cursor-text flex items-center gap-1.5 min-w-0"
                                  >
                                    <span className="truncate">{expense.merchant}</span>
                                    <Edit2 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                  </div>
                                )}
                                {editingDateId === expense.id ? (
                                  <Input
                                    type="date"
                                    value={editingDateValue}
                                    onChange={(e) => setEditingDateValue(e.target.value)}
                                    onBlur={() => handleSaveDate(expense.id, editingDateValue)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleSaveDate(expense.id, editingDateValue)
                                      if (e.key === "Escape") setEditingDateId(null)
                                    }}
                                    className="h-7 text-[10px] font-mono bg-background border-foreground/50 px-1.5 py-0 rounded-none w-32 shadow-sm focus-visible:ring-1 focus-visible:ring-foreground mt-1"
                                    autoFocus
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                ) : (
                                  <div 
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setEditingDateId(expense.id)
                                      const d = new Date(expense.date)
                                      const yyyy = d.getFullYear()
                                      const mm = String(d.getMonth() + 1).padStart(2, '0')
                                      const dd = String(d.getDate()).padStart(2, '0')
                                      setEditingDateValue(`${yyyy}-${mm}-${dd}`)
                                    }}
                                    className="text-[10px] text-muted-foreground font-mono cursor-pointer hover:underline flex items-center gap-1 mt-0.5 w-fit"
                                    title="Click to edit date inline"
                                  >
                                    <span>
                                      {new Date(expense.date).toLocaleDateString("en-GB", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric"
                                      })}
                                    </span>
                                    <Edit2 className="h-2.5 w-2.5 text-muted-foreground opacity-60 flex-shrink-0" />
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <div className={cn(
                                "text-xs font-mono font-bold tracking-tight mr-1",
                                isIncome ? "text-emerald-500" : "text-foreground"
                              )}>
                                <PrivacyValue>{isIncome ? "+" : "-"}{currencySymbol}{Math.abs(parseFloat(expense.amount.toString())).toFixed(2)}</PrivacyValue>
                              </div>
                              {!isIncome && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleAnomaly(expense.id, expense.is_anomaly)}
                                  className={cn(
                                    "h-8 w-8 flex items-center justify-center transition-colors rounded-none border border-transparent hover:border-amber-500/20 cursor-pointer",
                                    expense.is_anomaly 
                                      ? "text-amber-500 bg-amber-500/5 border-amber-500/20" 
                                      : "text-muted-foreground hover:text-amber-500"
                                  )}
                                  title={expense.is_anomaly ? "Flagged as anomaly" : "Flag as anomaly"}
                                >
                                  <AlertTriangle className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteExpense(expense.id.toString())}
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors rounded-none border border-transparent hover:border-destructive/20 cursor-pointer"
                                aria-label="Delete transaction"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-border/40 pt-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[8px] font-mono text-muted-foreground uppercase tracking-widest">Source:</span>
                              <span className="text-[9px] font-mono uppercase bg-secondary/50 px-1.5 py-0.5 border border-border/50 text-muted-foreground truncate max-w-[150px]">{expense.source || "Unknown"}</span>
                            </div>
                            <div className="w-full sm:w-44" onClick={(e) => e.stopPropagation()}>
                              <Select
                                value={expense.category_id?.toString() || "none"}
                                onValueChange={(value: string | null) => {
                                  if (expense.id) handleCategoryChange(expense.id.toString(), value || "none")
                                }}
                              >
                                <SelectTrigger className="w-full h-7 text-[10px] px-2 font-mono">
                                  {expense.category_id ? (
                                    (() => {
                                      const cat = categories.find(c => c.id === expense.category_id)
                                      if (!cat) return <span className="truncate text-muted-foreground">No category</span>
                                      return (
                                        <div className="flex items-center gap-1.5 overflow-hidden w-full">
                                          <div 
                                            className="h-1.5 w-1.5 rounded-full shrink-0" 
                                            style={{ backgroundColor: cat.color }} 
                                          />
                                          <span className="truncate uppercase">{cat.name}</span>
                                        </div>
                                      )
                                    })()
                                  ) : (
                                    <span className="truncate text-muted-foreground">No category</span>
                                  )}
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
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                  {paginatedExpenses.length === 0 && (
                    <div className="text-center py-8 px-4 text-muted-foreground">
                      {expenses.length === 0 ? (
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <p className="text-xs font-bold uppercase font-mono text-foreground">
                              No Transactions Recorded Yet
                            </p>
                            <p className="text-[11px] font-sans text-muted-foreground">
                              Ingest your first statement or add a manual entry to get started.
                            </p>
                          </div>
                          <div className="flex flex-col gap-2 pt-1">
                            <Button
                              type="button"
                              onClick={() => setActiveTab("ingest")}
                              className="h-10 rounded-none bg-foreground text-background hover:bg-foreground/90 uppercase font-mono text-xs font-bold tracking-wider cursor-pointer flex items-center justify-center gap-2 w-full"
                            >
                              <Upload className="h-3.5 w-3.5" /> Upload Statement
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setIsAddOpen(true)}
                              className="h-10 rounded-none border-border bg-secondary/30 hover:bg-secondary text-foreground uppercase font-mono text-xs font-bold tracking-wider cursor-pointer flex items-center justify-center gap-2 w-full"
                            >
                              <Plus className="h-3.5 w-3.5" /> Add Transaction
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <span className="font-mono text-xs uppercase">No transactions match current filters.</span>
                      )}
                    </div>
                  )}
                </div>
                {filteredExpenses.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-border bg-card/40">
                    <div className="text-xs font-mono text-muted-foreground">
                      Showing <span className="font-bold text-foreground">{filteredExpenses.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> - <span className="font-bold text-foreground">{Math.min(filteredExpenses.length, currentPage * pageSize)}</span> of <span className="font-bold text-foreground">{filteredExpenses.length}</span> entries
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

          <TabsContent value="radar" className="space-y-4">
            <SubscriptionRadar expenses={expenses} />
          </TabsContent>

          <TabsContent value="rules" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="md:col-span-1 rounded-none border-border ledger-border">
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
                        onValueChange={(val: string | null) => {
                          setNewRuleCategoryId(val || "")
                        }}
                        required
                      >
                        <SelectTrigger className="w-full">
                          {newRuleCategoryId ? (
                            (() => {
                              const cat = categories.find(c => c.id.toString() === newRuleCategoryId)
                              if (!cat) return <span className="truncate text-muted-foreground">Select category</span>
                              return (
                                <div className="flex items-center gap-1.5 overflow-hidden w-full text-xs font-mono">
                                  <div 
                                    className="h-1.5 w-1.5 rounded-full shrink-0" 
                                    style={{ backgroundColor: cat.color }} 
                                  />
                                  <span className="truncate uppercase">{cat.name}</span>
                                </div>
                              )
                            })()
                          ) : (
                            <span className="truncate text-muted-foreground">Select category</span>
                          )}
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

              <Card className="md:col-span-2 rounded-none border-border ledger-border">
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
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteRule(rule.id.toString())} aria-label="Delete rule">
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
              <Card className="lg:col-span-1 rounded-none border-border ledger-border">
                <CardHeader className="border-b border-border/40 pb-4">
                  <CardTitle className="text-sm font-bold uppercase tracking-widest">
                    Import Bank Statement
                  </CardTitle>
                  <CardDescription className="font-mono text-[9px] uppercase text-muted-foreground">
                    Supports Santander, CGD, Millennium bcp, Revolut, and all PDF / TXT / CSV extracts
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {/* Main File Dropzone */}
                  <div data-tour="ingest-dropzone" className="border border-dashed border-border p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-secondary/20 transition-all relative">
                    <input 
                      type="file" 
                      accept=".txt,.csv,.json,.pdf" 
                      onChange={handleFileUpload} 
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Upload className="h-6 w-6 text-muted-foreground/70 mb-2 stroke-[1.5]" />
                    <p className="text-[10px] font-mono font-bold uppercase">Upload Statement File (.pdf, .txt, .csv)</p>
                    <p className="text-[8px] font-mono text-muted-foreground uppercase mt-1">Click to browse or drag & drop file here</p>
                  </div>

                  {/* Raw Text Box */}
                  <div className="space-y-2">
                    <Label htmlFor="extractText" className="technical-label opacity-70">Or Paste Statement Text</Label>
                    <textarea
                      id="extractText"
                      rows={8}
                      className="w-full p-3 border border-border ledger-border font-mono text-[10px] bg-secondary/5 focus:bg-card focus:outline-none transition-all resize-none"
                      placeholder={"Paste text copied from your bank app or extract...\n\nExample:\n01-06-2026 PREVIOUS BALANCE 616.18\n02-06-2026 SALARY PAYCHECK +2450.00\n03-06-2026 SUPERMARKET SPEND -45.80"}
                      value={extractText}
                      onChange={(e) => setExtractText(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      onClick={() => handleParseExtract()} 
                      variant="outline"
                      className="w-full rounded-none h-10 uppercase font-mono text-[9px] font-bold tracking-widest border border-border cursor-pointer"
                    >
                      Parse Text
                    </Button>
                    <Button 
                      onClick={handleAiSmartParse} 
                      disabled={isAiParsing}
                      className="w-full rounded-none h-10 uppercase font-mono text-[9px] font-bold tracking-widest cursor-pointer flex items-center justify-center transition-all leading-none bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20 shadow-sm"
                    >
                      {isAiParsing ? (
                        "AI Parsing..."
                      ) : (
                        <div className="flex items-center justify-center gap-1.5 leading-none">
                          <Sparkles className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span className="leading-none pt-[1px]">AI Smart Parse</span>
                        </div>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Parsed Preview Column */}
              <Card className="lg:col-span-2 rounded-none border-border ledger-border">
                <CardHeader className="border-b border-border">
                  <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center justify-between">
                    <span>Statement Preview</span>
                    {parsedData && (
                      <span className="font-mono text-[9px] text-muted-foreground uppercase">
                        Period: {parsedData.month}/{parsedData.year}
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription className="font-mono text-[9px] uppercase">
                    Review your transactions before importing to your ledger
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {!parsedData ? (
                    <div className="h-64 flex flex-col items-center justify-center text-center text-muted-foreground space-y-2 font-mono">
                      <Landmark className="h-10 w-10 text-muted-foreground/60" />
                      <div className="space-y-1">
                        <p className="text-xs uppercase font-bold text-foreground">No statement loaded yet</p>
                        <p className="text-[10px] max-w-sm uppercase text-muted-foreground">Upload a PDF, TXT, or CSV statement file or paste extract text to preview transactions.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Statement Summary Cards */}
                      {(() => {
                        const checkedTxs = parsedData.transactions.filter(t => t.checked)
                        const inflows = checkedTxs.filter(t => t.amount > 0)
                        const outflows = checkedTxs.filter(t => t.amount < 0)
                        const totalInflow = inflows.reduce((sum, t) => sum + t.amount, 0)
                        const totalOutflow = outflows.reduce((sum, t) => sum + Math.abs(t.amount), 0)
                        const netFlow = totalInflow - totalOutflow
                        const uncategorizedCount = checkedTxs.filter(t => !t.category_id).length
                        const allChecked = parsedData.transactions.length > 0 && parsedData.transactions.every(t => t.checked)

                        return (
                          <>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-card/40 border border-border font-mono">
                              <div className="space-y-1">
                                <span className="technical-label text-[9px]">Starting Balance</span>
                                <p className="text-base sm:text-lg font-bold">{currencySymbol}{parsedData.startBalance.toFixed(2)}</p>
                              </div>
                              <div className="space-y-1">
                                <span className="technical-label text-[9px] text-emerald-500">Total Income</span>
                                <p className="text-base sm:text-lg font-bold text-emerald-500">
                                  +{currencySymbol}{totalInflow.toFixed(2)}
                                </p>
                                <p className="text-[9px] text-muted-foreground">{inflows.length} items</p>
                              </div>
                              <div className="space-y-1">
                                <span className="technical-label text-[9px] text-destructive">Total Expenses</span>
                                <p className="text-base sm:text-lg font-bold text-destructive">
                                  -{currencySymbol}{totalOutflow.toFixed(2)}
                                </p>
                                <p className="text-[9px] text-muted-foreground">{outflows.length} items</p>
                              </div>
                              <div className="space-y-1">
                                <span className="technical-label text-[9px]">Net Cash Flow</span>
                                <p className="text-base sm:text-lg font-bold">
                                  {netFlow >= 0 ? "+" : ""}{currencySymbol}{netFlow.toFixed(2)}
                                </p>
                                <p className="text-[9px] text-muted-foreground">
                                  {checkedTxs.length}/{parsedData.transactions.length} selected
                                </p>
                              </div>
                            </div>

                            {/* Preview Table */}
                            <div className="border border-border max-h-[360px] overflow-y-auto w-full relative p-0">
                              <table className="w-full font-mono text-[9px] table-fixed border-collapse border-spacing-0 m-0 p-0">
                                <thead className="sticky top-[-1px] z-30 bg-card shadow-sm border-b border-border m-0 p-0">
                                  <tr className="bg-card m-0 p-0">
                                    <th className="w-7 p-2 text-center sticky top-[-1px] bg-card z-30 border-b border-border align-middle m-0">
                                      <div className="flex items-center justify-center">
                                        <Checkbox 
                                          checked={allChecked}
                                          onCheckedChange={(checkedVal) => {
                                            const updatedTxs = parsedData.transactions.map(t => ({ ...t, checked: checkedVal }))
                                            setParsedData({ ...parsedData, transactions: updatedTxs })
                                          }}
                                          title="Select / Deselect All"
                                        />
                                      </div>
                                    </th>
                                    <th className="w-14 sm:w-16 text-[9px] font-mono font-bold uppercase tracking-wider p-2 whitespace-nowrap sticky top-[-1px] bg-card z-30 border-b border-border text-left align-middle m-0">Date</th>
                                    <th className="text-[9px] font-mono font-bold uppercase tracking-wider p-2 sticky top-[-1px] bg-card z-30 border-b border-border text-left align-middle m-0">Merchant</th>
                                    <th className="w-24 sm:w-28 text-[9px] font-mono font-bold uppercase tracking-wider p-2 sticky top-[-1px] bg-card z-30 border-b border-border text-left align-middle m-0">Category</th>
                                    <th className="w-20 sm:w-24 text-right text-[9px] font-mono font-bold uppercase tracking-wider p-2 whitespace-nowrap sticky top-[-1px] bg-card z-30 border-b border-border align-middle m-0">Amount</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {parsedData.transactions.map((tx, idx) => (
                                    <tr key={tx.id} className={cn("border-b border-border/40 transition-colors hover:bg-muted/30", !tx.checked && "opacity-40 bg-muted/10")}>
                                      <td className="text-center p-1.5 w-7">
                                        <div className="flex items-center justify-center">
                                          <Checkbox 
                                            checked={tx.checked}
                                            onCheckedChange={(checkedVal) => {
                                              const updatedTxs = [...parsedData.transactions]
                                              updatedTxs[idx].checked = checkedVal
                                              setParsedData({ ...parsedData, transactions: updatedTxs })
                                            }}
                                          />
                                        </div>
                                      </td>
                                      <td className="font-mono text-[9px] p-1.5 whitespace-nowrap">
                                        {new Date(tx.date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' })}
                                      </td>
                                      <td className="font-mono text-[9px] p-1.5 uppercase truncate" title={tx.merchant}>
                                        {tx.merchant}
                                      </td>
                                      <td className="p-1.5">
                                        <Select
                                          value={tx.category_id?.toString() || "none"}
                                          onValueChange={(val: string | null) => {
                                            const catId = (!val || val === "none") ? null : parseInt(val)
                                            const updatedTxs = [...parsedData.transactions]
                                            updatedTxs[idx].category_id = catId
                                            setParsedData({ ...parsedData, transactions: updatedTxs })
                                          }}
                                        >
                                          <SelectTrigger className="h-6 text-[8px] font-mono uppercase bg-transparent border-border rounded-none px-1 py-0 w-full">
                                            {tx.category_id ? (
                                              (() => {
                                                const cat = categories.find(c => c.id === tx.category_id)
                                                if (!cat) return <span className="truncate text-muted-foreground">Categorize</span>
                                                return (
                                                  <div className="flex items-center gap-1 overflow-hidden w-full text-[8px] font-mono">
                                                    <div 
                                                      className="h-1.5 w-1.5 rounded-full shrink-0" 
                                                      style={{ backgroundColor: cat.color }} 
                                                    />
                                                    <span className="truncate">{cat.name}</span>
                                                  </div>
                                                )
                                              })()
                                            ) : (
                                              <span className="truncate text-muted-foreground">Categorize</span>
                                            )}
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
                                      </td>
                                      <td className={cn("text-right font-mono text-[9px] sm:text-[10px] font-bold p-1.5 whitespace-nowrap", tx.amount > 0 ? "text-emerald-500" : "text-foreground")}>
                                        {tx.amount > 0 ? "+" : ""}{currencySymbol}{tx.amount.toFixed(2)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </>
                        )
                      })()}

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
                            Importing Transactions...
                          </>
                        ) : (
                          <>
                            <Check className="h-4.5 w-4.5" />
                            Import Transactions to Ledger
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
      </motion.div>
      {/* Mobile Floating Action Button (FAB) matching Portfolio style */}
      <button
        onClick={() => setIsAddOpen(true)}
        className="fixed bottom-[108px] md:bottom-8 right-4 md:right-8 z-50 h-12 w-12 rounded-xl bg-white text-black font-extrabold shadow-2xl flex items-center justify-center hover:bg-gray-100 border border-white/20 cursor-pointer select-none transition-all active:scale-95"
        aria-label="Add Transaction manual entry"
      >
        <Plus className="h-6 w-6 stroke-[3]" />
      </button>

      <AuditTracePanel expenses={expenses} categories={categories} />

      {/* Custom Deletion Confirmation Dialog (NN/G Usability Guideline) */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="bg-card border border-border rounded-none p-6 font-mono text-xs w-[90vw] max-w-sm">
          <DialogHeader className="border-b border-border pb-4 mb-4">
            <DialogTitle className="text-xs uppercase tracking-widest font-mono flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" /> Deletion Warning
            </DialogTitle>
            <DialogDescription className="text-[9px] uppercase font-mono tracking-wider opacity-60 text-muted-foreground mt-1">
              Confirm permanent database removal
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-[11px] leading-relaxed text-muted-foreground uppercase">
              Are you sure you want to permanently delete this {deleteTarget?.type}? This action is irreversible and will update all balances.
            </p>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmOpen(false)}
                className="flex-1 rounded-none h-10 font-mono text-[9px] uppercase tracking-widest font-bold border border-border hover:bg-secondary transition-colors"
              >
                Cancel
              </Button>
              <Button
                onClick={executeDelete}
                className="flex-1 rounded-none h-10 font-mono text-[9px] uppercase tracking-widest font-bold bg-destructive text-white hover:bg-destructive/80 transition-colors"
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </>
  )
}
