import { createClient } from "@/lib/supabase-server"
import { ExpensesView } from "@/components/ExpensesView"
import { getWorkspaceData } from "@/lib/workspace-data"

export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{ cycleId?: string }>
}

export default async function ExpensesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { allExpenses, categories, rules, cycles } = await getWorkspaceData(supabase, user.id)

  return (
    <ExpensesView 
      initialExpenses={allExpenses} 
      categories={categories} 
      initialRules={rules}
      cycles={cycles}
      currentCycleId={params.cycleId}
    />
  )
}
