import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const rawApiKey = process.env.GOOGLE_GEMINI_API_KEY || "";
const cleanApiKey = rawApiKey.replace(/^\ufeff/g, "").trim();
const genAI = new GoogleGenerativeAI(cleanApiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function POST(request: Request) {
  try {
    const { expenses, categories } = await request.json();

    if (!expenses || expenses.length === 0) {
      return NextResponse.json({ error: "No expenses provided" }, { status: 400 });
    }

    const categoryList = categories.map((c: any) => c.name).join(", ");
    const merchantData = expenses.map((e: any, i: number) => `[${i}] Merchant: ${e.merchant} | Raw: ${e.raw_text || "N/A"}`).join("\n");

    const prompt = `
      You are a high-precision financial auditor and categorization expert.
      I will provide a list of bank transactions (Merchant names and Raw transaction text) and a list of available expense categories.
      Your task is to assign the MOST LOGICAL category to each transaction.

      CRITICAL REASONING RULES:
      1. Cryptic Names: Merchant names are often truncated or misspelled (e.g., "sogenave vendig" means "Sogenave Vending", which is a vending machine -> Category: Food).
      2. Contextual Inference: If a merchant sounds like a cafe, restaurant, supermarket, or vending service, categorize as "Food".
      3. Language Awareness: Many transactions are in Portuguese or Spanish. "COMPRA" means purchase, "PAGAMENTO" means payment.
      4. Geographic Knowledge: Use your knowledge of European (especially Portuguese/Spanish) brands like Pingo Doce, Continente, Repsol, etc.
      5. Keywords: Look for "vending", "restaurante", "transporte", "clinica", "farmacia", etc.

      Available Categories: ${categoryList}

      Transactions to Categorize:
      ${merchantData}

      Return ONLY a JSON array of strings, where each string is the category name corresponding to the transaction ID [i] in the input list.
      The length of the returned array MUST exactly match the number of transactions provided (${expenses.length}).
      
      Example Output: ["Food", "Transport", "Entertainment"]
      Strictly follow the JSON array format. No markdown, no conversational text.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim().replace(/```json|```/g, "");
    
    try {
        const predictedCategories = JSON.parse(text);
        return NextResponse.json({ predictions: predictedCategories });
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
