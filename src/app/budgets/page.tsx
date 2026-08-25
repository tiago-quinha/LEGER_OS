import { createClient } from "@/lib/supabase-server"
import { BudgetsView } from "@/components/BudgetsView"
import { getCycles } from "@/lib/cycles"

export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{ cycleId?: string }>
}

export default async function BudgetsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const cycles = await getCycles(supabase, user.id)

  if (cycles.length === 0) {
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()

    const [categoriesRes, budgetsRes, expensesRes] = await Promise.all([
      supabase
        .from("categories")
        .select("*")
        .eq("user_id", user.id)
        .order("name"),
      supabase
        .from("budgets")
        .select("*")
        .eq("user_id", user.id)
        .eq("month", currentMonth + 1)
        .eq("year", currentYear),
      supabase
        .from("tracker_expense")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", new Date(currentYear, currentMonth, 1).toISOString())
        .lte("date", new Date(currentYear, currentMonth + 1, 0).toISOString())
    ])

    return (
      <BudgetsView 
        key="fallback"
        categories={categoriesRes.data || []}
        budgets={budgetsRes.data || []}
        expenses={expensesRes.data || []}
        cycles={[]}
        currentCycleId=""
      />
    )
  }

  const selectedCycle = params.cycleId 
    ? (cycles.find(c => c.id === params.cycleId) || cycles[0]) 
    : cycles[0]

  const startDate = new Date(selectedCycle.startDate)
  const cycleMonth = startDate.getMonth() + 1
  const cycleYear = startDate.getFullYear()

  const [categoriesRes, budgetsRes, expensesRes] = await Promise.all([
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
      .from("tracker_expense")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
  ])

  let budgets = budgetsRes.data || []

  return (
    <BudgetsView 
      categories={categoriesRes.data || []}
      budgets={budgets}
      expenses={expensesRes.data || []}
      cycles={cycles}
      currentCycleId={selectedCycle?.id || ""}
    />
  )
}
