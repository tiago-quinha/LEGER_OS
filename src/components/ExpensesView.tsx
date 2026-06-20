"use client"

import { useState } from "react"
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

import { MagneticButton } from "@/components/unlumen-ui/magnetic-button"
import { GlowingBadge } from "@/components/unlumen-ui/glowing-badge"

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
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses)
  const [rules, setRules] = useState<Rule[]>(initialRules)
  const [isCategorizing, setIsCategorizing] = useState(false)
  
  const { setAuditPanelOpen, setActiveTransactionId, refreshData } = useSystem()

  // New Rule State
  const [newRuleKeyword, setNewRuleKeyword] = useState("")
  const [newRuleCategoryId, setNewRuleCategoryId] = useState("")

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

          const isIncome = amountVal > 0 && (
            merchant.includes("ORDENADO") || 
            merchant.includes("TRF.IMED. DE") || 
            merchant.includes("REWARDS SANTANDER")
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

  return (
    <>
      <div className="mx-auto max-w-5xl p-4 md:p-8 space-y-6 w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
            <p className="text-muted-foreground">Manage your spending and automation rules.</p>
          </div>
          <MagneticButton 
            onClick={smartCategorize} 
            disabled={isCategorizing}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white border-0 shadow-md font-semibold px-4 py-2 flex items-center justify-center rounded-lg"
            strength={0.3}
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

        <Tabs defaultValue="history" className="space-y-4">
          <TabsList className="bg-card/40 border border-border p-1">
            <TabsTrigger value="history" className="rounded-none px-6 py-2 uppercase tracking-widest font-mono text-[10px]">Transaction History</TabsTrigger>
            <TabsTrigger value="rules" className="rounded-none px-6 py-2 uppercase tracking-widest font-mono text-[10px]">Merchant Rules</TabsTrigger>
            <TabsTrigger value="ingest" className="rounded-none px-6 py-2 uppercase tracking-widest font-mono text-[10px]">Ingestion Node</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px] md:w-[120px]">Date</TableHead>
                      <TableHead>Merchant</TableHead>
                      <TableHead className="hidden sm:table-cell">Category</TableHead>
                      <TableHead className="hidden lg:table-cell">Source</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-[40px] md:w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
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
                        <TableCell className="font-medium text-xs md:text-sm group-hover:pl-2 transition-all max-w-[100px] md:max-w-none truncate">
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
                        <TableCell className={cn(
                          "text-right font-mono font-bold text-xs md:text-sm",
                          parseFloat(expense.amount.toString()) > 0 ? "text-green-600" : ""
                        )}>
                          {parseFloat(expense.amount.toString()) > 0 ? "+" : ""}
                          €{Math.abs(parseFloat(expense.amount.toString())).toFixed(2)}
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
                <CardContent>
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
                      accept=".txt" 
                      onChange={handleFileUpload} 
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-[10px] font-mono font-bold uppercase">Select Extract File (.txt)</p>
                    <p className="text-[8px] font-mono text-muted-foreground uppercase mt-1">or drag & drop here</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="extractText" className="technical-label opacity-60">Or Paste Extract Text</Label>
                    <textarea
                      id="extractText"
                      rows={12}
                      className="w-full p-4 border border-border ledger-border font-mono text-[10px] bg-secondary/5 focus:bg-card focus:outline-none transition-all resize-none"
                      placeholder="Paste your Santander transaction extract lines here..."
                      value={extractText}
                      onChange={(e) => setExtractText(e.target.value)}
                    />
                  </div>

                  <MagneticButton 
                    onClick={handleParseExtract} 
                    className="w-full uppercase font-mono text-[10px] py-3 bg-foreground text-background font-bold tracking-widest border border-transparent hover:bg-foreground/80 justify-center"
                    strength={0.15}
                  >
                    Parse Extract Node
                  </MagneticButton>
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
                      <div className="grid grid-cols-3 gap-4 p-4 bg-secondary/20 border border-border border-dashed font-mono">
                        <div className="space-y-1">
                          <span className="technical-label text-[8px]">Est. Start Balance</span>
                          <p className="text-sm font-bold">€{parsedData.startBalance.toFixed(2)}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="technical-label text-[8px]">Total Salary/Income</span>
                          <p className="text-sm font-bold text-emerald-600">
                            €{parsedData.transactions.filter(t => t.checked && t.isIncome).reduce((sum, t) => sum + t.amount, 0).toFixed(2)}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="technical-label text-[8px]">Parsed Records</span>
                          <p className="text-sm font-bold">{parsedData.transactions.filter(t => t.checked).length} selected</p>
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
                              <TableHead className="text-xs font-mono font-bold uppercase tracking-wider">Category</TableHead>
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
                                <TableCell className="font-mono text-[9px] p-2 uppercase max-w-[150px] truncate" title={tx.merchant}>
                                  {tx.merchant}
                                </TableCell>
                                <TableCell className="p-2">
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
