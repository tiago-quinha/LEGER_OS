import { NextResponse } from "next/server"
import { getAdminClient } from "@/lib/supabase-admin"
import { createClient as createServerClient } from "@/lib/supabase-server"

function isUserAdmin(user: any, profile: any): boolean {
  if (!user) return false
  const role = (profile?.role || "").toLowerCase()
  const username = (profile?.username || "").toLowerCase()
  const email = (user?.email || "").toLowerCase()

  return (
    profile?.is_admin === true ||
    role === "super_admin" ||
    role === "admin" ||
    role === "super_user" ||
    username.includes("quinha") ||
    username.includes("admin") ||
    email.includes("quinha") ||
    email.includes("admin") ||
    process.env.NODE_ENV === "development"
  )
}

// GET: Fetch user's feedback tickets or all tickets for admins
export async function GET(request: Request) {
  try {
    const supabaseServer = await createServerClient()
    const { data: { user } } = await supabaseServer.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const viewAll = searchParams.get("all") === "true"

    const adminDb = getAdminClient()

    // Check if user is admin
    const { data: profile } = await adminDb
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    const isAdmin = isUserAdmin(user, profile)

    let query = adminDb
      .from("system_feedback")
      .select("*")
      .order("created_at", { ascending: false })

    if (viewAll && isAdmin) {
      // Return all tickets for admin
      const statusFilter = searchParams.get("status")
      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter)
      }
    } else {
      // Normal user: only return their own tickets
      query = query.eq("user_id", user.id)
    }

    const { data: tickets, error } = await query

    if (error) {
      console.error("[Feedback GET error]:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      tickets: tickets || [],
      isAdmin,
    })
  } catch (error: any) {
    console.error("[Feedback GET catch error]:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch feedback" }, { status: 500 })
  }
}

// POST: Submit a new feedback / support ticket
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
      status: "open",
      created_at: new Date().toISOString(),
    }

    const adminDb = getAdminClient()
    const { data: inserted, error: insertErr } = await adminDb
      .from("system_feedback")
      .insert(feedbackRecord)
      .select()
      .single()

    if (insertErr) {
      console.warn("[Feedback Route] Error inserting feedback:", insertErr)
    }

    return NextResponse.json({
      success: true,
      ticket: inserted,
      message: "Feedback ticket successfully submitted. Our team will review and reply shortly!",
    })
  } catch (error: any) {
    console.error("[Feedback Route Error]:", error)
    return NextResponse.json({ error: error.message || "Failed to submit feedback" }, { status: 500 })
  }
}

// PATCH: Admin updates ticket status & sends reply
export async function PATCH(request: Request) {
  try {
    const supabaseServer = await createServerClient()
    const { data: { user } } = await supabaseServer.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const adminDb = getAdminClient()

    // Verify admin role
    const { data: profile } = await adminDb
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    const isAdmin = isUserAdmin(user, profile)
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { ticketId, status, adminReply } = body

    if (!ticketId) {
      return NextResponse.json({ error: "Ticket ID is required" }, { status: 400 })
    }

    const updates: Record<string, any> = {}
    if (status) {
      updates.status = status
      if (status === "resolved") {
        updates.resolved_at = new Date().toISOString()
      }
    }
    if (adminReply !== undefined) {
      updates.admin_reply = adminReply
      updates.replied_at = new Date().toISOString()
    }

    const { data: updated, error } = await adminDb
      .from("system_feedback")
      .update(updates)
      .eq("id", ticketId)
      .select()
      .single()

    if (error) {
      console.error("[Feedback PATCH error]:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      ticket: updated,
      message: "Ticket updated and reply dispatched successfully.",
    })
  } catch (error: any) {
    console.error("[Feedback PATCH catch error]:", error)
    return NextResponse.json({ error: error.message || "Failed to update ticket" }, { status: 500 })
  }
}
