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

    const userCurrency = (profile.currency || "EUR").toUpperCase()
    const proPriceObj = getProPrice(userCurrency)
    const fullAmount = parseFloat(proPriceObj.amount)
    const unitAmount = Math.round((isDiscountClaim ? fullAmount / 2 : fullAmount) * 100)

    // 1. Ensure Stripe Customer exists
    let stripeCustomerId = profile.stripe_customer_id
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      })
      stripeCustomerId = customer.id

      await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", user.id)
    }

    const origin = request.headers.get("origin") || "https://leger-os.vercel.app"

    // 2. Build Stripe Checkout Session (Managed Payments automatically handles Card, PayPal, Apple Pay, Google Pay)
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      locale: "en",
      line_items: [
        {
          price_data: {
            currency: userCurrency.toLowerCase(),
            product_data: {
              name: isDiscountClaim ? "LEGER_OS PRO (50% Off Special Offer)" : "LEGER_OS PRO Membership",
              description: "Real-Time Push Sync, AI Neural Extraction & Predictive λ Cash Flow Forecasts",
              tax_code: "txcd_10103001",
            },
            unit_amount: unitAmount,
            tax_behavior: "inclusive",
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/system?payment=success`,
      cancel_url: `${origin}/system?payment=cancelled`,
      metadata: {
        supabase_user_id: user.id,
        is_discount_claim: isDiscountClaim ? "true" : "false",
      },
    })

    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (err: any) {
    console.error("Stripe Checkout Route Error:", err)
    return NextResponse.json({ error: err.message || "Failed to create checkout session" }, { status: 500 })
  }
}
