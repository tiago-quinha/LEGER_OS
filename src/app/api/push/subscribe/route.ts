import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"
import { getAdminClient } from "@/lib/supabase-admin"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { subscription } = body

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: "Invalid subscription payload" }, { status: 400 })
    }

    const supabaseAdmin = getAdminClient()

    // 1. Store in push_subscriptions table (with upsert)
    const { error: insertErr } = await supabaseAdmin
      .from("push_subscriptions")
      .upsert(
        {
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          updated_at: new Date().toISOString()
        },
        { onConflict: "endpoint" }
      )

    // 2. Also keep a copy in profiles.push_subscriptions JSONB array as fallback
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("push_subscriptions")
      .eq("id", user.id)
      .single()

    const existingSubs: any[] = Array.isArray(profile?.push_subscriptions) ? profile.push_subscriptions : []
    const updatedSubs = existingSubs.filter((s: any) => s.endpoint !== subscription.endpoint)
    updatedSubs.push({
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      updated_at: new Date().toISOString()
    })

    await supabaseAdmin
      .from("profiles")
      .update({ push_subscriptions: updatedSubs })
      .eq("id", user.id)

    return NextResponse.json({ success: true, message: "Push notification subscription saved" })
  } catch (err: any) {
    console.error("[Push Subscribe] Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { endpoint } = body

    if (!endpoint) {
      return NextResponse.json({ error: "Missing endpoint" }, { status: 400 })
    }

    const supabaseAdmin = getAdminClient()

    await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint)
      .eq("user_id", user.id)

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("push_subscriptions")
      .eq("id", user.id)
      .single()

    if (profile?.push_subscriptions && Array.isArray(profile.push_subscriptions)) {
      const filtered = profile.push_subscriptions.filter((s: any) => s.endpoint !== endpoint)
      await supabaseAdmin
        .from("profiles")
        .update({ push_subscriptions: filtered })
        .eq("id", user.id)
    }

    return NextResponse.json({ success: true, message: "Push subscription removed" })
  } catch (err: any) {
    console.error("[Push Unsubscribe] Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
