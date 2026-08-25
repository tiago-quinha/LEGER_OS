import { createClient } from "@/lib/supabase-server"
import { RadarPageView } from "@/components/RadarPageView"
import { getCycles } from "@/lib/cycles"

export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{ cycleId?: string }>
}

export default async function RadarPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const cycles = await getCycles(supabase, user.id)
  const selectedCycle = params.cycleId 
    ? (cycles.find(c => c.id === params.cycleId) || cycles[0]) 
    : cycles[0]

  const [expensesRes, categoriesRes] = await Promise.all([
    supabase
      .from("tracker_expense")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false }),
    supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .order("name")
  ])

  return (
    <RadarPageView 
      expenses={expensesRes.data || []} 
      categories={categoriesRes.data || []}
      cycles={cycles || []}
      currentCycleId={selectedCycle?.id || ""}
    />
  )
}
