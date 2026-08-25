/**
 * LEGER_OS Cadence & Subscription Detection Engine
 * High-precision algorithm to identify recurring bills, subscriptions, and silent price hikes.
 * 
 * 4-Layer Detection Architecture:
 * 1. Known Subscription Merchant Registry (Instant 1st-Charge Detection with Word-Boundary Match)
 * 2. Bank Extract Direct Debit & Institutional Keywords (SEPA, DD, Mensalidade, etc.)
 * 3. Empirical Recency, Day-of-Month & Interval Clustering with Burst Filtering
 * 4. User Manual Overrides & Exclusions (Persistent via localStorage & Supabase)
 */

export interface DetectedSubscription {
  id: string;
  merchant: string;
  normalizedMerchant: string;
  categoryName?: string;
  categoryId?: number;
  averageAmount: number;
  latestAmount: number;
  historicalAmounts: number[];
  cadence: "monthly" | "annual";
  intervalDays: number;
  confidence: number; // 0.0 - 1.0
  occurrences: number;
  firstSeenDate: string;
  latestDate: string;
  nextExpectedDate: string;
  expectedDayOfMonth?: number;
  status: "active" | "overdue" | "cancelled" | "price_jump";
  priceChangePercent?: number; // e.g. +15.2%
  priceChangeAmount?: number;
  isUtility?: boolean;
  source: "known_registry" | "direct_debit_keyword" | "empirical_cadence" | "user_pinned";
}

export interface CadenceAnalysisResult {
  subscriptions: DetectedSubscription[];
  totalMonthlyCommitment: number;
  totalAnnualCommitment: number;
  upcomingInCurrentCycle: {
    merchant: string;
    amount: number;
    expectedDate: string;
    alreadyPaid: boolean;
  }[];
  priceIncreases: {
    merchant: string;
    previousAmount: number;
    newAmount: number;
    increasePercent: number;
    detectedDate: string;
  }[];
}

// 1. KNOWN SUBSCRIPTION MERCHANT REGISTRY (100+ Brands)
interface KnownProvider {
  keywords: string[];
  canonicalName: string;
  defaultCadence?: "monthly" | "annual";
  isUtility?: boolean;
}

