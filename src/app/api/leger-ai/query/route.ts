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

    let portfolioContextForIntent = "";
    if (userPortfolioAssets && userPortfolioAssets.length > 0) {
      portfolioContextForIntent = "USER ACTIVE PORTFOLIO ASSETS (Holdings & Tickers):\n" + userPortfolioAssets
        .map((a: any) => `- ${a.symbol ? a.symbol.toUpperCase() : a.asset_name} (${a.asset_name}, Type: ${a.asset_type})`)
        .join("\n") + "\n";
    }

    // --- STEP 1: Intent Analysis for Database Queries & Live Web Search ---
    const intentPrompt = `
      You are the intent routing node of LEGER_OS, a personal finance terminal.
      
      CURRENT DATE: ${clientDate || new Date().toISOString()}

      ${activeCycleContextForIntent}
      ${categoriesContextForIntent}
      ${portfolioContextForIntent}
      ${historyContext}
      The user is asking: "${query}"
      
      Determine:
      1. If this query requires database records (e.g., specific transactions, merchant history, budget records, portfolio holdings).
         - DATABASE QUERY ROUTING RULES:
           * If the user asks for a "breakdown", "analysis", "audit", "comparison", "list", "where did my money go", "how much on X", "income vs expenses", or mentions specific merchants or categories:
             ALWAYS set "requiresDb": true and query "tracker_expense" for the active cycle date range (e.g. gte cycle start date) with limit 100, ordered by date descending or amount.
      2. If this query requires LIVE WEB SEARCH GROUNDING for external world context:
         - PROACTIVE ASSET & PORTFOLIO SEARCH RULE:
           * If the user asks to "analyze", "review", "check", "outlook", "promising", "is it good", "earnings", or assess the performance/future of their portfolio or specific stock/crypto holdings:
             ALWAYS set "requiresWebSearch": true and craft a specific, ticker-targeted search query using their actual portfolio tickers (e.g. "PLTR ALAB NET IOT NBIS stock news earnings outlook" or specific ticker catalysts). NEVER use vague queries like "current market news".
         - Also trigger for: current ECB/Euribor/Fed interest rates, inflation figures, subscription price changes, merchant inquiries, or macroeconomic trends.
      
      Format your response as a strict JSON object:
      {
        "requiresDb": boolean,
        "requiresWebSearch": boolean,
        "webSearchQuery": string | null, // e.g. "PLTR ALAB NET stock news outlook 2026", "ECB current deposit interest rate", "Spotify price increase Portugal"
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

    // Pre-computed portfolio context (prevents AI from misinterpreting raw per-unit buy_price columns)
    let portfolioContext = "";
    if (userPortfolioAssets && userPortfolioAssets.length > 0) {
      let totalInvested = 0;
      let totalCurrentVal = 0;
      const assetLines = userPortfolioAssets.map((a: any) => {
        const qty = parseFloat(a.quantity) || 0;
        const buyPrice = parseFloat(a.buy_price) || 0;
        const currentPrice = parseFloat(a.current_price) || buyPrice;
        const invested = qty * buyPrice;
        const currentVal = qty * currentPrice;
        const gainLoss = currentVal - invested;
        totalInvested += invested;
        totalCurrentVal += currentVal;
        return `- ${a.symbol?.toUpperCase() || a.asset_name} (${a.asset_type}): ${qty.toFixed(6)} units × Buy €${buyPrice.toFixed(2)} = Invested €${invested.toFixed(2)} | Current Price €${currentPrice.toFixed(2)} → Value €${currentVal.toFixed(2)} | P&L ${gainLoss >= 0 ? "+" : ""}€${gainLoss.toFixed(2)}`;
      });
      const totalGainLoss = totalCurrentVal - totalInvested;
      portfolioContext = `
      INVESTMENT PORTFOLIO HOLDINGS (Pre-Computed):
      ${assetLines.join("\n")}
      ---
      TOTAL INVESTED CAPITAL: €${totalInvested.toFixed(2)}
      TOTAL CURRENT VALUATION: €${totalCurrentVal.toFixed(2)}
      TOTAL PORTFOLIO P&L: ${totalGainLoss >= 0 ? "+" : ""}€${totalGainLoss.toFixed(2)} (${totalInvested > 0 ? ((totalGainLoss / totalInvested) * 100).toFixed(1) : "0.0"}%)
      NUMBER OF POSITIONS: ${userPortfolioAssets.length}
      CRITICAL: The "buy_price" column in portfolio_assets stores the PER-UNIT purchase price, NOT the total invested amount. Total invested for each asset = quantity × buy_price. Never sum raw buy_price values directly.
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
      You are LEGER_OS AI, the private financial intelligence engine and full-spectrum CFO for ${name}.
      
      ${historyContext}
      The user is asking: "${query}"

      COGNITIVE PERSONA & CONVERSATIONAL PHILOSOPHY:
      - You are LEGER_OS AI: an elite, razor-sharp private CFO, senior quantitative analyst, and high-precision financial engineer.
      - NEVER sound like a generic customer service chatbot, a lazy corporate assistant, or a superficial summarizer.
      - STRICT ANTI-LAZINESS & ANTI-DEFLECTION INVARIANT:
        * NEVER output generic 2-paragraph summaries with lazy follow-up questions asking if the user wants details later (e.g., NEVER say "Would you like me to analyze specific sectors or holdings?").
        * ALWAYS DELIVER THE FULL, EXHAUSTIVE, DETAILED BREAKDOWN UPFRONT.
        * NO MACROECONOMIC FILLER FLUFF: NEVER waste words with generic boilerplate openers like "Scanning live financial markets...", "Global equities remain on an upward path...", or "Navigating lingering inflation anchors...". Get straight to the user's real numbers, holdings, and metrics immediately.
        * BE EXHAUSTIVE & COMPLETE: Provide exact numbers, calculations, percentages, risk matrices, and actionable conclusions directly. Show the math.

      MANDATORY DOMAIN AUDIT PROTOCOLS:
      1. PORTFOLIO & INVESTMENT ASSET INQUIRIES (When user asks to analyze, review, or assess their portfolio, stocks, or crypto):
         - You MUST provide a structured, high-density analysis containing:
           a) **Holdings & Allocation Matrix** (Formatted Markdown Table):
              | Ticker | Asset Name | Type | Qty | Invested Basis (€) | Current Value (€) | P&L (€ / %) | Weight (%) |
              Include ALL holdings individually, followed by portfolio summary totals.
              CRITICAL: The "Invested Basis (€)" column MUST be the total amount invested in that position (Quantity × Buy Price, e.g. €9.97 for NBIS, €10.00 for GOOGL, totaling €50.00), NEVER the raw per-share share price (e.g. €240.24).
           b) **Thematic & Sector Exposure Audit**:
              Break down the capital distribution across sub-sectors (e.g. Enterprise AI, Cloud Infra, Big Tech, Crypto, Fixed Income). Explicitly call out concentration risk (e.g., if 100% of holdings are high-beta tech/AI).
           c) **Holding-by-Holding Intelligence & Catalysts**:
              A substantive, 1-2 sentence analysis for EACH individual ticker covering fundamental drivers, valuation risks, or recent catalysts from the live search data.
           d) **Portfolio-to-Cash Risk & Liquidity Alignment**:
              Compare total invested capital (€) against available liquid cash in the active paycheck cycle, DCA pacing, and actionable risk management takeaways.

      2. SPENDING, LEDGER & CYCLE AUDITS (When user asks about spending, budget status, or where money went):
         - You MUST provide:
           a) **Cash Flow Metrics**: Inflows (€) vs Outflows (€), Net Surplus/Deficit (€), Empirical Variable Daily Burn (€/day), Velocity Multiplier.
           b) **Category Variance Matrix** (Table): Category Name, Spent (€), Budget Limit (€), % Utilized, Variance (€ Over/Under).
           c) **Merchant Leaks & Habit Anomaly Audit**: Highlight the top spending drains, unexpected spikes, or unbudgeted recurring habits.
           d) **Closing Balance Projection**: State exact projected close position based on recency decay.

      3. SUBSCRIPTIONS & RECURRING EXPENSES (When user asks about subscriptions, bills, or price hikes):
         - Break down active monthly vs annual commitments, annualized cost drain, and detect any pricing increases.

      CRITICAL USER-INTERFACE & FORECAST ALIGNMENT INVARIANT:
      - The user's visual Dashboard displays two key cards:
        1. "ACTIVE CYCLE" card: Shows Inflow (€${parseFloat(finalTelemetry?.totalIn || 0).toFixed(2)}), Outflow (€${parseFloat(finalTelemetry?.totalOut || 0).toFixed(2)}), and Current Status (+€${parseFloat(finalTelemetry?.netDelta || 0).toFixed(2)} SURPLUS). Never contradict this: inflows exceed outflows in the active cycle.
        2. "CYCLE FORECAST" card: Shows "Projected Surplus" = €${parseFloat(finalTelemetry?.projectedEndBalance !== undefined ? finalTelemetry.projectedEndBalance : (finalTelemetry?.currentBalance || 0)).toFixed(2)} Est. (which is the estimated final bank closing position before cycle close based on spending velocity decay).
      - Whenever the user asks to simulate, project, or check their cycle forecast or surplus:
        * ALWAYS lead with the exact Cycle Forecast number shown on their visual card: €${parseFloat(finalTelemetry?.projectedEndBalance !== undefined ? finalTelemetry.projectedEndBalance : (finalTelemetry?.currentBalance || 0)).toFixed(2)}.
        * State the active cycle metrics accurately: Inflows €${parseFloat(finalTelemetry?.totalIn || 0).toFixed(2)} vs Outflows €${parseFloat(finalTelemetry?.totalOut || 0).toFixed(2)} (Net Surplus so far: +€${parseFloat(finalTelemetry?.netDelta || 0).toFixed(2)}).
        * Explain clearly that the €${parseFloat(finalTelemetry?.projectedEndBalance !== undefined ? finalTelemetry.projectedEndBalance : (finalTelemetry?.currentBalance || 0)).toFixed(2)} forecast represents their projected bank balance at the end of the cycle under current spending decay. Never invent conflicting negative numbers or claim outflows exceed inflows when inflows are higher.

      ${LEGER_OS_KNOWLEDGE_BASE}

      ${profileParametersContext}

      ${yapLevelInstruction}

      ${journalContext}

      ${overridesContext}

      TYPOGRAPHY & FORMATTING RULES:
      - Use clean, professional typography and natural Markdown formatting (bolding key metrics, clean markdown tables with aligned columns).
      - If asked a direct numerical question (e.g., "how many assets", "how much spent"), provide the exact number immediately in the first sentence.
      - Structure complex audits with clean, bolded section headers (e.g. "### Position Matrix", "### Sector Concentration & Risk", "### Holding-by-Holding Outlook", "### Strategic Summary").

      FINANCIAL DATA INTEGRITY & INTELLIGENCE INVARIANTS:
      - PAYCHECK CYCLE GROUNDING: LEGER_OS tracks finances by paycheck cycles (${finalTelemetry?.cycleStartDate || "Start"} to ${finalTelemetry?.cycleEndDate || "End"}, Day ${finalTelemetry?.daysElapsed || 1} of ${finalTelemetry?.totalDaysInCycle || 30}), not calendar months.
      - BROKER & INVESTMENT ASSET NEUTRALITY: Brokerage transfers (XTB, DEGIRO, TRADE REPUBLIC, BINANCE, KRAKEN) are asset reallocations, never lifestyle spending.
      - PORTFOLIO HOLDINGS & INVESTED BASIS INVARIANT: For portfolio data, use the pre-computed figures in "INVESTMENT PORTFOLIO HOLDINGS". Total invested is always (quantity * buy_price) (e.g. €50.00 total for fractional shares), never the sum of raw per-unit share prices.
      - RECENCY DECAY BURN MODEL: variable burn rate (€${parseFloat(finalTelemetry?.dailyVariableBurn !== undefined ? finalTelemetry?.dailyVariableBurn : finalTelemetry?.currentDailyVariableBurn || 0).toFixed(2)}/day) uses exponential recency decay (λ = 0.12).
      - ZERO HALLUCINATIONS: Always cite exact figures from the real database records and context provided.

      CONVERSATIONAL EXPENSE LOGGING:
      - If the user explicitly mentions spending money or logging an expense:
        1. Acknowledge the entry concisely in text.
        2. Append at the very end of your response:
           [TRANSACTION_DRAFT:{"merchant":"Name","amount":-15.00,"category":"Dining","categoryId":1,"date":"YYYY-MM-DD"}]

      ${cadenceSummaryContext}

      ${webGroundingContext}

      ${telemetryContext || "No summary telemetry loaded."}

      ${portfolioContext || "No portfolio holdings recorded."}

      COMPLETE USER CATEGORIES & BUDGET ALLOCATION MATRIX:
      ${categoriesContext || "No categories defined."}

      ${dbContextStr ? `DYNAMICAL DATABASE QUERY RESULTS:\n${dbContextStr}` : "No additional database records queried."}

      YOUR TASK:
      1. Deliver an exhaustive, highly intelligent, data-dense, and quantitative response that satisfies the user's inquiry completely.
      2. If closing with a strategic next step or follow-up question, ensure it is directly relevant and adds real value—never use it to deflect giving answers.
      3. Suggest 3 contextual quick-reply options matching the discussion.
      4. Determine if the question implies looking at specific ledger items (generate filter criteria if yes).
      5. Determine if the user requested a cycle projection override (e.g. "cut dining by 30%").
      6. Determine if the user shared new personal context for the status journal.

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
