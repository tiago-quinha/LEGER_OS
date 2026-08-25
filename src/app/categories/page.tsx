import { createClient } from "@/lib/supabase-server"
import { CategoriesView } from "@/components/CategoriesView"
import { getWorkspaceData } from "@/lib/workspace-data"

export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{ cycleId?: string }>
}

export default async function CategoriesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { allExpenses, categories, cycles } = await getWorkspaceData(supabase, user.id)
  const selectedCycle = params.cycleId 
    ? (cycles.find(c => c.id === params.cycleId) || cycles[0]) 
    : cycles[0]

  return (
    <CategoriesView 
      expenses={allExpenses} 
      categories={categories}
      cycles={cycles}
      currentCycleId={selectedCycle?.id || ""}
    />
  )
}
