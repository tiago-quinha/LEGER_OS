import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"
import { getAdminClient } from "@/lib/supabase-admin"
import { sendPushToUser } from "@/lib/web-push"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { title, body: msgBody, url, txId, amount } = body

    const supabaseAdmin = getAdminClient()

    const result = await sendPushToUser(supabaseAdmin, user.id, {
      title: title || "LEGER_OS // Test Alert",
      body: msgBody || "Your Web Push notification pipeline is active and verified.",
      url: url || (txId ? `/?resolveTxId=${txId}` : "/"),
      data: {
        txId,
        amount
      }
    })

    return NextResponse.json(result)
  } catch (err: any) {
    console.error("[Push Send] Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
