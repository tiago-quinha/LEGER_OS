import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const rawApiKey = process.env.GOOGLE_GEMINI_API_KEY || "";
const cleanApiKey = rawApiKey.replace(/^\ufeff/g, "").trim();
const genAI = new GoogleGenerativeAI(cleanApiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: "No statement text provided" }, { status: 400 });
    }

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const prompt = `
You are an expert financial data extractor and bank statement parser for Leger OS.
I will provide raw text or CSV from a bank statement or credit card extract (which could be Santander, Revolut, ActivoBank, Millennium, N26, etc., in Portuguese, English, or Spanish).
Your task is to extract all individual financial transactions from this text and return them as a structured JSON object.

Return ONLY a valid JSON object with exactly this structure:
{
  "startDate": "YYYY-MM-DD",
  "startBalance": 0.0,
  "month": ${currentMonth},
  "year": ${currentYear},
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "merchant": "Cleaned Merchant Name",
      "amount": -15.50,
      "raw_text": "Original text line"
    }
  ]
}

CRITICAL PARSING RULES:
1. Extract every transaction found in the text.
2. Clean up merchant names (e.g., "COMPRA 1234 PINGO DOCE LISBOA" -> "Pingo Doce", "PAGAMENTO SERVICE UBER EATS" -> "Uber Eats").
3. Amount MUST be a number (float). Outgoing spending/expenses/purchases MUST be negative numbers (e.g., -12.50). Incoming deposits/salary/refunds MUST be positive numbers (e.g., 1500.00).
4. For date parsing: Convert all dates to YYYY-MM-DD format. If only DD-MM is present, infer the year as ${currentYear} (or ${currentYear - 1} if month is 12 and current month is 1).
5. Determine the dominant "month" (1-12) and "year" of the extract based on the transactions.
6. Strictly return ONLY valid JSON without markdown fencing, backticks, or extra commentary.
    `;

    const result = await model.generateContent([prompt, `Statement Data:\n${text.slice(0, 15000)}`]);
    const response = await result.response;
    const rawText = response.text().trim().replace(/```json|```/g, "");
    
    try {
      const parsedData = JSON.parse(rawText);
      return NextResponse.json(parsedData);
    } catch (parseError) {
      console.error("AI Parse JSON Error:", parseError, rawText);
      return NextResponse.json({ error: "AI produced invalid JSON output. Please check the extract format." }, { status: 500 });
    }
  } catch (error: any) {
    console.error("AI Parse API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to parse statement via Leger AI" }, { status: 500 });
  }
}
