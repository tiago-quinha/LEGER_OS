import { getAdminClient } from "@/lib/supabase-admin"
import { createClient as createServerClient } from "@/lib/supabase-server"
import { stripe, isStripeConfigured } from "@/lib/stripe"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabaseServer = await createServerClient()
    const { data: { user } } = await supabaseServer.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: "Stripe API keys are not configured in environment settings." },
        { status: 400 }
      )
    }

    const supabaseAdmin = getAdminClient()
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single()

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No active Stripe customer found. Subscribe via Stripe first to manage billing." },
        { status: 400 }
      )
    }

    const origin = request.headers.get("origin") || "https://legeros.vercel.app"

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/system`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (err: any) {
    console.error("Stripe Portal Error:", err)
    return NextResponse.json({ error: err.message || "Failed to create billing portal session" }, { status: 500 })
  }
}
