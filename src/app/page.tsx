import { createClient } from "@/lib/supabase-server"
import { getCycles } from "@/lib/cycles"
import { DashboardView } from "@/components/DashboardView"
import { OnboardingView } from "@/components/OnboardingView"
import { DedicatedPushResolver } from "@/components/DedicatedPushResolver"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{ cycleId?: string; onboarding?: string; force_onboarding?: string; resolveTxId?: string }>
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  // 1. Fast-Path: Isolated Push Notification Capture Resolution
  // Only loads this focused popup when tapping push notifications, saving all dashboard computation
  if (params?.resolveTxId) {
    const resolveTxId = params.resolveTxId
    let txToResolve: any = null

    if (resolveTxId === "demo") {
      txToResolve = {
        id: "demo",
        amount: -14.50,
        merchant: "Santander Outflow",
        date: new Date().toISOString().split("T")[0],
        category_id: null,
        raw_text: "Santander Push: Compra com cartao 14.50 EUR"
      }
    } else {
      const { data: foundTx } = await supabase
        .from("tracker_expense")
        .select("*")
        .eq("id", resolveTxId)
        .eq("user_id", user.id)
        .single()
      txToResolve = foundTx
    }

    if (txToResolve) {
      const [categoriesRes, recentTxRes, profileRes] = await Promise.all([
        supabase.from("categories").select("*").eq("user_id", user.id).order("name"),
        supabase.from("tracker_expense").select("merchant, category_id").eq("user_id", user.id).order("date", { ascending: false }).limit(60),
        supabase.from("profiles").select("currency").eq("id", user.id).single()
      ])

      const categories = categoriesRes.data || []
      const counts = new Map<string, { count: number; categoryId: number | null }>()
      const genericNames = new Set([
        "UNKNOWN MERCHANT", "COMPRA CARTAO", "COMPRA", "MOVIMENTO", 
        "PAGAMENTO", "PAGAMENTO SERVICOS", "TRANSFERENCIA", "DEBITO DIRECTO"
      ])
      
      ;(recentTxRes.data || []).forEach((tx: any) => {
        const name = (tx.merchant || "").trim()
        if (name && name.length > 2 && !genericNames.has(name.toUpperCase())) {
          const current = counts.get(name) || { count: 0, categoryId: tx.category_id }
          counts.set(name, { count: current.count + 1, categoryId: tx.category_id || current.categoryId })
        }
      })

      const frequentMerchants = Array.from(counts.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 8)
        .map(([name, meta]) => ({ name, categoryId: meta.categoryId }))

      const currencySymbol = profileRes.data?.currency === "USD" ? "$" : profileRes.data?.currency === "GBP" ? "£" : "€"

      return (
        <DedicatedPushResolver
          transaction={txToResolve}
          categories={categories}
          frequentMerchants={frequentMerchants}
          currencySymbol={currencySymbol}
        />
      )
    }
  }

  // 2. Fetch user profile, cycles, and complete dataset in a single parallel batch
  const [profileRes, cycles, allTxRes, categoriesRes, budgetsRes, balancesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("onboarding_completed, target_monthly_income, target_monthly_spend, paycheck_keyword")
      .eq("id", user.id)
      .single(),
    getCycles(supabase, user.id),
    supabase
      .from("tracker_expense")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false }),
    supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .order("name"),
    supabase
      .from("budgets")
      .select("*")
      .eq("user_id", user.id),
    supabase
      .from("account_balance")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
  ])

  const profile = profileRes.data

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

  // 3. Determine selected cycle
  const selectedCycle = params.cycleId
    ? cycles.find(c => c.id === params.cycleId) || cycles[0]
    : cycles[0]

  const allExpenses = allTxRes.data || []
  const categories = categoriesRes.data || []
  const balances = balancesRes.data || []
  const budgets = budgetsRes.data || []
  const paycheckKeyword = profile?.paycheck_keyword || "SALARY"

  return (
    <DashboardView
      allExpenses={allExpenses}
      expenses={allExpenses}
      categories={categories}
      budgets={budgets}
      balances={balances}
      cycles={cycles}
      currentCycleId={selectedCycle.id}
      paycheckKeyword={paycheckKeyword}
      targetMonthlyIncome={parseFloat(profile?.target_monthly_income) || 2500}
      targetMonthlySpend={parseFloat(profile?.target_monthly_spend) || 1500}
    />
  )
}
