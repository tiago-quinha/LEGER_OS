export const SUPPORTED_CURRENCIES: Record<string, { symbol: string; name: string }> = {
  EUR: { symbol: "€", name: "Euro (€)" },
  USD: { symbol: "$", name: "US Dollar ($)" },
  GBP: { symbol: "£", name: "British Pound (£)" },
  BRL: { symbol: "R$", name: "Brazilian Real (R$)" },
  CAD: { symbol: "C$", name: "Canadian Dollar (C$)" },
  AUD: { symbol: "A$", name: "Australian Dollar (A$)" },
  JPY: { symbol: "¥", name: "Japanese Yen (¥)" },
  CHF: { symbol: "CHF", name: "Swiss Franc (CHF)" },
};

export const SUPPORTED_LANGUAGES: Record<string, { name: string }> = {
  "en-US": { name: "English (US)" },
  "en-GB": { name: "English (UK)" },
  "pt-PT": { name: "Português (Portugal)" },
  "pt-BR": { name: "Português (Brasil)" },
  "es-ES": { name: "Español (España)" },
  "es-MX": { name: "Español (México)" },
  "fr-FR": { name: "Français (France)" },
  "de-DE": { name: "Deutsch (Deutschland)" },
  "it-IT": { name: "Italiano (Italia)" },
  "nl-NL": { name: "Nederlands (Nederland)" },
  "ja-JP": { name: "日本語 (Japanese)" },
  "zh-CN": { name: "简体中文 (Chinese)" },
};

export function getCurrencySymbol(currencyCode: string = "EUR"): string {
  return SUPPORTED_CURRENCIES[currencyCode]?.symbol || currencyCode || "€";
}

export function formatCurrency(amount: number | string, currencyCode: string = "EUR", decimals: number = 2): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return `${getCurrencySymbol(currencyCode)}0.00`;
  const symbol = getCurrencySymbol(currencyCode);
  const formattedNum = Math.abs(num).toFixed(decimals);
  return num < 0 ? `-${symbol}${formattedNum}` : `${symbol}${formattedNum}`;
}

export const PRO_PRICING: Record<string, { amount: string }> = {
  EUR: { amount: "4.99" },
  USD: { amount: "5.50" },
  GBP: { amount: "4.50" },
  BRL: { amount: "29.50" },
  CAD: { amount: "7.50" },
  AUD: { amount: "8.50" },
  JPY: { amount: "800" },
  CHF: { amount: "4.50" },
};

export function getProPrice(currencyCode: string = "EUR"): { amount: string; symbol: string; formatted: string } {
  const symbol = getCurrencySymbol(currencyCode);
  const info = PRO_PRICING[currencyCode];
  if (info) {
    return { amount: info.amount, symbol, formatted: `${symbol}${info.amount}` };
  }
  return { amount: "4.99", symbol, formatted: `${symbol}4.99` };
}

export function formatDate(dateStr: string | Date, locale: string = "en-US"): string {
  try {
    const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    return d.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return String(dateStr);
  }
}

