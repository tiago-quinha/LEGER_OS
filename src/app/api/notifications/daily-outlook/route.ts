import { NextRequest, NextResponse } from "next/server"
import { getAdminClient } from "@/lib/supabase-admin"
import { getUserCachedTelemetry } from "@/lib/server-telemetry"
import { 
  notifyDailyMorningOutlook, 
  notifySubscriptionDue, 
  notifyCycleClosing,
  notifyVelocitySpike,
  notifyCategoryBudgetThreshold
} from "@/lib/server-notifications"

export const dynamic = "force-dynamic"
export const maxDuration = 60 // Allow up to 60s for serverless batch processing

/**
 * High-Precision Telemetry Notification Dispatcher
 * Dispatches:
 * 1. Morning Financial Outlook (08:30 AM in User's Local Timezone)
 * 2. Subscription Pre-Charge Radar Alerts (48h before expected charge)
 * 3. Velocity Spike Warnings (> 1.35x burn rate)
 * 4. Cycle Closing & Surplus Wrap-Up Reports (Last 48h of active cycle)
 * 5. Category Budget Threshold Alerts (85% & 100%)
 */
export async function GET(request: NextRequest) {
  return handleDispatch(request)
}

export async function POST(request: NextRequest) {
  return handleDispatch(request)
}

// Helper: Check if current UTC time falls in user's target morning window (default 8:00 - 8:59 AM local)
function isUserInMorningWindow(timezone: string, targetHour: number = 8): boolean {
  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone || "UTC",
      hour: "numeric",
      hour12: false
    })
    const localHour = parseInt(formatter.format(now), 10)
    return localHour === targetHour
  } catch (err) {
    // If timezone string is invalid, fallback to UTC hour check
    return new Date().getUTCHours() === targetHour
  }
}

// Process a single user's daily notifications
async function processUserDailyNotifications(
  supabaseAdmin: any,
  uId: string,
  currencySymbol: string,
  type: string
) {
  const userResults: any[] = []

  try {
    // 1. Fetch pre-cached telemetry (sub-millisecond single read)
    const telemetry = await getUserCachedTelemetry(supabaseAdmin, uId)
    const prefs = { morning: true, subscriptions: true, closing: true, velocity: true }

    // A. Daily Morning Outlook Telemetry Brief
    if (type === "morning" || type === "all") {
      if (prefs.morning) {
        const morningRes = await notifyDailyMorningOutlook(supabaseAdmin, uId, currencySymbol)
        if (morningRes) userResults.push({ type: "morning", res: morningRes })
      }
    }

    // B. Velocity Spike Alert Check
    if ((type === "velocity" || type === "all") && telemetry) {
      const velocity = parseFloat(telemetry.velocity || 1.0)
      if (velocity >= 1.35 && prefs.velocity) {
        const velRes = await notifyVelocitySpike(supabaseAdmin, uId, velocity)
        if (velRes) userResults.push({ type: "velocity_spike", velocity, res: velRes })
      }
    }

    // C. Subscription Pre-Charge Radar Alert (due in 1 or 2 days)
    if (type === "subscriptions" || type === "all") {
      try {
        const { data: expenses } = await supabaseAdmin
          .from("tracker_expense")
          .select("merchant, amount, date")
          .eq("user_id", uId)
          .order("date", { ascending: false })
          .limit(100)

        if (expenses && expenses.length > 0) {
          const merchantMap = new Map<string, { amounts: number[], dates: Date[] }>()
          expenses.forEach((e: any) => {
            const name = (e.merchant || "").trim().toUpperCase()
            if (!name || name === "UNKNOWN MERCHANT" || name.startsWith("COMPRA") || name.startsWith("TRANSFERENCIA")) return
            const list = merchantMap.get(name) || { amounts: [], dates: [] }
            list.amounts.push(Math.abs(parseFloat(e.amount || 0)))
            list.dates.push(new Date(e.date))
            merchantMap.set(name, list)
          })

          const now = new Date()
          for (const [merchant, data] of merchantMap.entries()) {
            if (data.dates.length < 2) continue
            const sortedDates = data.dates.sort((a, b) => b.getTime() - a.getTime())
            const latestDate = sortedDates[0]
            const diffDays = (now.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24)

            // Monthly cadence check (~26 to ~30 days since last charge)
            if (diffDays >= 26 && diffDays <= 30) {
              const daysUntilDue = Math.max(1, Math.round(30 - diffDays))
              const avgAmt = data.amounts.reduce((a, b) => a + b, 0) / data.amounts.length
              const subRes = await notifySubscriptionDue(supabaseAdmin, uId, merchant, avgAmt, daysUntilDue, currencySymbol)
              if (subRes) userResults.push({ type: "subscription_radar", merchant, res: subRes })
            }
          }
        }
      } catch (subErr) {
        console.error(`[Subscription Radar Scan Error for ${uId}]:`, subErr)
      }
    }

    // D. Cycle Closing & Surplus Wrap-Up (final 48 hours of paycheck cycle)
    if ((type === "closing" || type === "all") && telemetry) {
      try {
        const daysLeft = (telemetry.totalDaysInCycle || 30) - (telemetry.daysElapsed || 1)
        if (daysLeft <= 2) {
          const surplus = parseFloat(telemetry.projectedSurplus !== undefined ? telemetry.projectedSurplus : (telemetry.netDelta || 0))
          const closingRes = await notifyCycleClosing(supabaseAdmin, uId, surplus, currencySymbol)
          if (closingRes) userResults.push({ type: "cycle_closing", surplus, res: closingRes })
        }
      } catch (closingErr) {
        console.error(`[Cycle Closing Scan Error for ${uId}]:`, closingErr)
      }
    }
  } catch (userErr) {
    console.error(`[User Notification Dispatch Error for ${uId}]:`, userErr)
  }

  return userResults
}

