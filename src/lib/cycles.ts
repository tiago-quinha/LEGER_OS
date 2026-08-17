import { SupabaseClient } from "@supabase/supabase-js"

export interface Cycle {
  id: string
  label: string
  startDate: string
  endDate: string | null
  paycheckAmount: number
}

export async function getCycles(supabase: SupabaseClient, userId: string): Promise<Cycle[]> {
  // 1. Fetch user profile for keyword
  const { data: profile } = await supabase
    .from("profiles")
    .select("paycheck_keyword")
    .eq("id", userId)
    .single()

  const keyword = profile?.paycheck_keyword || "SALARY"

  // 2. Identify cycles by Paycheck
  const { data: paychecks } = await supabase
    .from("tracker_expense")
    .select("*")
    .eq("user_id", userId)
    .ilike("merchant", `%${keyword}%`)
    .order("date", { ascending: true })

  let baseCycles: Cycle[] = []

  if (keyword !== "MONTHLY" && paychecks && paychecks.length > 0) {
      // Cluster paychecks arriving within <= 12 days into the same payroll cycle (e.g. split transfers, bonuses, 14th month)
      const clusters: {
        startDate: string
        paycheckAmount: number
      }[] = []

      for (const pc of paychecks) {
        const pcDate = new Date(pc.date)
        const amt = parseFloat(pc.amount) || 0

        if (clusters.length === 0) {
          clusters.push({ startDate: pc.date, paycheckAmount: amt })
        } else {
          const lastCluster = clusters[clusters.length - 1]
          const lastDate = new Date(lastCluster.startDate)
          const diffDays = Math.abs((pcDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))

          if (diffDays <= 12) {
            // Same cycle payroll cluster (e.g. salary + bonus, or split paycheck) -> merge & sum income
            lastCluster.paycheckAmount += amt
          } else {
            // New distinct cycle boundary (standard bi-weekly or monthly cadence >= 13 days)
            clusters.push({ startDate: pc.date, paycheckAmount: amt })
          }
        }
      }

      baseCycles = clusters.map((c, index) => {
        const startDate = new Date(c.startDate)
        const nextCluster = clusters[index + 1]
        const endDateForLabel = nextCluster 
          ? new Date(new Date(nextCluster.startDate).getTime() - 86400000)
          : new Date()

        return {
          id: `pc-${index + 1}`,
          label: `Cycle: ${startDate.getUTCDate().toString().padStart(2, '0')} ${startDate.toLocaleDateString('en-GB', { month: 'short' })} - ${nextCluster ? endDateForLabel.getUTCDate().toString().padStart(2, '0') + ' ' + endDateForLabel.toLocaleDateString('en-GB', { month: 'short' }) : 'Present'}`,
          startDate: c.startDate,
          endDate: nextCluster ? nextCluster.startDate : null,
          paycheckAmount: c.paycheckAmount
        }
      })
      
      // Add initial opening cycle dynamically based on first paycheck month start
      const firstPcDate = new Date(baseCycles[0].startDate)
      const initialDateObj = new Date(Date.UTC(firstPcDate.getUTCFullYear(), firstPcDate.getUTCMonth(), 1))
      const initialCycleStart = initialDateObj.toISOString()
      const initialEndObj = new Date(firstPcDate.getTime() - 86400000)
      const initialCycle: Cycle = {
          id: "pc-0",
          label: `Cycle: 01 ${initialDateObj.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' })} - ${initialEndObj.getUTCDate().toString().padStart(2, '0')} ${initialEndObj.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' })}`,
          startDate: initialCycleStart,
          endDate: baseCycles[0].startDate,
          paycheckAmount: 0
      }
      baseCycles.unshift(initialCycle)
  } else {
      // Logic B: Monthly Fallback
      const { data: anyExpenses } = await supabase
        .from("tracker_expense")
        .select("date")
        .eq("user_id", userId)
        .order("date", { ascending: true })
        .limit(1)

      if (anyExpenses && anyExpenses.length > 0) {
          const firstDate = new Date(anyExpenses[0].date)
          const today = new Date()
          
          let current = new Date(today.getFullYear(), today.getMonth(), 1)
          let count = 0
          while (current >= new Date(firstDate.getFullYear(), firstDate.getMonth(), 1) && count < 12) {
              const monthStart = new Date(current.getFullYear(), current.getMonth(), 1)
              const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0)
              
              baseCycles.push({
                  id: `mo-${current.getFullYear()}-${current.getMonth() + 1}`,
                  label: `Monthly: ${monthStart.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`,
                  startDate: monthStart.toISOString(),
                  endDate: new Date(monthEnd.getTime() + 86400000).toISOString(),
                  paycheckAmount: 0
              })
              current = new Date(current.getFullYear(), current.getMonth() - 1, 1)
              count++
          }
          baseCycles.reverse();
      }
  }

  // Fallback when user has 0 transactions: generate current and previous monthly cycles starting from Day 1
  if (baseCycles.length === 0) {
    const today = new Date();
    for (let i = 0; i < 4; i++) {
      const current = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthStart = new Date(Date.UTC(current.getFullYear(), current.getMonth(), 1));
      const monthEnd = new Date(Date.UTC(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59));

      const isCurrentMonth = i === 0;
      const startDay = "01";
      const startMonth = monthStart.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
      const endDay = monthEnd.getUTCDate().toString().padStart(2, "0");
      const endMonth = monthEnd.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });

      baseCycles.push({
        id: `mo-${current.getFullYear()}-${current.getMonth() + 1}`,
        label: isCurrentMonth
          ? `Cycle: ${startDay} ${startMonth} - Present`
          : `Cycle: ${startDay} ${startMonth} - ${endDay} ${endMonth}`,
        startDate: monthStart.toISOString(),
        endDate: isCurrentMonth ? null : monthEnd.toISOString(),
        paycheckAmount: 0,
      });
    }
    // baseCycles was pushed newest to oldest, so return directly
    return baseCycles;
  }

  return [...baseCycles].reverse(); // Most recent first
}
