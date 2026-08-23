import { createClient } from "@/lib/supabase-server"
import { LegerAIPageView } from "@/components/LegerAIPageView"
import { getCycles } from "@/lib/cycles"

export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{ cycleId?: string }>
}

export default async function LegerAIPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [cycles, categoriesRes] = await Promise.all([
    getCycles(supabase, user.id),
    supabase
      .from("categories")
      .select("*")
      .order("name")
  ])

  const selectedCycle = params.cycleId
    ? cycles.find(c => c.id === params.cycleId) || cycles[0]
    : cycles[0]

  const startDateStr = selectedCycle.startDate
  const endDateStr = selectedCycle.endDate || '9999-12-31'

  const { data: expenses } = await supabase
    .from("tracker_expense")
    .select("*")
    .gte("date", startDateStr)
    .lt("date", endDateStr)
    .order("date", { ascending: false })

  return (
    <LegerAIPageView 
      cycleData={selectedCycle}
      expenses={expenses || []}
      categories={categoriesRes.data || []}
    />
  )
}
