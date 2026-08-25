import { SupabaseClient } from "@supabase/supabase-js"
import { cache } from "./cache"
import { calculateCyclesFromData, Cycle } from "./cycles"

export interface UserWorkspaceData {
  profile: any
  allExpenses: any[]
  categories: any[]
  budgets: any[]
  balances: any[]
  rules: any[]
  cycles: Cycle[]
  cachedAt: number
}

const WORKSPACE_CACHE_TTL_MS = 60 * 1000 // 60 seconds

/**
 * High-performance consolidated server-side data layer.
 * Fetches all necessary user workspace records in parallel and caches them in memory.
 * Eliminates redundant database roundtrips across all page navigations.
 */
export async function getWorkspaceData(
  supabase: SupabaseClient,
  userId: string
): Promise<UserWorkspaceData> {
  const cacheKey = `workspace_data:${userId}`
  const cached = cache.get(cacheKey) as UserWorkspaceData | null
  if (cached) {
    return cached
  }

  // Parallel fetch of all user tables with selective column projections
  const [profileRes, expensesRes, categoriesRes, budgetsRes, balancesRes, rulesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, currency, onboarding_completed, target_monthly_income, target_monthly_spend, paycheck_keyword, paycheck_frequency")
      .eq("id", userId)
      .single(),
    supabase
      .from("tracker_expense")
      .select("id, amount, merchant, date, category_id, is_anomaly, source, raw_text")
      .eq("user_id", userId)
      .order("date", { ascending: false }),
    supabase
      .from("categories")
      .select("id, name, color, icon, is_system")
      .eq("user_id", userId)
      .order("name"),
    supabase
      .from("budgets")
      .select("id, category_id, amount, period")
      .eq("user_id", userId),
    supabase
      .from("account_balance")
      .select("id, balance, date, notes")
      .eq("user_id", userId)
      .order("date", { ascending: false }),
    supabase
      .from("merchant_rules")
      .select("id, keyword, category_id")
      .eq("user_id", userId)
      .order("keyword")
  ])

  const profile = profileRes.data || null
  const allExpenses = expensesRes.data || []
  const categories = categoriesRes.data || []
  const budgets = budgetsRes.data || []
  const balances = balancesRes.data || []
  const rules = rulesRes.data || []

  // Derive cycles in memory without separate SQL queries
  const cycles = calculateCyclesFromData(allExpenses, profile)

  // Ensure default cycle if none exists
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

  const result: UserWorkspaceData = {
    profile,
    allExpenses,
    categories,
    budgets,
    balances,
    rules,
    cycles,
    cachedAt: Date.now()
  }

  cache.set(cacheKey, result, WORKSPACE_CACHE_TTL_MS)
  return result
}

export function invalidateUserWorkspaceCache(userId: string) {
  cache.delete(`workspace_data:${userId}`)
  cache.delete(`dashboard_data:${userId}`)
  cache.delete(`cycles:${userId}`)
  cache.delete(`telemetry:${userId}:now`)
}
