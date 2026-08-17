import { SupabaseClient } from "@supabase/supabase-js"
import { getCycles } from "./cycles"
import { cache } from "./cache"
import { runEmpiricalProjection } from "./projection-engine"

export async function calculateServerTelemetry(supabase: SupabaseClient, userId: string, clientDateStr?: string) {
  const today = clientDateStr ? new Date(clientDateStr) : new Date();

  const cacheKey = `telemetry:${userId}:${clientDateStr || 'now'}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // 1. Fetch user profile
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("paycheck_keyword, target_monthly_spend, target_monthly_income, decay_weight, projection_overrides")
    .eq("id", userId)
    .single()

  if (profileErr || !profile) {
    throw new Error(`Profile not found: ${profileErr?.message || "Unknown error"}`)
  }

  const decayWeight = profile.decay_weight !== undefined && profile.decay_weight !== null ? Number(profile.decay_weight) : 0.0462
  const overrides = profile.projection_overrides || []

  // 2. Fetch cycles
  const cycles = await getCycles(supabase, userId)
  if (cycles.length === 0) {
    const startOfMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)).toISOString()
    cycles.push({
      id: "default-0",
      label: `Cycle: 01 ${today.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' })} - Present`,
      startDate: startOfMonth,
      endDate: null,
      paycheckAmount: 0
    })
  }

  const currentCycle = cycles[0]
  const startDateStr = currentCycle.startDate
  const endDateStr = currentCycle.endDate || '9999-12-31'

  const dateObj = new Date(currentCycle.startDate)
  const cycleMonth = dateObj.getUTCMonth() + 1
  const cycleYear = dateObj.getUTCFullYear()

  // 3. Fetch data parallel
  const [expensesRes, categoriesRes, budgetsRes, balancesRes, previousTxRes] = await Promise.all([
    supabase
      .from("tracker_expense")
      .select("*")
      .eq("user_id", userId)
      .gte("date", startDateStr)
      .lt("date", endDateStr)
      .order("date", { ascending: false }),
    supabase
      .from("categories")
      .select("*")
      .eq("user_id", userId)
      .order("name"),
    supabase
      .from("budgets")
      .select("*")
      .eq("user_id", userId)
      .eq("month", cycleMonth)
      .eq("year", cycleYear),
    supabase
      .from("account_balance")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false }),
    supabase
      .from("tracker_expense")
      .select("*")
      .eq("user_id", userId)
      .lt("date", startDateStr)
      .order("date", { ascending: true })
  ])

  const expenses = expensesRes.data || []
  const categories = categoriesRes.data || []
  const budgets = budgetsRes.data || []
  const balances = balancesRes.data || []
  const previousTx = previousTxRes.data || []

  // Starting balance calculations
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

  const injectedStartBalance = calculateStartBalance(currentCycle.startDate, balances, previousTx)

  // Outflows/inflows
  const totalOut = expenses
    .filter(exp => parseFloat(exp.amount) < 0)
    .reduce((sum, exp) => sum + Math.abs(parseFloat(exp.amount) || 0), 0)

  const totalIn = expenses
    .filter(exp => parseFloat(exp.amount) > 0)
    .reduce((sum, exp) => sum + Math.abs(parseFloat(exp.amount) || 0), 0)

  const netChange = expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0)
  const cycleEndBalance = injectedStartBalance + netChange

  // Date diffs
  const calculateDaysElapsed = () => {
    const start = new Date(currentCycle.startDate)
    const end = currentCycle.endDate ? new Date(currentCycle.endDate) : today
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(1, diffDays)
  }

  const daysElapsed = calculateDaysElapsed()

  const calculateTotalDays = () => {
    if (!currentCycle.endDate) return 30
    const start = new Date(currentCycle.startDate)
    const end = new Date(currentCycle.endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
  }

  const totalDaysInCycle = calculateTotalDays()

  // Run daily simulation
  const currentIndex = cycles.findIndex(c => c.id === currentCycle.id)
  const isCurrentCycle = currentIndex === 0 || !currentCycle.endDate
  
  const previousCycle = currentIndex !== -1 && currentIndex < cycles.length - 1
    ? cycles[currentIndex + 1]
    : null

  let previousExpenses: any[] = []
  let previousStartBalance = 0

  if (previousCycle) {
    previousExpenses = previousTx.filter(tx => tx.date >= previousCycle.startDate)
    previousStartBalance = calculateStartBalance(previousCycle.startDate, balances, previousTx)
  }

  const expertProjection = runEmpiricalProjection({
    pastExpenses: previousTx,
    currentExpenses: expenses,
    currentCycle,
    today,
    daysElapsed,
    totalDaysInCycle,
    overrides,
    halfLifeDays: 15.0,
    targetMonthlySpend: parseFloat(profile.target_monthly_spend) || 1500,
    startingBalance: injectedStartBalance
  })

  const projectedTotalOut = isCurrentCycle ? expertProjection.projectedTotalSpend : totalOut
  const projectedTotalIn = isCurrentCycle ? expertProjection.projectedTotalInflow : totalIn
  const estimatedFinalBalance = isCurrentCycle 
    ? expertProjection.projectedEndingBalance 
    : cycleEndBalance

  // Velocity
  const timeProgress = Math.min(1, daysElapsed / totalDaysInCycle)
  const baseIncome = currentCycle.paycheckAmount > 0 ? currentCycle.paycheckAmount : 500
  const spendProgress = baseIncome > 0 ? totalOut / baseIncome : 0
  const velocity = timeProgress > 0 ? spendProgress / timeProgress : 0

  // Category summary
  const categoriesDetailed = categories.map(cat => {
    const spent = expenses
      .filter(exp => exp.category_id === cat.id && parseFloat(exp.amount) < 0)
      .reduce((sum, exp) => sum + Math.abs(parseFloat(exp.amount) || 0), 0)

    const budget = budgets.find(b => b.category_id?.toString() === cat.id.toString())
    const limit = budget ? parseFloat(budget.amount) : 0

    return {
      id: cat.id,
      name: cat.name,
      value: spent,
      limit: limit,
      color: cat.color
    }
  });

  const spendingByCategory = categoriesDetailed
    .filter(c => c.value > 0)
    .map(c => ({ name: c.name, value: c.value }))

  const topExpenses = expenses
    .filter(e => parseFloat(e.amount) < 0)
    .sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount))
    .slice(0, 10)
    .map(e => ({ date: e.date, merchant: e.merchant, amount: parseFloat(e.amount), category_id: e.category_id, is_anomaly: e.is_anomaly }));

  const recentExpenses = [...expenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)
    .map(e => ({ date: e.date, merchant: e.merchant, amount: parseFloat(e.amount), category_id: e.category_id, is_anomaly: e.is_anomaly }));

  const result = {
    totalIn,
    totalOut,
    currentBalance: cycleEndBalance,
    velocity,
    daysElapsed,
    dailyVariableBurn: expertProjection.blendedDailyBurn,
    currentDailyVariableBurn: expertProjection.currentDailyVariableBurn,
    spendingLimit: parseFloat(profile.target_monthly_spend) || 1500,
    categories: spendingByCategory,
    categoriesDetailed,
    netDelta: totalIn - totalOut,
    topExpenses,
    recentExpenses,
    projectedSurplus: expertProjection.projectedNetCashFlow,
    projectedEndBalance: estimatedFinalBalance,
    cycleStartDate: currentCycle.startDate,
    cycleEndDate: currentCycle.endDate
  }

  // Cache lightweight telemetry for short TTL to reduce repeated DB work
  try {
    cache.set(cacheKey, result, 30 * 1000); // 30s
  } catch (e) {
    console.warn("Failed to set telemetry cache:", e);
  }

  return result
}

