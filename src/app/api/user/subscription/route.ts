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

    const { action, reason, feedback, discountCode } = await request.json()

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
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({
          subscription_tier: "PRO",
          ai_quota_limit: 300,
          ai_quota_usage: 0
        })
        .eq("id", user.id)

      if (error) throw error

      return NextResponse.json({ success: true, message: "Retention discount applied! You retain full PRO access at €2.49/mo." })
    } else if (action === "cancel") {
      // Save survey feedback if provided
      if (reason || feedback) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("ai_journal")
          .eq("id", user.id)
          .single()

        const existingJournal = profile?.ai_journal || {}
        const updatedJournal = {
          ...existingJournal,
          churn_survey: {
            reason: reason || "unspecified",
            feedback: feedback || "",
            cancelled_at: new Date().toISOString()
          }
        }

        await supabaseAdmin
          .from("profiles")
          .update({ ai_journal: updatedJournal })
          .eq("id", user.id)
      }

      const { error } = await supabaseAdmin
        .from("profiles")
        .update({
          subscription_tier: "FREE",
          ai_quota_limit: 50
        })
        .eq("id", user.id)

      if (error) throw error

      return NextResponse.json({ success: true, message: "Returned to Core Free Tier." })
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (err: any) {
    console.error("Subscription API Route Error:", err)
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}
