import webpush from "web-push"
import { SupabaseClient } from "@supabase/supabase-js"

// Default or environment VAPID keys
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@leger-os.com"
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BNo8Lg0hY60s_FqM193Nn7B2tq9u_9ZcQ-P5eL1H7Y8QJ0z7w9A6B5C4D3E2F1G0H_I8J7K6L5M4N3O2P1Q"
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "N1o8Lg0hY60s_FqM193Nn7B2tq9u_9ZcQ-P5eL1H7Y8"

try {
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  )
} catch (e) {
  // If invalid mock VAPID key in local dev, ignore setVapidDetails crash
}

export interface PushNotificationPayload {
  title: string
  body: string
  url?: string
  data?: {
    txId?: string | number
    amount?: number
    bankApp?: string
    [key: string]: any
  }
}

export async function sendPushToUser(
  supabaseAdmin: SupabaseClient,
  userId: string,
  payload: PushNotificationPayload
) {
  try {
    // 1. Fetch user push subscriptions from database
    const { data: subscriptions, error } = await supabaseAdmin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId)

    if (error || !subscriptions || subscriptions.length === 0) {
      // Check fallback in profiles.push_subscriptions JSONB
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("push_subscriptions")
        .eq("id", userId)
        .single()

      const profileSubs = profile?.push_subscriptions as any[] | undefined
      if (!profileSubs || profileSubs.length === 0) {
        return { success: false, reason: "No active push subscriptions found" }
      }

      return await dispatchPush(profileSubs, payload, supabaseAdmin, userId)
    }

    return await dispatchPush(subscriptions, payload, supabaseAdmin, userId)
  } catch (err: any) {
    console.error("[WebPush] Failed to send push to user:", err)
    return { success: false, error: err.message }
  }
}

async function dispatchPush(
  subscriptions: any[],
  payload: PushNotificationPayload,
  supabaseAdmin: SupabaseClient,
  userId: string
) {
  const jsonPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: "/icon-512.svg",
    url: payload.url || (payload.data?.txId ? `/?resolveTxId=${payload.data.txId}` : "/"),
    data: payload.data || {}
  })

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh || sub.keys?.p256dh,
          auth: sub.auth || sub.keys?.auth
        }
      }

      return webpush.sendNotification(pushSubscription, jsonPayload)
    })
  )

  // Clean up expired (410 Gone / 404) subscriptions
  for (let i = 0; i < results.length; i++) {
    const res = results[i]
    if (res.status === "rejected") {
      const err = res.reason
      if (err.statusCode === 410 || err.statusCode === 404) {
        const deadEndpoint = subscriptions[i].endpoint
        await supabaseAdmin
          .from("push_subscriptions")
          .delete()
          .eq("endpoint", deadEndpoint)
          .eq("user_id", userId)
      }
    }
  }

  return {
    success: true,
    dispatched: results.filter(r => r.status === "fulfilled").length,
    failed: results.filter(r => r.status === "rejected").length
  }
}
