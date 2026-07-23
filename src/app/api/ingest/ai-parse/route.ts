import { NextResponse } from "next/server";
import { generateAIContent } from "@/lib/ai-bridge";
import { verifyAndConsumeQuota } from "@/lib/server-auth";

async function callAIWithRetry(
  prompt: string,
  options: { provider?: string; customKey?: string; jsonMode?: boolean; modelType?: "flash" | "pro" },
  maxRetries = 3
): Promise<string> {
  let delay = 1000;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await generateAIContent(prompt, options);
    } catch (error: any) {
      const isRateLimit = error.status === 429 || 
                          error.message?.includes("429") || 
                          error.message?.includes("exhausted") || 
                          error.message?.includes("Rate limit");
      
      if (isRateLimit && attempt < maxRetries) {
        console.warn(`[Ingest AI Parse] Rate limit hit. Retrying in ${delay}ms (Attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      throw error;
    }
  }
  throw new Error("Max retries reached");
}

export async function POST(request: Request) {
  try {
    const { allowed, reason, customApiKey, aiProvider, userId } = await verifyAndConsumeQuota(request);

    if (!allowed) {
      return NextResponse.json({ error: reason }, { status: 403 });
    }

    const { text, autoSave, source } = await request.json();

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

    const fullPrompt = `${prompt}\nStatement Data:\n${text.slice(0, 15000)}`;
    
    // Resolve AI settings: prioritize server-retrieved user profile settings, fallback to headers
    const provider = aiProvider || request.headers.get("x-ai-provider") || undefined;
    const customKey = customApiKey || request.headers.get("x-custom-api-key") || undefined;

    const rawText = await callAIWithRetry(fullPrompt, {
      provider,
      customKey,
      jsonMode: true,
      modelType: "flash"
    });
    
    try {
      const parsedData = JSON.parse(rawText);
      
      // If autoSave option is enabled, write transactions directly to the database
      if (autoSave && parsedData.transactions && parsedData.transactions.length > 0) {
        const { createClient: createSupabaseClient } = await import("@supabase/supabase-js");
        const supabaseAdmin = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Fetch user categories
        const { data: categories } = await supabaseAdmin
          .from("categories")
          .select("*")
          .or(`user_id.is.null,user_id.eq.${userId}`);

        // Fetch user merchant mapping rules
        const { data: rules } = await supabaseAdmin
          .from("merchant_rules")
          .select("*")
          .eq("user_id", userId);

        const dbTransactions = parsedData.transactions.map((tx: any) => {
          const lowerMerchant = tx.merchant.toLowerCase();
          let matchedCategoryId = null;

          // 1. Try matching custom merchant rules first
          if (rules) {
            const matchedRule = rules.find((rule: any) => 
              lowerMerchant.includes(rule.keyword.toLowerCase())
            );
            if (matchedRule) {
              matchedCategoryId = matchedRule.category_id;
            }
          }

          // 2. Fallback: Match category names directly
          if (!matchedCategoryId && categories) {
            const matchedCategory = categories.find((cat: any) => 
              lowerMerchant.includes(cat.name.toLowerCase()) || 
              cat.name.toLowerCase().includes(lowerMerchant)
            );
            if (matchedCategory) {
              matchedCategoryId = matchedCategory.id;
            }
          }

          // 3. Fallback: Basic keyword mapping
          if (!matchedCategoryId && categories) {
            const getLocalCategoryName = (merch: string) => {
              const m = merch.toLowerCase();
              if (m.includes("uber") || m.includes("bolt") || m.includes("cabify") || m.includes("taxi")) return "Transport";
              if (m.includes("pingo") || m.includes("continente") || m.includes("pingo doce") || m.includes("supermarket") || m.includes("vending") || m.includes("starbucks") || m.includes("cafe") || m.includes("restaurant") || m.includes("mcdonald")) return "Food";
              if (m.includes("netflix") || m.includes("spotify") || m.includes("disney") || m.includes("hbo") || m.includes("steam")) return "Entertainment";
              if (m.includes("rent") || m.includes("condo") || m.includes("mortgage")) return "Housing";
              if (m.includes("electricity") || m.includes("water") || m.includes("gas") || m.includes("internet")) return "Utilities";
              return null;
            };
            
            const fallbackCatName = getLocalCategoryName(tx.merchant);
            if (fallbackCatName) {
              const matchedCat = categories.find((cat: any) => cat.name.toLowerCase() === fallbackCatName.toLowerCase());
              if (matchedCat) {
                matchedCategoryId = matchedCat.id;
              }
            }
          }

          return {
            amount: String(tx.amount), // numeric is mapped to signed string/decimal
            merchant: tx.merchant,
            date: tx.date ? new Date(tx.date).toISOString() : new Date().toISOString(),
            source: source || "Android Ingest",
            raw_text: tx.raw_text || tx.merchant,
            category_id: matchedCategoryId,
            user_id: userId
          };
        });

        const { data: insertedData, error: insertError } = await supabaseAdmin
          .from("tracker_expense")
          .insert(dbTransactions)
          .select();

        if (insertError) {
          console.error("[Ingest AI Parse] Database insertion error:", insertError);
          throw new Error(`Failed to save transactions to database: ${insertError.message}`);
        }

        return NextResponse.json({
          success: true,
          saved: true,
          transactions: insertedData
        });
      }

      return NextResponse.json(parsedData);
    } catch (parseError) {
      console.error("AI Parse JSON Error:", parseError, rawText);
      return NextResponse.json({ error: "AI produced invalid JSON output. Please check the extract format." }, { status: 500 });
    }
  } catch (error: any) {
    console.error("AI Parse API Error:", error);
    
    if (error.status === 429 || error.message?.includes("429") || error.message?.includes("exhausted")) {
      return NextResponse.json({ 
        error: "AI parsing rate limit reached. Please wait a minute before retrying, or configure your own paid API key in System Settings." 
      }, { status: 429 });
    }

    return NextResponse.json({ error: error.message || "Failed to parse statement via Leger AI" }, { status: 500 });
  }
}
