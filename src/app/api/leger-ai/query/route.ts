import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const rawApiKey = process.env.GOOGLE_GEMINI_API_KEY || "";
const cleanApiKey = rawApiKey.replace(/^\ufeff/g, "").trim();
const genAI = new GoogleGenerativeAI(cleanApiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, expenses, categories, userName } = body;

    const name = userName || "User";
    const transactionsContext = (expenses || [])
      .map((e: any) => `- Date: ${e.date}, Merchant: ${e.merchant || "Unknown"}, Amount: €${parseFloat(e.amount).toFixed(2)}, Category ID: ${e.category_id || "Unclassified"}`)
      .join("\n");

    const categoriesContext = (categories || [])
      .map((c: any) => `- ID: ${c.id}, Name: ${c.name}`)
      .join("\n");

    const prompt = `
      You are the LEGER_OS AI, a high-precision strategic wealth agent for ${name}.
      The user is asking: "${query}"

      Speak directly to the user. Be helpful, concise, and clear. 
      Analyze the current paycheck cycle's transactions provided below to answer the user's question.

      TYPOGRAPHY RULES:
      - Use Proper Sentence Case.
      - Use bold text for numbers, merchant names, or category names for emphasis.

      TRANSACTIONS DATA:
      ${transactionsContext || "No transactions registered in this cycle."}

      CATEGORIES LIST:
      ${categoriesContext || "No categories defined."}

      YOUR TASK:
      1. Provide a direct, smart, and data-backed answer to the user's question.
      2. Determine if the question implies looking at specific items (e.g., "show my supermarkets", "how much spent on lidl", "expensive things", "positive transfers").
      3. If yes, generate filter criteria matching:
         - "categoryId": numerical ID of the category matching (or null if not matching a specific category)
         - "merchant": a short case-insensitive search string for the merchant name (or null)
         - "amountMin": positive number for minimum absolute amount (or null)
         - "amountMax": positive number for maximum absolute amount (or null)
         - "type": "expense" (negative amounts) | "income" (positive amounts) | "all"

      Format your response as a JSON object:
      {
        "message": "User-facing direct answer here.",
        "filters": {
          "categoryId": number | null,
          "merchant": "string" | null,
          "amountMin": number | null,
          "amountMax": number | null,
          "type": "expense" | "income" | "all"
        }
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim().replace(/```json|```/g, "");

    try {
      return NextResponse.json(JSON.parse(text));
    } catch (parseError) {
      console.error("Leger AI Chat JSON Parse Error:", text);
      return NextResponse.json({ 
        message: `I analyzed your query but had trouble formatting the response structure. Here is my plain text assessment:\n\n${text}`, 
        filters: null 
      });
    }
  } catch (error: any) {
    console.error("Gemini/Leger Query Error:", error);
    
    if (error.status === 429 || error.message?.includes("429")) {
      return NextResponse.json({ error: "Processing limit reached. Let's try again in a few minutes." }, { status: 429 });
    }
    
    return NextResponse.json({ error: error.message || "Mainframe connection lost." }, { status: 500 });
  }
}
