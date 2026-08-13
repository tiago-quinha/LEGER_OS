import { createClient } from "@/lib/supabase-server"
import { ExpensesView } from "@/components/ExpensesView"
import { getCycles } from "@/lib/cycles"

export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{ cycleId?: string }>
}

export default async function ExpensesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [expensesRes, categoriesRes, rulesRes, cycles] = await Promise.all([
    supabase
      .from("tracker_expense")
      .select("id, amount, merchant, date, source, category_id, raw_text, is_anomaly")
      .order("date", { ascending: false }),
    supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .order("name"),
    supabase
      .from("merchant_rules")
      .select("*")
      .order("keyword"),
    getCycles(supabase, user.id)
  ])

  return (
    <ExpensesView 
      initialExpenses={expensesRes.data || []} 
      categories={categoriesRes.data || []} 
      initialRules={rulesRes.data || []}
      cycles={cycles || []}
      currentCycleId={params.cycleId}
    />
  )
}
