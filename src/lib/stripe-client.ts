import { loadStripe, Stripe as StripeClient } from "@stripe/stripe-js"

let stripePromise: Promise<StripeClient | null>

export function getStripe() {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "")
  }
  return stripePromise
}
