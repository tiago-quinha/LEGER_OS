import { getAdminClient } from "@/lib/supabase-admin"
import { stripe } from "@/lib/stripe"
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { buildSubscriptionUpdatedJournal } from "@/lib/journal-utils"

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  let event: Stripe.Event

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (webhookSecret && signature) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } else if (process.env.NODE_ENV !== "production") {
      // Allow unverified events ONLY in non-production local development
      event = JSON.parse(body) as Stripe.Event
    } else {
      console.error("Missing STRIPE_WEBHOOK_SECRET or stripe-signature in production")
      return NextResponse.json({ error: "Missing webhook signature or secret" }, { status: 400 })
    }
  } catch (err: any) {
    console.error(`Webhook Signature Verification Failed: ${err.message}`)
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 })
  }

  const supabaseAdmin = getAdminClient()

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.supabase_user_id
        const isDiscountClaim = session.metadata?.is_discount_claim === "true"

        if (userId) {
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("ai_journal")
            .eq("id", userId)
            .single()

          const rawJournal = profile?.ai_journal
          const metadataUpdates: Record<string, any> = {}
          if (isDiscountClaim) {
            metadataUpdates.retention_discount_claimed_at = new Date().toISOString()
          }

          const journal = buildSubscriptionUpdatedJournal(rawJournal, metadataUpdates)

          await supabaseAdmin
            .from("profiles")
            .update({
              subscription_tier: "PRO",
              ai_quota_limit: 300,
              ai_quota_usage: 0,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
              ai_journal: journal,
            })
            .eq("id", userId)
        }
        break
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const userId = paymentIntent.metadata?.supabase_user_id
        const isDiscountClaim = paymentIntent.metadata?.is_discount_claim === "true"

        if (userId) {
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("ai_journal")
            .eq("id", userId)
            .single()

          const rawJournal = profile?.ai_journal
          const metadataUpdates: Record<string, any> = {}
          if (isDiscountClaim) {
            metadataUpdates.retention_discount_claimed_at = new Date().toISOString()
          }

          const journal = buildSubscriptionUpdatedJournal(rawJournal, metadataUpdates)

          await supabaseAdmin
            .from("profiles")
            .update({
              subscription_tier: "PRO",
              ai_quota_limit: 300,
              ai_quota_usage: 0,
              stripe_customer_id: (paymentIntent.customer as string) || profile?.stripe_customer_id,
              ai_journal: journal,
            })
            .eq("id", userId)
        }
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id, ai_journal")
          .eq("stripe_customer_id", customerId)
          .single()

        if (profile) {
          const retentionDeadline = new Date()
          retentionDeadline.setDate(retentionDeadline.getDate() + 90)

          const rawJournal = profile.ai_journal
          const journal = buildSubscriptionUpdatedJournal(rawJournal, {
            pro_data_retention_deadline: retentionDeadline.toISOString()
          })

          await supabaseAdmin
            .from("profiles")
            .update({
              subscription_tier: "FREE",
              ai_quota_limit: 50,
              stripe_subscription_id: null,
              ai_journal: journal,
            })
            .eq("id", profile.id)
        }
        break
      }

      default:
        console.log(`Unhandled Stripe Webhook Event: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error("Stripe Webhook Handler Error:", err)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}
