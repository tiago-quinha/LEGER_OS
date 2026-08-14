/**
 * LEGER_OS Cadence & Subscription Detection Engine
 * High-precision algorithm to identify recurring bills, subscriptions, and cadence drift.
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
  cadence: "weekly" | "bi-weekly" | "monthly" | "quarterly" | "annual" | "irregular";
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

function normalizeMerchantName(name: string): string {
  if (!name) return "UNKNOWN";
  let clean = name.trim().toUpperCase();
  
  // Strip common bank prefix/suffix noise (e.g. "PAGAMENTO MBWAY", "COMPRA CC", "DD DEBIT", "*PT", "WWW.")
  clean = clean
    .replace(/^(PAGAMENTO|COMPRA|DEBITO DIRECTO|DD|MB WAY|MBWAY|SIBS|TRF|TRANSFERENCIA)\s+/i, "")
    .replace(/\s+(LISBOA|PORTO|MADRID|LONDON|AMSTERDAM|IE|PT|ES|UK|US|LTD|SA|INC|ONLINE|WWW)\b/gi, "")
    .replace(/[0-9*#_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Known brand aliases
  if (clean.includes("SPOTIFY")) return "SPOTIFY";
  if (clean.includes("NETFLIX")) return "NETFLIX";
  if (clean.includes("AMAZON PRIME") || clean.includes("PRIME VIDEO")) return "AMAZON PRIME";
  if (clean.includes("APPLE") || clean.includes("ICLOUD") || clean.includes("ITUNES")) return "APPLE SERVICES";
  if (clean.includes("GOOGLE") || clean.includes("YOUTUBE") || clean.includes("GSUITE")) return "GOOGLE / YOUTUBE";
  if (clean.includes("CHATGPT") || clean.includes("OPENAI")) return "OPENAI / CHATGPT";
  if (clean.includes("DISNEY")) return "DISNEY+";
  if (clean.includes("VODAFONE")) return "VODAFONE";
  if (clean.includes("MEO")) return "MEO";
  if (clean.includes("NOS COMUNICACOES")) return "NOS";
  if (clean.includes("EDP")) return "EDP COMERCIAL";
  if (clean.includes("FITNESS") || clean.includes("GYM") || clean.includes("SOLINCA") || clean.includes("FIT")) return clean;

  return clean || name.trim().toUpperCase();
}

export function detectRecurringCadence(
  expenses: any[],
  cycleStartDate?: string | Date,
  cycleEndDate?: string | Date
): CadenceAnalysisResult {
  const expenseTransactions = expenses.filter(
    (e) => (parseFloat(e.amount) < 0 || e.is_income === false) && e.date
  );

  // Group by normalized merchant
  const groups = new Map<string, any[]>();
  expenseTransactions.forEach((tx) => {
    const rawMerchant = tx.merchant || tx.raw_text || "Unspecified";
    const norm = normalizeMerchantName(rawMerchant);
    if (!groups.has(norm)) {
      groups.set(norm, []);
    }
    groups.get(norm)!.push(tx);
  });

  const subscriptions: DetectedSubscription[] = [];
  const priceIncreases: CadenceAnalysisResult["priceIncreases"] = [];

  const now = new Date();

  groups.forEach((txs, normMerchant) => {
    // Need at least 2 charges to identify a cadence
    if (txs.length < 2) return;

    // Sort ascending by date
    txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const amounts = txs.map((t) => Math.abs(parseFloat(t.amount)));
    const dates = txs.map((t) => new Date(t.date));

    // Calculate intervals between consecutive transactions in days
    const intervals: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      const diffMs = dates[i].getTime() - dates[i - 1].getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays > 0) intervals.push(diffDays);
    }

    if (intervals.length === 0) return;

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const latestAmount = amounts[amounts.length - 1];
    const previousAmount = amounts.length >= 2 ? amounts[amounts.length - 2] : avgAmount;

    // Check amount stability (coefficient of variation)
    const variance = amounts.reduce((sum, a) => sum + Math.pow(a - avgAmount, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);
    const amountCoeffVar = avgAmount > 0 ? stdDev / avgAmount : 1;

    // Classify Cadence
    let cadence: DetectedSubscription["cadence"] = "irregular";
    let confidence = 0.5;

    if (avgInterval >= 5 && avgInterval <= 9) {
      cadence = "weekly";
      confidence = 0.9 - Math.min(0.4, amountCoeffVar);
    } else if (avgInterval >= 12 && avgInterval <= 16) {
      cadence = "bi-weekly";
      confidence = 0.85 - Math.min(0.4, amountCoeffVar);
    } else if (avgInterval >= 25 && avgInterval <= 34) {
      cadence = "monthly";
      confidence = 0.95 - Math.min(0.3, amountCoeffVar);
    } else if (avgInterval >= 80 && avgInterval <= 100) {
      cadence = "quarterly";
      confidence = 0.85 - Math.min(0.3, amountCoeffVar);
    } else if (avgInterval >= 340 && avgInterval <= 380) {
      cadence = "annual";
      confidence = 0.8 - Math.min(0.3, amountCoeffVar);
    } else {
      // Check if day of month is consistently identical despite interval jitter
      const daysOfMonth = dates.map((d) => d.getDate());
      const dayDiffs = daysOfMonth.map((d) => Math.abs(d - daysOfMonth[0]));
      const isSameDayOfMonth = dayDiffs.every((d) => d <= 3);
      if (isSameDayOfMonth && avgInterval >= 20 && avgInterval <= 45) {
        cadence = "monthly";
        confidence = 0.88;
      }
    }

    // Filter out highly variable non-subscriptions (e.g. random grocery trips) unless amount is very consistent
    if (cadence === "irregular" || confidence < 0.6) {
      if (amountCoeffVar < 0.15 && txs.length >= 3 && avgInterval >= 20 && avgInterval <= 40) {
        cadence = "monthly";
        confidence = 0.75;
      } else {
        return;
      }
    }

    // Compute expected next charge date
    const latestDate = dates[dates.length - 1];
    const nextDate = new Date(latestDate);
    if (cadence === "weekly") {
      nextDate.setDate(nextDate.getDate() + 7);
    } else if (cadence === "bi-weekly") {
      nextDate.setDate(nextDate.getDate() + 14);
    } else if (cadence === "monthly") {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else if (cadence === "quarterly") {
      nextDate.setMonth(nextDate.getMonth() + 3);
    } else if (cadence === "annual") {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    } else {
      nextDate.setDate(nextDate.getDate() + Math.round(avgInterval));
    }

    // Status check
    const daysSinceLast = Math.round((now.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));
    const maxExpectedDays = avgInterval * 1.5;
    let status: DetectedSubscription["status"] = "active";

    if (daysSinceLast > avgInterval * 2.5) {
      status = "cancelled";
    } else if (daysSinceLast > maxExpectedDays) {
      status = "overdue";
    }

    // Price change detector (increase >= 5% compared to previous baseline)
    let priceChangePercent: number | undefined;
    let priceChangeAmount: number | undefined;
    if (latestAmount > previousAmount * 1.05 && Math.abs(latestAmount - previousAmount) >= 0.5) {
      status = "price_jump";
      priceChangePercent = ((latestAmount - previousAmount) / previousAmount) * 100;
      priceChangeAmount = latestAmount - previousAmount;

      priceIncreases.push({
        merchant: normMerchant,
        previousAmount,
        newAmount: latestAmount,
        increasePercent: Math.round(priceChangePercent * 10) / 10,
        detectedDate: latestDate.toISOString(),
      });
    }

    const latestTx = txs[txs.length - 1];

    subscriptions.push({
      id: `sub-${normMerchant.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      merchant: latestTx.merchant || normMerchant,
      normalizedMerchant: normMerchant,
      categoryName: latestTx.category?.name || latestTx.categories?.name,
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
    });
  });

  // Calculate total monthly equivalent commitments
  let totalMonthlyCommitment = 0;
  subscriptions.forEach((sub) => {
    if (sub.status === "cancelled") return;
    if (sub.cadence === "monthly") totalMonthlyCommitment += sub.latestAmount;
    else if (sub.cadence === "weekly") totalMonthlyCommitment += sub.latestAmount * 4.33;
    else if (sub.cadence === "bi-weekly") totalMonthlyCommitment += sub.latestAmount * 2.165;
    else if (sub.cadence === "quarterly") totalMonthlyCommitment += sub.latestAmount / 3;
    else if (sub.cadence === "annual") totalMonthlyCommitment += sub.latestAmount / 12;
  });

  totalMonthlyCommitment = Math.round(totalMonthlyCommitment * 100) / 100;
  const totalAnnualCommitment = Math.round(totalMonthlyCommitment * 12 * 100) / 100;

  // Calculate upcoming in current paycheck cycle
  const upcomingInCurrentCycle: CadenceAnalysisResult["upcomingInCurrentCycle"] = [];
  const cycleStart = cycleStartDate ? new Date(cycleStartDate) : new Date(now.getFullYear(), now.getMonth(), 1);
  const cycleEnd = cycleEndDate ? new Date(cycleEndDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0);

  subscriptions.forEach((sub) => {
    if (sub.status === "cancelled") return;
    const nextD = new Date(sub.nextExpectedDate);
    const isPaidInCycle = new Date(sub.latestDate) >= cycleStart && new Date(sub.latestDate) <= cycleEnd;

    upcomingInCurrentCycle.push({
      merchant: sub.merchant,
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