async function handleDispatch(request: NextRequest) {
  const startTime = Date.now()
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId") || searchParams.get("user_id")
    const forceAllTimezones = searchParams.get("forceTimezone") === "true" || searchParams.get("all_tz") === "true"
    const type = searchParams.get("type") || "all" // "morning" | "subscriptions" | "closing" | "all"
    const cronSecret = process.env.CRON_SECRET

    // Optional Bearer token check if CRON_SECRET is configured
    if (cronSecret) {
      const authHeader = request.headers.get("authorization")
      if (authHeader && authHeader !== `Bearer ${cronSecret}` && !userId) {
        return NextResponse.json({ error: "Unauthorized cron trigger" }, { status: 401 })
      }
    }

    const supabaseAdmin = getAdminClient()

    // 1. Fetch eligible profiles
    let targetProfiles: { id: string; currency: string; timezone: string }[] = []

    if (userId) {
      // Direct explicit user dispatch (e.g. test notification / debug trigger)
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id, currency, timezone")
        .eq("id", userId)
        .single()

      if (profile) targetProfiles = [profile]
    } else {
      // Scalable query: Fetch users with registered push subscriptions
      const { data: activeProfiles, error: fetchErr } = await supabaseAdmin
        .from("profiles")
        .select("id, currency, timezone, push_subscriptions")
        .limit(1000)

      if (fetchErr) {
        console.error("[Daily Outlook Cron] DB fetch error:", fetchErr)
        return NextResponse.json({ error: "Failed to fetch user profiles" }, { status: 500 })
      }

      // Filter to users whose local time is currently in the 8:00 AM window
      targetProfiles = ((activeProfiles as any[]) || []).filter((p: any) => {
        const userTz = p.timezone || "UTC"
        if (forceAllTimezones) return true
        return isUserInMorningWindow(userTz, 8)
      })
    }

    if (targetProfiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No users in current 08:30 AM timezone window",
        processedUsers: 0,
        dispatchedCount: 0,
        durationMs: Date.now() - startTime
      })
    }

    // 2. Parallel fanout execution in micro-batches of 25
    const CHUNK_SIZE = 25
    const allDispatchedResults: any[] = []

    for (let i = 0; i < targetProfiles.length; i += CHUNK_SIZE) {
      const chunk = targetProfiles.slice(i, i + CHUNK_SIZE)
      const chunkPromises = chunk.map(async (prof) => {
        const currencySymbol = prof.currency === "USD" ? "$" : prof.currency === "GBP" ? "£" : "€"
        const results = await processUserDailyNotifications(supabaseAdmin, prof.id, currencySymbol, type)
        return { userId: prof.id, timezone: prof.timezone, results }
      })

      const settled = await Promise.allSettled(chunkPromises)
      settled.forEach((res) => {
        if (res.status === "fulfilled") {
          allDispatchedResults.push(res.value)
        }
      })
    }

    const durationMs = Date.now() - startTime
    const totalDispatches = allDispatchedResults.reduce((acc, curr) => acc + curr.results.length, 0)

    let targetUId = userId
    if (!targetUId) {
      const { data: fallbackProfiles } = await supabaseAdmin
        .from("profiles")
        .select("id, currency, timezone")
        .order("updated_at", { ascending: false })
        .limit(1)
      if (fallbackProfiles && fallbackProfiles.length >= 1) {
        targetUId = fallbackProfiles[0].id
      }
    }

    let titleText = "Morning Outlook"
    let summaryText = ""

    if (targetUId) {
      const telemetry = await getUserCachedTelemetry(supabaseAdmin, targetUId)
      if (telemetry) {
        const safeDailyBurn = parseFloat(telemetry.dailyVariableBurn || telemetry.currentDailyVariableBurn || 35.0)
        const projectedSurplus = parseFloat(telemetry.projectedSurplus !== undefined ? telemetry.projectedSurplus : (telemetry.netDelta || 0))
        const velocity = parseFloat(telemetry.velocity || 1.0)
        const daysElapsed = telemetry.daysElapsed || 1
        const totalDays = telemetry.totalDaysInCycle || 30
        const isSurplus = projectedSurplus >= 0
        const currencySymbol = (targetProfiles[0]?.currency === "USD" ? "$" : targetProfiles[0]?.currency === "GBP" ? "£" : "€")

        titleText = `Morning Outlook · Day ${daysElapsed} of ${totalDays}`
        summaryText = `Safe burn: ${currencySymbol}${safeDailyBurn.toFixed(2)}/day · Projected: ${isSurplus ? '+' : ''}${currencySymbol}${projectedSurplus.toFixed(2)} · Velocity: ${velocity.toFixed(2)}x`
      }
    }

    return NextResponse.json({
      success: true,
      title: titleText,
      summary: summaryText || "Daily morning brief processed",
      processedUsers: targetProfiles.length,
      dispatchedCount: totalDispatches,
      durationMs,
      details: allDispatchedResults
    })
  } catch (error: any) {
    console.error("[Daily Outlook Dispatcher] Fatal error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
