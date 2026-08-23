import { getAdminClient } from "@/lib/supabase-admin"
import { createClient as createServerClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"
import { buildSubscriptionUpdatedJournal } from "@/lib/journal-utils"

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
      // In production, direct upgrade without Stripe verification is forbidden
      if (process.env.NODE_ENV === "production" && process.env.STRIPE_SECRET_KEY) {
        return NextResponse.json(
          { error: "Direct upgrades are disabled. Please subscribe via the secure Stripe payment checkout." },
          { status: 403 }
        )
      }

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
      // In production, discount claims must process through Stripe payment intent
      if (process.env.NODE_ENV === "production" && process.env.STRIPE_SECRET_KEY) {
        return NextResponse.json(
          { error: "Promotional upgrades must be completed through the secure Stripe checkout session." },
          { status: 403 }
        )
      }

      // One-time gate: check if user has already claimed a retention discount
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("ai_journal")
        .eq("id", user.id)
        .single()

      const rawJournal = profile?.ai_journal
      if (rawJournal && typeof rawJournal === "object" && rawJournal.retention_discount_claimed_at) {
        return NextResponse.json(
          { error: "This exclusive offer has already been redeemed on your account." },
          { status: 409 }
        )
      }

      // Record the claim timestamp while preserving memories safely
      const updatedJournal = buildSubscriptionUpdatedJournal(rawJournal, {
        retention_discount_claimed_at: new Date().toISOString()
      })

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

      const rawJournal = profile?.ai_journal
      const dataRetentionDeadline = new Date()
      dataRetentionDeadline.setDate(dataRetentionDeadline.getDate() + 90)

      const updatedJournal = buildSubscriptionUpdatedJournal(rawJournal, {
        churn_survey: {
          reason: reason || "unspecified",
          feedback: feedback || "",
          cancelled_at: new Date().toISOString()
        },
        pro_data_retention_deadline: dataRetentionDeadline.toISOString()
      })

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
