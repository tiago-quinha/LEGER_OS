import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerCookieClient } from "@/lib/supabase-server";
import { getAdminClient } from "@/lib/supabase-admin";

// In-memory server cache (15-minute TTL per symbol/id)
interface CachedPrice {
  price: number;
  change24h: number;
  currency: string;
  timestamp: number;
}

const priceCache = new Map<string, CachedPrice>();
const userLastFetchMap = new Map<string, number>();

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const USER_THROTTLE_MS = 30 * 1000; // 30 seconds limit between refreshes

// Common crypto symbol mapping for CoinGecko IDs
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

async function getAuthUser(req: Request) {
  let user: any = null;
  let supabaseClient: any = null;

  const authHeader = req.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    supabaseClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    const { data } = await supabaseClient.auth.getUser(token);
    user = data?.user;
  }

  if (!user) {
    supabaseClient = await createServerCookieClient();
    const { data } = await supabaseClient.auth.getUser();
    user = data?.user;
  }

  return { user, supabaseClient };
}

export async function POST(req: Request) {
  try {
    const { user } = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = Date.now();

    // Check user request throttle
    const lastUserFetch = userLastFetchMap.get(user.id) || 0;
    const body = await req.json().catch(() => ({}));
    const forceRefresh = body?.force === true;

    if (forceRefresh && now - lastUserFetch < USER_THROTTLE_MS) {
      const waitSeconds = Math.ceil((USER_THROTTLE_MS - (now - lastUserFetch)) / 1000);
      return NextResponse.json(
        { error: `Rate limit hit. Please wait ${waitSeconds} seconds before forcing another market price update.` },
        { status: 429 }
      );
    }

    if (forceRefresh) {
      userLastFetchMap.set(user.id, now);
    }

    const adminDb = getAdminClient();
    const { data: assets, error: dbError } = await adminDb
      .from("portfolio_assets")
      .select("*")
      .eq("user_id", user.id);

    if (dbError) {
      console.error("Failed to load user portfolio assets:", dbError);
      return NextResponse.json({ error: "Database error fetching assets" }, { status: 500 });
    }

    if (!assets || assets.length === 0) {
      return NextResponse.json({ prices: {}, updatedCount: 0 });
    }

    // Filter assets that have symbols
    const validAssets = (assets || []).filter((a: any) => a.symbol && a.symbol.trim() !== "");
    const updatedPrices: Record<string, CachedPrice> = {};
    const assetsToFetchRemote: typeof validAssets = [];

    // Check cache first unless forceRefresh is set
    validAssets.forEach((asset: any) => {
      const cacheKey = `${asset.asset_type}:${asset.symbol.toUpperCase()}`;
      const cached = priceCache.get(cacheKey);

      if (!forceRefresh && cached && now - cached.timestamp < CACHE_TTL_MS) {
        updatedPrices[asset.id] = cached;
      } else {
        assetsToFetchRemote.push(asset);
      }
    });

    if (assetsToFetchRemote.length > 0) {
      // 1. Crypto Fetch via CoinGecko
      const cryptoAssets = assetsToFetchRemote.filter((a: any) => a.asset_type === "crypto");
      if (cryptoAssets.length > 0) {
        const coinIds = Array.from(
          new Set(
            cryptoAssets
              .map((c: any) => {
                const sym = c.symbol.toUpperCase();
                return CRYPTO_COINGECKO_MAP[sym] || c.symbol.toLowerCase();
              })
              .filter(Boolean)
          )
        );

        if (coinIds.length > 0) {
          try {
            const cgUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds.join(",")}&vs_currencies=eur,usd&include_24hr_change=true`;
            const cgRes = await fetch(cgUrl, {
              headers: { "User-Agent": "LEGER_OS/1.0" },
              next: { revalidate: 300 }
            });

            if (cgRes.ok) {
              const cgData = await cgRes.json();
              cryptoAssets.forEach((asset: any) => {
                const sym = asset.symbol.toUpperCase();
                const coinId = CRYPTO_COINGECKO_MAP[sym] || asset.symbol.toLowerCase();
                const coinInfo = cgData[coinId];
                if (coinInfo) {
                  const price = asset.currency === "USD" ? coinInfo.usd : coinInfo.eur;
                  const change24h = asset.currency === "USD" ? coinInfo.usd_24h_change : coinInfo.eur_24h_change;

                  const priceObj: CachedPrice = {
                    price: typeof price === "number" ? price : parseFloat(price),
                    change24h: parseFloat((change24h || 0).toFixed(2)),
                    currency: asset.currency || "EUR",
                    timestamp: now,
                  };

                  const cacheKey = `crypto:${sym}`;
                  priceCache.set(cacheKey, priceObj);
                  updatedPrices[asset.id] = priceObj;
                }
              });
            }
          } catch (cgErr) {
            console.error("CoinGecko fetch error:", cgErr);
          }
        }
      }

      // 2. Stock / ETF Fetch via Yahoo Finance
      const stockAssets = assetsToFetchRemote.filter((a: any) => a.asset_type === "stock_etf" || a.asset_type === "commodity");
      if (stockAssets.length > 0) {
        // Fetch real-time EUR/USD exchange rate for proper currency normalization
        let eurUsdRate = 1.08;
        try {
          const fxRes = await fetch("https://query1.finance.yahoo.com/v8/finance/chart/EURUSD=X?interval=1d&range=1d", {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
            next: { revalidate: 1800 }
          });
          if (fxRes.ok) {
            const fxData = await fxRes.json();
            const rate = fxData?.chart?.result?.[0]?.meta?.regularMarketPrice;
            if (typeof rate === "number" && rate > 0) {
              eurUsdRate = rate;
            }
          }
        } catch (fxErr) {
          console.warn("Using fallback EURUSD rate:", eurUsdRate);
        }

        await Promise.all(
          stockAssets.map(async (asset: any) => {
            const sym = asset.symbol.toUpperCase();
            try {
              const yfUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`;
              const yfRes = await fetch(yfUrl, {
                headers: {
                  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                },
                next: { revalidate: 300 }
              });

              if (yfRes.ok) {
                const yfData = await yfRes.json();
                const meta = yfData?.chart?.result?.[0]?.meta;
                if (meta && typeof meta.regularMarketPrice === "number") {
                  let currentPrice = meta.regularMarketPrice;
                  let prevClose = meta.chartPreviousClose || currentPrice;

                  // Normalize currency to user target currency (default EUR)
                  const metaCurrency = (meta.currency || "USD").toUpperCase();
                  const targetCurrency = (asset.currency || "EUR").toUpperCase();

                  if ((metaCurrency === "GBP" || metaCurrency === "GBX") && targetCurrency === "EUR") {
                    if (metaCurrency === "GBX") {
                      currentPrice = currentPrice / 100;
                      prevClose = prevClose / 100;
                    }
                  } else if (metaCurrency === "USD" && targetCurrency === "EUR") {
                    currentPrice = currentPrice / eurUsdRate;
                    prevClose = prevClose / eurUsdRate;
                  }

                  const change24h = prevClose > 0 ? ((currentPrice - prevClose) / prevClose) * 100 : 0;

                  const priceObj: CachedPrice = {
                    price: parseFloat(currentPrice.toFixed(2)),
                    change24h: parseFloat(change24h.toFixed(2)),
                    currency: targetCurrency,
                    timestamp: now,
                  };

                  const cacheKey = `${asset.asset_type}:${sym}`;
                  priceCache.set(cacheKey, priceObj);
                  updatedPrices[asset.id] = priceObj;
                }
              }
            } catch (yfErr) {
              console.error(`Yahoo Finance fetch error for ${sym}:`, yfErr);
            }
          })
        );
      }
    }

    // Batch update asset prices & 24h market performance in Supabase DB for persisted accuracy
    const updatePromises = Object.entries(updatedPrices).map(([assetId, data]) => {
      const existingAsset = assets.find((a: any) => a.id === assetId);
      const updatedMeta = {
        ...(existingAsset?.metadata || {}),
        change24h: data.change24h,
      };

      return adminDb
        .from("portfolio_assets")
        .update({
          current_price: data.price,
          metadata: updatedMeta,
          updated_at: new Date().toISOString(),
        })
        .eq("id", assetId)
        .eq("user_id", user.id);
    });

    await Promise.all(updatePromises);

    return NextResponse.json({
      prices: updatedPrices,
      updatedCount: Object.keys(updatedPrices).length,
      cachedCount: validAssets.length - assetsToFetchRemote.length,
    });
  } catch (error: any) {
    console.error("POST /api/portfolio/market-data error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { user } = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const symbolsParam = searchParams.get("symbols");
    const currency = (searchParams.get("currency") || "EUR").toUpperCase();

    const targetSymbols = symbolsParam
      ? symbolsParam.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
      : [
          "BTC", "ETH", "SOL", "ADA", "XRP", "BNB", "LINK", "DOGE", "DOT", "AVAX", "MATIC", "SHIB", "UNI", "LTC", "NEAR", "SUI", "ATOM",
          "AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "META", "AMD", "NFLX", "SPY", "QQQ", "VWCE.DE", "SXR8.DE", "XTB",
          "XAU", "XAG", "WTI"
        ];

    const now = Date.now();
    const resultPrices: Record<string, { price: number; change24h: number; currency: string }> = {};
    const missingCryptoSymbols: string[] = [];
    const missingStockSymbols: string[] = [];

    for (const sym of targetSymbols) {
      const isCrypto = CRYPTO_COINGECKO_MAP[sym] !== undefined;
      const cacheKey = isCrypto ? `crypto:${sym}` : `stock_etf:${sym}`;
      const cached = priceCache.get(cacheKey);

      if (cached && now - cached.timestamp < CACHE_TTL_MS) {
        resultPrices[sym] = {
          price: cached.price,
          change24h: cached.change24h,
          currency: cached.currency,
        };
      } else {
        if (isCrypto) {
          missingCryptoSymbols.push(sym);
        } else {
          missingStockSymbols.push(sym);
        }
      }
    }

    // 1. Fetch missing crypto
    if (missingCryptoSymbols.length > 0) {
      const coinIds = missingCryptoSymbols
        .map((s) => CRYPTO_COINGECKO_MAP[s])
        .filter(Boolean);

      if (coinIds.length > 0) {
        try {
          const cgUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds.join(",")}&vs_currencies=eur,usd&include_24hr_change=true`;
          const cgRes = await fetch(cgUrl, {
            headers: { "User-Agent": "LEGER_OS/1.0" },
            next: { revalidate: 300 },
          });

          if (cgRes.ok) {
            const cgData = await cgRes.json();
            missingCryptoSymbols.forEach((sym) => {
              const coinId = CRYPTO_COINGECKO_MAP[sym];
              const coinInfo = cgData[coinId];
              if (coinInfo) {
                const price = currency === "USD" ? coinInfo.usd : coinInfo.eur;
                const change24h = currency === "USD" ? coinInfo.usd_24h_change : coinInfo.eur_24h_change;

                const priceObj: CachedPrice = {
                  price: typeof price === "number" ? price : parseFloat(price),
                  change24h: parseFloat((change24h || 0).toFixed(2)),
                  currency,
                  timestamp: now,
                };

                priceCache.set(`crypto:${sym}`, priceObj);
                resultPrices[sym] = {
                  price: priceObj.price,
                  change24h: priceObj.change24h,
                  currency: priceObj.currency,
                };
              }
            });
          }
        } catch (cgErr) {
          console.error("GET market-data CoinGecko fetch error:", cgErr);
        }
      }
    }

    // 2. Fetch missing stocks / commodities
    if (missingStockSymbols.length > 0) {
      await Promise.allSettled(
        missingStockSymbols.map(async (sym) => {
          try {
            const yfUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`;
            const yfRes = await fetch(yfUrl, {
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              },
              next: { revalidate: 300 },
            });

            if (yfRes.ok) {
              const yfData = await yfRes.json();
              const meta = yfData?.chart?.result?.[0]?.meta;
              if (meta && typeof meta.regularMarketPrice === "number") {
                const currentPrice = meta.regularMarketPrice;
                const prevClose = meta.chartPreviousClose || currentPrice;
                const change24h = prevClose > 0 ? ((currentPrice - prevClose) / prevClose) * 100 : 0;

                const priceObj: CachedPrice = {
                  price: parseFloat(currentPrice.toFixed(2)),
                  change24h: parseFloat(change24h.toFixed(2)),
                  currency: meta.currency || currency,
                  timestamp: now,
                };

                priceCache.set(`stock_etf:${sym}`, priceObj);
                resultPrices[sym] = {
                  price: priceObj.price,
                  change24h: priceObj.change24h,
                  currency: priceObj.currency,
                };
              }
            }
          } catch (yfErr) {
            console.error(`GET market-data Yahoo Finance fetch error for ${sym}:`, yfErr);
          }
        })
      );
    }

    return NextResponse.json({ prices: resultPrices });
  } catch (error: any) {
    console.error("GET /api/portfolio/market-data error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch market data" }, { status: 500 });
  }
}

