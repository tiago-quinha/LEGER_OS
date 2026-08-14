import { getAdminClient } from "@/lib/supabase-admin"
import { NextResponse } from "next/server"
import { generateAIContent } from "@/lib/ai-bridge"

const supabaseAdmin = getAdminClient()

// Multi-lingual outflow & inflow keywords for deterministic sign detection
const OUTFLOW_KEYWORDS = [
  "saída", "saida", "débito", "debito", "compra", "pagamento", "transferência enviada", 
  "transferencia enviada", "levantamento", "spent", "debit", "withdrawal", "paid", 
  "charge", "purchase", "cargo", "salida", "gasto", "pago", "achat", "ausgabe", "zahlung"
]

const INFLOW_KEYWORDS = [
  "entrada", "crédito", "credito", "recebida", "reembolso", "depósito", "deposito", 
  "refund", "credit", "received", "salary", "payroll", "paycheck", "ingreso", 
  "nómina", "nomina", "vencimento", "ordenado", "salário", "salario"
]

export async function POST(request: Request) {
  try {
    const url = new URL(request.url)
    const queryUserId = url.searchParams.get("userId") || url.searchParams.get("user_id")
    const authHeader = request.headers.get("authorization") || request.headers.get("x-device-token")

    let body: any = {}
    const contentType = request.headers.get("content-type") || ""

    if (contentType.includes("application/json")) {
      body = await request.json().catch(() => ({}))
    } else {
      const rawText = await request.text()
      try {
        body = JSON.parse(rawText)
      } catch {
        body = { raw_text: rawText }
      }
    }

    const { 
      amount, 
      merchant, 
      source = "device-push", 
      raw_text, 
      userId: payloadUserId,
      category_id,
      bank_app,
      date: customDate
    } = body

    // 1. Resolve User ID
    let userId = queryUserId || payloadUserId

    // Check bearer token if passed as Supabase JWT
    if (!userId && authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "").trim()
      const { data: { user: authUser } } = await supabaseAdmin.auth.getUser(token)
      if (authUser) {
        userId = authUser.id
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized: Missing userId query parameter or authentication token" },
        { status: 401 }
      )
    }

    // 2. Verify Profile & Tier
    const { data: userProfile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("id, subscription_tier, currency, custom_api_key, ai_provider")
      .eq("id", userId)
      .single()

    if (profileErr || !userProfile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 })
    }

    const isPro = userProfile.subscription_tier === "PRO" || userProfile.subscription_tier === "pro"
    const hasCustomKey = Boolean(userProfile.custom_api_key)

    let finalMerchant = (merchant || "").trim()
    let finalAmountRaw = amount
    const rawTextCombined = raw_text || (body.title ? `${body.title} - ${body.text || ""}` : "")

    // 3. AI Extraction - STRICTLY EXCLUSIVE TO PRO USERS
    if ((!finalMerchant || finalAmountRaw === undefined || finalAmountRaw === null) && rawTextCombined) {
      if (!isPro) {
        return NextResponse.json(
          { 
            error: "Autonomous AI transaction extraction from push notifications is exclusive to LEGER_OS PRO subscribers. Upgrade to PRO to activate real-time AI parsing.",
            code: "PRO_REQUIRED"
          },
          { status: 403 }
        )
      }

      try {
        const aiPrompt = `
          You are the real-time bank transaction parsing engine for LEGER_OS.
          Extract the merchant name and numerical amount from this device notification / SMS text:
          "${rawTextCombined}"
          
          Format your output strictly as a JSON object:
          {
            "merchant": string, // Extract business/store/merchant/recipient name. Clean & concise. If unknown, return "Unknown Merchant".
            "amount": number // Extract transaction amount as a positive decimal (e.g. 14.50). If unknown, return null.
          }
        `
        const aiResText = await generateAIContent(aiPrompt, {
          jsonMode: true,
          modelType: "flash",
          provider: userProfile.ai_provider || undefined,
          apiKey: userProfile.custom_api_key || undefined
        })
        const parsed = JSON.parse(aiResText)
        if (!finalMerchant && parsed.merchant) {
          finalMerchant = parsed.merchant
        }
        if ((finalAmountRaw === undefined || finalAmountRaw === null) && parsed.amount !== null) {
          finalAmountRaw = parsed.amount
        }
      } catch (aiErr) {
        console.error("[Device Push] AI Extraction failed:", aiErr)
      }
    }

    if (finalAmountRaw === undefined || finalAmountRaw === null || isNaN(Number(String(finalAmountRaw).replace(',', '.')))) {
      return NextResponse.json(
        { error: "Could not extract valid transaction amount from payload", raw_text: rawTextCombined },
        { status: 400 }
      )
    }

    if (!finalMerchant) {
      finalMerchant = bank_app ? `Transaction via ${bank_app}` : "Device Ingestion"
    }

    // 4. Deterministic Sign Calculation
    let parsedAmount = parseFloat(String(finalAmountRaw).replace(',', '.'))
    const isExplicitlyNegative = parsedAmount < 0
    let finalAmount = Math.abs(parsedAmount)

    const lowerRaw = (rawTextCombined || "").toLowerCase()
    let isOutflow = false

    if (OUTFLOW_KEYWORDS.some(kw => lowerRaw.includes(kw))) {
      isOutflow = true
    }
    if (INFLOW_KEYWORDS.some(kw => lowerRaw.includes(kw))) {
      isOutflow = false
    }

    // Default to expense (outflow) unless marked as inflow or explicit positive deposit
    if (isOutflow || isExplicitlyNegative || !INFLOW_KEYWORDS.some(kw => lowerRaw.includes(kw))) {
      finalAmount = -finalAmount
    }

    // 5. Automatic Category Classification
    let resolvedCategoryId = category_id || null

    if (!resolvedCategoryId) {
      // Check user merchant rules
      const { data: rules } = await supabaseAdmin
        .from("rules")
        .select("keyword, category_id")
        .eq("user_id", userId)

      if (rules && rules.length > 0) {
        const lowerMerchant = finalMerchant.toLowerCase()
        const matched = (rules as any[]).find((r: any) => lowerMerchant.includes(r.keyword.toLowerCase()))
        if (matched) {
          resolvedCategoryId = matched.category_id
        }
      }
    }

    // Fallback: If still uncategorized, assign to general "Other" or find matching category
    if (!resolvedCategoryId) {
      const { data: categories } = await supabaseAdmin
        .from("categories")
        .select("id, name")
        .eq("user_id", userId)

      if (categories && categories.length > 0) {
        const fallbackCat = (categories as any[]).find((c: any) => 
          c.name.toLowerCase().includes("outros") || 
          c.name.toLowerCase().includes("other") || 
          c.name.toLowerCase().includes("geral") ||
          c.name.toLowerCase().includes("general")
        ) || categories[0]
        resolvedCategoryId = fallbackCat?.id || null
      }
    }

    // 6. Record Transaction to Supabase
    const txDate = customDate ? new Date(customDate).toISOString() : new Date().toISOString()
    const isIncome = finalAmount > 0

    const { data: insertedTx, error: insertErr } = await supabaseAdmin
      .from("tracker_expense")
      .insert({
        user_id: userId,
        amount: finalAmount,
        merchant: finalMerchant,
        date: txDate,
        category_id: resolvedCategoryId,
        raw_text: rawTextCombined || `Device push sync (${source})`,
        source: source
      })
      .select()
      .single()

    if (insertErr) {
      console.error("[Device Push] DB Insert Error:", insertErr)
      return NextResponse.json({ error: "Failed to persist transaction to database", details: insertErr.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Transaction logged successfully",
      transaction: insertedTx,
      meta: {
        source,
        bank_app: bank_app || "auto-detected",
        parsed_merchant: finalMerchant,
        parsed_amount: finalAmount,
        is_income: isIncome
      }
    })
  } catch (error: any) {
    console.error("[Device Push] Server Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
