import { SupabaseClient } from "@supabase/supabase-js"
import { sendPushToUser, PushNotificationPayload } from "@/lib/web-push"
import { calculateServerTelemetry } from "@/lib/server-telemetry"
import { getCycles } from "@/lib/cycles"

// Deduplication cache key helper to prevent duplicate push spam within 18 hours
async function shouldSendAlert(supabaseAdmin: SupabaseClient, userId: string, alertKey: string): Promise<boolean> {
  try {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("metadata")
      .eq("id", userId)
      .single()

    const meta = profile?.metadata || {}
    const lastSentMap = meta.last_sent_notifications || {}
    const lastTimestamp = lastSentMap[alertKey] || 0
    const now = Date.now()

    // 18 hours cooldown per unique alert key
    if (now - lastTimestamp < 18 * 60 * 60 * 1000) {
      return false
    }

    lastSentMap[alertKey] = now
    await supabaseAdmin
      .from("profiles")
      .update({
        metadata: {
          ...meta,
          last_sent_notifications: lastSentMap
        }
      })
      .eq("id", userId)

    return true
  } catch (err) {
    console.error("[Notification Cooldown Check Error]:", err)
    return true // Default to allow if meta lookup fails
  }
}

/**
 * 1. Payday & Cycle Reset Notification
 */
export async function notifyPaydayCaptured(
  supabaseAdmin: SupabaseClient,
  userId: string,
  amount: number,
  currencySymbol: string = "€"
) {
  const alertKey = `payday_${new Date().toISOString().slice(0, 7)}`
  const allowed = await shouldSendAlert(supabaseAdmin, userId, alertKey)
  if (!allowed) return

  const telemetry = await calculateServerTelemetry(supabaseAdmin, userId)
  const safeDailyBurn = telemetry?.currentDailyVariableBurn || telemetry?.dailyVariableBurn || 45.0

  return await sendPushToUser(supabaseAdmin, userId, {
    title: `Payday Logged · Cycle Reset`,
    body: `+${currencySymbol}${Math.abs(amount).toFixed(2)} captured. New cycle initialized with ${currencySymbol}${safeDailyBurn.toFixed(2)}/day spending budget.`,
    url: `/dashboard`,
    data: {
      type: "payday",
      amount,
      safeDailyBurn
    }
  })
}

/**
 * 2. Category Budget Threshold Alert (85% & 100%)
 */
export async function notifyCategoryBudgetThreshold(
  supabaseAdmin: SupabaseClient,
  userId: string,
  categoryId: number,
  currencySymbol: string = "€"
) {
  try {
    const now = new Date()
    const month = now.getUTCMonth() + 1
    const year = now.getUTCFullYear()

    const [{ data: budget }, { data: category }, { data: expenses }] = await Promise.all([
      supabaseAdmin.from("budgets").select("amount").eq("user_id", userId).eq("category_id", categoryId).eq("month", month).eq("year", year).maybeSingle(),
      supabaseAdmin.from("categories").select("name").eq("id", categoryId).maybeSingle(),
      supabaseAdmin.from("tracker_expense").select("amount").eq("user_id", userId).eq("category_id", categoryId).gte("date", `${year}-${String(month).padStart(2, '0')}-01`)
    ])

    const budgetLimit = parseFloat(budget?.amount || 0)
    if (!budgetLimit || budgetLimit <= 0) return

    const totalSpent = (expenses || []).reduce((sum, tx) => sum + Math.abs(parseFloat(tx.amount || 0)), 0)
    const pct = Math.round((totalSpent / budgetLimit) * 100)

    if (pct < 85) return

    const catName = category?.name || "Category"
    const isOver = pct >= 100
    const alertKey = `budget_${categoryId}_${isOver ? '100' : '85'}_${year}_${month}`

    const allowed = await shouldSendAlert(supabaseAdmin, userId, alertKey)
    if (!allowed) return

    return await sendPushToUser(supabaseAdmin, userId, {
      title: isOver ? `Budget Exceeded · ${catName} at ${pct}%` : `Budget Alert · ${catName} at ${pct}%`,
      body: `${currencySymbol}${totalSpent.toFixed(2)} spent of ${currencySymbol}${budgetLimit.toFixed(2)} limit. Tap to review.`,
      url: `/budgets`,
      data: {
        type: "budget_alert",
        categoryId,
        totalSpent,
        budgetLimit,
        pct
      }
    })
  } catch (err) {
    console.error("[Budget Threshold Error]:", err)
  }
}

/**
 * 3. Subscription Pre-Charge Radar Alert (48h before due date)
 */
export async function notifySubscriptionDue(
  supabaseAdmin: SupabaseClient,
  userId: string,
  merchantName: string,
  amount: number,
  daysUntilDue: number,
  currencySymbol: string = "€"
) {
  const cleanMerchant = merchantName.toUpperCase()
  const alertKey = `sub_due_${cleanMerchant}_${new Date().toISOString().slice(0, 10)}`
  const allowed = await shouldSendAlert(supabaseAdmin, userId, alertKey)
  if (!allowed) return

  return await sendPushToUser(supabaseAdmin, userId, {
    title: `Radar Alert · ${cleanMerchant} Due in ${daysUntilDue}d`,
    body: `Upcoming charge of ${currencySymbol}${Math.abs(amount).toFixed(2)} detected on your active cycle timeline.`,
    url: `/radar`,
    data: {
      type: "subscription_radar",
      merchant: cleanMerchant,
      amount,
      daysUntilDue
    }
  })
}

/**
 * 4. Spending Velocity Spike Alert (> 1.35x normal baseline)
 */