const KNOWN_SUBSCRIPTION_PROVIDERS: KnownProvider[] = [
  // Streaming & Entertainment
  { keywords: ["SPOTIFY"], canonicalName: "SPOTIFY", defaultCadence: "monthly" },
  { keywords: ["NETFLIX"], canonicalName: "NETFLIX", defaultCadence: "monthly" },
  { keywords: ["DISNEY", "DISNEYPLUS", "DISNEY+"], canonicalName: "DISNEY+", defaultCadence: "monthly" },
  { keywords: ["HBOMAX", "HBO MAX", "MAX.COM", "HBO"], canonicalName: "MAX / HBO", defaultCadence: "monthly" },
  { keywords: ["AMAZON PRIME", "PRIME VIDEO", "AMZNPRIME"], canonicalName: "AMAZON PRIME", defaultCadence: "monthly" },
  { keywords: ["APPLE MUSIC", "APPLE.COM/BILL", "ITUNES", "ICLOUD"], canonicalName: "APPLE SERVICES", defaultCadence: "monthly" },
  { keywords: ["YOUTUBE", "YOUTUBEMEMBER", "GOOGLE *YOUTUBE"], canonicalName: "YOUTUBE PREMIUM", defaultCadence: "monthly" },
  { keywords: ["AUDIBLE"], canonicalName: "AUDIBLE", defaultCadence: "monthly" },
  { keywords: ["CRUNCHYROLL"], canonicalName: "CRUNCHYROLL", defaultCadence: "monthly" },
  { keywords: ["PARAMOUNT", "PARAMOUNT+"], canonicalName: "PARAMOUNT+", defaultCadence: "monthly" },
  { keywords: ["ELEVEN SPORTS", "DAZN ELEVEN"], canonicalName: "ELEVEN SPORTS", defaultCadence: "monthly" },
  { keywords: ["DAZN"], canonicalName: "DAZN", defaultCadence: "monthly" },
  { keywords: ["SPORT TV", "SPORTTV"], canonicalName: "SPORT TV", defaultCadence: "monthly" },
  { keywords: ["FILMIN"], canonicalName: "FILMIN", defaultCadence: "monthly" },
  { keywords: ["TIDAL"], canonicalName: "TIDAL", defaultCadence: "monthly" },
  { keywords: ["DEEZER"], canonicalName: "DEEZER", defaultCadence: "monthly" },

  // AI & Productivity Software
  { keywords: ["CHATGPT", "OPENAI"], canonicalName: "OPENAI / CHATGPT", defaultCadence: "monthly" },
  { keywords: ["CLAUDE", "ANTHROPIC"], canonicalName: "ANTHROPIC / CLAUDE", defaultCadence: "monthly" },
  { keywords: ["GITHUB"], canonicalName: "GITHUB", defaultCadence: "monthly" },
  { keywords: ["CURSOR", "ANYSWYS"], canonicalName: "CURSOR AI", defaultCadence: "monthly" },
  { keywords: ["MIDJOURNEY"], canonicalName: "MIDJOURNEY", defaultCadence: "monthly" },
  { keywords: ["NOTION"], canonicalName: "NOTION", defaultCadence: "monthly" },
  { keywords: ["FIGMA"], canonicalName: "FIGMA", defaultCadence: "monthly" },
  { keywords: ["ADOBE", "CREATIVE CLOUD"], canonicalName: "ADOBE CREATIVE CLOUD", defaultCadence: "monthly" },
  { keywords: ["GOOGLE ONE", "GOOGLE STORAGE", "GOOGLE WORKSPACE", "GSUITE"], canonicalName: "GOOGLE ONE / WORKSPACE", defaultCadence: "monthly" },
  { keywords: ["MICROSOFT", "MSFT", "OFFICE365", "O365"], canonicalName: "MICROSOFT 365", defaultCadence: "monthly" },
  { keywords: ["DROPBOX"], canonicalName: "DROPBOX", defaultCadence: "monthly" },
  { keywords: ["VERCEL"], canonicalName: "VERCEL", defaultCadence: "monthly" },
  { keywords: ["SUPABASE"], canonicalName: "SUPABASE", defaultCadence: "monthly" },
  { keywords: ["AWS", "AMAZON WEB SERVICES"], canonicalName: "AMAZON WEB SERVICES", defaultCadence: "monthly" },
  { keywords: ["DIGITALOCEAN", "DIGITAL OCEAN"], canonicalName: "DIGITALOCEAN", defaultCadence: "monthly" },
  { keywords: ["HEROKU"], canonicalName: "HEROKU", defaultCadence: "monthly" },
  { keywords: ["1PASSWORD", "AGILEBITS"], canonicalName: "1PASSWORD", defaultCadence: "monthly" },
  { keywords: ["BITWARDEN"], canonicalName: "BITWARDEN", defaultCadence: "annual" },
  { keywords: ["SETAPP"], canonicalName: "SETAPP", defaultCadence: "annual" },
  { keywords: ["CANVA"], canonicalName: "CANVA", defaultCadence: "monthly" },
  { keywords: ["GRAMMARLY"], canonicalName: "GRAMMARLY", defaultCadence: "monthly" },
  { keywords: ["LOOM"], canonicalName: "LOOM", defaultCadence: "monthly" },
  { keywords: ["LINEAR"], canonicalName: "LINEAR", defaultCadence: "monthly" },
  { keywords: ["RAYCAST"], canonicalName: "RAYCAST PRO", defaultCadence: "monthly" },

  // Telecom, Internet & Mobile
  { keywords: ["VODAFONE"], canonicalName: "VODAFONE", defaultCadence: "monthly", isUtility: true },
  { keywords: ["MEO", "ALTICE"], canonicalName: "MEO", defaultCadence: "monthly", isUtility: true },
  { keywords: ["NOS COMUNICACOES", "NOS LUSOMUNDO", "NOS TELECOM", "NOS"], canonicalName: "NOS", defaultCadence: "monthly", isUtility: true },
  { keywords: ["DIGI PORTUGAL", "DIGI"], canonicalName: "DIGI", defaultCadence: "monthly", isUtility: true },
  { keywords: ["NOWO"], canonicalName: "NOWO", defaultCadence: "monthly", isUtility: true },
  { keywords: ["ORANGE"], canonicalName: "ORANGE", defaultCadence: "monthly", isUtility: true },
  { keywords: ["MOVISTAR", "TELEFONICA"], canonicalName: "MOVISTAR", defaultCadence: "monthly", isUtility: true },
  { keywords: ["STARLINK"], canonicalName: "STARLINK", defaultCadence: "monthly", isUtility: true },

  // Utilities, Energy & Water (Variable Consumption)
  { keywords: ["EDP COMERCIAL", "EDP DISTRIBUICAO", "EDP SERVICOS", "EDP"], canonicalName: "EDP COMERCIAL", defaultCadence: "monthly", isUtility: true },
  { keywords: ["GALP POWER", "GALP ENERGIA", "GALP ON", "GALP"], canonicalName: "GALP ENERGIA", defaultCadence: "monthly", isUtility: true },
  { keywords: ["ENDESA"], canonicalName: "ENDESA", defaultCadence: "monthly", isUtility: true },
  { keywords: ["IBERDROLA"], canonicalName: "IBERDROLA", defaultCadence: "monthly", isUtility: true },
  { keywords: ["GOLDENERGY"], canonicalName: "GOLDENERGY", defaultCadence: "monthly", isUtility: true },
  { keywords: ["PLENITUDE"], canonicalName: "PLENITUDE", defaultCadence: "monthly", isUtility: true },
  { keywords: ["SMAS", "SERVICOS MUNICIPALIZADOS"], canonicalName: "SMAS AGUAS", defaultCadence: "monthly", isUtility: true },
  { keywords: ["EPAL"], canonicalName: "EPAL AGUAS", defaultCadence: "monthly", isUtility: true },
  { keywords: ["AGUAS DO PORTO", "AGUAS DE GAIA", "AGUAS DE CASCAIS", "AGUAS"], canonicalName: "AGUAS MUNICIPAIS", defaultCadence: "monthly", isUtility: true },

  // Fitness, Gyms & Sports
  { keywords: ["FITNESS HUT", "FITNESSHUT"], canonicalName: "FITNESS HUT", defaultCadence: "monthly" },
  { keywords: ["SOLINCA"], canonicalName: "SOLINCA", defaultCadence: "monthly" },
  { keywords: ["BASIC-FIT", "BASIC FIT"], canonicalName: "BASIC-FIT", defaultCadence: "monthly" },
  { keywords: ["HOLMES PLACE", "HOLMESPLACE"], canonicalName: "HOLMES PLACE", defaultCadence: "monthly" },
  { keywords: ["GO FIT", "GOFIT"], canonicalName: "GO FIT", defaultCadence: "monthly" },
  { keywords: ["ELEMENTS"], canonicalName: "ELEMENTS FITNESS", defaultCadence: "monthly" },
  { keywords: ["URBAN SPORTS CLUB", "URBAN SPORTS"], canonicalName: "URBAN SPORTS CLUB", defaultCadence: "monthly" },
  { keywords: ["GYMPASS", "WELLHUB"], canonicalName: "WELLHUB / GYMPASS", defaultCadence: "monthly" },
  { keywords: ["STRAVA"], canonicalName: "STRAVA", defaultCadence: "annual" },
  { keywords: ["WHOOP"], canonicalName: "WHOOP", defaultCadence: "monthly" },
  { keywords: ["ZWIFT"], canonicalName: "ZWIFT", defaultCadence: "monthly" },

  // Gaming & Memberships
  { keywords: ["PLAYSTATION", "PSN", "SONY PLAYSTATION"], canonicalName: "PLAYSTATION PLUS", defaultCadence: "monthly" },
  { keywords: ["XBOX", "GAME PASS", "MICROSOFT*XBOX"], canonicalName: "XBOX GAME PASS", defaultCadence: "monthly" },
  { keywords: ["NINTENDO"], canonicalName: "NINTENDO SWITCH ONLINE", defaultCadence: "annual" },
  { keywords: ["PATREON"], canonicalName: "PATREON", defaultCadence: "monthly" },
  { keywords: ["SUBSTACK"], canonicalName: "SUBSTACK", defaultCadence: "monthly" },
  { keywords: ["MEDIUM"], canonicalName: "MEDIUM", defaultCadence: "monthly" },
  { keywords: ["NEW YORK TIMES", "NYTIMES"], canonicalName: "THE NEW YORK TIMES", defaultCadence: "monthly" },
  { keywords: ["THE ECONOMIST", "ECONOMIST"], canonicalName: "THE ECONOMIST", defaultCadence: "monthly" },
  { keywords: ["FINANCIAL TIMES"], canonicalName: "FINANCIAL TIMES", defaultCadence: "monthly" },
  { keywords: ["PUBLICO", "JORNAL PUBLICO"], canonicalName: "JORNAL PUBLICO", defaultCadence: "monthly" },
  { keywords: ["EXPRESSO", "IMPRESA"], canonicalName: "JORNAL EXPRESSO", defaultCadence: "monthly" },
  { keywords: ["OBSERVADOR"], canonicalName: "OBSERVADOR", defaultCadence: "monthly" },

  // Insurance, Rent, Banking & Condominium
  { keywords: ["VICTORIA SEGUROS", "FIDELIDADE", "TRANQUILIDADE", "ALLIANZ", "MAPFRE", "GENERALI", "AGEAS"], canonicalName: "SEGUROS", defaultCadence: "monthly" },
  { keywords: ["CONDOMINIO", "ADMINISTRACAO DE CONDOMINIO"], canonicalName: "CONDOMINIO", defaultCadence: "monthly" }
];

