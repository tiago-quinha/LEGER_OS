/**
 * LEGER_OS Cadence & Subscription Detection Engine
 * High-precision algorithm to identify recurring bills, subscriptions, and silent price hikes.
 * 
 * 4-Layer Detection Architecture:
 * 1. Known Subscription Merchant Registry (Instant 1st-Charge Detection)
 * 2. Bank Extract Direct Debit & Institutional Keywords (SEPA, DD, Mensalidade, etc.)
 * 3. Empirical Recency, Day-of-Month & Interval Clustering
 * 4. User Manual Overrides & Exclusions (Persistent via localStorage)
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
}

const KNOWN_SUBSCRIPTION_PROVIDERS: KnownProvider[] = [
  // Streaming & Entertainment
  { keywords: ["SPOTIFY"], canonicalName: "SPOTIFY" },
  { keywords: ["NETFLIX"], canonicalName: "NETFLIX" },
  { keywords: ["DISNEY", "DISNEYPLUS", "DISNEY+"], canonicalName: "DISNEY+" },
  { keywords: ["HBO", "HBOMAX", "MAX.COM"], canonicalName: "MAX / HBO" },
  { keywords: ["AMAZON PRIME", "PRIME VIDEO", "AMZNPRIME"], canonicalName: "AMAZON PRIME" },
  { keywords: ["APPLE MUSIC", "APPLE.COM/BILL", "ITUNES", "ICLOUD"], canonicalName: "APPLE SERVICES" },
  { keywords: ["YOUTUBE", "YOUTUBEMEMBER", "GOOGLE *YOUTUBE"], canonicalName: "YOUTUBE PREMIUM" },
  { keywords: ["AUDIBLE"], canonicalName: "AUDIBLE" },
  { keywords: ["CRUNCHYROLL"], canonicalName: "CRUNCHYROLL" },
  { keywords: ["PARAMOUNT"], canonicalName: "PARAMOUNT+" },
  { keywords: ["DAZN"], canonicalName: "DAZN" },
  { keywords: ["SPORT TV", "SPORTTV"], canonicalName: "SPORT TV" },
  { keywords: ["ELEVEN SPORTS", "DAZN ELEVEN"], canonicalName: "ELEVEN SPORTS" },
  { keywords: ["FILMIN"], canonicalName: "FILMIN" },
  { keywords: ["TIDAL"], canonicalName: "TIDAL" },
  { keywords: ["DEEZER"], canonicalName: "DEEZER" },

  // AI & Productivity Software
  { keywords: ["CHATGPT", "OPENAI"], canonicalName: "OPENAI / CHATGPT" },
  { keywords: ["CLAUDE", "ANTHROPIC"], canonicalName: "ANTHROPIC / CLAUDE" },
  { keywords: ["GITHUB"], canonicalName: "GITHUB" },
  { keywords: ["CURSOR", "ANYSWYS"], canonicalName: "CURSOR AI" },
  { keywords: ["MIDJOURNEY"], canonicalName: "MIDJOURNEY" },
  { keywords: ["NOTION"], canonicalName: "NOTION" },
  { keywords: ["FIGMA"], canonicalName: "FIGMA" },
  { keywords: ["ADOBE", "CREATIVE CLOUD"], canonicalName: "ADOBE CREATIVE CLOUD" },
  { keywords: ["GOOGLE ONE", "GOOGLE STORAGE", "GOOGLE WORKSPACE", "GSUITE"], canonicalName: "GOOGLE ONE / WORKSPACE" },
  { keywords: ["MICROSOFT", "MSFT", "OFFICE365", "O365"], canonicalName: "MICROSOFT 365" },
  { keywords: ["DROPBOX"], canonicalName: "DROPBOX" },
  { keywords: ["VERCEL"], canonicalName: "VERCEL" },
  { keywords: ["SUPABASE"], canonicalName: "SUPABASE" },
  { keywords: ["AWS", "AMAZON WEB SERVICES"], canonicalName: "AMAZON WEB SERVICES" },
  { keywords: ["DIGITALOCEAN", "DIGITAL OCEAN"], canonicalName: "DIGITALOCEAN" },
  { keywords: ["HEROKU"], canonicalName: "HEROKU" },
  { keywords: ["1PASSWORD", "AGILEBITS"], canonicalName: "1PASSWORD" },
  { keywords: ["BITWARDEN"], canonicalName: "BITWARDEN" },
  { keywords: ["SETAPP"], canonicalName: "SETAPP" },
  { keywords: ["CANVA"], canonicalName: "CANVA" },
  { keywords: ["GRAMMARLY"], canonicalName: "GRAMMARLY" },
  { keywords: ["LOOM"], canonicalName: "LOOM" },
  { keywords: ["LINEAR"], canonicalName: "LINEAR" },
  { keywords: ["RAYCAST"], canonicalName: "RAYCAST PRO" },

  // Telecom, Internet & Mobile
  { keywords: ["VODAFONE"], canonicalName: "VODAFONE" },
  { keywords: ["MEO", "ALTICE"], canonicalName: "MEO" },
  { keywords: ["NOS COMUNICACOES", "NOS LUSOMUNDO", "NOS TELECOM"], canonicalName: "NOS" },
  { keywords: ["DIGI PORTUGAL", "DIGI"], canonicalName: "DIGI" },
  { keywords: ["NOWO"], canonicalName: "NOWO" },
  { keywords: ["ORANGE"], canonicalName: "ORANGE" },
  { keywords: ["MOVISTAR", "TELEFONICA"], canonicalName: "MOVISTAR" },
  { keywords: ["STARLINK"], canonicalName: "STARLINK" },

  // Utilities, Energy & Water
  { keywords: ["EDP COMERCIAL", "EDP DISTRIBUICAO", "EDP SERVICOS"], canonicalName: "EDP COMERCIAL" },
  { keywords: ["GALP POWER", "GALP ENERGIA", "GALP ON"], canonicalName: "GALP ENERGIA" },
  { keywords: ["ENDESA"], canonicalName: "ENDESA" },
  { keywords: ["IBERDROLA"], canonicalName: "IBERDROLA" },
  { keywords: ["GOLDENERGY"], canonicalName: "GOLDENERGY" },
  { keywords: ["PLENITUDE"], canonicalName: "PLENITUDE" },
  { keywords: ["SMAS", "SERVICOS MUNICIPALIZADOS"], canonicalName: "SMAS AGUAS" },
  { keywords: ["EPAL"], canonicalName: "EPAL AGUAS" },
  { keywords: ["AGUAS DO PORTO", "AGUAS DE GAIA", "AGUAS DE CASCAIS"], canonicalName: "AGUAS MUNICIPAIS" },

  // Fitness, Gyms & Sports
  { keywords: ["FITNESS HUT", "FITNESSHUT"], canonicalName: "FITNESS HUT" },
  { keywords: ["SOLINCA"], canonicalName: "SOLINCA" },
  { keywords: ["BASIC-FIT", "BASIC FIT"], canonicalName: "BASIC-FIT" },
  { keywords: ["HOLMES PLACE", "HOLMESPLACE"], canonicalName: "HOLMES PLACE" },
  { keywords: ["GO FIT", "GOFIT"], canonicalName: "GO FIT" },
  { keywords: ["ELEMENTS"], canonicalName: "ELEMENTS FITNESS" },
  { keywords: ["URBAN SPORTS CLUB", "URBAN SPORTS"], canonicalName: "URBAN SPORTS CLUB" },
  { keywords: ["GYMPASS", "WELLHUB"], canonicalName: "WELLHUB / GYMPASS" },
  { keywords: ["STRAVA"], canonicalName: "STRAVA" },
  { keywords: ["WHOOP"], canonicalName: "WHOOP" },
  { keywords: ["ZWIFT"], canonicalName: "ZWIFT" },

  // Gaming & Memberships
  { keywords: ["PLAYSTATION", "PSN", "SONY PLAYSTATION"], canonicalName: "PLAYSTATION PLUS" },
  { keywords: ["XBOX", "GAME PASS", "MICROSOFT*XBOX"], canonicalName: "XBOX GAME PASS" },
  { keywords: ["NINTENDO"], canonicalName: "NINTENDO SWITCH ONLINE" },
  { keywords: ["PATREON"], canonicalName: "PATREON" },
  { keywords: ["SUBSTACK"], canonicalName: "SUBSTACK" },
  { keywords: ["MEDIUM"], canonicalName: "MEDIUM" },
  { keywords: ["NEW YORK TIMES", "NYTIMES"], canonicalName: "THE NEW YORK TIMES" },
  { keywords: ["THE ECONOMIST", "ECONOMIST"], canonicalName: "THE ECONOMIST" },
  { keywords: ["FINANCIAL TIMES"], canonicalName: "FINANCIAL TIMES" },
  { keywords: ["PUBLICO", "JORNAL PUBLICO"], canonicalName: "JORNAL PUBLICO" },
  { keywords: ["EXPRESSO", "IMPRESA"], canonicalName: "JORNAL EXPRESSO" },
  { keywords: ["OBSERVADOR"], canonicalName: "OBSERVADOR" },

  // Insurance, Rent, Banking & Condominium
  { keywords: ["VICTORIA SEGUROS", "FIDELIDADE", "TRANQUILIDADE", "ALLIANZ", "MAPFRE", "GENERALI", "AGEAS"], canonicalName: "SEGUROS" },
  { keywords: ["CONDOMINIO", "ADMINISTRACAO DE CONDOMINIO"], canonicalName: "CONDOMINIO" }
];

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

export function normalizeMerchantName(name: string): string {
  if (!name) return "UNKNOWN";
  let clean = name.trim().toUpperCase();

  // Check known registry first
  for (const provider of KNOWN_SUBSCRIPTION_PROVIDERS) {
    for (const kw of provider.keywords) {
      if (clean.includes(kw)) {
        return provider.canonicalName.toUpperCase();
      }
    }
  }

  // Strip bank prefix / suffix noise
  clean = clean
    .replace(/^(PAGAMENTO|COMPRA|DEBITO DIRECTO|DEBITO DIRETO|DD|MB WAY|MBWAY|SIBS|TRF|TRANSFERENCIA|PAG|AUTOPAY)\s+/gi, "")
    .replace(/\s+(LISBOA|PORTO|MADRID|LONDON|AMSTERDAM|IE|PT|ES|UK|US|LTD|SA|INC|ONLINE|WWW|PT)\b/gi, "")
    .replace(/[0-9*#_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return clean.toUpperCase() || name.trim().toUpperCase();
}

export function detectRecurringCadence(
  expenses: any[],
  cycleStartDate?: string | Date,
  cycleEndDate?: string | Date,
  dismissedMerchants: string[] = []
): CadenceAnalysisResult {
  const expenseTransactions = expenses.filter(
    (e) => (parseFloat(e.amount) < 0 || e.is_income === false) && e.date
  );

  const dismissedSet = new Set(dismissedMerchants.map(m => m.trim().toUpperCase()));

  // Group by normalized merchant
  const groups = new Map<string, any[]>();
  expenseTransactions.forEach((tx) => {
    const rawMerchant = tx.merchant || tx.raw_text || "UNSPECIFIED";
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
    // Sort ascending by date
    txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const amounts = txs.map((t) => Math.abs(parseFloat(t.amount)));
    const dates = txs.map((t) => new Date(t.date));
    const latestTx = txs[txs.length - 1];
    const latestAmount = amounts[amounts.length - 1];
    const latestDate = dates[dates.length - 1];
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const previousAmount = amounts.length >= 2 ? amounts[amounts.length - 2] : avgAmount;

    // Check if known provider
    const isKnownProvider = KNOWN_SUBSCRIPTION_PROVIDERS.some(p => p.canonicalName.toUpperCase() === normMerchant);
    
    // Check if bank raw text contains direct debit markers
    const hasDirectDebitFlag = txs.some(t => {
      const fullText = `${t.merchant || ""} ${t.raw_text || ""}`.toUpperCase();
      return DIRECT_DEBIT_PATTERNS.some(pat => fullText.includes(pat));
    });

    // Calculate intervals between consecutive transactions in days
    const intervals: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      const diffMs = dates[i].getTime() - dates[i - 1].getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays > 0) intervals.push(diffDays);
    }

    const avgInterval = intervals.length > 0 ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 30;

    // Classify Cadence strictly into "monthly" or "annual"
    let cadence: "monthly" | "annual" = "monthly";
    let confidence = 0.6;
    let source: DetectedSubscription["source"] = "empirical_cadence";

    if (avgInterval >= 180 || (latestAmount > 50 && isKnownProvider && avgInterval > 60)) {
      cadence = "annual";
      confidence = 0.85;
    } else {
      cadence = "monthly";
      confidence = 0.90;
    }

    // Eligibility check
    if (isKnownProvider) {
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
        // High variation, not a subscription
        return;
      }
    } else {
      // 1 single transaction and not known provider/direct debit -> skip
      return;
    }

    // Compute expected next charge date
    const nextDate = new Date(latestDate);
    if (cadence === "annual") {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    } else {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }

    // Strict Recency Check:
    // Drop anything that hasn't charged in the last ~1 month (for monthly) or ~1 year (for annual)
    const allDates = expenseTransactions.map(e => new Date(e.date).getTime()).filter(t => !isNaN(t));
    const maxDatasetDate = allDates.length > 0 ? new Date(Math.max(...allDates)) : new Date();
    const refDate = cycleEndDate ? new Date(cycleEndDate) : (now > maxDatasetDate ? now : maxDatasetDate);
    const daysSinceLast = Math.round((refDate.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));

    if (cadence === "monthly" && daysSinceLast > 38) {
      return; // Hasn't happened in the last month -> do not display
    }
    if (cadence === "annual" && daysSinceLast > 380) {
      return; // Hasn't happened in the last year -> do not display
    }

    let status: DetectedSubscription["status"] = "active";

    // Price change detector (increase >= 5% compared to previous baseline)
    let priceChangePercent: number | undefined;
    let priceChangeAmount: number | undefined;
    if (txs.length >= 2 && latestAmount > previousAmount * 1.05 && Math.abs(latestAmount - previousAmount) >= 0.45) {
      status = "price_jump";
      priceChangePercent = ((latestAmount - previousAmount) / previousAmount) * 100;
      priceChangeAmount = latestAmount - previousAmount;

      priceIncreases.push({
        merchant: normMerchant.toUpperCase(),
        previousAmount,
        newAmount: latestAmount,
        increasePercent: Math.round(priceChangePercent * 10) / 10,
        detectedDate: latestDate.toISOString(),
      });
    }

    subscriptions.push({
      id: `sub-${normMerchant.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      merchant: normMerchant.toUpperCase(),
      normalizedMerchant: normMerchant.toUpperCase(),
      categoryName: (latestTx.category?.name || latestTx.categories?.name || "RECURRING BILL").toUpperCase(),
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
