import { NextResponse } from "next/server";
import { generateAIContent } from "@/lib/ai-bridge";
import { verifyAndConsumeQuota } from "@/lib/server-auth";
import { getAdminClient } from "@/lib/supabase-admin";
import { calculateServerTelemetry } from "@/lib/server-telemetry";
import { normalizeJournal, buildUpdatedJournal } from "@/lib/journal-utils";
import { searchFinancialWeb } from "@/lib/web-search";
import { detectRecurringCadence } from "@/lib/cadence-detector";
import { LEGER_OS_KNOWLEDGE_BASE } from "@/lib/leger-os-knowledge";

export async function POST(request: Request) {
  try {
    const { allowed, reason, userId, customApiKey, aiProvider } = await verifyAndConsumeQuota(request);

    if (!allowed) {
      return NextResponse.json({ error: reason }, { status: 403 });
    }

    const supabaseAdmin = getAdminClient();
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
    let allUserCategories: any[] = [];
    let allUserBudgets: any[] = [];
    let userPortfolioAssets: any[] = [];
    let cadenceSummaryContext = "";

    if (userId) {
      try {
        const [serverDataRes, profileRes, catsRes, budgetsRes, portfolioRes, txRes] = await Promise.all([
          calculateServerTelemetry(supabaseAdmin, userId, clientDate).catch(telErr => {
            console.error("Failed to calculate server-side telemetry:", telErr);
            return null;
          }),
          supabaseAdmin.from("profiles").select("*").eq("id", userId).single(),
          supabaseAdmin.from("categories").select("*").eq("user_id", userId),
          supabaseAdmin.from("budgets").select("*").eq("user_id", userId),
          supabaseAdmin.from("portfolio_assets").select("*").eq("user_id", userId),
          supabaseAdmin.from("tracker_expense").select("id, date, merchant, amount, category_id, raw_text").eq("user_id", userId).order("date", { ascending: false }).limit(300)
        ]);

        if (telemetry && Object.keys(telemetry).length > 0) {
          finalTelemetry = telemetry;
        } else if (serverDataRes) {
          finalTelemetry = serverDataRes;
          finalCategories = serverDataRes.categoriesDetailed;
        }
        if (profileRes.data) {
          profileData = profileRes.data;
        }
        if (catsRes.data) {
          allUserCategories = catsRes.data;
        }
        if (budgetsRes.data) {
          allUserBudgets = budgetsRes.data;
        }
        if (portfolioRes.data) {
          userPortfolioAssets = portfolioRes.data;
        }

        // Run automated cadence & recurring bill detector
        if (txRes.data && txRes.data.length > 0) {
          const cadenceResult = detectRecurringCadence(txRes.data, finalTelemetry?.cycleStartDate, finalTelemetry?.cycleEndDate);
          if (cadenceResult.subscriptions.length > 0) {
            cadenceSummaryContext = `
            AUTOMATED RECURRING BILLS & CADENCE DETECTIONS:
            - Total Monthly Fixed Commitments: €${cadenceResult.totalMonthlyCommitment.toFixed(2)}/mo
            - Active Subscriptions (${cadenceResult.subscriptions.length}):
            ${cadenceResult.subscriptions.slice(0, 10).map(s => `  * ${s.merchant}: €${s.latestAmount.toFixed(2)} (${s.cadence}, next: ${s.nextExpectedDate.split('T')[0]}, status: ${s.status})`).join("\n")}
            ${cadenceResult.priceIncreases.length > 0 ? `- Price Hikes Detected:\n${cadenceResult.priceIncreases.map(p => `  * ${p.merchant}: was €${p.previousAmount.toFixed(2)} → now €${p.newAmount.toFixed(2)} (+${p.increasePercent}%)`).join("\n")}` : ""}
            `;
          }
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

    // --- STEP 1: Intent Analysis for Database Queries & Live Web Search ---
    const intentPrompt = `
      You are the intent routing node of LEGER_OS, a personal finance terminal.
      
      CURRENT DATE: ${clientDate || new Date().toISOString()}

      ${activeCycleContextForIntent}
      ${categoriesContextForIntent}
      ${historyContext}
      The user is asking: "${query}"
      
      Determine:
      1. If this query requires database records (e.g., specific transactions, merchant history, budget records, portfolio holdings).
         - DATABASE QUERY ROUTING RULES:
           * If the user asks for a "breakdown", "analysis", "audit", "comparison", "list", "where did my money go", "how much on X", "income vs expenses", or mentions specific merchants or categories:
             ALWAYS set "requiresDb": true and query "tracker_expense" for the active cycle date range (e.g. gte cycle start date) with limit 100, ordered by date descending or amount.
      2. If this query requires LIVE WEB SEARCH GROUNDING for external world context (e.g. current ECB/Euribor/Fed interest rates, inflation numbers, specific stock/crypto price news, reasons for subscription price changes, merchant invoice checks, economic policies).
      
      Format your response as a strict JSON object:
      {
        "requiresDb": boolean,
        "requiresWebSearch": boolean,
        "webSearchQuery": string | null, // e.g. "ECB current deposit interest rate 2026", "Spotify price increase Portugal", "Euribor 3-month rate"
        "dbQueries": [
          {
            "table": "tracker_expense" | "categories" | "budgets" | "income" | "account_balance" | "merchant_rules" | "portfolio_assets",
            "select": "comma,separated,columns,to,select" | "*",
            "filter": [
              {
                "column": string,
                "operator": "eq" | "ilike" | "gte" | "lte" | "is_null" | "is_not_null",
                "value": any
              }
            ] | null,
            "orderBy": {
              "column": string,
              "ascending": boolean
            } | null,
            "limit": number
          }
        ] | null
      }
    `;

    let dbQueries: any[] = [];
    let requiresDb = false;
    let requiresWebSearch = false;
    let webSearchQuery = "";

    try {
      const intentResText = await generateAIContent(intentPrompt, {
        provider: request.headers.get("x-ai-provider") || undefined,
        customKey: request.headers.get("x-custom-api-key") || undefined,
        jsonMode: true,
        modelType: "flash"
      });

      const intentRes = JSON.parse(intentResText);
      requiresDb = !!intentRes.requiresDb;
      requiresWebSearch = !!intentRes.requiresWebSearch;
      webSearchQuery = (intentRes.webSearchQuery || "").trim();
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
      portfolio_assets: ["id", "asset_name", "symbol", "asset_type", "quantity", "buy_price", "current_price", "currency", "institution", "notes", "user_id"],
      portfolio_snapshots: ["id", "snapshot_date", "total_net_worth", "liquid_cash", "invested_capital", "total_gain_loss", "asset_breakdown", "user_id"],
      profiles: ["id", "ai_journal", "subscription_tier", "ai_yap_level", "projection_overrides"]
    };

    function sanitizeDbQuery(q: any) {
      if (!q || !q.table) return null;
      const table = q.table;
      if (!TABLE_ALLOWLIST[table]) return null;

      // only allow columns that are in the allowlist, or '*' when explicitly needed
      const rawSelect = typeof q.select === "string" ? q.select : Array.isArray(q.select) ? q.select.join(",") : "*";
      const requested = rawSelect.split(",").map((s: string) => s.trim()).filter(Boolean);
      const allowedCols = TABLE_ALLOWLIST[table];
      const validCols = requested.includes("*") ? allowedCols : requested.filter((c: string) => allowedCols.includes(c));
      if (validCols.length === 0) return null;

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

      return { table, select: validCols.join(","), filter: filters, orderBy, limit };
    }

    const sanitizedQueries = (dbQueries || []).map(sanitizeDbQuery).filter(Boolean) as any[];

    // --- STEP 2: Database Retrieval ---
    let dbContextStr = "";
    if (requiresDb && sanitizedQueries.length > 0 && userId) {
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

    // --- STEP 2.5: Live Financial Web Search Grounding ---
    let webGroundingContext = "";
    let webSourcesList: any[] = [];
    if (requiresWebSearch || webSearchQuery) {
      try {
        const targetSearch = webSearchQuery || query;
        const webSearchRes = await searchFinancialWeb(targetSearch);
        if (webSearchRes.results && webSearchRes.results.length > 0) {
          webGroundingContext = webSearchRes.groundedSummary;
          webSourcesList = webSearchRes.results;
        }
      } catch (searchErr) {
        console.error("Failed to execute live web search:", searchErr);
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
      - Empirical Variable Daily Burn Rate (Filtered of 1-off anomalies & recurring bills): €${parseFloat(finalTelemetry.dailyVariableBurn !== undefined ? finalTelemetry.dailyVariableBurn : finalTelemetry.currentDailyVariableBurn || 0).toFixed(2)}/day
      - Spending daily velocity multiplier: ${parseFloat(finalTelemetry.velocity || 0).toFixed(2)}x
      - Cycle Timeline Progress: ${finalTelemetry.daysElapsed || 1} / 30 Days Elapsed
      - Budget spending limit: €${parseFloat(finalTelemetry.spendingLimit || 1500).toFixed(2)}
      - ANOMALY & RECURRING FILTERING INVARIANT: When discussing daily variable burn rate or spending pace, use the empirical variable daily burn rate (€${parseFloat(finalTelemetry.dailyVariableBurn !== undefined ? finalTelemetry.dailyVariableBurn : finalTelemetry.currentDailyVariableBurn || 0).toFixed(2)}/day), which correctly isolates 1-off anomaly transactions (e.g. annual subscriptions, hardware purchases) and fixed bills from inflating daily variable spend.

      MOST EXPENSIVE CYCLE TRANSACTIONS:
      ${topContext || "No transaction records passed."}

      RECENT CYCLE TRANSACTIONS:
      ${recentContext || "No recent transaction records passed."}
      `;
    }

    // Merge all user categories (including 0-spend categories) with assigned budget limits & spent totals
    const activeCatMap = new Map<string, any>((finalCategories || []).map((c: any) => [c.id?.toString(), c]));
    const budgetMap = new Map<string, number>((allUserBudgets || []).map((b: any) => [b.category_id?.toString(), parseFloat(b.amount || 0)]));

    const completeCategoriesList = allUserCategories.length > 0 ? allUserCategories : (finalCategories || []);

    const categoriesContext = completeCategoriesList
      .map((c: any) => {
        const catIdStr = c.id?.toString();
        const activeItem = activeCatMap.get(catIdStr);
        const spent = activeItem ? parseFloat(activeItem.value || 0) : 0;
        const limit = budgetMap.get(catIdStr) ?? (activeItem ? parseFloat(activeItem.limit || 0) : 0);
        const remaining = limit > 0 ? limit - spent : 0;
        const pctUsed = limit > 0 ? Math.round((spent / limit) * 100) : 0;

        return `- Category [ID: ${c.id}] "${c.name}": Spent so far €${spent.toFixed(2)} / Monthly Budget Limit: €${limit.toFixed(2)} (${limit > 0 ? `${pctUsed}% used, €${remaining.toFixed(2)} remaining` : 'No budget limit set'})`;
      })
      .join("\n");

    // Profile & Financial Parameters Context
    let profileParametersContext = "";
    if (profileData) {
      profileParametersContext = `
      USER PROFILE & SYSTEM CONFIGURATION:
      - Name / Handle: ${profileData.full_name || profileData.username || name}
      - Account ID: ${userId}
      - Preferred Currency: ${profileData.preferred_currency || "EUR (€)"}
      - Monthly Target Income Baseline: €${parseFloat(profileData.target_monthly_income || 0).toFixed(2)}
      - Monthly Target Spend Baseline: €${parseFloat(profileData.target_monthly_spend || 1500).toFixed(2)}
      - Subscription Tier: ${profileData.subscription_tier || "PRO"}
      - AI Engine Provider: ${profileData.ai_provider || "gemini"}
      `;
    }

    // Active Projection Overrides Context
    let overridesContext = "";
    if (profileData && profileData.projection_overrides && Array.isArray(profileData.projection_overrides) && profileData.projection_overrides.length > 0) {
      overridesContext = `
      ACTIVE PROJECTION OVERRIDES & SPENDING MULTIPLIERS:
      ${profileData.projection_overrides.map((ov: any) => {
        const multText = ov.multiplier !== undefined && ov.multiplier !== null ? `${ov.multiplier}x multiplier (${Math.round((1 - ov.multiplier) * 100)}% reduction)` : '';
        const fixedText = ov.fixedDelta !== undefined ? `Fixed Delta €${ov.fixedDelta}` : '';
        return `- Category: "${ov.categoryName || "Unknown"}" [ID: ${ov.categoryId}] | ${multText || fixedText} | Reason: "${ov.reason || "Override set"}"`;
      }).join("\n")}
      `;
    }

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
      const journalMemories = normalizeJournal(profileData.ai_journal).filter(m => m.status === "active");
      if (journalMemories.length > 0) {
        journalContext = `
        USER STATUS JOURNAL (Personal context you learned in previous chats to keep in mind):
        ${journalMemories.map(m => `- ${m.content} (Category: ${m.category})`).join("\n")}
        
        CRITICAL: Always remember these facts! If the user's query relates to their current situation (e.g. they ask about spending projections and they are currently on vacation), seamlessly incorporate this context to personalize your reply.
        `;
      }
    }

    const prompt = `
      You are the LEGER_OS AI, a high-precision strategic wealth agent for ${name}.
      
      ${historyContext}
      The user is asking: "${query}"

      Speak directly to the user. Be helpful, concise, and clear. 
      Use the provided client-computed telemetry, complete categories & budget matrix, profile configuration, and dynamic database query results below to construct a complete, accurate, data-backed response.
      CRITICAL: Do NOT hallucinate transaction items. Use the DATABASE TABLE RECORDS to list specific expenses, calculate historical sums, or answer questions about past transactions.

      CRITICAL USER-INTERFACE INVARIANT:
      - On the user's dashboard UI, the card labeled "End-of-Cycle Surplus" actually displays the "Projected End-of-Cycle Account Balance" (which is starting balance + projected net surplus).
      - E.g., If the starting balance is €174.04 and the projected cash flow surplus is €476.51, the user's dashboard card will show "€650.55" and label it "End-of-Cycle Surplus".
      - When the user asks "How much surplus am I projecting?" or questions about their projected surplus, you MUST address both to prevent confusion:
        1. Explicitly state the Projected Ending Account Balance (which is what shows up on their dashboard card labeled 'End-of-Cycle Surplus' or 'Smart Forecasting', e.g., €650.55).
        2. Explicitly state the actual Projected Net Cash Flow Surplus (excluding starting balance, e.g., €476.51), explaining that this is the net surplus generated purely within the active cycle (income minus expenses).
      This way, the user sees a 100% match with their visual dashboard while also understanding the exact mathematical cash flow breakdown.

      ${LEGER_OS_KNOWLEDGE_BASE}

      ${profileParametersContext}

      ${yapLevelInstruction}

      ${journalContext}

      ${overridesContext}

      TYPOGRAPHY & FORMATTING RULES:
      - Use Proper Sentence Case.
      - Use bold text for numbers, merchant names, or category names for emphasis.
      - Never misspelt words (e.g. use "You" instead of "Yu").
      - DIRECT NUMERICAL & APP CAPABILITY ANSWER RULE: If the user asks for a number, quantity, count, or specific figure (e.g., "how many, a number", "how many assets available"), ALWAYS answer with the exact figures immediately in the first sentence: LEGER_OS supports **10,000+ Cryptocurrencies** (via CoinGecko) and **tens of thousands of Global Equities, European ETFs, and Commodities** (via Yahoo Finance) across **4 core asset classes** (Stocks & ETFs, Crypto, Commodities, Cash & Savings), with **8 1-click quick-pick presets** in the Add Position drawer. Never dodge direct questions with generic, vague platitudes.

      CONVERSATIONAL CALIBRATION & FRAGMENT / TYPO HANDLING:
      - If the user's message is a greeting (e.g. "hi", "hello", "hey", "good morning"), an acknowledgment ("ok", "thanks", "got it", "cool"), or an incomplete fragment / typo (e.g. "rea", "asdf", "test", single random letters/words):
        1. DO NOT DUMP ALL TELEMETRY STATS, DASHBOARD DATA, OR UNPROMPTED PARAGRAPHS.
        2. Respond naturally and concisely in 1-2 short sentences:
           - For greetings: Warm, clean welcome asking how you can help with their ledger, radar, portfolio, or budgets today.
           - For typos/fragments (like "rea"): Briefly ask for clarification (e.g., "Did you mean 'recurring', 'real balance', or a specific transaction? How can I assist you with your finances?").
           - For acknowledgments: Polite brief confirmation.
        3. ONLY produce full telemetry audits, category tables, or spending forecasts when the user actually asks a financial question or requests an analysis!

      EXHAUSTIVE QUANTITATIVE BREAKDOWN & ANTI-LAZINESS INVARIANT:
      - When the user asks for a "breakdown", "analysis", "audit", "comparison", "income vs expenses", or asks where their money went:
        1. NEVER just echo the two summary numbers back with basic subtraction (e.g., "You received €643 and spent €537, leaving €105. Would you like to review top expenses?"). THAT IS LAZY AI AND STRICTLY PROHIBITED.
        2. ALWAYS provide the full, structured analytical breakdown immediately in the response:
           - Inflows / Income Section: List the specific income deposits, source names, dates, and amounts.
           - Outflows by Category: Itemize spending across all active categories in descending order of spend. For each category, include the € amount and its percentage share of total spending (e.g., "**Groceries**: €184.20 (34.3% of spend)").
           - Top Merchant Drivers: Call out the top 3-4 specific merchant expenses driving the numbers.
           - Net Cash Dynamics & Velocity: State the net cash flow, empirical variable daily burn rate (€/day), and pacing relative to spending limits.
           - Actionable Financial Diagnosis: Identify which category is over/under pacing and provide immediate tactical suggestions.
        3. Format all multi-item breakdowns with clean Markdown tables or bold bullet points.
        4. NEVER deflect with permission questions like "Would you like me to review your top expenses?" when the user just asked for a breakdown. Always deliver the full answers immediately!

      FINANCIAL DATA INTEGRITY & INTELLIGENCE INVARIANTS:
      - PAYCHECK CYCLE GROUNDING (NO CALENDAR DISORIENTATION): LEGER_OS tracks finances by paycheck cycles (from one paycheck to the next), NOT naive calendar months. When the user asks about "this month", "my spending", or "how am I doing", always anchor your analysis to the active paycheck cycle timeline (${finalTelemetry?.cycleStartDate || "Start"} → ${finalTelemetry?.cycleEndDate || "End"}, Day ${finalTelemetry?.daysElapsed || 1} of ${finalTelemetry?.totalDaysInCycle || 30}).
      - BROKER & INVESTMENT ASSET NEUTRALITY: Transfers to investment platforms, crypto exchanges, or savings accounts (e.g., XTB, DEGIRO, TRADE REPUBLIC, BINANCE, KRAKEN, REVOLUT SAVINGS) are balance-neutral asset reallocations. NEVER classify them as lifestyle spending burn or treat them as budget deficits.
      - NON-LINEAR RECENCY DECAY BURN MODEL: Never calculate future spending using naive linear multiplication (e.g., "spending €50 in 5 days means €300 in 30 days"). Always reference the system's empirical variable daily burn rate (€${parseFloat(finalTelemetry?.dailyVariableBurn !== undefined ? finalTelemetry?.dailyVariableBurn : finalTelemetry?.currentDailyVariableBurn || 0).toFixed(2)}/day), which applies exponential recency decay weighting (λ = 0.12, ~6-day half-life) and isolates fixed subscriptions and 1-off anomalies.
      - ANTI-SLOP & FACTUAL PERSONAL FINANCE STANDARD: Strictly ban patronizing life-coach platitudes (e.g., "Financial freedom is a journey", "Don't beat yourself up", "Try skipping your daily coffee"). Every insight must be grounded in hard mathematical calculations: exact velocity ratios, safe daily burn rates (€${parseFloat(finalTelemetry?.safeDailyBurn || 0).toFixed(2)}/day), and category dollar deltas.
      - STRICT RECORD CITATION (ZERO HALLUCINATION): Always cite exact dates, merchant strings, and euro amounts directly from the DATABASE TABLE RECORDS. Never fabricate hypothetical transactions.

      CONVERSATIONAL EXPENSE LOGGING INVARIANT:
      - If the user mentions spending money, buying something, or incurring an expense (e.g. "I spent 15€ at Starbucks", "paid 42.50 for fuel at BP", "bought groceries for 28€ at Aldi", "logged 12 for lunch with friends"):
        1. Acknowledge the expense naturally and concisely in your text reply (e.g., "I've drafted an entry for **€15.00** at **Starbucks** under **Dining**. Confirm below to add it to your ledger.").
        2. AT THE VERY END of your response (after all markdown text), append a single line formatted exactly as:
           [TRANSACTION_DRAFT:{"merchant":"Starbucks","amount":-15.00,"category":"Dining","categoryId":1,"date":"2026-08-17"}]
           * The amount must be a negative number for expenses (e.g. -15.00) or positive for income deposits.
           * Pick the best matching category name and categoryId from the user's available categories list above. If unknown, use "Uncategorized" with categoryId null.
           * Date format: YYYY-MM-DD (default to ${clientDate || "today"}).
      - CRITICAL: Whenever presenting multiple transactions, budget lines, income records, or category limits, you MUST format them as a Markdown Table (using standard | Column | Column | format) or a clean Bulleted List (using - Item format). Never output them as long inline paragraphs of text.

      ${cadenceSummaryContext}

      ${webGroundingContext}

      ${telemetryContext || "No summary telemetry loaded."}

      COMPLETE USER CATEGORIES & BUDGET ALLOCATION MATRIX:
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
         - "durationDays": A reasonable number of days this fact will remain active/relevant based on context.
            CRITICAL PAYCHECK CYCLE DURATION RULE:
            Current Cycle Status: Day ${finalTelemetry?.daysElapsed || 1} of ${finalTelemetry?.totalDaysInCycle || 30} Total Days (${Math.max(1, (finalTelemetry?.totalDaysInCycle || 30) - (finalTelemetry?.daysElapsed || 0))} Days Remaining in current cycle).
            If the user mentions "this cycle", "for this cycle", "until next paycheck", "the rest of the cycle", "this month's cycle", or "for the cycle", you MUST set "durationDays" to EXACTLY ${Math.max(1, (finalTelemetry?.totalDaysInCycle || 30) - (finalTelemetry?.daysElapsed || 0))}.
            Otherwise, use 7 for 1-week, 30 for 1-month, 90 for seasonal, or null for permanent long-term updates.
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
          let rawJournal = profileData?.ai_journal;
          if (!rawJournal) {
            const { data: prof } = await supabaseAdmin
              .from("profiles")
              .select("ai_journal")
              .eq("id", userId)
              .single();
            rawJournal = prof?.ai_journal;
          }
          
          const existingMemories = normalizeJournal(rawJournal);
          const content = typeof parsedRes.newJournalEntry === "string" 
            ? parsedRes.newJournalEntry.trim()
            : parsedRes.newJournalEntry.content?.trim();

          const exists = existingMemories.some((item) => item.content?.toLowerCase() === content?.toLowerCase());

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

            const updatedMemories = [newFactObj, ...existingMemories];
            const updatedJournal = buildUpdatedJournal(rawJournal, updatedMemories);
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

      return NextResponse.json({
        ...parsedRes,
        webSearched: webSourcesList.length > 0,
        webSearchQuery: webSearchQuery || null,
        webSources: webSourcesList,
      });
    } catch (parseError) {
      console.error("Leger AI Chat JSON Parse Error:", text);
      return NextResponse.json({ 
        message: `I analyzed your query but had trouble formatting the response structure. Here is my plain text assessment:\n\n${text}`, 
        filters: null 
      });
    }
  } catch (error: any) {
    console.error("Gemini/Leger Query Error:", error);
    
    const isQuota = error.status === 429 || error.message?.includes("429") || error.message?.toLowerCase()?.includes("quota") || error.message?.toLowerCase()?.includes("resource_exhausted");
    
    return NextResponse.json({ 
      error: error.message || "Mainframe query error.",
      userFriendlyMessage: isQuota
        ? "The AI assistant is temporarily experiencing high request traffic. Please try asking again in a moment."
        : "I'm currently unable to complete this analysis. Please try asking again in a moment.",
      isQuota
    }, { status: isQuota ? 429 : 500 });
  }
}
