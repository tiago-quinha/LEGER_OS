/**
 * LEGER_OS // Universal Bank CSV Ingestion Engine
 * Deterministic multi-bank CSV parser for Revolut, Wise, N26, Millennium BCP,
 * ActivoBank, Santander, Chase, and generic financial CSV extracts.
 * Zero AI tokens consumed - pure deterministic parsing for all user tiers.
 */

export interface ParsedCsvTransaction {
  id: string
  date: string
  merchant: string
  amount: number
  balance?: number | null
  raw_text: string
  isIncome: boolean
  category_id: number | null
  checked: boolean
}

export interface ParsedCsvResult {
  transactions: ParsedCsvTransaction[]
  initialBalance: number
  startDate: string
  month: number
  year: number
}

// Split CSV line respecting quoted strings with commas/semicolons
function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"' || char === "'") {
      if (inQuotes && line[i + 1] === char) {
        current += char
        i++ // skip escaped quote
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

// Detect CSV delimiter by counting occurrences in header lines
function detectDelimiter(text: string): string {
  const sampleLines = text.split("\n").filter(l => l.trim().length > 0).slice(0, 5)
  const delimiters = [",", ";", "\t", "|"]
  const counts: Record<string, number> = { ",": 0, ";": 0, "\t": 0, "|": 0 }

  for (const line of sampleLines) {
    for (const d of delimiters) {
      counts[d] += (line.split(d).length - 1)
    }
  }

  let maxDelim = ","
  let maxCount = -1
  for (const d of delimiters) {
    if (counts[d] > maxCount) {
      maxCount = counts[d]
      maxDelim = d
    }
  }

  return maxCount > 0 ? maxDelim : ","
}

// Parse various global date formats into a Date object
function parseFlexibleDate(dateStr: string): { date: Date; year: number; month: number; day: number } | null {
  if (!dateStr) return null
  const cleaned = dateStr.trim().replace(/[T ].*$/, "") // Strip ISO time components if present

  // 1. ISO format: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = cleaned.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/)
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10)
    const month = parseInt(isoMatch[2], 10)
    const day = parseInt(isoMatch[3], 10)
    const d = new Date(Date.UTC(year, month - 1, day))
    if (!isNaN(d.getTime())) return { date: d, year, month, day }
  }

  // 2. European / UK format: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const euMatch = cleaned.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})$/)
  if (euMatch) {
    const day = parseInt(euMatch[1], 10)
    const month = parseInt(euMatch[2], 10)
    let year = parseInt(euMatch[3], 10)
    if (year < 100) year += 2000 // handle 2-digit years
    
    // Check if month/day might be swapped (e.g. US format where month > 12 is impossible)
    if (month > 12 && day <= 12) {
      const d = new Date(Date.UTC(year, day - 1, month))
      if (!isNaN(d.getTime())) return { date: d, year, month: day, day: month }
    }

    const d = new Date(Date.UTC(year, month - 1, day))
    if (!isNaN(d.getTime())) return { date: d, year, month, day }
  }

  // Fallback to standard JS Date parsing
  const fallback = new Date(dateStr)
  if (!isNaN(fallback.getTime())) {
    return {
      date: fallback,
      year: fallback.getUTCFullYear(),
      month: fallback.getUTCMonth() + 1,
      day: fallback.getUTCDate(),
    }
  }

  return null
}

// Parse localized monetary values (handles "-1,234.56", "-1.234,56", "€ 45,00", "(50.00)")
function parseFlexibleAmount(amountStr: string): number | null {
  if (!amountStr) return null
  let cleaned = amountStr.trim()

  // Handle accounting parentheses (e.g. (100.00) -> -100.00)
  const isAccountingNegative = cleaned.startsWith("(") && cleaned.endsWith(")")
  cleaned = cleaned.replace(/[()]/g, "")

  // Remove currency symbols, non-breaking spaces, and letters
  const hasMinus = cleaned.includes("-") || isAccountingNegative
  cleaned = cleaned.replace(/[^0-9.,]/g, "")

  if (!cleaned) return null

  // Determine decimal separator: if both '.' and ',' exist, the last one is the decimal separator
  const lastDot = cleaned.lastIndexOf(".")
  const lastComma = cleaned.lastIndexOf(",")

  let numVal = 0
  if (lastDot > -1 && lastComma > -1) {
    if (lastDot > lastComma) {
      // e.g. "1,234.56" (US/UK)
      numVal = parseFloat(cleaned.replace(/,/g, ""))
    } else {
      // e.g. "1.234,56" (European)
      numVal = parseFloat(cleaned.replace(/\./g, "").replace(",", "."))
    }
  } else if (lastComma > -1) {
    // Only comma present: e.g. "12,50" -> 12.50
    numVal = parseFloat(cleaned.replace(",", "."))
  } else {
    // Only dot or raw digits: e.g. "12.50"
    numVal = parseFloat(cleaned)
  }

  if (isNaN(numVal)) return null
  return hasMinus ? -Math.abs(numVal) : Math.abs(numVal)
}

