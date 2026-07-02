import { createClient } from "@/lib/supabase-server"
import { LegerAIPageView } from "@/components/LegerAIPageView"
import { getCycles } from "@/lib/cycles"

export const revalidate = 0

export default async function LegerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // 1. Identify current cycle using utility
  const cycles = await getCycles(supabase, user.id)
  const currentCycle = cycles[0]

  if (!currentCycle) return <div className="p-8 font-mono technical-label text-destructive">Mainframe status: Offline. No cycle data found.</div>

  // 2. Fetch all necessary nodes in parallel
  const [expensesRes, categoriesRes, balancesRes, allTxRes] = await Promise.all([
    supabase
      .from("tracker_expense")
      .select("*")
      .gte("date", currentCycle.startDate)
      .order("date", { ascending: false }),
    supabase
      .from("categories")
      .select("*"),
    supabase
      .from("account_balance")
      .select("*")
      .order("date", { ascending: false }),
    supabase
      .from("tracker_expense")
      .select("*")
      .lt("date", currentCycle.startDate)
      .order("date", { ascending: true })
  ])

  const expenses = expensesRes.data || []
  const categories = categoriesRes.data || []
  const balances = balancesRes.data || []
  const previousTx = allTxRes.data || []

  // 3. Calculate HIGH-PRECISION START BALANCE
  const snapshot = balances
    .filter(b => new Date(b.date) <= new Date(currentCycle.startDate))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
  
  let actualStartBalance = 0
  if (snapshot) {
      const snapDate = new Date(snapshot.date)
      const snapAmount = parseFloat(snapshot.amount)
      
      const transitionTxSum = previousTx
        .filter(tx => new Date(tx.date) >= snapDate)
        .reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0)
      
      actualStartBalance = snapAmount + transitionTxSum
  }

  // 4. Final Position Calculation
  const netChange = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)
  const currentBalance = actualStartBalance + netChange

  // 5. Synthesis Parameters
  const totalOut = expenses
    .filter(e => parseFloat(e.amount) < 0)
    .reduce((sum, e) => sum + Math.abs(parseFloat(e.amount)), 0)
  
  const totalIn = expenses
    .filter(e => parseFloat(e.amount) > 0)
    .reduce((sum, e) => sum + parseFloat(e.amount), 0)

  const startDate = new Date(currentCycle.startDate)
  const today = new Date()
  const daysElapsed = Math.max(1, Math.floor((today.getTime() - startDate.getTime()) / 86400000))
  const baseIncome = currentCycle.paycheckAmount > 0 ? currentCycle.paycheckAmount : 500
  const velocity = (totalOut / baseIncome) / (daysElapsed / 30)

  const catSpending = categories.map(cat => ({
    name: cat.name,
    value: expenses
        .filter(e => e.category_id === cat.id && parseFloat(e.amount) < 0)
        .reduce((sum, e) => sum + Math.abs(parseFloat(e.amount)), 0)
  })).filter(c => c.value > 0)

  return (
    <LegerAIPageView 
      cycleData={{
        currentBalance,
        velocity,
        categories: catSpending
      }}
      expenses={expenses}
      categories={categories}
    />
  )
}
