import { createClient } from "@/lib/supabase-server"
import { ExpensesView } from "@/components/ExpensesView"

export const revalidate = 0

export default async function ExpensesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [expensesRes, categoriesRes, rulesRes] = await Promise.all([
    supabase
      .from("tracker_expense")
      .select("*")
      .order("date", { ascending: false }),
    supabase
      .from("categories")
      .select("*")
      .order("name"),
    supabase
      .from("merchant_rules")
      .select("*")
      .order("keyword")
  ])

  return (
    <ExpensesView 
      initialExpenses={expensesRes.data || []} 
      categories={categoriesRes.data || []} 
      initialRules={rulesRes.data || []}
    />
  )
}
