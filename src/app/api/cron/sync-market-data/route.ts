import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase-admin";
import { convertCurrency } from "@/lib/forex";
import { notifyAssetSurge, notifyPortfolioATH, notifyDailyPortfolioWrap } from "@/lib/server-notifications";

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
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    // 1. Verify Cron Authorization if CRON_SECRET is configured (exempt explicit user queries)
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && !userId) {
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

      // Trigger Asset Surge/Drop alert for significant 24h market moves (>= 3.5%)
      if (asset.user_id && Math.abs(quote.change24h) >= 3.5) {
        notifyAssetSurge(adminDb, asset.user_id, sym, quote.change24h, finalPrice, targetCurrency).catch(console.error);
      }

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
        const breakdown: Record<string, { valuation: number; count: number }> = {
          stock_etf: { valuation: 0, count: 0 },
          crypto: { valuation: 0, count: 0 },
          cash_equivalent: { valuation: 0, count: 0 },
          commodity: { valuation: 0, count: 0 },
          other: { valuation: 0, count: 0 },
        };

        (refreshedAssets || []).forEach((a: any) => {
          const q = Number(a.quantity) || 0;
          const cp = Number(a.current_price) || 0;
          const bp = Number(a.buy_price) || 0;
          const assetVal = q * cp;
          totalVal += assetVal;
          totalCost += q * bp;

          const type = a.asset_type || "other";
          if (!breakdown[type]) breakdown[type] = { valuation: 0, count: 0 };
          breakdown[type].valuation += assetVal;
          breakdown[type].count += 1;
        });

        const unrealizedPnL = totalVal - totalCost;
        const totalNetWorth = liquid + totalVal;
        const currVal = parseFloat(totalVal.toFixed(2));

        // Fetch existing today snapshot to track intraday min/max range
        const { data: existingTodaySnap } = await adminDb
          .from("portfolio_snapshots")
          .select("min_valuation, max_valuation")
          .eq("user_id", userId)
          .eq("snapshot_date", todayDate)
          .maybeSingle();

        let minVal = currVal;
        let maxVal = currVal;

        if (existingTodaySnap) {
          const prevMin = parseFloat(existingTodaySnap.min_valuation);
          const prevMax = parseFloat(existingTodaySnap.max_valuation);
          if (!isNaN(prevMin) && prevMin > 0) minVal = Math.min(prevMin, currVal);
          if (!isNaN(prevMax) && prevMax > 0) maxVal = Math.max(prevMax, currVal);
        }

        // Upsert today's snapshot matching exact schema
        await adminDb.from("portfolio_snapshots").upsert(
          {
            user_id: userId,
            snapshot_date: todayDate,
            total_net_worth: parseFloat(totalNetWorth.toFixed(2)),
            liquid_cash: parseFloat(liquid.toFixed(2)),
            invested_capital: parseFloat(totalCost.toFixed(2)),
            total_gain_loss: parseFloat(unrealizedPnL.toFixed(2)),
            min_valuation: parseFloat(minVal.toFixed(2)),
            max_valuation: parseFloat(maxVal.toFixed(2)),
            closing_valuation: currVal,
            asset_breakdown: breakdown,
            created_at: nowIso,
          },
          { onConflict: "user_id,snapshot_date" }
        );

        // Check for Portfolio All-Time High Milestone
        const { data: peakSnap } = await adminDb
          .from("portfolio_snapshots")
          .select("closing_valuation")
          .eq("user_id", userId)
          .order("closing_valuation", { ascending: false })
          .limit(2);

        if (peakSnap && peakSnap.length >= 2) {
          const secondHighest = parseFloat(peakSnap[1]?.closing_valuation || 0);
          if (currVal > secondHighest && (currVal - secondHighest) >= 100) {
            notifyPortfolioATH(adminDb, userId, currVal, "€").catch(console.error);
          }
        }

        // Fetch previous snapshot to compute daily day change for Daily Portfolio Wrap
        const { data: previousSnaps } = await adminDb
          .from("portfolio_snapshots")
          .select("closing_valuation, snapshot_date")
          .eq("user_id", userId)
          .lt("snapshot_date", todayDate)
          .order("snapshot_date", { ascending: false })
          .limit(1);

        const prevVal = previousSnaps && previousSnaps.length > 0 ? parseFloat(previousSnaps[0].closing_valuation || 0) : 0;
        const dayChangeAmount = prevVal > 0 ? currVal - prevVal : 0;
        const dayChangePercent = prevVal > 0 ? ((currVal - prevVal) / prevVal) * 100 : 0;

        // Find top mover asset among user's holdings
        let topMover: { symbol: string; change24h: number } | null = null;
        (refreshedAssets || []).forEach((a: any) => {
          const meta = a.metadata || {};
          const ch = typeof meta.change24h === "number" ? meta.change24h : 0;
          if (!topMover || Math.abs(ch) > Math.abs(topMover.change24h)) {
            topMover = { symbol: a.symbol || a.asset_name || "", change24h: ch };
          }
        });

        // Dispatch Daily Portfolio Wrap-Up notification (cooldown handled inside)
        notifyDailyPortfolioWrap(
          adminDb, 
          userId, 
          currVal, 
          dayChangeAmount, 
          dayChangePercent, 
          topMover, 
          "€"
        ).catch(console.error);
      } catch (snapErr) {
        console.error(`[Cron Market Sync] Snapshot error for user ${userId}:`, snapErr);
      }
    });

    await Promise.all(snapshotPromises);

    let wrapTitle = "Portfolio Wrap";
    let wrapSummary = "Daily market session closed";

    let targetUserId = userId;
    if (!targetUserId) {
      const { data: fallbackProfiles } = await adminDb
        .from("profiles")
        .select("id")
        .order("updated_at", { ascending: false })
        .limit(1);
      if (fallbackProfiles && fallbackProfiles.length >= 1) {
        targetUserId = fallbackProfiles[0].id;
      }
    }

    if (targetUserId) {
      const { data: userAssets } = await adminDb
        .from("portfolio_assets")
        .select("id, symbol, asset_name, quantity, current_price, buy_price, metadata")
        .eq("user_id", targetUserId);

      let currVal = 0;
      let topMover: { symbol: string; change24h: number } | null = null;

      for (const a of (userAssets || [])) {
        const qty = a.quantity || 0;
        const price = a.current_price || a.buy_price || 0;
        currVal += qty * price;

        const meta = (a.metadata || {}) as any;
        const ch = typeof meta.change24h === "number" ? meta.change24h : 0;
        if (!topMover || Math.abs(ch) > Math.abs(topMover.change24h)) {
          topMover = { symbol: (a.symbol || a.asset_name || "") as string, change24h: ch };
        }
      }

      const todayDate = new Date().toISOString().slice(0, 10);
      const { data: previousSnaps } = await adminDb
        .from("portfolio_snapshots")
        .select("closing_valuation, snapshot_date")
        .eq("user_id", targetUserId)
        .lt("snapshot_date", todayDate)
        .order("snapshot_date", { ascending: false })
        .limit(1);

      const prevVal = previousSnaps && previousSnaps.length > 0 ? parseFloat(previousSnaps[0].closing_valuation || 0) : 0;
      const dayChangeAmount = prevVal > 0 ? currVal - prevVal : 0;
      const dayChangePercent = prevVal > 0 ? ((currVal - prevVal) / prevVal) * 100 : 0;
      const isGain = dayChangeAmount >= 0;
      const sign = isGain ? "+" : "-";
      const absChange = Math.abs(dayChangeAmount);
      const absPct = Math.abs(dayChangePercent);

      wrapTitle = `Portfolio Wrap · ${sign}€${absChange.toFixed(2)} (${sign}${absPct.toFixed(1)}%)`;
      wrapSummary = `Total valuation: €${currVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`;
      if (topMover && (topMover as any).symbol) {
        const mover = topMover as { symbol: string; change24h: number };
        const moverSign = mover.change24h >= 0 ? "+" : "";
        wrapSummary += ` Top mover: ${mover.symbol.toUpperCase()} (${moverSign}${mover.change24h.toFixed(1)}%).`;
      }
      wrapSummary += ` Tap to view portfolio.`;
    }

    const durationMs = Date.now() - startTime;
    return NextResponse.json({
      success: true,
      message: `Server-side sync completed in ${durationMs}ms`,
      wrapTitle,
      wrapSummary,
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
