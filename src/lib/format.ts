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
  "pt-BR": { name: "Português (Brasil)" },
  "es-ES": { name: "Español" },
  "de-DE": { name: "Deutsch" },
  "fr-FR": { name: "Français" },
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

export function formatDate(dateStr: string | Date, locale: string = "en-US"): string {
  try {
    const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    return d.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return String(dateStr);
  }
}
