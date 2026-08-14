import { createClient } from "@/lib/supabase-server"
import { getCycles } from "@/lib/cycles"
import { DashboardView } from "@/components/DashboardView"
import { OnboardingView } from "@/components/OnboardingView"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{ cycleId?: string; onboarding?: string; force_onboarding?: string }>
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  // 1. Fetch user profile and cycles using utility
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed, target_monthly_income, target_monthly_spend, paycheck_keyword")
    .eq("id", user.id)
    .single()

  const cycles = await getCycles(supabase, user.id)

  if (!profile?.onboarding_completed || params?.onboarding === "true" || params?.force_onboarding === "true") {
    return <OnboardingView />
  }

  if (cycles.length === 0) {
    const now = new Date()
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
    cycles.push({
      id: "default-0",
      label: `Cycle: 01 ${now.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' })} - Present`,
      startDate: startOfMonth,
      endDate: null,
      paycheckAmount: 0
    })
  }

  // 2. Determine selected cycle
  const selectedCycle = params.cycleId
    ? cycles.find(c => c.id === params.cycleId) || cycles[0]
    : cycles[0]

  const selectedIndex = cycles.findIndex(c => c.id === selectedCycle.id)
  const previousCycle = selectedIndex !== -1 && selectedIndex < cycles.length - 1
    ? cycles[selectedIndex + 1]
    : null

  // 3. Fetch selected cycle expenses, categories, budgets, and balance snapshots
  const startDateStr = selectedCycle.startDate
  const endDateStr = selectedCycle.endDate || '9999-12-31'

  const dateObj = new Date(selectedCycle.startDate)
  const cycleMonth = dateObj.getUTCMonth() + 1
  const cycleYear = dateObj.getUTCFullYear()

  // Run database queries in parallel
  const [expensesRes, categoriesRes, budgetsRes, balancesRes, previousTxRes] = await Promise.all([
    // Selected cycle expenses
    supabase
      .from("tracker_expense")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", startDateStr)
      .lt("date", endDateStr)
      .order("date", { ascending: false }),
    // Categories
    supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .order("name"),
    // Budgets for the selected cycle's month/year
    supabase
      .from("budgets")
      .select("*")
      .eq("user_id", user.id)
      .eq("month", cycleMonth)
      .eq("year", cycleYear),
    // All balance snapshots
    supabase
      .from("account_balance")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false }),
    // All transactions before the selected cycle
    supabase
      .from("tracker_expense")
      .select("*")
      .eq("user_id", user.id)
      .lt("date", startDateStr)
      .order("date", { ascending: true })
  ])

  const expenses = expensesRes.data || []
  const categories = categoriesRes.data || []
  const balances = balancesRes.data || []
  const previousTx = previousTxRes.data || []
  const paycheckKeyword = profile?.paycheck_keyword || "SALARY"

  let budgets = budgetsRes.data || []
  if (budgets.length === 0 && cycles.length > 0) {
    const { data: latestBudgets } = await supabase
      .from("budgets")
      .select("*")
      .eq("user_id", user.id)
      .order("year", { ascending: false })
      .order("month", { ascending: false })
    
    if (latestBudgets && latestBudgets.length > 0) {
      const latestMonth = latestBudgets[0].month
      const latestYear = latestBudgets[0].year
      const fallbackBudgets = latestBudgets.filter(b => b.month === latestMonth && b.year === latestYear)
      
      const clonePayload = fallbackBudgets.map(b => ({
        category_id: b.category_id,
        amount: b.amount,
        month: cycleMonth,
        year: cycleYear,
        user_id: user.id
      }))
      
      const { data: insertedBudgets, error: cloneError } = await supabase
        .from("budgets")
        .insert(clonePayload)
        .select()
        
      if (!cloneError && insertedBudgets) {
        budgets = insertedBudgets
      }
    }
  }

  // Helper to calculate starting balance for a cycle
  const calculateStartBalance = (cycleStartDateStr: string, allBalances: any[], txs: any[]) => {
    const cycleStartDate = new Date(cycleStartDateStr)
    const snapshot = allBalances
      .filter(b => new Date(b.date) <= cycleStartDate)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]

    if (!snapshot) return 0

    const snapDate = new Date(snapshot.date)
    const snapAmount = parseFloat(snapshot.amount)

    const transitionTxSum = txs
      .filter(tx => {
        const txDate = new Date(tx.date)
        return txDate >= snapDate && txDate < cycleStartDate
      })
      .reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0)

    return snapAmount + transitionTxSum
  }

  const injectedStartBalance = calculateStartBalance(selectedCycle.startDate, balances, previousTx)

  let previousExpenses: any[] = []
  let previousStartBalance = 0

  if (previousCycle) {
    previousExpenses = previousTx.filter(tx => tx.date >= previousCycle.startDate)
    previousStartBalance = calculateStartBalance(previousCycle.startDate, balances, previousTx)
  }

  return (
    <DashboardView
      expenses={expenses}
      categories={categories}
      budgets={budgets}
      balances={balances}
      cycles={cycles}
      currentCycleId={selectedCycle.id}
      injectedStartBalance={injectedStartBalance}
      previousExpenses={previousExpenses}
      previousStartBalance={previousStartBalance}
      allPastExpenses={previousTx}
      paycheckKeyword={paycheckKeyword}
      targetMonthlyIncome={parseFloat(profile?.target_monthly_income) || 2500}
      targetMonthlySpend={parseFloat(profile?.target_monthly_spend) || 1500}
    />
  )
}
