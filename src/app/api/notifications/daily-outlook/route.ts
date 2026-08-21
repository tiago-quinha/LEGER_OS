import { NextRequest, NextResponse } from "next/server"
import { getAdminClient } from "@/lib/supabase-admin"
import { calculateServerTelemetry } from "@/lib/server-telemetry"
import { 
  notifyDailyMorningOutlook, 
  notifySubscriptionDue, 
  notifyCycleClosing 
} from "@/lib/server-notifications"

export const dynamic = "force-dynamic"

/**
 * Autonomous Financial Telemetry Notification Dispatcher
 * Dispatches:
 * 1. Morning Financial Outlook (08:30 AM)
 * 2. Subscription Pre-Charge Radar Alerts (48h before due date)
 * 3. Cycle Closing & Surplus Wrap-Up Reports
 */
export async function GET(request: NextRequest) {
  return handleDispatch(request)
}

export async function POST(request: NextRequest) {
  return handleDispatch(request)
}

async function handleDispatch(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId") || searchParams.get("user_id")
    const type = searchParams.get("type") || "all" // "morning" | "subscriptions" | "closing" | "all"

    const supabaseAdmin = getAdminClient()

    // 1. Identify users to process
    let userIds: string[] = []
    if (userId) {
      userIds = [userId]
    } else {
      const { data: activeProfiles } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .limit(100)
      userIds = ((activeProfiles as any[]) || []).map((p: any) => p.id)
    }

    const results: any[] = []

    for (const uId of userIds) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("currency")
        .eq("id", uId)
        .single()

      const currencySymbol = profile?.currency === "USD" ? "$" : profile?.currency === "GBP" ? "£" : "€"

      // A. Morning Outlook Telemetry
      if (type === "morning" || type === "all") {
        const morningRes = await notifyDailyMorningOutlook(supabaseAdmin, uId, currencySymbol)
        results.push({ userId: uId, type: "morning", res: morningRes })
      }

      // B. Subscription Pre-Charge Radar Alert (due in 1 or 2 days)
      if (type === "subscriptions" || type === "all") {
        try {
          const { data: expenses } = await supabaseAdmin
            .from("tracker_expense")
            .select("merchant, amount, date")
            .eq("user_id", uId)
            .order("date", { ascending: false })
            .limit(150)

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

              // Monthly cadence check (~26 to ~32 days since last charge)
              if (diffDays >= 26 && diffDays <= 30) {
                const daysUntilDue = Math.max(1, Math.round(30 - diffDays))
                const avgAmt = data.amounts.reduce((a, b) => a + b, 0) / data.amounts.length
                const subRes = await notifySubscriptionDue(supabaseAdmin, uId, merchant, avgAmt, daysUntilDue, currencySymbol)
                results.push({ userId: uId, type: "subscription_radar", merchant, res: subRes })
              }
            }
          }
        } catch (subErr) {
          console.error(`[Subscription Radar Scan Error for ${uId}]:`, subErr)
        }
      }

      // C. Cycle Closing & Surplus Wrap-Up
      if (type === "closing" || type === "all") {
        try {
          const telemetry = await calculateServerTelemetry(supabaseAdmin, uId)
          if (telemetry) {
            const daysLeft = (telemetry.totalDaysInCycle || 30) - (telemetry.daysElapsed || 1)
            if (daysLeft <= 2) {
              const surplus = parseFloat(telemetry.projectedSurplus !== undefined ? telemetry.projectedSurplus : (telemetry.netDelta || 0))
              const closingRes = await notifyCycleClosing(supabaseAdmin, uId, surplus, currencySymbol)
              results.push({ userId: uId, type: "cycle_closing", surplus, res: closingRes })
            }
          }
        } catch (closingErr) {
          console.error(`[Cycle Closing Scan Error for ${uId}]:`, closingErr)
        }
      }
    }

    return NextResponse.json({
      success: true,
      processedUsers: userIds.length,
      dispatched: results
    })
  } catch (error: any) {
    console.error("Error in daily outlook dispatcher:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
