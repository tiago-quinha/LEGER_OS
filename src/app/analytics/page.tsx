import { createClient } from "@/lib/supabase-server"
import { AnalyticsView } from "@/components/AnalyticsView"
import { getCycles } from "@/lib/cycles"

export const revalidate = 0

export default async function Analytics() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // 1. Fetch cycles using utility (to get paycheck data consistently)
  const cycles = await getCycles(supabase, user.id)
  const paychecks = cycles
    .filter(c => c.paycheckAmount > 0)
    .map(c => ({ date: c.startDate, amount: c.paycheckAmount, merchant: 'PAYCHECK' }))

  // 2. Fetch all expenses
  const { data: expenses } = await supabase
    .from("tracker_expense")
    .select("*")
    .order("date", { ascending: false })

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("name")

  return (
    <AnalyticsView 
      expenses={expenses || []} 
      categories={categories || []}
      paychecks={paychecks || []}
      currentMonth={new Date().getMonth()}
      currentYear={new Date().getFullYear()}
    />
  )
}
