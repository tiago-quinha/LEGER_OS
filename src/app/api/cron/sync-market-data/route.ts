import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { convertCurrency } from "@/lib/forex";

// CoinGecko symbol mapping
const CRYPTO_COINGECKO_MAP: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  ADA: "cardano",
  XRP: "ripple",
  DOT: "polkadot",
  AVAX: "avalanche-2",
  DOGE: "dogecoin",
  LINK: "chainlink",
  MATIC: "matic-network",
  POL: "matic-network",
  SHIB: "shiba-inu",
  LTC: "litecoin",
  UNI: "uniswap",
  ATOM: "cosmos",
  NEAR: "near",
  ALGO: "algorand",
  USDT: "tether",
  USDC: "usd-coin",
};

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60s for full server cron batch

export async function GET(req: Request) {
  return handleSync(req);
}

export async function POST(req: Request) {
  return handleSync(req);
}

async function handleSync(req: Request) {
  const startTime = Date.now();
  try {
    // 1. Verify Cron Authorization if CRON_SECRET is configured
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = req.headers.get("authorization");
      if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized cron trigger" }, { status: 401 });
      }
    }

    const adminDb = getAdminClient();

    // 2. Fetch all portfolio assets across the entire mainframe
    const { data: allAssets, error: dbError } = await adminDb
      .from("portfolio_assets")
      .select("id, user_id, symbol, asset_type, currency, quantity, buy_price");

    if (dbError) {
      console.error("[Cron Market Sync] DB query error:", dbError);
      return NextResponse.json({ error: "Database error fetching assets" }, { status: 500 });
    }

    if (!allAssets || allAssets.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No assets found to sync",
        updatedAssets: 0,
        distinctSymbols: 0,
        durationMs: Date.now() - startTime,
      });
    }

    // 3. Extract distinct unique symbols
    const validAssets = (allAssets as any[]).filter((a: any) => a.symbol && a.symbol.trim() !== "");
    const distinctStocks: string[] = Array.from(
      new Set(
        validAssets
          .filter((a: any) => a.asset_type === "stock_etf" || a.asset_type === "commodity" || !a.asset_type)
          .map((a: any) => String(a.symbol).trim().toUpperCase())
      )
    );

    const distinctCryptos: string[] = Array.from(
      new Set(
        validAssets
          .filter((a: any) => a.asset_type === "crypto")
          .map((a: any) => String(a.symbol).trim().toUpperCase())
      )
    );

    const fetchedQuotes: Record<string, { rawPrice: number; rawCurrency: string; change24h: number }> = {};

    // 4. Batch fetch Crypto from CoinGecko (1 single API request for all users)
    if (distinctCryptos.length > 0) {
      const coinIds = distinctCryptos
        .map((sym: string) => CRYPTO_COINGECKO_MAP[sym] || sym.toLowerCase())
        .filter(Boolean);

      if (coinIds.length > 0) {
        try {
          const cgUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds.join(",")}&vs_currencies=eur,usd&include_24hr_change=true`;
          const cgRes = await fetch(cgUrl, {
            headers: { "User-Agent": "LEGER_OS/1.0 Server-Cron" },
            cache: "no-store",
          });

          if (cgRes.ok) {
            const cgData = await cgRes.json();
            distinctCryptos.forEach((sym: string) => {
              const coinId = CRYPTO_COINGECKO_MAP[sym] || sym.toLowerCase();
              const coinInfo = cgData[coinId];
              if (coinInfo) {
                fetchedQuotes[`crypto:${sym}`] = {
                  rawPrice: coinInfo.usd || coinInfo.eur,
                  rawCurrency: "USD",
                  change24h: parseFloat((coinInfo.usd_24h_change || 0).toFixed(2)),
                };
              }
            });
          }
        } catch (cgErr) {
          console.error("[Cron Market Sync] CoinGecko fetch failed:", cgErr);
        }
      }
    }

    // 5. Batch fetch Stocks / Commodities from Yahoo Finance
    if (distinctStocks.length > 0) {
      await Promise.allSettled(
        distinctStocks.map(async (sym) => {
          try {
            const yfUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`;
            const yfRes = await fetch(yfUrl, {
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              },
              cache: "no-store",
            });

            if (yfRes.ok) {
              const yfData = await yfRes.json();
              const meta = yfData?.chart?.result?.[0]?.meta;
              if (meta && typeof meta.regularMarketPrice === "number") {
                const currentPrice = meta.regularMarketPrice;
                const prevClose = meta.chartPreviousClose || currentPrice;
                const change24h = prevClose > 0 ? ((currentPrice - prevClose) / prevClose) * 100 : 0;

                fetchedQuotes[`stock_etf:${sym}`] = {
                  rawPrice: currentPrice,
                  rawCurrency: (meta.currency || "USD").toUpperCase(),
                  change24h: parseFloat(change24h.toFixed(2)),
                };
              }
            }
          } catch (yfErr) {
            console.error(`[Cron Market Sync] Yahoo Finance fetch failed for ${sym}:`, yfErr);
          }
        })
      );
    }

    // 6. Update all assets in DB with normalized target currency
    let updatedCount = 0;
    const nowIso = new Date().toISOString();
    const updatePromises = validAssets.map(async (asset: any) => {
      const sym = String(asset.symbol).trim().toUpperCase();
      const lookupKey = asset.asset_type === "crypto" ? `crypto:${sym}` : `stock_etf:${sym}`;
      const quote = fetchedQuotes[lookupKey];

      if (!quote) return;

      const targetCurrency = (asset.currency || "EUR").toUpperCase();
      const { convertedAmount: normalizedPrice } = await convertCurrency(
        quote.rawPrice,
        quote.rawCurrency,
        targetCurrency
      );

      const finalPrice = parseFloat(normalizedPrice.toFixed(4));

      await adminDb
        .from("portfolio_assets")
        .update({
          current_price: finalPrice,
          metadata: {
            change24h: quote.change24h,
            last_synced_at: nowIso,
            source: "server_cron",
          },
          updated_at: nowIso,
        })
        .eq("id", asset.id);

      updatedCount++;
    });

    await Promise.all(updatePromises);

    // 7. Auto-generate daily portfolio snapshots for historical charting
    const userGroups = new Map<string, any[]>();
    validAssets.forEach((a: any) => {
      const list = userGroups.get(a.user_id) || [];
      list.push(a);
      userGroups.set(a.user_id, list);
    });

    const todayDate = nowIso.split("T")[0];
    const snapshotPromises = Array.from(userGroups.entries()).map(async ([userId, _userAssets]) => {
      try {
        const [{ data: latestBalance }, { data: refreshedAssets }] = await Promise.all([
          adminDb
            .from("account_balance")
            .select("amount")
            .eq("user_id", userId)
            .order("date", { ascending: false })
            .limit(1)
            .maybeSingle(),
          adminDb
            .from("portfolio_assets")
            .select("quantity, current_price, buy_price")
            .eq("user_id", userId),
        ]);

        const liquid = latestBalance?.amount || 0;
        let totalVal = 0;
        let totalCost = 0;

        (refreshedAssets || []).forEach((a: any) => {
          const q = Number(a.quantity) || 0;
          const cp = Number(a.current_price) || 0;
          const bp = Number(a.buy_price) || 0;
          totalVal += q * cp;
          totalCost += q * bp;
        });

        const unrealizedPnL = totalVal - totalCost;
        const totalNetWorth = liquid + totalVal;

        // Upsert today's snapshot
        await adminDb.from("portfolio_snapshots").upsert(
          {
            user_id: userId,
            date: todayDate,
            total_valuation: parseFloat(totalVal.toFixed(2)),
            liquid_balance: parseFloat(liquid.toFixed(2)),
            total_net_worth: parseFloat(totalNetWorth.toFixed(2)),
            unrealized_pnl: parseFloat(unrealizedPnL.toFixed(2)),
            asset_breakdown: { count: refreshedAssets?.length || 0 },
          },
          { onConflict: "user_id,date" }
        );
      } catch (snapErr) {
        console.error(`[Cron Market Sync] Snapshot error for user ${userId}:`, snapErr);
      }
    });

    await Promise.all(snapshotPromises);

    const durationMs = Date.now() - startTime;
    return NextResponse.json({
      success: true,
      message: `Server-side sync completed in ${durationMs}ms`,
      updatedAssets: updatedCount,
      distinctSymbols: distinctStocks.length + distinctCryptos.length,
      usersProcessed: userGroups.size,
      durationMs,
    });
  } catch (err: any) {
    console.error("[Cron Market Sync] Unhandled fatal error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error during market sync", durationMs: Date.now() - startTime },
      { status: 500 }
    );
  }
}