// Sort providers so longer keywords match first (e.g. "DAZN ELEVEN" before "DAZN", "APPLE MUSIC" before "APPLE")
const SORTED_PROVIDERS = [...KNOWN_SUBSCRIPTION_PROVIDERS].sort((a, b) => {
  const maxA = Math.max(...a.keywords.map(k => k.length));
  const maxB = Math.max(...b.keywords.map(k => k.length));
  return maxB - maxA;
});

// 2. INSTITUTIONAL RECURRING / DIRECT DEBIT KEYWORDS
const DIRECT_DEBIT_PATTERNS = [
  "DEBITO DIRECTO",
  "DEBITO DIRETO",
  "DD ",
  "SEPA DD",
  "SEPA DIRECT DEBIT",
  "MENSALIDADE",
  "QUOTA",
  "AUTOPAY",
  "RECURRING",
  "SUBSCRIPTION",
  "PRESTACAO",
  "CREDITO HABITACAO",
  "AMORTIZACAO"
];

// 3. EXCLUDED FINANCIAL KEYWORDS (Rule 16: Brokerages, Transfers, Crypto, ATM withdrawals)
const EXCLUDED_FINANCIAL_KEYWORDS = [
  "XTB",
  "DEGIRO",
  "TRADE REPUBLIC",
  "TRADEREPUBLIC",
  "INTERACTIVE BROKERS",
  "IBKR",
  "BINANCE",
  "KRAKEN",
  "COINBASE",
  "INVESTIMENTO",
  "INVESTMENT",
  "POUPANCA",
  "SAVINGS",
  "TRANSFERENCIA",
  "TRANSFER",
  "LEVANTAMENTO",
  "ATM",
  "MULTIBANCO"
];

