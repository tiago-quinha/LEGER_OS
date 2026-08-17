import { SupabaseClient } from "@supabase/supabase-js"
import { getCycles } from "./cycles"
import { cache } from "./cache"
import { detectRecurringCadence } from "./cadence-detector"

function simulateExpertDailyProjection(
  pastExpenses: any[],
  currentExpenses: any[],
  currentCycle: any,
  today: Date,
  daysElapsed: number,
  totalDaysInCycle: number,
  overrides: any[] = [],
  decayRate: number = 0.12
) {
  // Use high-precision Automated Cadence Engine for recurring subscriptions & fixed bills
  const cadenceResult = detectRecurringCadence(pastExpenses, currentCycle?.startDate, currentCycle?.endDate);
  const recurringMerchants = cadenceResult.subscriptions.map(s => ({
    merchant: s.normalizedMerchant,
    amount: s.latestAmount,
    expectedDay: s.expectedDayOfMonth || 15
  }));
  const recurringNames = new Set(cadenceResult.subscriptions.map(s => s.normalizedMerchant));

  const dowSpend = [1, 1, 1, 1, 1, 1, 1]
  pastExpenses.forEach((e: any) => {
    const amt = parseFloat(e.amount)
    if (amt < 0 && !recurringNames.has((e.merchant || "").trim().toUpperCase())) {
      const dow = new Date(e.date).getDay()
      dowSpend[dow] += Math.abs(amt)
    }
  })
  const totalDow = dowSpend.reduce((a, b) => a + b, 0)
  const dowWeights = dowSpend.map(s => (s / totalDow) * 7)

  const currentActualOut = currentExpenses
    .filter((e: any) => new Date(e.date) <= today && parseFloat(e.amount) < 0)
    .reduce((sum: number, e: any) => sum + Math.abs(parseFloat(e.amount)), 0)
  
  const currentActualIn = currentExpenses
    .filter((e: any) => new Date(e.date) <= today && parseFloat(e.amount) > 0)
    .reduce((sum: number, e: any) => sum + parseFloat(e.amount), 0)

  const currentRecurringSpent = currentExpenses
    .filter((e: any) => new Date(e.date) <= today && parseFloat(e.amount) < 0 && recurringNames.has((e.merchant || "").trim().toUpperCase()))
    .reduce((sum: number, e: any) => sum + Math.abs(parseFloat(e.amount)), 0)
    
  const effectiveElapsed = Math.max(1, Math.min(daysElapsed, totalDaysInCycle))
  const todayTime = today.getTime()

  // Recency-weighted daily variable burn rate (aggregated by day offset, adapting with exponential decay half-life)
  const dailyVariableMap = new Map<number, number>()
  for (let d = 0; d <= effectiveElapsed; d++) {
    dailyVariableMap.set(d, 0)
  }
  currentExpenses.forEach((e: any) => {
    const amt = parseFloat(e.amount)
    if (amt < 0 && new Date(e.date) <= today && !recurringNames.has((e.merchant || "").trim().toUpperCase()) && !e.is_anomaly) {
      const daysAgo = Math.floor(Math.max(0, (todayTime - new Date(e.date).getTime()) / (1000 * 60 * 60 * 24)))
      if (daysAgo <= effectiveElapsed) {
        dailyVariableMap.set(daysAgo, (dailyVariableMap.get(daysAgo) || 0) + Math.abs(amt))
      }
    }
  })

  let weightedDailySpend = 0
  let totalDailyWeight = 0
  dailyVariableMap.forEach((dailyTotal, daysAgo) => {
    const w = Math.exp(-decayRate * daysAgo)
    weightedDailySpend += dailyTotal * w
    totalDailyWeight += w
  })

  const unweightedVariableSpend = Math.max(0, currentActualOut - currentRecurringSpent)
  const standardDailyBurn = unweightedVariableSpend / effectiveElapsed
  
  const rawDecayBurn = totalDailyWeight > 0 ? (weightedDailySpend / totalDailyWeight) : standardDailyBurn
  // Smooth the aggressive exponential decay with the unweighted average to handle lumpy spend (e.g. weekly groceries)
  const currentDailyVariableBurn = (rawDecayBurn + standardDailyBurn) / 2

  const pastVariableTotal = pastExpenses
    .filter((e: any) => parseFloat(e.amount) < 0 && !recurringNames.has((e.merchant || "").trim().toUpperCase()))
    .reduce((sum: number, e: any) => sum + Math.abs(parseFloat(e.amount)), 0)
    
  let histDaysCount = Math.max(30, totalDaysInCycle)
  if (pastExpenses.length > 0) {
    const oldestDate = Math.min(...pastExpenses.map((e: any) => new Date(e.date).getTime()))
    const newestDate = Math.max(...pastExpenses.map((e: any) => new Date(e.date).getTime()))
    const spanDays = Math.max(30, (newestDate - oldestDate) / (1000 * 60 * 60 * 24))
    histDaysCount = spanDays
  }
  
  const histDailyVariableBurn = pastExpenses.length > 0 ? (pastVariableTotal / histDaysCount) : (currentDailyVariableBurn || 20)

  const alpha = Math.min(1.0, 0.65 + 0.35 * (effectiveElapsed / totalDaysInCycle))
  const blendedDailyBurn = alpha * currentDailyVariableBurn + (1 - alpha) * histDailyVariableBurn

  let dailyBurnAdjustment = 0
  let totalFixedDelta = 0
  if (overrides && overrides.length > 0) {
    overrides.forEach((ov: any) => {
      if (ov.fixedDelta) {
        totalFixedDelta += parseFloat(ov.fixedDelta) || 0
      }
      if (ov.multiplier !== undefined && ov.multiplier !== null && ov.multiplier !== 1.0) {
        let catWeightedSpend = 0
        let catTotalWeight = 0
        currentExpenses.forEach((e: any) => {
          const amt = parseFloat(e.amount)
          if (amt < 0 && new Date(e.date) <= today && (ov.categoryId ? e.category_id === ov.categoryId : true)) {
            const daysAgo = Math.floor(Math.max(0, (todayTime - new Date(e.date).getTime()) / (1000 * 60 * 60 * 24)))
            if (daysAgo <= effectiveElapsed) {
              const w = Math.exp(-decayRate * daysAgo)
              catWeightedSpend += Math.abs(amt) * w
              catTotalWeight += w
            }
          }
        })
        const catDailyBurn = catTotalWeight > 0 ? (catWeightedSpend / catTotalWeight) : 0
        dailyBurnAdjustment += (catDailyBurn * ov.multiplier) - catDailyBurn
      }
    })
  }

  const dailySpend = new Array(totalDaysInCycle + 1).fill(0)
  const dailySpendOptimistic = new Array(totalDaysInCycle + 1).fill(0)
  const dailySpendPessimistic = new Array(totalDaysInCycle + 1).fill(0)
  const dailyInflow = new Array(totalDaysInCycle + 1).fill(0)
  const startDate = new Date(currentCycle.startDate)
  const remainingDays = Math.max(1, totalDaysInCycle - daysElapsed)
  const dailyFixedDelta = totalFixedDelta / remainingDays

  for (let i = 0; i <= totalDaysInCycle; i++) {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    const isSameDay = d.toDateString() === today.toDateString()
    const isPastDay = d < today && !isSameDay

    if (isPastDay || isSameDay) {
      const dEnd = new Date(d)
      dEnd.setHours(23, 59, 59, 999)
      const actualOut = currentExpenses
        .filter((e: any) => new Date(e.date) <= dEnd && parseFloat(e.amount) < 0)
        .reduce((sum: number, e: any) => sum + Math.abs(parseFloat(e.amount)), 0)
      dailySpend[i] = actualOut
      dailySpendOptimistic[i] = actualOut
      dailySpendPessimistic[i] = actualOut
      
      dailyInflow[i] = currentExpenses
        .filter((e: any) => new Date(e.date) <= dEnd && parseFloat(e.amount) > 0)
        .reduce((sum: number, e: any) => sum + parseFloat(e.amount), 0)
    } else {
      const prevSpend = i > 0 ? dailySpend[i - 1] : currentActualOut
      const prevSpendOpt = i > 0 ? dailySpendOptimistic[i - 1] : currentActualOut
      const prevSpendPes = i > 0 ? dailySpendPessimistic[i - 1] : currentActualOut
      const prevInflow = i > 0 ? dailyInflow[i - 1] : currentActualIn

      let billsDueToday = 0
      const currentCalDay = d.getDate()
      recurringMerchants.forEach(rm => {
        if (rm.expectedDay === currentCalDay) {
          billsDueToday += rm.amount
        }
      })

      const dow = d.getDay()
      const variableSpendToday = Math.max(0, (blendedDailyBurn + dailyBurnAdjustment) * (dowWeights[dow] || 1.0) + dailyFixedDelta)
      
      dailySpend[i] = prevSpend + billsDueToday + variableSpendToday
      dailySpendOptimistic[i] = prevSpendOpt + billsDueToday + (variableSpendToday * 0.8)
      dailySpendPessimistic[i] = prevSpendPes + billsDueToday + (variableSpendToday * 1.2)
      dailyInflow[i] = prevInflow
    }
  }

  return {
    projectedTotalOut: dailySpend[totalDaysInCycle] || currentActualOut,
    projectedTotalIn: dailyInflow[totalDaysInCycle] || currentActualIn
  }
}

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

  const expertProjection = simulateExpertDailyProjection(
    previousTx,
    expenses,
    currentCycle,
    today,
    daysElapsed,
    totalDaysInCycle,
    overrides,
    decayWeight
  )

  const projectedTotalOut = isCurrentCycle ? expertProjection.projectedTotalOut : totalOut
  const projectedTotalIn = isCurrentCycle ? expertProjection.projectedTotalIn : totalIn
  const estimatedFinalBalance = isCurrentCycle 
    ? (injectedStartBalance + projectedTotalIn - projectedTotalOut) 
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
    .map(e => ({ date: e.date, merchant: e.merchant, amount: parseFloat(e.amount), category_id: e.category_id }));

  const recentExpenses = [...expenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)
    .map(e => ({ date: e.date, merchant: e.merchant, amount: parseFloat(e.amount), category_id: e.category_id }));

  const result = {
    totalIn,
    totalOut,
    currentBalance: cycleEndBalance,
    velocity,
    daysElapsed,
    spendingLimit: parseFloat(profile.target_monthly_spend) || 1500,
    categories: spendingByCategory,
    categoriesDetailed,
    netDelta: totalIn - totalOut,
    topExpenses,
    recentExpenses,
    projectedSurplus: projectedTotalIn - projectedTotalOut,
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

