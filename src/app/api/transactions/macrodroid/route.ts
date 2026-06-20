import { supabase } from "@/lib/supabase"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const { amount, merchant, source, raw_text } = payload

    if (!amount || !merchant) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 })
    }

    // Convert amount to absolute number first
    let finalAmount = Math.abs(parseFloat(amount.toString().replace(',', '.')))
    
    // SMART SIGN DETECTION
    // Keywords that indicate money LEAVING the account
    const outflowKeywords = ["saída", "débito", "compra", "pagamento", "transferência enviada", "levantamento"]
    // Keywords that indicate money ENTERING the account
    const inflowKeywords = ["entrada", "crédito", "recebida", "reembolso", "depósito"]

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
    if (isOutflow) {
        finalAmount = -finalAmount
    }

    const { data, error } = await supabase
      .from("tracker_expense")
      .insert({
        amount: finalAmount,
        merchant: merchant,
        source: source || "MacroDroid",
        raw_text: raw_text,
        date: new Date().toISOString()
      })
      .select()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("MacroDroid API Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
