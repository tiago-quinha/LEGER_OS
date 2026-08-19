import { NextResponse } from "next/server"
import { getAdminClient } from "@/lib/supabase-admin"
import { createClient as createServerClient } from "@/lib/supabase-server"

export async function POST(request: Request) {
  try {
    let userId: string | null = null
    let userEmail: string | null = null

    try {
      const supabaseServer = await createServerClient()
      const { data } = await supabaseServer.auth.getUser()
      if (data?.user) {
        userId = data.user.id
        userEmail = data.user.email || null
      }
    } catch {}

    const body = await request.json().catch(() => ({}))
    const { category, message, includeTelemetry, telemetryData } = body

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    const cleanCategory = category || "General Feedback"
    const cleanMessage = message.trim()
    const userAgent = request.headers.get("user-agent") || "Unknown"

    const feedbackRecord = {
      user_id: userId,
      user_email: userEmail,
      category: cleanCategory,
      message: cleanMessage,
      include_telemetry: !!includeTelemetry,
      telemetry: includeTelemetry ? { ...telemetryData, userAgent } : { userAgent },
      created_at: new Date().toISOString(),
    }

    // Try persisting to Supabase `system_feedback` table
    const adminDb = getAdminClient()
    try {
      await adminDb.from("system_feedback").insert(feedbackRecord)
    } catch (dbErr) {
      console.warn("[Feedback Route] Could not write to system_feedback table, logging to stdout:", dbErr)
    }

    console.log("[IN_APP_FEEDBACK_RECEIVED]", {
      category: cleanCategory,
      user: userEmail || userId || "Anonymous",
      message: cleanMessage.slice(0, 300),
      timestamp: feedbackRecord.created_at,
    })

    return NextResponse.json({
      success: true,
      message: "Feedback successfully recorded. Thank you for helping refine LEGER_OS!",
    })
  } catch (error: any) {
    console.error("[Feedback Route Error]:", error)
    return NextResponse.json({ error: error.message || "Failed to submit feedback" }, { status: 500 })
  }
}
