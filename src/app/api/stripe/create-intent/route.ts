import { getAdminClient } from "@/lib/supabase-admin"
import { createClient as createServerClient } from "@/lib/supabase-server"
import { stripe, isStripeConfigured } from "@/lib/stripe"
import { getProPrice } from "@/lib/format"
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

    const { isDiscountClaim } = await request.json().catch(() => ({ isDiscountClaim: false }))

    const supabaseAdmin = getAdminClient()
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (profileErr || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    const userCurrency = (profile.currency || "EUR").toLowerCase()
    const proPriceObj = getProPrice(userCurrency.toUpperCase())
    const fullAmount = parseFloat(proPriceObj.amount)
    const unitAmount = Math.round((isDiscountClaim ? fullAmount / 2 : fullAmount) * 100)

    // 1. Ensure Stripe Customer exists
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

    // 2. Create PaymentIntent for in-app Stripe Elements modal (Automatic payment methods enabled)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: unitAmount,
      currency: userCurrency,
      customer: stripeCustomerId,
      automatic_payment_methods: { enabled: true },
      metadata: {
        supabase_user_id: user.id,
        is_discount_claim: isDiscountClaim ? "true" : "false",
      },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      amount: unitAmount,
      currency: userCurrency,
    })
  } catch (err: any) {
    console.error("Stripe Create Intent Error:", err)
    return NextResponse.json({ error: err.message || "Failed to create payment intent" }, { status: 500 })
  }
}
