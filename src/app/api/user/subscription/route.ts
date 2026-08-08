import { getAdminClient } from "@/lib/supabase-admin"
import { createClient as createServerClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabaseServer = await createServerClient()
    const { data: { user } } = await supabaseServer.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { action, reason, feedback } = await request.json()

    const supabaseAdmin = getAdminClient();

    if (action === "upgrade") {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({
          subscription_tier: "PRO",
          ai_quota_limit: 300,
          ai_quota_usage: 0
        })
        .eq("id", user.id)

      if (error) throw error

      return NextResponse.json({ success: true, message: "Welcome to LEGER_OS PRO!" })
    } else if (action === "claim_discount") {
      // One-time gate: check if user has already claimed a retention discount
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("ai_journal")
        .eq("id", user.id)
        .single()

      const journal = profile?.ai_journal || {}

      if (journal.retention_discount_claimed_at) {
        return NextResponse.json(
          { error: "This exclusive offer has already been redeemed on your account." },
          { status: 409 }
        )
      }

      // Record the claim timestamp and keep PRO active
      const updatedJournal = {
        ...journal,
        retention_discount_claimed_at: new Date().toISOString()
      }

      const { error } = await supabaseAdmin
        .from("profiles")
        .update({
          subscription_tier: "PRO",
          ai_quota_limit: 300,
          ai_quota_usage: 0,
          ai_journal: updatedJournal
        })
        .eq("id", user.id)

      if (error) throw error

      return NextResponse.json({ success: true, message: "Retention discount applied! You retain full PRO access." })
    } else if (action === "cancel") {
      // Save survey feedback and set data retention deadline (90 days)
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("ai_journal")
        .eq("id", user.id)
        .single()

      const existingJournal = profile?.ai_journal || {}
      const dataRetentionDeadline = new Date()
      dataRetentionDeadline.setDate(dataRetentionDeadline.getDate() + 90)

      const updatedJournal = {
        ...existingJournal,
        churn_survey: {
          reason: reason || "unspecified",
          feedback: feedback || "",
          cancelled_at: new Date().toISOString()
        },
        pro_data_retention_deadline: dataRetentionDeadline.toISOString()
      }

      const { error } = await supabaseAdmin
        .from("profiles")
        .update({
          subscription_tier: "FREE",
          ai_quota_limit: 50,
          ai_journal: updatedJournal
        })
        .eq("id", user.id)

      if (error) throw error

      return NextResponse.json({ success: true, message: "Returned to Core Base tier." })
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (err: any) {
    console.error("Subscription API Route Error:", err)
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}
