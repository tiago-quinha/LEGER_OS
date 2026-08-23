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

    const supabaseAdmin = getAdminClient();

    // 1. Delete user from auth.users (which triggers cascading deletes for all user tables)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id)

    if (error) {
      console.error("Right to Erasure cascade purge failed:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: "Mainframe profile and all cascading records successfully purged." 
    })
  } catch (err: any) {
    console.error("Right to Erasure route error:", err)
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 })
  }
}