// 4. DISCRETIONARY RETAIL EXCLUSIONS (Supermarkets, Delivery, Fast-Fashion)
const DISCRETIONARY_RETAIL_KEYWORDS = [
  "PINGO DOCE",
  "CONTINENTE",
  "AUCHAN",
  "MERCADONA",
  "LIDL",
  "ALDI",
  "INTERMARCHE",
  "MINIPRECO",
  "EL CORTE INGLES",
  "UBER *TRIP",
  "UBER TRIP",
  "BOLT.EU",
  "BOLT TRIP",
  "GLOVO",
  "UBER *EATS",
  "ZARA",
  "PRIMARK",
  "PULL & BEAR",
  "STRADIVARIUS",
  "MANGO",
  "IKEA",
  "LEROY MERLIN",
  "DECATHLON",
  "WORTEN",
  "FNAC",
  "PADARIA PORTUGUESA",
  "STARBUCKS"
];

/**
 * Normalizes raw merchant strings from bank extracts into clean canonical titles.
 * Uses exact word-boundary matching for short acronyms to avoid false collisions.
 */
export function normalizeMerchantName(name: string): string {
  if (!name) return "UNKNOWN";
  const clean = name.trim().toUpperCase();

  // 1. Check Known Registry with boundary / substring safety
  for (const provider of SORTED_PROVIDERS) {
    for (const kw of provider.keywords) {
      if (kw.length <= 4) {
        // Strict word boundary for short keywords (e.g. MEO, NOS, EDP, DIGI)
        const regex = new RegExp(`(?:^|[^A-Z0-9])${kw}(?:$|[^A-Z0-9])`, "i");
        if (regex.test(clean)) {
          return provider.canonicalName.toUpperCase();
        }
      } else {
        if (clean.includes(kw)) {
          return provider.canonicalName.toUpperCase();
        }
      }
    }
  }

  // 2. Clean compound prefixes and suffixes
  let sanitized = clean
    .replace(/^(?:PAGAMENTO\s+|COMPRA\s+|DEBITO\s+DIRECTO\s+|DEBITO\s+DIRETO\s+|SEPA\s+DD\s+|DD\s+|MB\s+WAY\s+|MBWAY\s+|SIBS\s+|TRF\s+|TRANSFERENCIA\s+|PAG\s+|AUTOPAY\s+)+/gi, "")
    .replace(/\s+(?:LISBOA|PORTO|MADRID|LONDON|AMSTERDAM|IE|PT|ES|UK|US|LTD|SA|INC|ONLINE|WWW)\b/gi, "")
    .replace(/[*#_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return sanitized.toUpperCase() || name.trim().toUpperCase();
}

/**
 * Safe Month Date Addition (avoids JavaScript Jan 31 -> Mar 3 rollover bugs)
 */
function addMonthsSafe(date: Date, monthsToAdd: number): Date {
  const result = new Date(date);
  const targetMonth = result.getMonth() + monthsToAdd;
  result.setMonth(targetMonth);
  // If date rolled into unexpected month (e.g. Jan 31 + 1 mo = Mar 3), snap to last day of target month
  const expectedMonth = ((date.getMonth() + monthsToAdd) % 12 + 12) % 12;
  if (result.getMonth() !== expectedMonth) {
    result.setDate(0); // Snap to previous month's last valid day
  }
  return result;
}

export function detectRecurringCadence(
  expenses: any[],
  cycleStartDate?: string | Date,
  cycleEndDate?: string | Date,
  dismissedMerchants: string[] = [],
  cadenceOverrides: Record<string, "monthly" | "annual"> = {}
): CadenceAnalysisResult {
  // STRICT: Only real negative outflows (expenses), strictly exclude any positive inflow/income
  const expenseTransactions = expenses.filter((e) => {
    const amt = parseFloat(e.amount);
    return !isNaN(amt) && amt < 0 && e.is_income !== true && e.date;
  });

  const dismissedSet = new Set(dismissedMerchants.map(m => m.trim().toUpperCase()));

  // Group by normalized merchant
  const groups = new Map<string, any[]>();
  expenseTransactions.forEach((tx) => {
    const rawMerchant = tx.merchant || tx.raw_text || "UNSPECIFIED";
    const rawUpper = `${tx.merchant || ""} ${tx.raw_text || ""}`.toUpperCase();

    // Check if it's a brokerage/investment/transfer
    const isExcludedFinancial = EXCLUDED_FINANCIAL_KEYWORDS.some(kw => rawUpper.includes(kw));
    if (isExcludedFinancial) return;

    const norm = normalizeMerchantName(rawMerchant).toUpperCase();
    if (dismissedSet.has(norm)) return; // Skip dismissed

    if (!groups.has(norm)) {
      groups.set(norm, []);
    }
    groups.get(norm)!.push(tx);
  });

  const subscriptions: DetectedSubscription[] = [];
  const priceIncreases: CadenceAnalysisResult["priceIncreases"] = [];
  const now = new Date();

  groups.forEach((txs, normMerchant) => {
    // Sort chronologically ascending
    txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const amounts = txs.map((t) => Math.abs(parseFloat(t.amount)));
    const dates = txs.map((t) => new Date(t.date));
    const latestTx = txs[txs.length - 1];
    const latestAmount = amounts[amounts.length - 1];
    const latestDate = dates[dates.length - 1];
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const previousAmount = amounts.length >= 2 ? amounts[amounts.length - 2] : avgAmount;

    // Check if known provider
    const matchedProvider = SORTED_PROVIDERS.find(p => p.canonicalName.toUpperCase() === normMerchant);
    const isKnownProvider = Boolean(matchedProvider);
    const isUtility = Boolean(matchedProvider?.isUtility || /EDP|GALP|ENDESA|IBERDROLA|GOLDENERGY|SMAS|EPAL|AGUAS|MEO|NOS|VODAFONE|DIGI/i.test(normMerchant));

    // Check if bank raw text contains direct debit markers
    const hasDirectDebitFlag = txs.some(t => {
      const fullText = `${t.merchant || ""} ${t.raw_text || ""}`.toUpperCase();
      return DIRECT_DEBIT_PATTERNS.some(pat => fullText.includes(pat));
    });

    // Check if merchant matches discretionary retail / supermarkets (anti-false positive)
    const isDiscretionaryRetail = DISCRETIONARY_RETAIL_KEYWORDS.some(kw => normMerchant.includes(kw));

    // Calculate intervals between consecutive transactions in days
    const intervals: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      const diffMs = dates[i].getTime() - dates[i - 1].getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays > 0) intervals.push(diffDays);
    }

    const avgInterval = intervals.length > 0 ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 30;

    // Density test: if transactions happen multiple times a month without direct debit, reject discretionary burst
    const hasShortInterval = intervals.some(inv => inv < 18);
    if (isDiscretionaryRetail && !hasDirectDebitFlag) {
      // Discretionary supermarkets/cafes rejected unless explicitly pinned by user
      const userOverride = cadenceOverrides[normMerchant.toUpperCase()];
      if (!userOverride) return;
    }
    if (hasShortInterval && !hasDirectDebitFlag && !isKnownProvider) {
      const userOverride = cadenceOverrides[normMerchant.toUpperCase()];
      if (!userOverride) return; // Discard high-frequency discretionary spending
    }

    // Classify Cadence strictly into "monthly" or "annual" (Rule 16)
    let cadence: "monthly" | "annual" = matchedProvider?.defaultCadence || "monthly";
    let confidence = 0.6;
    let source: DetectedSubscription["source"] = "empirical_cadence";

    const userOverride = cadenceOverrides[normMerchant.toUpperCase()];
    if (userOverride === "monthly" || userOverride === "annual") {
      cadence = userOverride;
      confidence = 1.0;
      source = "user_pinned";
    } else if (avgInterval >= 180 || (latestAmount >= 45 && (isKnownProvider || /ANNUAL|ANUAL|1 YEAR|RENOVACAO/i.test(normMerchant)) && (txs.length === 1 || avgInterval > 60))) {
      cadence = "annual";
      confidence = 0.88;
      source = isKnownProvider ? "known_registry" : "empirical_cadence";
    } else {
      cadence = "monthly";
      confidence = 0.90;
    }

    // Eligibility check
    if (userOverride) {
      // Explicit user pin -> always allowed
    } else if (isKnownProvider) {
      source = "known_registry";
      confidence = 0.98;
    } else if (hasDirectDebitFlag) {
      source = "direct_debit_keyword";
      confidence = 0.92;
    } else if (txs.length >= 2) {
      // Check day of month stability or interval stability
      const daysOfMonth = dates.map((d) => d.getDate());
      const dayDiffs = daysOfMonth.map((d) => Math.abs(d - daysOfMonth[0]));
      const isConsistentDay = dayDiffs.every((d) => d <= 4);

      if (isConsistentDay || (avgInterval >= 20 && avgInterval <= 45)) {
        source = "empirical_cadence";
        confidence = 0.88;
      } else if (avgInterval >= 320 && avgInterval <= 400) {
        cadence = "annual";
        source = "empirical_cadence";
        confidence = 0.85;
      } else {
        // High variation without direct debit -> skip
        return;
      }
    } else {
      // 1 single transaction without registry or direct debit -> skip
      return;
    }

    // Compute expected next charge date safely without month rollover bugs
    let nextDate: Date;
    if (cadence === "annual") {
      nextDate = new Date(latestDate);
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    } else {
      nextDate = addMonthsSafe(latestDate, 1);
    }

    // Strict Recency Check (Rule 16 Invariant):
    // Drop anything inactive >38 days (monthly) or >380 days (annual)
    const allDates = expenseTransactions.map(e => new Date(e.date).getTime()).filter(t => !isNaN(t));
    const maxDatasetDate = allDates.length > 0 ? new Date(Math.max(...allDates)) : new Date();
    const refDate = cycleEndDate ? new Date(cycleEndDate) : (now > maxDatasetDate ? now : maxDatasetDate);
    const daysSinceLast = Math.round((refDate.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));

    if (cadence === "monthly" && daysSinceLast > 38) {
      return; // Inactive >38 days
    }
    if (cadence === "annual" && daysSinceLast > 380) {
      return; // Inactive >380 days
    }

    let status: DetectedSubscription["status"] = "active";

    // Like-for-Like Price Change Detection (Rule 16 Invariant)
    // Avoid false price jump spikes when shifting between monthly and annual plans
    let priceChangePercent: number | undefined;
    let priceChangeAmount: number | undefined;

    const isCadenceShiftToAnnual = cadence === "annual" && previousAmount < 35 && latestAmount >= previousAmount * 3.0;
    const compLatest = isCadenceShiftToAnnual ? latestAmount / 12 : latestAmount;
    const compPrev = previousAmount;

    // Suppress price hike alerts on variable utilities (EDP, Water, Gas) where bills fluctuate naturally
    const allowPriceHikeAlert = !isUtility;

    if (
      allowPriceHikeAlert &&
      txs.length >= 2 &&
      compLatest >= compPrev * 1.05 &&
      Math.abs(compLatest - compPrev) >= 0.25
    ) {
      status = "price_jump";
      priceChangePercent = ((compLatest - compPrev) / compPrev) * 100;
      priceChangeAmount = compLatest - compPrev;

      priceIncreases.push({
        merchant: normMerchant.toUpperCase(),
        previousAmount: Math.round(compPrev * 100) / 100,
        newAmount: Math.round(compLatest * 100) / 100,
        increasePercent: Math.round(priceChangePercent * 10) / 10,
        detectedDate: latestDate.toISOString(),
      });
    }

    subscriptions.push({
      id: `sub-${normMerchant.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      merchant: normMerchant.toUpperCase(),
      normalizedMerchant: normMerchant.toUpperCase(),
      categoryName: (latestTx.category?.name || latestTx.categories?.name || (isUtility ? "UTILITIES" : "RECURRING BILL")).toUpperCase(),
      categoryId: latestTx.category_id,
      averageAmount: Math.round(avgAmount * 100) / 100,
      latestAmount: Math.round(latestAmount * 100) / 100,
      historicalAmounts: amounts,
      cadence,
      intervalDays: Math.round(avgInterval),
      confidence: Math.round(confidence * 100) / 100,
      occurrences: txs.length,
      firstSeenDate: dates[0].toISOString(),
      latestDate: latestDate.toISOString(),
      nextExpectedDate: nextDate.toISOString(),
      expectedDayOfMonth: latestDate.getDate(),
      status,
      priceChangePercent: priceChangePercent ? Math.round(priceChangePercent * 10) / 10 : undefined,
      priceChangeAmount: priceChangeAmount ? Math.round(priceChangeAmount * 100) / 100 : undefined,
      isUtility,
      source,
    });
  });

  // Calculate total monthly and annual commitments
  let totalMonthlyCommitment = 0;
  subscriptions.forEach((sub) => {
    if (sub.status === "cancelled") return;
    if (sub.cadence === "monthly") totalMonthlyCommitment += sub.latestAmount;
    else if (sub.cadence === "annual") totalMonthlyCommitment += sub.latestAmount / 12;
  });

  totalMonthlyCommitment = Math.round(totalMonthlyCommitment * 100) / 100;
  const totalAnnualCommitment = Math.round(totalMonthlyCommitment * 12 * 100) / 100;

  // Upcoming in current cycle
  const upcomingInCurrentCycle: CadenceAnalysisResult["upcomingInCurrentCycle"] = [];
  const cycleStart = cycleStartDate ? new Date(cycleStartDate) : new Date(now.getFullYear(), now.getMonth(), 1);
  const cycleEnd = cycleEndDate ? new Date(cycleEndDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0);

  subscriptions.forEach((sub) => {
    if (sub.status === "cancelled") return;
    const isPaidInCycle = new Date(sub.latestDate) >= cycleStart && new Date(sub.latestDate) <= cycleEnd;

    upcomingInCurrentCycle.push({
      merchant: sub.merchant.toUpperCase(),
      amount: sub.latestAmount,
      expectedDate: sub.nextExpectedDate,
      alreadyPaid: isPaidInCycle,
    });
  });

  return {
    subscriptions: subscriptions.sort((a, b) => b.latestAmount - a.latestAmount),
    totalMonthlyCommitment,
    totalAnnualCommitment,
    upcomingInCurrentCycle,
    priceIncreases,
  };
}
