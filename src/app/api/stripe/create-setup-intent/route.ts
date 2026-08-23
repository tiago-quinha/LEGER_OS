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
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (profileErr || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Ensure Stripe Customer exists
    let stripeCustomerId = profile.stripe_customer_id
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      })
      stripeCustomerId = customer.id

      await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", user.id)
    }

    // Create SetupIntent to manage/update payment methods natively in-app
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      automatic_payment_methods: { enabled: true },
      metadata: {
        supabase_user_id: user.id,
      },
    })

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
    })
  } catch (err: any) {
    console.error("Stripe Create SetupIntent Error:", err)
    return NextResponse.json({ error: err.message || "Failed to create setup intent" }, { status: 500 })
  }
}