export async function notifyVelocitySpike(
  supabaseAdmin: SupabaseClient,
  userId: string,
  velocity: number
) {
  if (velocity < 1.35) return

  const alertKey = `velocity_spike_${new Date().toISOString().slice(0, 10)}`
  const allowed = await shouldSendAlert(supabaseAdmin, userId, alertKey)
  if (!allowed) return

  const pctAbove = Math.round((velocity - 1.0) * 100)

  return await sendPushToUser(supabaseAdmin, userId, {
    title: `Velocity Alert · ${velocity.toFixed(2)}x Burn Rate`,
    body: `Current cycle spending burn rate is trending +${pctAbove}% above normal baseline.`,
    url: `/dashboard`,
    data: {
      type: "velocity_spike",
      velocity
    }
  })
}

/**
 * 5. Daily Morning Outlook Telemetry Brief
 */
export async function notifyDailyMorningOutlook(
  supabaseAdmin: SupabaseClient,
  userId: string,
  currencySymbol: string = "€"
) {
  const alertKey = `morning_outlook_${new Date().toISOString().slice(0, 10)}`
  const allowed = await shouldSendAlert(supabaseAdmin, userId, alertKey)
  if (!allowed) return

  const telemetry = await calculateServerTelemetry(supabaseAdmin, userId)
  if (!telemetry) return

  const safeDailyBurn = parseFloat(telemetry.dailyVariableBurn || telemetry.currentDailyVariableBurn || 35.0)
  const projectedSurplus = parseFloat(telemetry.projectedSurplus !== undefined ? telemetry.projectedSurplus : (telemetry.netDelta || 0))
  const velocity = parseFloat(telemetry.velocity || 1.0)
  const daysElapsed = telemetry.daysElapsed || 1
  const totalDays = telemetry.totalDaysInCycle || 30

  const isSurplus = projectedSurplus >= 0

  return await sendPushToUser(supabaseAdmin, userId, {
    title: `Morning Outlook · Day ${daysElapsed} of ${totalDays}`,
    body: `Safe daily burn: ${currencySymbol}${safeDailyBurn.toFixed(2)} · Projected: ${isSurplus ? '+' : ''}${currencySymbol}${projectedSurplus.toFixed(2)} · Velocity: ${velocity.toFixed(2)}x`,
    url: `/dashboard`,
    data: {
      type: "morning_outlook",
      safeDailyBurn,
      projectedSurplus,
      velocity
    }
  })
}

/**
 * 6. Cycle Closing / Final Surplus Report (24-48h before next payday)
 */
export async function notifyCycleClosing(
  supabaseAdmin: SupabaseClient,
  userId: string,
  projectedSurplus: number,
  currencySymbol: string = "€"
) {
  const alertKey = `cycle_closing_${new Date().toISOString().slice(0, 10)}`
  const allowed = await shouldSendAlert(supabaseAdmin, userId, alertKey)
  if (!allowed) return

  const isSurplus = projectedSurplus > 0

  return await sendPushToUser(supabaseAdmin, userId, {
    title: isSurplus ? `Cycle Closing · +${currencySymbol}${projectedSurplus.toFixed(2)} Surplus` : `Cycle Closing · Final Pace Review`,
    body: isSurplus 
      ? `You finished this cycle under budget. Tap to review savings & transfer surplus to investments.`
      : `Cycle is closing soon. Tap to review final numbers before next payday.`,
    url: `/dashboard`,
    data: {
      type: "cycle_closing",
      projectedSurplus
    }
  })
}

/**
 * 7. Portfolio Asset Surge / Drop Alert (e.g. Asset moved +/- 3.5% or more in 24h)
 */
export async function notifyAssetSurge(
  supabaseAdmin: SupabaseClient,
  userId: string,
  symbol: string,
  change24h: number,
  currentPrice: number,
  currency: string = "EUR"
) {
  if (Math.abs(change24h) < 3.5) return

  const cleanSymbol = symbol.trim().toUpperCase()
  const alertKey = `asset_move_${cleanSymbol}_${new Date().toISOString().slice(0, 10)}`
  const allowed = await shouldSendAlert(supabaseAdmin, userId, alertKey)
  if (!allowed) return

  const isGain = change24h > 0
  const currencySymbol = currency === "USD" ? "$" : currency === "GBP" ? "£" : "€"

  return await sendPushToUser(supabaseAdmin, userId, {
    title: `${cleanSymbol} ${isGain ? '+' : ''}${change24h.toFixed(1)}% · ${currencySymbol}${currentPrice.toFixed(2)}`,
    body: `${cleanSymbol} moved ${isGain ? '+' : ''}${change24h.toFixed(1)}% in the last 24h. Holdings value updated in Portfolio.`,
    url: `/portfolio`,
    data: {
      type: "asset_move",
      symbol: cleanSymbol,
      change24h,
      currentPrice
    }
  })
}

/**
 * 8. Portfolio All-Time High (ATH) Milestone Alert
 */
export async function notifyPortfolioATH(
  supabaseAdmin: SupabaseClient,
  userId: string,
  newTotalValuation: number,
  currencySymbol: string = "€"
) {
  const alertKey = `portfolio_ath_${new Date().toISOString().slice(0, 7)}`
  const allowed = await shouldSendAlert(supabaseAdmin, userId, alertKey)
  if (!allowed) return

  return await sendPushToUser(supabaseAdmin, userId, {
    title: `Portfolio Milestone · ${currencySymbol}${Math.round(newTotalValuation).toLocaleString()} ATH`,
    body: `Your total investment portfolio reached a new all-time high of ${currencySymbol}${Math.round(newTotalValuation).toLocaleString()}.`,
    url: `/portfolio`,
    data: {
      type: "portfolio_ath",
      totalValuation: newTotalValuation
    }
  })
}
