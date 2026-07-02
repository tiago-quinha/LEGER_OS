import { createClient } from "@/lib/supabase-server"
import { getCycles } from "@/lib/cycles"
import { DashboardView } from "@/components/DashboardView"
import { OnboardingView } from "@/components/OnboardingView"

export const revalidate = 0

interface PageProps {
  searchParams: Promise<{ cycleId?: string; onboarding?: string; force_onboarding?: string }>
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // 1. Fetch user profile and cycles using utility
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .single()

  const cycles = await getCycles(supabase, user.id)

  if (!profile?.onboarding_completed || cycles.length === 0 || params?.onboarding === "true" || params?.force_onboarding === "true") {
    return <OnboardingView />
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
  const [expensesRes, categoriesRes, budgetsRes, balancesRes, previousTxRes, profileRes] = await Promise.all([
    // Selected cycle expenses
    supabase
      .from("tracker_expense")
      .select("*")
      .gte("date", startDateStr)
      .lt("date", endDateStr)
      .order("date", { ascending: false }),
    // Categories
    supabase
      .from("categories")
      .select("*")
      .order("name"),
    // Budgets for the selected cycle's month/year
    supabase
      .from("budgets")
      .select("*")
      .eq("month", cycleMonth)
      .eq("year", cycleYear),
    // All balance snapshots
    supabase
      .from("account_balance")
      .select("*")
      .order("date", { ascending: false }),
    // All transactions before the selected cycle (used for starting balance calculations and previous cycle comparison)
    supabase
      .from("tracker_expense")
      .select("*")
      .lt("date", startDateStr)
      .order("date", { ascending: true }),
    // User profile keyword
    supabase
      .from("profiles")
      .select("paycheck_keyword")
      .eq("id", user.id)
      .single()
  ])

  const expenses = expensesRes.data || []
  const categories = categoriesRes.data || []
  const budgets = budgetsRes.data || []
  const balances = balancesRes.data || []
  const previousTx = previousTxRes.data || []
  const paycheckKeyword = profileRes.data?.paycheck_keyword || "SALARY"

  // Helper to calculate starting balance for a cycle
  const calculateStartBalance = (cycleStartDateStr: string, allBalances: any[], txs: any[]) => {
    const cycleStartDate = new Date(cycleStartDateStr)
    const snapshot = allBalances
      .filter(b => new Date(b.date) <= cycleStartDate)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]

    if (!snapshot) return 0

    const snapDate = new Date(snapshot.date)
    const snapAmount = parseFloat(snapshot.amount)

    // Sum transactions between the snapshot date and the cycle start date
    const transitionTxSum = txs
      .filter(tx => {
        const txDate = new Date(tx.date)
        return txDate >= snapDate && txDate < cycleStartDate
      })
      .reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0)

    return snapAmount + transitionTxSum
  }

  // Calculate starting balance for current cycle
  const injectedStartBalance = calculateStartBalance(selectedCycle.startDate, balances, previousTx)

  // Calculate previous cycle expenses and starting balance
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
    />
  )
}
