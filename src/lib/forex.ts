// In-memory FX rate cache with 30-minute TTL
interface CachedFxRate {
  rate: number;
  timestamp: number;
}

const fxCache = new Map<string, CachedFxRate>();
const FX_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Fetch live Forex rate from Yahoo Finance with fallback cache.
 * Pair examples: "EURUSD=X", "GBPUSD=X", "EURGBP=X"
 */
export async function getLiveForexRate(pair: string = "EURUSD=X"): Promise<number> {
  const normalizedPair = pair.toUpperCase().includes("=X") ? pair.toUpperCase() : `${pair.toUpperCase()}=X`;
  const cached = fxCache.get(normalizedPair);
  const now = Date.now();

  if (cached && now - cached.timestamp < FX_TTL_MS) {
    return cached.rate;
  }

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(normalizedPair)}?interval=1d&range=1d`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        next: { revalidate: 1800 },
      }
    );

    if (res.ok) {
      const data = await res.json();
      const rate = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (typeof rate === "number" && rate > 0) {
        fxCache.set(normalizedPair, { rate, timestamp: now });
        return rate;
      }
    }
  } catch (err) {
    console.warn(`Failed to fetch live FX rate for ${normalizedPair}:`, err);
  }

  // Fallbacks if network fails
  if (normalizedPair.startsWith("EURUSD")) return 1.08;
  if (normalizedPair.startsWith("GBPUSD")) return 1.28;
  if (normalizedPair.startsWith("EURGBP")) return 0.85;
  return 1.0;
}

/**
 * Convert an asset price from sourceCurrency to targetCurrency
 */
export async function convertCurrency(
  amount: number,
  sourceCurrency: string = "USD",
  targetCurrency: string = "EUR"
): Promise<{ convertedAmount: number; rate: number }> {
  const src = sourceCurrency.toUpperCase();
  const tgt = targetCurrency.toUpperCase();

  if (src === tgt) {
    return { convertedAmount: amount, rate: 1.0 };
  }

  // Handle London pence (GBX / GBp)
  let baseAmount = amount;
  let normalizedSrc = src;
  if (src === "GBX" || src === "GBP") {
    if (src === "GBX") {
      baseAmount = amount / 100;
    }
    normalizedSrc = "GBP";
  }

  if (normalizedSrc === tgt) {
    return { convertedAmount: baseAmount, rate: baseAmount / amount };
  }

  if (normalizedSrc === "USD" && tgt === "EUR") {
    const eurusd = await getLiveForexRate("EURUSD=X");
    return { convertedAmount: baseAmount / eurusd, rate: 1 / eurusd };
  }

  if (normalizedSrc === "EUR" && tgt === "USD") {
    const eurusd = await getLiveForexRate("EURUSD=X");
    return { convertedAmount: baseAmount * eurusd, rate: eurusd };
  }

  if (normalizedSrc === "GBP" && tgt === "EUR") {
    const eurgbp = await getLiveForexRate("EURGBP=X");
    return { convertedAmount: baseAmount / eurgbp, rate: 1 / eurgbp };
  }

  if (normalizedSrc === "EUR" && tgt === "GBP") {
    const eurgbp = await getLiveForexRate("EURGBP=X");
    return { convertedAmount: baseAmount * eurgbp, rate: eurgbp };
  }

  if (normalizedSrc === "GBP" && tgt === "USD") {
    const gbpusd = await getLiveForexRate("GBPUSD=X");
    return { convertedAmount: baseAmount * gbpusd, rate: gbpusd };
  }

  if (normalizedSrc === "USD" && tgt === "GBP") {
    const gbpusd = await getLiveForexRate("GBPUSD=X");
    return { convertedAmount: baseAmount / gbpusd, rate: 1 / gbpusd };
  }

  return { convertedAmount: baseAmount, rate: 1.0 };
}
