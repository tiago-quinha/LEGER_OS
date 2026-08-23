import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { generateAIContent } from "@/lib/ai-bridge";
import { verifyAndConsumeQuota } from "@/lib/server-auth";

export async function POST(request: Request) {
  try {
    const { allowed, reason } = await verifyAndConsumeQuota(request);

    if (!allowed) {
      return NextResponse.json({ error: reason }, { status: 403 });
    }

    const { expenses, categories } = await request.json();

    if (!expenses || expenses.length === 0) {
      return NextResponse.json({ error: "No expenses provided" }, { status: 400 });
    }

    const categoryList = categories.map((c: any) => c.name).join(", ");
    const merchantData = expenses.map((e: any, i: number) => `[${i}] Merchant: ${e.merchant} | Raw: ${e.raw_text || "N/A"}`).join("\n");

    const prompt = `
      You are a high-precision financial auditor and categorization expert.
      I will provide a list of bank transactions (Merchant names and Raw transaction text) and a list of available expense categories.
      Your task is twofold for EACH transaction:
      1. Clean the merchant name into a human-readable, professional brand or company name (e.g., "POSIX/DEBIT 4920 STARBUCKS COFFEE #892" -> "Starbucks Coffee", "sogenave vendig" -> "Sogenave Vending"). Strip out random card terminal numbers, POSIX codes, location strings if redundant, and formatting junk.
      2. Assign the MOST LOGICAL expense category from the provided list.

      CRITICAL REASONING RULES:
      1. Cryptic Names: Merchant names are often truncated or misspelled (e.g., "sogenave vendig" means "Sogenave Vending", which is a vending machine -> Category: Food).
      2. Contextual Inference: If a merchant sounds like a cafe, restaurant, supermarket, or vending service, categorize as "Food".
      3. Language Awareness: Many transactions are in Portuguese or Spanish. "COMPRA" means purchase, "PAGAMENTO" means payment.
      4. Geographic Knowledge: Use your knowledge of European (especially Portuguese/Spanish) brands like Pingo Doce, Continente, Repsol, etc.
      5. Keywords: Look for "vending", "restaurante", "transporte", "clinica", "farmacia", etc.

      Available Categories: ${categoryList}

      Transactions to Categorize & Cleanse:
      ${merchantData}

      Return ONLY a JSON array of objects, where each object corresponds to transaction ID [i] in the input list and has exactly two keys: "category" (the predicted category name) and "merchant" (the cleaned merchant name).
      The length of the returned array MUST exactly match the number of transactions provided (${expenses.length}).
      
      Example Output: [
        {"category": "Food", "merchant": "Starbucks Coffee"},
        {"category": "Transport", "merchant": "Uber"},
        {"category": "Entertainment", "merchant": "Netflix"}
      ]
      Strictly follow the JSON array format. No markdown, no conversational text.
    `;

    const text = await generateAIContent(prompt, {
      provider: request.headers.get("x-ai-provider") || undefined,
      customKey: request.headers.get("x-custom-api-key") || undefined,
      jsonMode: true,
      modelType: "flash"
    });
    
    try {
        const results = JSON.parse(text);
        const predictedCategories = results.map((r: any) => typeof r === 'string' ? r : r.category);
        const cleanedMerchants = results.map((r: any) => typeof r === 'string' ? null : r.merchant);
        return NextResponse.json({ predictions: predictedCategories, cleanedMerchants });
    } catch (parseError) {
        console.error("JSON Parse Error from Gemini:", text);
        return NextResponse.json({ error: "Invalid AI response format" }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Gemini Error:", error);
    
    // Return 429 if rate limited
    if (error.status === 429 || error.message?.includes("429")) {
        return NextResponse.json({ error: "AI Quota Exceeded. Please try again later." }, { status: 429 });
    }
    
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}
