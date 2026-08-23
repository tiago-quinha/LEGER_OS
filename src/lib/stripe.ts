import Stripe from "stripe"

export const isStripeConfigured = () => {
  return !!process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith("sk_")
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
  apiVersion: "2025-03-31.basil" as any,
  appInfo: {
    name: "LEGER_OS // Personal Finance Mainframe",
    version: "0.1.0",
  },
})