/**
 * Universal CSV Parser for bank exports
 */
export function parseUniversalCsv(
  csvText: string,
  categoryMatcher?: (merchant: string) => number | null
): ParsedCsvResult | null {
  if (!csvText || !csvText.trim()) return null

  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return null

  const delimiter = detectDelimiter(csvText)

  // Find header row (usually line 0, but sometimes line 1-3 if metadata precedes it)
  let headerIndex = -1
  let colMap: {
    date: number
    merchant: number
    amount: number
    debit: number
    credit: number
    balance: number
  } = { date: -1, merchant: -1, amount: -1, debit: -1, credit: -1, balance: -1 }

  // Expanded Multi-Lingual Banking CSV Column Dictionaries
  const PRIMARY_MERCHANT_HEADERS = [
    "description", "merchant", "payee", "descritivo", "descrição", "descricao",
    "libellé", "libelle", "begünstigter", "beguenstigter", "auftraggeber", "verwendungszweck",
    "empfänger", "empfaenger", "zahlungsempfänger", "causale", "descrizione", "beneficiary",
    "counterparty", "concept", "concepto", "memo", "narrative", "naam / omschrijving", "opis"
  ]
  const FALLBACK_MERCHANT_HEADERS = [
    "name", "details", "payment reference", "reference", "mededelingen", "type"
  ]

  const DATE_HEADERS = [
    "date", "data", "data operacao", "data operação", "data mov", "data valor",
    "started date", "completed date", "posting date", "booking date", "value date",
    "transaction date", "fecha", "buchungstag", "wertstellung", "datum", "data contabile",
    "data valuta", "data operacji", "data waluty"
  ]
  const AMOUNT_HEADERS = [
    "amount", "montante", "valor", "importe", "betrag", "amount (eur)", "amount (usd)",
    "net amount", "total", "importo", "kwota", "bedrag"
  ]
  const DEBIT_HEADERS = [
    "debit", "debito", "débito", "débit", "saida", "saída", "money out", "spent",
    "charge", "withdrawal", "paid out", "lastschrift", "ausgabe", "dare", "af"
  ]
  const CREDIT_HEADERS = [
    "credit", "credito", "crédito", "crédit", "entrada", "money in", "received",
    "income", "deposit", "paid in", "gutschrift", "einnahme", "avere", "bij"
  ]
  const BALANCE_HEADERS = [
    "balance", "saldo", "running balance", "saldo contabilistico", "saldo contabilístico",
    "saldo disponivel", "saldo disponível", "saldo disponible", "solde", "kontostand",
    "saldo na trn", "saldo po transakcji"
  ]

  for (let i = 0; i < Math.min(lines.length, 12); i++) {
    const rawCols = splitCsvLine(lines[i], delimiter)
    const cols = rawCols.map(c => c.toLowerCase().replace(/["']/g, "").trim())
    
    let foundDate = -1
    let foundMerchant = -1
    let foundAmount = -1
    let foundDebit = -1
    let foundCredit = -1
    let foundBalance = -1

    // Step 1: Strict matching for Date, Amount, Debit, Credit, Balance
    cols.forEach((col, idx) => {
      if (foundDate === -1 && DATE_HEADERS.some(h => col === h || col.includes(h))) foundDate = idx
      if (foundAmount === -1 && AMOUNT_HEADERS.some(h => col === h || col.startsWith(h))) foundAmount = idx
      if (foundDebit === -1 && DEBIT_HEADERS.some(h => col === h || col.startsWith(h))) foundDebit = idx
      if (foundCredit === -1 && CREDIT_HEADERS.some(h => col === h || col.startsWith(h))) foundCredit = idx
      if (foundBalance === -1 && BALANCE_HEADERS.some(h => col === h || col.includes(h))) foundBalance = idx
    })

    // Step 2: Primary Merchant Match (Description, Payee, Libellé, Begünstigter)
    cols.forEach((col, idx) => {
      if (foundMerchant === -1 && idx !== foundDate && idx !== foundAmount && idx !== foundDebit && idx !== foundCredit && idx !== foundBalance) {
        if (PRIMARY_MERCHANT_HEADERS.some(h => col === h || col.includes(h))) foundMerchant = idx
      }
    })

    // Step 3: Fallback Merchant Match (Details, Name, Reference)
    if (foundMerchant === -1) {
      cols.forEach((col, idx) => {
        if (foundMerchant === -1 && idx !== foundDate && idx !== foundAmount && idx !== foundDebit && idx !== foundCredit && idx !== foundBalance) {
          if (FALLBACK_MERCHANT_HEADERS.some(h => col === h || col.includes(h))) foundMerchant = idx
        }
      })
    }

    // A valid CSV bank header must at least have a Date column and either an Amount, Debit, or Credit column
    if (foundDate !== -1 && (foundAmount !== -1 || (foundDebit !== -1 && foundCredit !== -1))) {
      headerIndex = i
      colMap = {
        date: foundDate,
        merchant: foundMerchant !== -1 ? foundMerchant : (foundDate === 0 && foundAmount !== 1 ? 1 : 0),
        amount: foundAmount,
        debit: foundDebit,
        credit: foundCredit,
        balance: foundBalance,
      }
      break
    }
  }

  // If no recognizable CSV header was matched, abort to allow fallback to standard text parser
  if (headerIndex === -1) return null

  const txList: ParsedCsvTransaction[] = []
  let latestYear = new Date().getFullYear()
  let latestMonth = new Date().getMonth() + 1
  let initialBalance = 0
  let firstBalanceCaptured = false

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const rawLine = lines[i]
    if (!rawLine) continue

    const cols = splitCsvLine(rawLine, delimiter)
    if (cols.length <= Math.max(colMap.date, colMap.amount, colMap.debit, colMap.credit)) continue

    const dateStr = cols[colMap.date]
    const parsedDate = parseFlexibleDate(dateStr)
    if (!parsedDate) continue

    latestYear = parsedDate.year
    latestMonth = parsedDate.month

    let merchant = colMap.merchant !== -1 && cols[colMap.merchant] ? cols[colMap.merchant].replace(/^["']|["']$/g, "").trim() : "Card Transaction"
    if (!merchant) merchant = "Card Transaction"

    let finalAmount: number | null = null

    // Case A: Separate Debit and Credit columns
    if (colMap.debit !== -1 && colMap.credit !== -1) {
      const debitVal = parseFlexibleAmount(cols[colMap.debit])
      const creditVal = parseFlexibleAmount(cols[colMap.credit])

      if (creditVal !== null && creditVal > 0) {
        finalAmount = Math.abs(creditVal)
      } else if (debitVal !== null && debitVal > 0) {
        finalAmount = -Math.abs(debitVal)
      }
    }

    // Case B: Single Amount column (standard signed or unsigned amount)
    if (finalAmount === null && colMap.amount !== -1) {
      const amtVal = parseFlexibleAmount(cols[colMap.amount])
      if (amtVal !== null) {
        finalAmount = amtVal
      }
    }

    if (finalAmount === null || isNaN(finalAmount)) continue

    // Balance extraction
    let lineBalance: number | null = null
    if (colMap.balance !== -1 && cols[colMap.balance]) {
      const balVal = parseFlexibleAmount(cols[colMap.balance])
      if (balVal !== null && !isNaN(balVal)) {
        lineBalance = balVal
        if (!firstBalanceCaptured) {
          initialBalance = balVal
          firstBalanceCaptured = true
        }
      }
    }

    const categoryId = categoryMatcher ? (categoryMatcher(merchant) ?? null) : null

    txList.push({
      id: `csv-${i}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      date: parsedDate.date.toISOString(),
      merchant,
      amount: finalAmount,
      balance: lineBalance,
      raw_text: rawLine,
      isIncome: finalAmount > 0,
      category_id: categoryId,
      checked: true,
    })
  }

  if (txList.length === 0) return null

  return {
    transactions: txList,
    initialBalance,
    startDate: `${latestYear}-${String(latestMonth).padStart(2, "0")}-01`,
    month: latestMonth,
    year: latestYear,
  }
}
