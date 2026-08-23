import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerCookieClient } from "@/lib/supabase-server";

export interface SearchAssetResult {
  id: string;
  name: string;
  symbol: string;
  type: "stock_etf" | "crypto" | "commodity" | "cash_equivalent" | "other";
  badgeLabel: string;
  exchange?: string;
  iconUrl?: string;
  currency?: string;
}

// In-memory cache for search results (10-minute TTL)
interface CachedSearchResults {
  results: SearchAssetResult[];
  timestamp: number;
}

const searchCache = new Map<string, CachedSearchResults>();
const CACHE_TTL_MS = 10 * 60 * 1000;

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

export async function GET(req: Request) {
  try {
    const { user } = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = (searchParams.get("q") || "").trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const cacheKey = query.toLowerCase();
    const cached = searchCache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({ results: cached.results, cached: true });
    }

    const results: SearchAssetResult[] = [];
    const seenSymbols = new Set<string>();

    // Parallel external search queries
    const [yahooResults, coingeckoResults] = await Promise.allSettled([
      // 1. Yahoo Finance Search (Global Stocks, ETFs, Commodities, Indices)
      (async () => {
        const yfUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=8&newsCount=0&enableFuzzyQuery=false`;
        const res = await fetch(yfUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          next: { revalidate: 300 },
        });

        if (!res.ok) return [];
        const data = await res.json();
        const quotes = data?.quotes || [];

        const mapped: SearchAssetResult[] = [];
        for (const q of quotes) {
          if (!q.symbol) continue;
          const sym = q.symbol.toUpperCase();
          const name = q.shortname || q.longname || sym;
          const quoteType = (q.quoteType || "").toUpperCase();

          let type: SearchAssetResult["type"] = "stock_etf";
          let badge = "STOCK";

          if (quoteType === "ETF" || quoteType === "MUTUALFUND") {
            type = "stock_etf";
            badge = "ETF";
          } else if (quoteType === "COMMODITY" || quoteType === "FUTURE") {
            type = "commodity";
            badge = "COMMODITY";
          } else if (quoteType === "CURRENCY") {
            type = "cash_equivalent";
            badge = "FOREX";
          } else if (quoteType === "CRYPTOCURRENCY") {
            type = "crypto";
            badge = "CRYPTO";
          }

          mapped.push({
            id: `yf-${sym.toLowerCase()}`,
            name,
            symbol: sym,
            type,
            badgeLabel: badge,
            exchange: q.exchange || q.exchDisp,
          });
        }
        return mapped;
      })(),

      // 2. CoinGecko Search (10,000+ Cryptocurrencies)
      (async () => {
        const cgUrl = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`;
        const res = await fetch(cgUrl, {
          headers: { "User-Agent": "LEGER_OS/1.0" },
          next: { revalidate: 300 },
        });

        if (!res.ok) return [];
        const data = await res.json();
        const coins = data?.coins || [];

        const mapped: SearchAssetResult[] = [];
        // Take top 6 coins ordered by market cap rank
        const sortedCoins = coins
          .slice(0, 6)
          .sort((a: any, b: any) => (a.market_cap_rank || 99999) - (b.market_cap_rank || 99999));

        for (const coin of sortedCoins) {
          if (!coin.symbol) continue;
          const sym = coin.symbol.toUpperCase();
          mapped.push({
            id: `cg-${coin.id || sym.toLowerCase()}`,
            name: coin.name || sym,
            symbol: sym,
            type: "crypto",
            badgeLabel: "CRYPTO",
            iconUrl: coin.thumb || coin.large,
          });
        }
        return mapped;
      })(),
    ]);

    // Aggregate Yahoo Finance
    if (yahooResults.status === "fulfilled" && yahooResults.value) {
      for (const item of yahooResults.value) {
        if (!seenSymbols.has(item.symbol)) {
          seenSymbols.add(item.symbol);
          results.push(item);
        }
      }
    }

    // Aggregate CoinGecko
    if (coingeckoResults.status === "fulfilled" && coingeckoResults.value) {
      for (const item of coingeckoResults.value) {
        if (!seenSymbols.has(item.symbol)) {
          seenSymbols.add(item.symbol);
          results.push(item);
        }
      }
    }

    // Cache the result
    searchCache.set(cacheKey, {
      results,
      timestamp: now,
    });

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("GET /api/portfolio/search error:", error);
    return NextResponse.json({ error: error.message || "Failed to search assets" }, { status: 500 });
  }
}
