import { NextResponse } from "next/server";
import { generateAIContent } from "@/lib/ai-bridge";
import { verifyAndConsumeQuota } from "@/lib/server-auth";
import { getAdminClient } from "@/lib/supabase-admin";
import { calculateServerTelemetry } from "@/lib/server-telemetry";

export async function POST(request: Request) {
  try {
    const { allowed, reason, userId, customApiKey, aiProvider } = await verifyAndConsumeQuota(request);

    if (!allowed) {
      return NextResponse.json({ error: reason }, { status: 403 });
    }

    const body = await request.json();
    const { query, telemetry, categories, userName, clientDate, history } = body;

    const name = userName || "User";

    let historyContext = "";
    if (history && Array.isArray(history) && history.length > 0) {
      const recentHistory = history.slice(-10);
      historyContext = "CONVERSATION HISTORY (FOR CONTEXT):\n" + recentHistory
        .map((msg: any) => `- ${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
        .join("\n") + "\n";
    }

    // --- STEP 0.5: Server-side Telemetry & Profile Context Retrieval ---
    let finalTelemetry = telemetry;
    let finalCategories = categories;
    let profileData: any = null;

    if (userId) {
      try {
        const supabaseAdmin = getAdminClient();
        const [serverDataRes, profileRes] = await Promise.all([
          calculateServerTelemetry(supabaseAdmin, userId, clientDate).catch(telErr => {
            console.error("Failed to calculate server-side telemetry:", telErr);
            return null;
          }),
          supabaseAdmin.from("profiles").select("ai_yap_level, ai_journal, subscription_tier").eq("id", userId).single()
        ]);

        if (serverDataRes) {
          finalTelemetry = serverDataRes;
          finalCategories = serverDataRes.categoriesDetailed;
        }
        if (profileRes.data) {
          profileData = profileRes.data;
        }
      } catch (err) {
        console.error("Failed to load server-side context:", err);
      }
    }

    const activeCategories = finalCategories || categories || [];
    const cycleStart = finalTelemetry?.cycleStartDate || (telemetry?.startDate) || null;
    const cycleEnd = finalTelemetry?.cycleEndDate || (telemetry?.endDate) || null;

    let categoriesContextForIntent = "";
    if (activeCategories && Array.isArray(activeCategories) && activeCategories.length > 0) {
      categoriesContextForIntent = "AVAILABLE SYSTEM CATEGORIES (Name and ID mapping):\n" + activeCategories
        .map((c: any) => `- Name: "${c.name}", ID: ${c.id}`)
        .join("\n") + "\n";
    }

    let activeCycleContextForIntent = "";
    if (cycleStart) {
      activeCycleContextForIntent = `ACTIVE PAYCHECK CYCLE DATES:
- Start Date: ${cycleStart}
- End Date: ${cycleEnd || "Present (Ongoing)"}
`;
    }

    // --- STEP 1: Intent Analysis for Database Queries ---
    const intentPrompt = `
      You are the intent routing node of LEGER_OS, a personal finance terminal.
      
      CURRENT DATE: ${clientDate || new Date().toISOString()}

      ${activeCycleContextForIntent}
      ${categoriesContextForIntent}
      ${historyContext}
      The user is asking: "${query}"
      
      Determine if this query requires retrieving database records to construct an accurate answer (e.g., historical transactions, list of categories, budgets, income logs, balance snapshots, merchant rules).
      
      CRITICAL OPTIMIZATION: If the user's question can be directly answered using the provided client-computed telemetry summary (such as total spend for a specific category, net cash flow, overall balance, daily velocity, target limits), set "requiresDb" to false. Do NOT query the database to sum up category totals if the telemetry categories array already provides the value. Only set "requiresDb" to true if the user explicitly asks to list individual transactions, search for specific merchant names, list rules, or check items outside the active cycle.
      
      When generating filters for "tracker_expense", you MUST use the correct category_id based on the AVAILABLE SYSTEM CATEGORIES provided above. If filtering by date, use the ACTIVE PAYCHECK CYCLE DATES as a reference.
      
      Format your response as a strict JSON object:
      {
        "requiresDb": boolean,
        "dbQueries": [
          {
            "table": "tracker_expense" | "categories" | "budgets" | "income" | "account_balance" | "merchant_rules",
            "select": "comma,separated,columns,to,select" | "*", // IMPORTANT: only select the specific columns needed (e.g. "date,merchant,amount") to maximize token effectiveness!
            "filter": [
              {
                "column": string,
                "operator": "eq" | "ilike" | "gte" | "lte" | "is_null" | "is_not_null",
                "value": any // (value is null for is_null and is_not_null operator types)
              }
            ] | null,
            "orderBy": {
              "column": string,
              "ascending": boolean
            } | null,
            "limit": number // default 100, max 200
          }
        ] | null
      }

      AVAILABLE TABLES & COLUMNS FOR YOUR SELECT & FILTERS:
      1. "tracker_expense" (historical transactions):
         Columns:
         - date: date (e.g. '2026-06-25')
         - merchant: string (e.g. 'Lidl')
         - amount: decimal number (expenses are negative, income is positive)
         - category_id: integer (foreign key to categories)
         - source: string (e.g. 'SANTANDER')
      2. "categories" (expense categories):
         Columns:
         - id: integer
         - name: string
         - color: string
      3. "budgets" (budget limits):
         Columns:
         - category_id: integer
         - amount: decimal number
      4. "income" (historical monthly income):
         Columns:
         - amount: decimal number
         - date: date
         - source: string
      5. "account_balance" (account balance checkpoints):
         Columns:
         - balance: decimal number
         - recorded_at: timestamp
      6. "merchant_rules" (auto-categorization rules):
         Columns:
         - keyword: string
         - category_id: integer
    `;

    let dbQueries: any[] = [];
    let requiresDb = false;

    try {
      const intentResText = await generateAIContent(intentPrompt, {
        provider: request.headers.get("x-ai-provider") || undefined,
        customKey: request.headers.get("x-custom-api-key") || undefined,
        jsonMode: true,
        modelType: "flash"
      });

      const intentRes = JSON.parse(intentResText);
      requiresDb = !!intentRes.requiresDb;
      dbQueries = intentRes.dbQueries || [];
    } catch (e) {
      console.error("Failed to parse AI intent:", e);
    }

    // Sanitize AI-proposed DB queries to an allowlist to prevent injection or expensive scans
    const TABLE_ALLOWLIST: Record<string, string[]> = {
      tracker_expense: ["date", "merchant", "amount", "category_id", "source", "user_id"],
      categories: ["id", "name", "color", "user_id"],
      budgets: ["category_id", "amount", "month", "year", "user_id"],
      income: ["amount", "date", "source", "user_id"],
      account_balance: ["balance", "recorded_at", "date", "user_id"],
      merchant_rules: ["keyword", "category_id", "user_id"],
      profiles: ["id", "ai_journal", "subscription_tier", "ai_yap_level", "projection_overrides"]
    };

    function sanitizeDbQuery(q: any) {
      if (!q || !q.table) return null;
      const table = q.table;
      if (!TABLE_ALLOWLIST[table]) return null;

      // only allow columns that are in the allowlist, or '*' when explicitly needed
      const requested = (q.select || "*").split(",").map((s: string) => s.trim()).filter(Boolean);
      const allowedCols = TABLE_ALLOWLIST[table];
      const selectCols = requested.includes("*") ? allowedCols.join(",") : requested.filter((c: string) => allowedCols.includes(c));
      if (selectCols.length === 0) return null;

      // sanitize filters: only allow simple ops
      const allowedOps = new Set(["eq", "ilike", "gte", "lte", "is_null", "is_not_null"]);
      let filters = null;
      if (Array.isArray(q.filter)) {
        filters = q.filter.map((f: any) => {
          if (!f || !f.column || !allowedCols.includes(f.column)) return null;
          if (!allowedOps.has(f.operator)) return null;
          return { column: f.column, operator: f.operator, value: f.value };
        }).filter(Boolean);
      }

      const orderBy = q.orderBy && q.orderBy.column && allowedCols.includes(q.orderBy.column) ? { column: q.orderBy.column, ascending: !!q.orderBy.ascending } : null;
      const limit = Math.min(200, Math.max(1, parseInt(q.limit) || 100));

      return { table, select: selectCols.join(","), filter: filters, orderBy, limit };
    }

    const sanitizedQueries = (dbQueries || []).map(sanitizeDbQuery).filter(Boolean) as any[];

    // --- STEP 2: Database Retrieval ---
    let dbContextStr = "";
    if (requiresDb && sanitizedQueries.length > 0 && userId) {
      const supabaseAdmin = getAdminClient();

      for (const dbQ of sanitizedQueries) {
        const table = dbQ.table;
        const selectCols = dbQ.select || "*";

        let q: any = supabaseAdmin.from(table).select(selectCols);

        // Security constraint: always enforce tenant boundaries
        if (table === "profiles") {
          q = q.eq("id", userId);
        } else {
          q = q.eq("user_id", userId);
        }

        // Apply dynamic filters (already sanitized above)
        if (dbQ.filter && Array.isArray(dbQ.filter)) {
          for (const f of dbQ.filter) {
            const col = f.column;
            const op = f.operator;
            const val = f.value;

            if (op === "eq") {
              q = q.eq(col, val);
            } else if (op === "ilike") {
              q = q.ilike(col, `%${val}%`);
            } else if (op === "gte") {
              q = q.gte(col, val);
            } else if (op === "lte") {
              q = q.lte(col, val);
            } else if (op === "is_null") {
              q = q.is(col, null);
            } else if (op === "is_not_null") {
              q = q.not(col, "is", null);
            }
          }
        }

        // Apply sorting
        if (dbQ.orderBy && dbQ.orderBy.column) {
          q = q.order(dbQ.orderBy.column, { ascending: !!dbQ.orderBy.ascending });
        }

        // Apply limit
        const limitVal = Math.min(200, dbQ.limit || 100);
        q = q.limit(limitVal);

        const { data, error } = await q;
        if (!error && data) {
          dbContextStr += `\nDATABASE TABLE: ${table.toUpperCase()} RECORDS (Selected: ${selectCols}):\n`;
          dbContextStr += data.map((row: any) => {
            const keys = Object.keys(row);
            const content = keys.map(k => {
              const val = row[k];
              if (k === "amount" || k === "balance") {
                return `${k}: €${parseFloat(val || 0).toFixed(2)}`;
              }
              if (k === "category_id") {
                const cat = (activeCategories || []).find((c: any) => c.id?.toString() === val?.toString());
                const catName = cat ? cat.name : "Unknown";
                return `${k}: ${val} (${catName})`;
              }
              return `${k}: ${val}`;
            }).join(", ");
            return `- ${content}`;
          }).join("\n");
        } else if (error) {
          console.error(`Error querying database table ${table}:`, error);
        }
      }
    }

    // --- STEP 3: Final Response Synthesis ---
    let telemetryContext = "";
    if (finalTelemetry) {
      const getCategoryName = (catId: any) => {
        if (catId === undefined || catId === null) return "Uncategorized";
        const cat = (activeCategories || []).find((c: any) => c.id?.toString() === catId.toString());
        return cat ? cat.name : "Uncategorized";
      };

      const topContext = (finalTelemetry.topExpenses || [])
        .map((e: any) => `- Date: ${e.date}, Merchant: ${e.merchant || "Unknown"}, Amount: €${parseFloat(e.amount).toFixed(2)}, Category: ${getCategoryName(e.category_id)}`)
        .join("\n");

      const recentContext = (finalTelemetry.recentExpenses || [])
        .map((e: any) => `- Date: ${e.date}, Merchant: ${e.merchant || "Unknown"}, Amount: €${parseFloat(e.amount).toFixed(2)}, Category: ${getCategoryName(e.category_id)}`)
        .join("\n");

      telemetryContext = `
      CURRENT PAYCHECK CYCLE SUMMARY TELEMETRY (Client/Server-Computed):
      - Current End Balance (Actual change including starting balance): €${parseFloat(finalTelemetry.currentBalance || 0).toFixed(2)}
      - Net Cash Flow (Delta so far): €${parseFloat(finalTelemetry.netDelta || 0).toFixed(2)} (${(finalTelemetry.netDelta || 0) >= 0 ? "SURPLUS" : "DEFICIT"})
      - Projected End-of-Cycle Cash Flow Surplus/Deficit: €${parseFloat(finalTelemetry.projectedSurplus !== undefined ? finalTelemetry.projectedSurplus : (finalTelemetry.netDelta || 0)).toFixed(2)}
      - Projected End-of-Cycle Account Balance (estimated final close balance): €${parseFloat(finalTelemetry.projectedEndBalance !== undefined ? finalTelemetry.projectedEndBalance : (finalTelemetry.currentBalance || 0)).toFixed(2)}
      - Total Inflow (Income Received): €${parseFloat(finalTelemetry.totalIn || 0).toFixed(2)}
      - Total Outflow (Expenses Paid): €${parseFloat(finalTelemetry.totalOut || 0).toFixed(2)}
      - Spending daily velocity multiplier: ${parseFloat(finalTelemetry.velocity || 0).toFixed(2)}x
      - Cycle Timeline Progress: ${finalTelemetry.daysElapsed || 1} / 30 Days Elapsed
      - Budget spending limit: €${parseFloat(finalTelemetry.spendingLimit || 1500).toFixed(2)}

      MOST EXPENSIVE CYCLE TRANSACTIONS:
      ${topContext || "No transaction records passed."}

      RECENT CYCLE TRANSACTIONS:
      ${recentContext || "No recent transaction records passed."}
      `;
    }

    const categoriesContext = (finalCategories || [])
      .map((c: any) => `- ID: ${c.id}, Name: ${c.name}, Spent so far: €${parseFloat(c.value || 0).toFixed(2)}, Limit: €${parseFloat(c.limit || 0).toFixed(2)}`)
      .join("\n");

    // Dynamic yap level instructions
    let yapLevelInstruction = "";
    if (profileData && profileData.subscription_tier === "PRO") {
      const yapLvl = profileData.ai_yap_level || "standard";
      if (yapLvl === "concise") {
        yapLevelInstruction = `
        AI VERBOSITY CONFIGURATION: [CONCISE MODE]
        - Keep your response extremely brief, concise, and direct to the point.
        - Do not yap. Limit your response to 1-2 paragraphs max, or a single table/bulleted list.
        `;
      } else if (yapLvl === "verbose") {
        yapLevelInstruction = `
        AI VERBOSITY CONFIGURATION: [VERBOSE MODE]
        - Provide a highly detailed, analytical, and thorough response.
        - Break down details fully, explain the mathematical projection formulas, and offer extensive strategic suggestions.
        - Do not hold back on details.
        `;
      } else {
        yapLevelInstruction = `
        AI VERBOSITY CONFIGURATION: [STANDARD MODE]
        - Maintain a balanced response: informative, structured, and helpful without being overly wordy or too short.
        `;
      }
    } else {
      yapLevelInstruction = `
      AI VERBOSITY CONFIGURATION: [STANDARD MODE]
      - Maintain a balanced, helpful response without being overly wordy.
      `;
    }

    // Dynamic user status journal facts injection
    let journalContext = "";
    if (profileData && profileData.ai_journal) {
      const journalArray = Array.isArray(profileData.ai_journal) ? profileData.ai_journal : [];
      if (journalArray.length > 0) {
        journalContext = `
        USER STATUS JOURNAL (Personal context you learned in previous chats to keep in mind):
        ${journalArray.map((fact: string) => `- ${fact}`).join("\n")}
        
        CRITICAL: Always remember these facts! If the user's query relates to their current situation (e.g. they ask about spending projections and they are currently on vacation), seamlessly incorporate this context to personalize your reply.
        `;
      }
    }

    const prompt = `
      You are the LEGER_OS AI, a high-precision strategic wealth agent for ${name}.
      
      ${historyContext}
      The user is asking: "${query}"

      Speak directly to the user. Be helpful, concise, and clear. 
      Use the provided client-computed telemetry, categories list, and dynamic database query results below to construct a complete, accurate, data-backed response.
      CRITICAL: Do NOT hallucinate transaction items. Use the DATABASE TABLE RECORDS to list specific expenses, calculate historical sums, or answer questions about past transactions.

      CRITICAL USER-INTERFACE INVARIANT:
      - On the user's dashboard UI, the card labeled "End-of-Cycle Surplus" actually displays the "Projected End-of-Cycle Account Balance" (which is starting balance + projected net surplus).
      - E.g., If the starting balance is €174.04 and the projected cash flow surplus is €476.51, the user's dashboard card will show "€650.55" and label it "End-of-Cycle Surplus".
      - When the user asks "How much surplus am I projecting?" or questions about their projected surplus, you MUST address both to prevent confusion:
        1. Explicitly state the Projected Ending Account Balance (which is what shows up on their dashboard card labeled 'End-of-Cycle Surplus' or 'Smart Forecasting', e.g., €650.55).
        2. Explicitly state the actual Projected Net Cash Flow Surplus (excluding starting balance, e.g., €476.51), explaining that this is the net surplus generated purely within the active cycle (income minus expenses).
      This way, the user sees a 100% match with their visual dashboard while also understanding the exact mathematical cash flow breakdown.

      ${yapLevelInstruction}

      ${journalContext}

      TYPOGRAPHY & FORMATTING RULES:
      - Use Proper Sentence Case.
      - Use bold text for numbers, merchant names, or category names for emphasis.
      - Never misspelt words (e.g. use "You" instead of "Yu").
      - CRITICAL: Whenever presenting multiple transactions, budget lines, income records, or category limits, you MUST format them as a Markdown Table (using standard | Column | Column | format) or a clean Bulleted List (using - Item format). Never output them as long inline paragraphs of text.

      ${telemetryContext || "No summary telemetry loaded."}

      CATEGORIES STATUS:
      ${categoriesContext || "No categories defined."}

      ${dbContextStr ? `DYNAMICAL DATABASE QUERY RESULTS:\n${dbContextStr}` : "No additional database records queried."}

      YOUR TASK:
      1. Provide a direct, smart, and data-backed answer to the user's question.
      2. At the end of your response, always ask a single highly targeted, strategic follow-up question (under 12 words) to help the user adjust budgets, check specific category details, or schedule limits.
      3. Suggest exactly 3 quick query replies matching this closing question. These suggested queries will be rendered as clickable chips.
      4. Determine if the question implies looking at specific items (e.g., "show my supermarkets", "how much spent on lidl", "expensive things", "positive transfers").
      5. If yes, generate filter criteria matching:
         - "categoryId": numerical ID of the category matching (or null if not matching a specific category)
         - "merchant": a short case-insensitive search string for the merchant name (or null)
         - "amountMin": positive number for minimum absolute amount (or null)
         - "amountMax": positive number for maximum absolute amount (or null)
         - "type": "expense" (negative amounts) | "income" (positive amounts) | "all"
      6. Determine if the user is instructing you to adjust or override their spending prediction for the rest of this current cycle (e.g., "I am doing hybrid work, so I'll spend 40% less on gas", "I have a vacation next week, add 200 to dining", "cut supermarket spending in half", "reset my overrides").
      7. If yes, generate an "override" object. If resetting, set { "reset": true }. Otherwise set:
         - "categoryId": numerical ID of the category being affected (or null if affecting all categories)
         - "categoryName": name of the category (e.g., "Gas / Supermarket")
         - "multiplier": positive number scaling remaining daily velocity (e.g., 0.6 for 40% reduction, 1.5 for 50% increase, 1.0 for unchanged)
         - "fixedDelta": number representing a lump sum amount to add/subtract from the remaining cycle spend (default 0)
         - "reason": a short 3-6 word summary of why (e.g., "Hybrid work gas reduction")
      8. Determine if the user's message contains a new personal fact, situation update, or lifestyle context about themselves in this message that should be remembered in future chats (e.g., "I'm currently on vacation", "I just started hybrid work", "I'm saving for a trip to Tokyo", "I got a dog", "I have a new job").
         If yes, generate a structured journal object:
         - "content": A short, concise fact string (e.g., "Currently on vacation", "Working hybrid", "Saving for a trip to Tokyo").
         - "category": One of "lifestyle" | "goal" | "health" | "financial" | "other" (choose the most logical category).
         - "durationDays": A reasonable number of days this fact will remain active/relevant based on context (e.g. 7 for a 1-week vacation, 30 for a 1-month rehab, 90 for a seasonal shift, or null if it represents a permanent or long-term lifestyle change like starting a new job, buying a dog, or buying a house). Be smart and logical!
         Otherwise, return null.

      Format your response as a JSON object:
      {
        "message": "User-facing direct answer here ending with your strategic question.",
        "suggestedQueries": ["Dynamic reply option 1", "Dynamic reply option 2", "Dynamic reply option 3"],
        "filters": {
          "categoryId": number | null,
          "merchant": "string" | null,
          "amountMin": number | null,
          "amountMax": number | null,
          "type": "expense" | "income" | "all"
        },
        "override": {
          "reset": boolean,
          "categoryId": number | null,
          "categoryName": "string" | null,
          "multiplier": number,
          "fixedDelta": number,
          "reason": "string"
        } | null,
        "newJournalEntry": {
          "content": "string",
          "category": "lifestyle" | "goal" | "health" | "financial" | "other",
          "durationDays": number | null
        } | null
      }
    `;

    const text = await generateAIContent(prompt, {
      provider: request.headers.get("x-ai-provider") || undefined,
      customKey: request.headers.get("x-custom-api-key") || undefined,
      jsonMode: true,
      modelType: "flash"
    });

    try {
      const parsedRes = JSON.parse(text);
      
      // Automatic memory journaling processing
      if (parsedRes.newJournalEntry && userId) {
        try {
          const supabaseAdmin = getAdminClient();
          
          let existingJournal: any[] = [];
          if (profileData && Array.isArray(profileData.ai_journal)) {
            existingJournal = profileData.ai_journal;
          } else {
            const { data: prof } = await supabaseAdmin
              .from("profiles")
              .select("ai_journal")
              .eq("id", userId)
              .single();
            if (prof && Array.isArray(prof.ai_journal)) {
              existingJournal = prof.ai_journal;
            }
          }
          
          const content = typeof parsedRes.newJournalEntry === "string" 
            ? parsedRes.newJournalEntry.trim()
            : parsedRes.newJournalEntry.content?.trim();

          const exists = existingJournal.some((item: any) => {
            const existingContent = typeof item === "string" ? item.trim() : item.content?.trim();
            return existingContent?.toLowerCase() === content?.toLowerCase();
          });

          if (content && !exists) {
            const durationDays = typeof parsedRes.newJournalEntry === "object" ? parsedRes.newJournalEntry.durationDays : null;
            const category = typeof parsedRes.newJournalEntry === "object" ? parsedRes.newJournalEntry.category : "other";
            
            const newFactObj = {
              id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              content,
              category: category || "other",
              createdAt: new Date().toISOString(),
              expiresAt: durationDays ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString() : null,
              status: "active"
            };

            const updatedJournal = [...existingJournal, newFactObj];
            await supabaseAdmin
              .from("profiles")
              .update({ ai_journal: updatedJournal })
              .eq("id", userId);
            console.log(`Journal updated for user ${userId}: added fact object`, newFactObj);
          }
        } catch (journalErr) {
          console.error("Failed to update user status journal in database:", journalErr);
        }
      }

      return NextResponse.json(parsedRes);
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
      return NextResponse.json({ 
        error: "Processing limit reached (Gemini 429). To bypass shared mainframe constraints, configure your own free Gemini API key in System Settings." 
      }, { status: 429 });
    }
    
    return NextResponse.json({ error: error.message || "Mainframe connection lost." }, { status: 500 });
  }
}
