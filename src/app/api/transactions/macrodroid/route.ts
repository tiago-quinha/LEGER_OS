import { getAdminClient } from "@/lib/supabase-admin";
import { NextResponse } from "next/server"
import { generateAIContent } from "@/lib/ai-bridge"
import { notifyTransactionCaptured, notifyPaydayCaptured } from "@/lib/server-notifications"
import { updateAndCacheUserTelemetry } from "@/lib/server-telemetry"

const supabaseAdmin = getAdminClient();

export async function POST(request: Request) {
  try {
    const url = new URL(request.url)
    const queryUserId = url.searchParams.get("userId")

    const payload = await request.json()
    const { amount, merchant, source, raw_text, userId: payloadUserId } = payload
    let userId = queryUserId || payloadUserId

    if (!userId) {
      const authHeader = request.headers.get("authorization")
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.replace("Bearer ", "").trim()
        const { data: { user: authUser } } = await supabaseAdmin.auth.getUser(token)
        if (authUser) {
          userId = authUser.id
        }
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized: Missing userId parameter or bearer authentication token" },
        { status: 401 }
      )
    }

    let userProfile: any = null
    const { data: prof, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("id, subscription_tier, currency")
      .eq("id", userId)
      .single()

    if (profErr || !prof) {
      return NextResponse.json(
        { error: "User profile not found or unauthorized" },
        { status: 404 }
      )
    }

    userProfile = prof

    if (prof.subscription_tier !== "PRO" && prof.subscription_tier !== "pro") {
      return NextResponse.json(
        { error: "Automated push notification ingestion is exclusive to LEGER_OS PRO nodes. Please upgrade to PRO to activate real-time phone posting." },
        { status: 403 }
      )
    }

    let finalMerchant = (merchant || "").trim()
    let finalAmountRaw = amount

    // AI Ingestion logic: parse only if fields are empty
    if ((!finalMerchant || !finalAmountRaw) && raw_text) {
      try {
        const aiPrompt = `
          You are the bank transaction parsing agent of LEGER_OS.
          Extract the merchant name and numerical amount from this push notification text: "${raw_text}"
          
          Format your output as a strict JSON object:
          {
            "merchant": string, // Extract store/merchant/recipient. Clean & short. If not found, return "Unknown Merchant".
            "amount": number // Extract transaction amount as positive float (e.g. 15.30). If not found, return null.
          }
        `
        const aiResText = await generateAIContent(aiPrompt, {
          jsonMode: true,
          modelType: "flash"
        })
        const parsed = JSON.parse(aiResText)
        if (!finalMerchant && parsed.merchant) {
          finalMerchant = parsed.merchant
        }
        if (!finalAmountRaw && parsed.amount) {
          finalAmountRaw = parsed.amount
        }
      } catch (aiErr) {
        console.error("MacroDroid AI Ingestion parsing failed:", aiErr)
      }
    }

    if (!finalAmountRaw) {
      return NextResponse.json({ error: "Missing amount data" }, { status: 400 })
    }

    if (!finalMerchant) {
      finalMerchant = "Unknown Merchant"
    }

    // Convert amount to float
    let parsedAmount = parseFloat(finalAmountRaw.toString().replace(',', '.'))
    const isExplicitlyNegative = parsedAmount < 0
    let finalAmount = Math.abs(parsedAmount)
    
    // SMART SIGN DETECTION
    // Keywords that indicate money LEAVING the account
    const outflowKeywords = ["saída", "débito", "compra", "pagamento", "transferência enviada", "levantamento", "spent", "debit", "withdrawal"]
    // Keywords that indicate money ENTERING the account
    const inflowKeywords = ["entrada", "crédito", "recebida", "reembolso", "depósito", "refund", "credit", "received"]

    const lowerRaw = (raw_text || "").toLowerCase()
    
    let isOutflow = false
    
    // Check for explicit "saída" or "débito"
    if (outflowKeywords.some(kw => lowerRaw.includes(kw))) {
        isOutflow = true
    }
    
    // Override if explicit "entrada" or "crédito" is found (safety)
    if (inflowKeywords.some(kw => lowerRaw.includes(kw))) {
        isOutflow = false
    }

    // Apply sign
    if (isOutflow || isExplicitlyNegative) {
        finalAmount = -finalAmount
    }

    const { data, error } = await supabaseAdmin
      .from("tracker_expense")
      .insert({
        amount: finalAmount,
        merchant: finalMerchant,
        source: source || "MacroDroid",
        raw_text: raw_text || null,
        date: new Date().toISOString(),
        user_id: userId || undefined
      })
      .select()
      .single()

    if (error) throw error

    // Secondary notification triggers & background telemetry caching
    if (userId && data) {
      const currencySymbol = userProfile?.currency === "USD" ? "$" : userProfile?.currency === "GBP" ? "£" : "€"
      notifyTransactionCaptured(supabaseAdmin, userId, data.id, finalAmount, finalMerchant, source || "MacroDroid", currencySymbol).catch(console.error)

      if (finalAmount > 0 && (Math.abs(finalAmount) >= 500 || finalMerchant.toLowerCase().includes("salary") || finalMerchant.toLowerCase().includes("ordenado"))) {
        notifyPaydayCaptured(supabaseAdmin, userId, finalAmount, currencySymbol).catch(console.error)
      }

      updateAndCacheUserTelemetry(supabaseAdmin, userId).catch(console.error)
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("MacroDroid API Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
