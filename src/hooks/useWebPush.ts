"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { Capacitor } from "@capacitor/core"
import { PushNotifications } from "@capacitor/push-notifications"
import { LocalNotifications } from "@capacitor/local-notifications"

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function useWebPush() {
  const [isSupported, setIsSupported] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        Boolean((window as any).Capacitor) ||
        ("serviceWorker" in navigator && "PushManager" in window)
      )
    }
    return false
  })
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [subscription, setSubscription] = useState<PushSubscription | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // 1. Check support and register Service Worker or Native Push
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      setIsSupported(true)
      PushNotifications.checkPermissions().then((status) => {
        if (status.receive === "granted") {
          setPermission("granted")
        } else if (status.receive === "denied") {
          setPermission("denied")
        } else {
          setPermission("default")
        }
      }).catch(() => {})

      // Wire tap listener to route to Transaction Resolver drawer
      LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
        const extra = action.notification.extra
        const txId = extra?.txId || "demo"
        if (typeof window !== "undefined") {
          window.location.href = `/?resolveTxId=${txId}`
        }
      }).catch(() => {})

      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        const data = action.notification.data
        const txId = data?.txId || "demo"
        if (typeof window !== "undefined") {
          window.location.href = `/?resolveTxId=${txId}`
        }
      }).catch(() => {})

      return
    }

    if (typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true)
      if (typeof Notification !== "undefined") {
        setPermission(Notification.permission)
      }

      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          return reg.pushManager.getSubscription()
        })
        .then((sub) => {
          setSubscription(sub)
        })
        .catch((err) => {
          console.error("[WebPush] SW Registration failed:", err)
        })
    }
  }, [])

  // 2. Subscribe to Web Push / Native Push
  const subscribe = useCallback(async () => {
    setIsLoading(true)
    try {
      if (Capacitor.isNativePlatform()) {
        const pushPerm = await PushNotifications.requestPermissions()
        await LocalNotifications.requestPermissions()
        
        if (pushPerm.receive === "granted") {
          setPermission("granted")
          toast.success("Native push alerts active: instant transaction prompts enabled.")
          setIsLoading(false)
          return true
        } else {
          setPermission("denied")
          toast.error("Notification permission not granted in device settings.")
          setIsLoading(false)
          return false
        }
      }

      if (!isSupported) {
        toast.error("Web Push notifications are not supported in this browser.")
        setIsLoading(false)
        return false
      }

      const reg = await navigator.serviceWorker.ready
      const perm = await Notification.requestPermission()
      setPermission(perm)

      if (perm !== "granted") {
        toast.error("Notification permission denied in browser settings.")
        setIsLoading(false)
        return false
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BNo8Lg0hY60s_FqM193Nn7B2tq9u_9ZcQ-P5eL1H7Y8QJ0z7w9A6B5C4D3E2F1G0H_I8J7K6L5M4N3O2P1Q"
      const convertedKey = urlBase64ToUint8Array(vapidPublicKey)

      const newSub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey
      })

      // Send subscription to server with detected browser timezone
      const userTimezone = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC"
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          subscription: newSub.toJSON(),
          timezone: userTimezone
        })
      })

      if (!res.ok) {
        throw new Error("Failed to persist push subscription to server")
      }

      setSubscription(newSub)
      toast.success("Push alerts active: instant transaction prompts enabled.")
      setIsLoading(false)
      return true
    } catch (err: any) {
      console.error("[WebPush] Subscribe error:", err)
      toast.error(err.message || "Failed to enable push notifications.")
      setIsLoading(false)
      return false
    }
  }, [isSupported])

  // 3. Unsubscribe
  const unsubscribe = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      setPermission("default")
      toast.info("Push alerts disabled.")
      return true
    }

    if (!subscription) return false

    setIsLoading(true)
    try {
      const endpoint = subscription.endpoint
      await subscription.unsubscribe()

      // Inform server
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint })
      })

      setSubscription(null)
      toast.success("Push notifications disabled.")
      setIsLoading(false)
      return true
    } catch (err: any) {
      console.error("[WebPush] Unsubscribe error:", err)
      toast.error("Failed to disable push notifications.")
      setIsLoading(false)
      return false
    }
  }, [subscription])

  // 4. Send Test Push Alert
  const sendTestNotification = useCallback(async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Math.floor(Math.random() * 10000),
              title: "Santander · -€14.50",
              body: "Tap to identify store & categorize.",
              extra: { txId: "demo" },
              schedule: { at: new Date(Date.now() + 500) }
            }
          ]
        })
        toast.success("Test notification dispatched to your device.")
        return
      }

      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Santander · -€14.50",
          body: "Tap to identify store & categorize.",
          amount: -14.50,
          url: "/?resolveTxId=demo"
        })
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Test notification dispatched to your device.")
      } else {
        toast.error(data.reason || data.error || "Could not dispatch test notification.")
      }
    } catch (e) {
      toast.error("Failed to trigger test notification.")
    }
  }, [])

  const isSubscribed = Boolean(subscription) || (Capacitor.isNativePlatform() && permission === "granted")

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    sendTestNotification
  }
}
