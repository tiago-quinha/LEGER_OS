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
        .order("name"),
      supabase
        .from("budgets")
        .select("*")
        .eq("month", currentMonth + 1)
        .eq("year", currentYear),
      supabase
        .from("tracker_expense")
        .select("*")
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

  // Query expenses for the cycle
  const query = supabase
    .from("tracker_expense")
    .select("*")
    .gte("date", selectedCycle.startDate)
    .order("date", { ascending: false })

  if (selectedCycle.endDate) {
    query.lt("date", selectedCycle.endDate)
  }

  const [categoriesRes, budgetsRes, expensesRes] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .order("name"),
    supabase
      .from("budgets")
      .select("*")
      .eq("month", cycleMonth)
      .eq("year", cycleYear),
    query
  ])

  let budgets = budgetsRes.data || []
  if (budgets.length === 0 && cycles.length > 0) {
    // Fetch the latest configured budgets from the database for this user
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
      
      // Auto-clone them in the database for the current cycleMonth/cycleYear
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

  return (
    <BudgetsView 
      key={selectedCycle.id}
      categories={categoriesRes.data || []}
      budgets={budgets}
      expenses={expensesRes.data || []}
      cycles={cycles}
      currentCycleId={selectedCycle.id}
    />
  )
}
