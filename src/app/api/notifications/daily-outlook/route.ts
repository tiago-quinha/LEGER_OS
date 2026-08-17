import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { calculateServerTelemetry } from "@/lib/server-telemetry"

export const dynamic = "force-dynamic"

/**
 * WHOOP-Style High-Signal Daily Financial Outlook Notification Engine
 * Computes Morning Outlook (8:30 AM) and Evening Pace Recap (8:30 PM) telemetry.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const type = searchParams.get("type") || "morning" // "morning" | "evening" | "transaction"

    if (!userId) {
      return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ""

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Calculate live telemetry
    const telemetry = await calculateServerTelemetry(supabaseAdmin, userId)
    if (!telemetry) {
      return NextResponse.json({ error: "Unable to calculate cycle telemetry" }, { status: 404 })
    }

    const safeDailyBurn = parseFloat(telemetry.dailyVariableBurn || telemetry.currentDailyVariableBurn || 25.0)
    const projectedSurplus = parseFloat(telemetry.projectedSurplus !== undefined ? telemetry.projectedSurplus : (telemetry.netDelta || 0))
    const velocity = parseFloat(telemetry.velocity || 1.0)
    const daysElapsed = telemetry.daysElapsed || 1
    const totalDays = telemetry.totalDaysInCycle || 30

    let title = "LEGER_OS // MORNING OUTLOOK"
    let body = ""

    if (type === "morning") {
      title = "Daily Financial Outlook"
      body = `Your safe variable burn today is €${safeDailyBurn.toFixed(2)} to maintain your projected €${projectedSurplus.toFixed(2)} cycle surplus.`
    } else if (type === "evening") {
      title = "Evening Pace Recap"
      body = `Cycle Day ${daysElapsed}/${totalDays} complete. Spending velocity is at ${velocity.toFixed(2)}x. Projected cash flow: €${projectedSurplus.toFixed(2)}.`
    } else {
      title = "Transaction Logged"
      body = `Transaction verified. Remaining safe daily burn: €${safeDailyBurn.toFixed(2)}.`
    }

    return NextResponse.json({
      success: true,
      notification: {
        title,
        body,
        data: {
          safeDailyBurn,
          projectedSurplus,
          velocity,
          daysElapsed,
          totalDays,
          url: "/"
        }
      }
    })
  } catch (error: any) {
    console.error("Error generating daily outlook notification:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
