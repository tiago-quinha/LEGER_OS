import { createClient } from "@/lib/supabase-server"
import { CategoriesView } from "@/components/CategoriesView"
import { getCycles } from "@/lib/cycles"

export const dynamic = "force-dynamic"

export default async function CategoriesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Parallel fetches for standard metadata & cycles
  const [expensesRes, categoriesRes, cycles] = await Promise.all([
    supabase
      .from("tracker_expense")
      .select("*")
      .order("date", { ascending: false }),
    supabase
      .from("categories")
      .select("*")
      .order("name"),
    getCycles(supabase, user.id)
  ])

  return (
    <CategoriesView 
      expenses={expensesRes.data || []} 
      categories={categoriesRes.data || []}
      cycles={cycles || []}
    />
  )
}
