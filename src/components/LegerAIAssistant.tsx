"use client"

import React, { useState, useEffect, useRef, useMemo } from "react"
import { motion, AnimatePresence, useAnimation, useMotionValue, useDragControls } from "framer-motion"
import { Brain, Cpu, MessageSquare, Mic, MicOff, Send, X, RefreshCcw, Sparkles, Lock, ChevronUp, ChevronDown, Globe, ArrowUpRight, History, Plus, Trash2, Clock, MessageSquarePlus, MessagesSquare, ChevronRight, Check, PieChart, TrendingUp, Activity, Radio, Command, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSystem } from "@/lib/SystemContext"
import { getAIHeaders } from "@/lib/ai-client"
import { usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { ProLockOverlay } from "@/components/ProLockOverlay"

export interface TransactionDraft {
  merchant: string
  amount: number
  category?: string
  categoryId?: number | null
  date?: string
}

export function parseTransactionDraft(text: string): { cleanText: string; draft: TransactionDraft | null } {
  if (!text) return { cleanText: text, draft: null }
  const match = text.match(/\[TRANSACTION_DRAFT:(\{.*?\})\]/)
  if (!match) return { cleanText: text, draft: null }
  try {
    const draft = JSON.parse(match[1]) as TransactionDraft
    const cleanText = text.replace(/\[TRANSACTION_DRAFT:\{.*?\}\]/, "").trim()
    return { cleanText, draft }
  } catch (e) {
    return { cleanText: text, draft: null }
  }
}

export interface Message {
  sender: "user" | "assistant"
  text: string
  timestamp: number
  webSearched?: boolean
  webSearchQuery?: string | null
  webSources?: { title: string; snippet: string; url: string; source: string }[]
}

export interface ChatSession {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: Message[]
}

export interface SlashCommandItem {
  command: string
  label: string
  description: string
  icon: any
  promptTemplate: string | ((arg: string) => string)
  isDirect?: boolean
}

export const SLASH_COMMANDS: SlashCommandItem[] = [
  {
    command: "/projection",
    label: "Smart Forecasting",
    description: "Simulate balance & surplus (/projection [e.g. if 10€ daily burn])",
    icon: Sparkles,
    promptTemplate: (arg: string) => arg 
      ? `Simulate my end-of-cycle balance and projected cash flow with this specific scenario: "${arg}". Factor this assumption into the recency decay projection engine.` 
      : "Simulate my end-of-cycle balance and projected net cash flow surplus using the recency decay projection engine."
  },
  {
    command: "/breakdown",
    label: "Spending Breakdown",
    description: "Category spend & top drivers (/breakdown [e.g. groceries])",
    icon: PieChart,
    promptTemplate: (arg: string) => arg 
      ? `Give me a detailed quantitative spending breakdown focusing on: "${arg}", including category metrics and merchant drivers.` 
      : "Give me a detailed quantitative breakdown of my income, expenses by category, and top merchant drivers for this cycle."
  },
  {
    command: "/portfolio",
    label: "Portfolio Intelligence",
    description: "Valuation, risk & market research (/portfolio [e.g. compare ALAB])",
    icon: TrendingUp,
    promptTemplate: (arg: string) => arg 
      ? `Analyze my investment portfolio with specific focus on: "${arg}". Provide valuation, risk analysis, and market research.` 
      : "Analyze my investment portfolio holdings, sector concentration, risk profile, and market outlook."
  },
  {
    command: "/audit",
    label: "Cycle Financial Audit",
    description: "Burn rate velocity & pacing (/audit [e.g. why is burn high])",
    icon: Activity,
    promptTemplate: (arg: string) => arg 
      ? `Perform a financial audit of my active cycle focusing on: "${arg}". Check velocity, limits, and variances.` 
      : "Perform a full financial audit of my active paycheck cycle, daily variable burn velocity, and surplus pacing."
  },
  {
    command: "/radar",
    label: "Subscription Radar",
    description: "Scan recurring bills & price hikes (/radar [e.g. cancel gym])",
    icon: Radio,
    promptTemplate: (arg: string) => arg 
      ? `Audit my subscription radar with focus on: "${arg}". Check monthly commitments, cadence, and price changes.` 
      : "Audit my subscription radar: scan all recurring bills, fixed monthly commitments, and detect any price hikes."
  },
  {
    command: "/search",
    label: "Live Web Search",
    description: "Search live financial web (/search [query])",
    icon: Globe,
    promptTemplate: (arg: string) => arg 
      ? `Search live financial web and news for: ${arg}` 
      : "Search live financial web for current market news and rates."
  },
  {
    command: "/clear",
    label: "Clear Conversation",
    description: "Reset current chat and start a fresh session",
    icon: Trash2,
    promptTemplate: "",
    isDirect: true
  }
]

// Shared Markdown-like React elements formatter supporting Lists, Blockquotes, HR lines, Tables and bold typography
export const renderFormattedText = (text: string) => {
  if (!text) return null;

  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let currentTableRows: string[][] = [];
  let isTable = false;
  let listItems: React.ReactNode[] = [];
  let listType: "ul" | "ol" | null = null;
  let quoteLines: string[] = [];

  const flushList = (key: number) => {
    if (listItems.length > 0) {
      const listKey = `list-${key}`;
      if (listType === "ul") {
        elements.push(<ul key={listKey} className="list-disc pl-4 space-y-1 my-1.5 text-foreground/90">{...listItems}</ul>);
      } else if (listType === "ol") {
        elements.push(<ol key={listKey} className="list-decimal pl-4 space-y-1 my-1.5 text-foreground/90">{...listItems}</ol>);
      }
      listItems = [];
      listType = null;
    }
  };

  const flushTable = (key: number) => {
    if (currentTableRows.length > 0) {
      const hasHeader = currentTableRows.length >= 2 && currentTableRows[1].some(c => c.includes("---") || c.trim() === "");
      const headerRow = hasHeader ? currentTableRows[0] : null;
      const bodyRows = hasHeader ? currentTableRows.slice(2) : currentTableRows;
      
      elements.push(
        <div key={`table-wrapper-${key}`} className="overflow-x-auto w-full my-2 border border-border/80 rounded bg-secondary/10">
          <table className="w-full text-left text-[10px] border-collapse font-mono">
            {headerRow && (
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  {headerRow.map((cell, idx) => (
                    <th key={idx} className="p-2 font-bold uppercase text-[9px] tracking-wider border-r border-border/40 last:border-r-0">
                      {renderInlineMarkup(cell.trim())}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {bodyRows.map((row, rIdx) => (
                <tr key={rIdx} className="border-b border-border/30 last:border-0 hover:bg-secondary/20 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="p-2 border-r border-border/20 last:border-r-0 text-foreground/95">
                      {renderInlineMarkup(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      currentTableRows = [];
      isTable = false;
    }
  };

  const flushQuote = (key: number) => {
    if (quoteLines.length > 0) {
      elements.push(
        <blockquote key={`quote-${key}`} className="border-l-2 border-emerald-500/80 bg-secondary/20 p-2 my-1.5 pl-3 rounded-r text-[12.5px] sm:text-[11px] leading-relaxed text-foreground/90 italic">
          {quoteLines.map((l, idx) => <p key={idx}>{renderInlineMarkup(l)}</p>)}
        </blockquote>
      );
      quoteLines = [];
    }
  };

  function renderInlineMarkup(str: string): React.ReactNode {
    if (!str) return "";
    // Match inline code (`...`) and bold (**...**)
    const parts = str.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
        return (
          <code key={i} className="px-1.5 py-0.5 rounded bg-secondary/80 font-mono text-[10px] text-foreground border border-border/40 font-semibold">
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
        return <strong key={i} className="text-foreground font-bold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // 1. Table Row Check
    if (trimmedLine.startsWith("|") && trimmedLine.endsWith("|")) {
      flushList(i);
      flushQuote(i);
      isTable = true;
      const cells = line.split("|").slice(1, -1);
      currentTableRows.push(cells);
      continue;
    } else if (isTable) {
      flushTable(i);
    }

    // 2. Headings (# to ######)
    const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushList(i);
      flushQuote(i);
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];
      if (level === 1) {
        elements.push(
          <h1 key={i} className="text-base md:text-lg font-bold font-sans tracking-tighter uppercase text-foreground mt-4 mb-2 border-b border-border pb-1">
            {renderInlineMarkup(headingText)}
          </h1>
        );
      } else if (level === 2) {
        elements.push(
          <h2 key={i} className="text-sm md:text-base font-bold font-sans tracking-tighter uppercase text-foreground mt-3.5 mb-1.5 border-b border-border/60 pb-1">
            {renderInlineMarkup(headingText)}
          </h2>
        );
      } else {
        elements.push(
          <h3 key={i} className="text-xs md:text-sm font-bold font-sans tracking-tighter uppercase text-foreground mt-3 mb-1 border-b border-border/40 pb-1 flex items-center gap-1.5">
            {renderInlineMarkup(headingText)}
          </h3>
        );
      }
      continue;
    }

    // 3. Unordered List
    if (trimmedLine.startsWith("* ") || trimmedLine.startsWith("- ")) {
      flushQuote(i);
      if (listType !== "ul") {
        flushList(i);
        listType = "ul";
      }
      const content = line.substring(line.indexOf(trimmedLine.startsWith("* ") ? "* " : "- ") + 2);
      listItems.push(<li key={`li-${i}`}>{renderInlineMarkup(content)}</li>);
      continue;
    }

    // 4. Numbered List
    if (/^\d+\.\s+/.test(trimmedLine)) {
      flushQuote(i);
      if (listType !== "ol") {
        flushList(i);
        listType = "ol";
      }
      const content = line.substring(line.indexOf(".") + 1).trim();
      listItems.push(<li key={`li-${i}`}>{renderInlineMarkup(content)}</li>);
      continue;
    }

    if (trimmedLine !== "") {
      if (listType) flushList(i);
    }

    // 5. Blockquote
    if (trimmedLine.startsWith(">")) {
      const content = line.substring(line.indexOf(">") + 1).trim();
      quoteLines.push(content);
      continue;
    } else if (quoteLines.length > 0) {
      flushQuote(i);
    }

    // 6. Horizontal Rule
    if (trimmedLine === "---" || trimmedLine === "___") {
      elements.push(<hr key={i} className="border-border/60 my-2" />);
      continue;
    }

    // 7. Normal Paragraph or Empty Line
    if (trimmedLine === "") {
      elements.push(<div key={i} className="h-1" />);
    } else {
      elements.push(<p key={i} className="my-0.5 leading-relaxed text-foreground/90">{renderInlineMarkup(line)}</p>);
    }
  }

  flushList(lines.length);
  flushTable(lines.length);
  flushQuote(lines.length);

  return <div className="space-y-0.5">{elements}</div>;
};

// Custom typewriter typing effect that parses markdown boldly
function TypewriterText({ text, speed = 6, onComplete }: { text: string; speed?: number; onComplete?: () => void }) {
  const [displayedText, setDisplayedText] = useState("")

  useEffect(() => {
    setDisplayedText("")
    let index = 0
    const timer = setInterval(() => {
      setDisplayedText(text.slice(0, index + 1))
      index++
      if (index >= text.length) {
        clearInterval(timer)
        if (onComplete) onComplete()
      }
    }, speed)
    return () => clearInterval(timer)
  }, [text, speed])

  return <>{renderFormattedText(displayedText)}</>
}

const THINKING_MESSAGES = [
  "Analyzing spending velocity...",
  "Searching the financial web...",
  "Cross-referencing category budgets...",
  "Grounding live market telemetry...",
  "Simulating end-of-cycle balance...",
  "Auditing transaction anomalies...",
  "Calculating safe daily pace...",
  "Synthesizing income & outflow...",
  "Formulating financial insights..."
]

function ThinkingIndicator({ query = "" }: { query?: string }) {
  const [index, setIndex] = useState(0)

  const isWebHeavy = useMemo(() => {
    const q = query.toLowerCase()
    return ["ecb", "euribor", "rate", "interest", "stock", "crypto", "bitcoin", "price", "inflation", "news", "hike", "increase", "spotify", "netflix", "why", "search"].some(kw => q.includes(kw))
  }, [query])

  const messages = useMemo(() => {
    if (isWebHeavy) {
      return [
        "Searching the financial web...",
        "Grounding live market telemetry...",
        "Cross-referencing verified sources...",
        "Analyzing spending velocity...",
        "Synthesizing live financial strategy..."
      ]
    }
    return THINKING_MESSAGES
  }, [isWebHeavy])

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % messages.length)
    }, 1800)
    return () => clearInterval(timer)
  }, [messages.length])

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex gap-3 max-w-[85%] mr-auto items-start shrink-0"
    >
      <div className="p-1.5 bg-foreground text-background border border-border h-9 w-9 flex items-center justify-center shrink-0 rounded-md shadow-sm">
        <Brain className="h-4 w-4 animate-pulse" />
      </div>
      <div className="w-[260px] sm:w-[280px] h-9 px-3 bg-secondary/40 text-muted-foreground border border-border/60 rounded-lg rounded-tl-none text-xs italic animate-pulse flex items-center justify-between gap-2 overflow-hidden shrink-0">
        <div className="flex-1 min-w-0 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.span
              key={index}
              initial={{ opacity: 0, y: 6, filter: "blur(2px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -6, filter: "blur(2px)" }}
              transition={{ duration: 0.28, ease: "easeInOut" }}
              className="truncate block w-full whitespace-nowrap"
            >
              {messages[index]}
            </motion.span>
          </AnimatePresence>
        </div>
        <span className="flex gap-1 shrink-0 ml-1.5">
          <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
          <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
          <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" />
        </span>
      </div>
    </motion.div>
  )
}

// Empirical Real-Data Telemetry Detector Generator (Strictly Per-Route, Zero Speculative Suggestions, Zero Emojis)
function getPagePillVariations(pathname: string, telemetry: any, profile: any, aiProvider: string) {
  const unclassified = telemetry?.unclassifiedCount || 0
  const overrides = profile?.projection_overrides || []
  const journalMemories = (profile?.ai_journal?.memories || []).filter((m: any) => m.status === "active")
  const topCat = telemetry?.categories && telemetry.categories.length > 0 ? telemetry.categories[0] : null
  const lowestCat = telemetry?.categories && telemetry.categories.length > 1 ? telemetry.categories[telemetry.categories.length - 1] : null
  const daysElapsed = telemetry?.daysElapsed || 1
  const daysLeft = telemetry?.daysRemaining || telemetry?.daysLeft || Math.max(1, (telemetry?.totalDaysInCycle || 30) - daysElapsed)
  const surplus = telemetry?.projectedSurplus !== undefined ? Math.round(telemetry.projectedSurplus) : 0
  const netDelta = telemetry?.netDelta !== undefined ? Math.round(telemetry.netDelta) : 0
  const velocity = telemetry?.velocity || 1.0
  const totalIn = telemetry?.totalIn || 0
  const totalOut = telemetry?.totalOut || 0
  const spendingLimit = telemetry?.spendingLimit || profile?.target_monthly_spend || 1500
  const remainingBudget = spendingLimit - totalOut
  const budgetPct = spendingLimit > 0 ? Math.round((totalOut / spendingLimit) * 100) : 0
  const safeDaily = remainingBudget > 0 ? (remainingBudget / daysLeft) : 0
  const actualDailyBurn = Number(telemetry?.dailyVariableBurn ?? telemetry?.currentDailyVariableBurn ?? telemetry?.blendedDailyBurn ?? (daysElapsed > 0 ? totalOut / daysElapsed : 0))
  const hasCustomKey = !!(profile?.custom_api_key)

  switch (pathname) {
    case "/":
      // DASHBOARD ONLY: Projection Engine, Spending Velocity, Cash Runway & Surplus Deployment
      return [
        {
          banner: surplus >= 0 ? `Projected surplus +€${surplus} — ready for savings or investments...` : `Projected deficit of €${Math.abs(surplus)} — expense cuts required...`,
          query: surplus >= 0 ? `How should I allocate my projected cycle surplus of €${surplus} toward savings or investments?` : `What specific variable expenses can I cut to eliminate my €${Math.abs(surplus)} projected deficit?`
        },
        {
          banner: `€${actualDailyBurn.toFixed(2)}/day average burn — runway lasts through cycle end...`,
          query: `Analyze my daily spending burn rate of €${actualDailyBurn.toFixed(2)}/day and projected cash runway.`
        },
        ...(velocity > 1.15 ? [{
          banner: `Spending velocity elevated at ${velocity.toFixed(2)}x baseline for day ${daysElapsed}...`,
          query: `Why is my spending velocity elevated at ${velocity.toFixed(2)}x baseline for day ${daysElapsed} of this cycle?`
        }] : []),
        ...(safeDaily >= 1.0 ? [{
          banner: `Safe daily variable spend limit is €${safeDaily.toFixed(2)} for ${daysLeft}d left...`,
          query: `What is my recommended daily spending cap to stay on budget for the remaining ${daysLeft} days?`
        }] : remainingBudget <= 0 && totalOut > 0 ? [{
          banner: `Monthly budget target reached (€${Math.round(totalOut)} spent) — ${daysLeft}d remaining...`,
          query: `My target monthly budget of €${spendingLimit} has been reached. Analyze my spending and recommend adjustments for the remaining ${daysLeft} days.`
        }] : []),
        {
          banner: `Net cash flow is €${netDelta > 0 ? '+' : ''}${netDelta} (€${Math.round(totalIn)} in / €${Math.round(totalOut)} out)...`,
          query: `Break down my total income (€${Math.round(totalIn)}) vs total expenses (€${Math.round(totalOut)}) so far this cycle.`
        },
        ...(overrides.length > 0 ? [{
          banner: `Active routine override: ${overrides[0].reason || overrides[0].categoryName}...`,
          query: `How is my active ${overrides[0].categoryName || 'spending'} override modifying my projected cycle end balance?`
        }] : [])
      ]

    case "/expenses":
      // LEDGER ONLY: Uncategorized Items, Top Spend Category Breakdown & Large Expense Audits
      return [
        ...(unclassified > 0 ? [{
          banner: `${unclassified} uncategorized ${unclassified === 1 ? 'transaction needs' : 'transactions need'} classification...`,
          query: `Review and help me categorize my ${unclassified} uncategorized transactions in my ledger.`
        }] : []),
        ...(topCat ? [{
          banner: `${topCat.name} is your #1 expense category (€${Math.round(topCat.value)} spent)...`,
          query: `Break down all transactions in category ${topCat.name} this cycle and check if it exceeds normal baseline.`
        }] : []),
        {
          banner: `Audit top single expenses and check for duplicate recurring charges...`,
          query: `Audit my largest transactions this cycle and check for duplicate subscriptions or unusual charges.`
        },
        {
          banner: `Total ledger outflow registered this cycle: €${totalOut.toFixed(2)}...`,
          query: `Summarize my total ledger outflow of €${totalOut.toFixed(2)} and list my top 5 largest expenses.`
        }
      ]

    case "/categories":
      // CATEGORIES ONLY: Category Spend Allocation, Pareto Concentration & Optimization
      return [
        ...(topCat && totalOut > 0 ? [{
          banner: `${topCat.name} represents ${Math.round((topCat.value / totalOut) * 100)}% of total cycle expenses...`,
          query: `Analyze my category spending concentration and suggest the highest impact areas to optimize.`
        }] : []),
        ...(lowestCat ? [{
          banner: `Lowest burn category: ${lowestCat.name} (€${Math.round(lowestCat.value)}) — headroom available...`,
          query: `Can I reallocate unspent budget from lower-spend categories to cover higher-velocity areas?`
        }] : []),
        {
          banner: `Total category spend allocation across categories: €${Math.round(totalOut)}...`,
          query: `Summarize my user-defined expense categories and budget allocations.`
        }
      ]

    case "/budgets":
      // BUDGETS ONLY: Monthly Target Spend Limits & Capacity Planning
      return [
        {
          banner: `Target monthly budget is ${budgetPct}% consumed (${daysLeft}d left)...`,
          query: `Which budget categories are at risk of exceeding limits before this cycle ends?`
        },
        ...(remainingBudget > 0 ? [{
          banner: `Remaining unallocated budget buffer: €${remainingBudget.toFixed(2)} for ${daysLeft}d left...`,
          query: `Calculate my remaining unallocated budget buffer for the rest of this cycle.`
        }] : [{
          banner: `Monthly budget cap exceeded by €${Math.abs(Math.round(remainingBudget))} with ${daysLeft}d left...`,
          query: `My total outflow has exceeded my monthly budget target by €${Math.abs(Math.round(remainingBudget))}. How should I adjust my categories?`
        }]),
        {
          banner: `Monthly target spending limit set to €${spendingLimit}...`,
          query: `Is my monthly spending limit of €${spendingLimit} realistic based on current velocity?`
        }
      ]

    case "/radar":
      // RADAR ONLY: Fixed Subscriptions & Silent Price Hike Detection
      return [
        {
          banner: `Recurring subscription radar monitoring active commitments...`,
          query: `Analyze my recurring subscriptions and highlight any potential savings or silent price hikes.`
        },
        {
          banner: `Tracking annual vs monthly recurring overhead...`,
          query: `Break down my fixed subscription commitments vs variable spending in this cycle.`
        }
      ]

    case "/memory":
      // MEMORY JOURNAL ONLY: Routine Overrides & Conversational Memories
      return [
        ...(journalMemories.length > 0 ? [{
          banner: `${journalMemories.length} active lifestyle context ${journalMemories.length === 1 ? 'memory' : 'memories'} adjusting forecast...`,
          query: `Summarize how my active lifestyle context memories are modifying my financial projection.`
        }] : []),
        ...(overrides.length > 0 ? [{
          banner: `Active routine override: ${overrides[0].reason || overrides[0].categoryName}...`,
          query: `How is my active ${overrides[0].categoryName || 'spending'} override modifying my projected cycle end balance?`
        }] : []),
        ...(journalMemories.length === 0 ? [{
          banner: `0 active routine memories stored in profile journal...`,
          query: `How do conversational context memories and routine updates modify my cycle projections?`
        }] : [])
      ]

    case "/system":
      // SYSTEM CONFIG ONLY: Infrastructure, API Key Status & Health
      return [
        {
          banner: `AI engine provider active: ${aiProvider || 'Gemini'}...`,
          query: `Check my AI engine provider status and telemetry integration.`
        },
        {
          banner: `Custom API key status: ${hasCustomKey ? 'Custom Key Active' : 'System Default Key'}...`,
          query: `Verify my AI API key quotas and response performance.`
        },
        {
          banner: `Account subscription tier: ${profile?.subscription_tier || 'PRO'}...`,
          query: `What features are unlocked with my LEGER_OS PRO subscription?`
        }
      ]

    case "/portfolio":
      // PORTFOLIO ONLY: Net Worth, Asset Allocations & Position Telemetry
      return [
        {
          banner: `Total Net Worth tracked across bank cash & portfolio holdings...`,
          query: `Analyze my total net worth breakdown across my bank account cash and investment portfolio holdings.`
        },
        {
          banner: `Multi-asset class holdings tracked across Stocks, ETFs, Crypto & Cash...`,
          query: `Summarize my asset allocation strategy across stocks, ETFs, crypto, and cash positions.`
        },
        {
          banner: `Live market quotes syncing across portfolio asset positions...`,
          query: `Check my investment portfolio return (unrealized PnL) and list my top performing asset.`
        }
      ]

    default:
      return [
        {
          banner: `Analyzing live financial telemetry...`,
          query: `How is my paycheck cycle progressing?`
        }
      ]
  }
}

function TransactionDraftCard({
  draft,
  onConfirm,
  currencySymbol = "€"
}: {
  draft: TransactionDraft
  onConfirm: (draft: TransactionDraft) => Promise<void>
  currencySymbol?: string
}) {
  const [status, setStatus] = useState<"pending" | "saving" | "confirmed" | "cancelled">("pending")

  const handleConfirm = async () => {
    setStatus("saving")
    try {
      await onConfirm(draft)
      setStatus("confirmed")
    } catch (e) {
      setStatus("pending")
    }
  }

  if (status === "cancelled") {
    return (
      <div className="mt-2.5 p-2 bg-secondary/20 border border-border/40 text-[10px] font-mono text-muted-foreground italic rounded-xl">
        Transaction draft dismissed
      </div>
    )
  }

  if (status === "confirmed") {
    return (
      <div className="mt-2.5 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-mono font-bold flex items-center gap-2 rounded-xl">
        <Check className="h-4 w-4 shrink-0 stroke-[3]" />
        <span>Added {currencySymbol}{Math.abs(draft.amount).toFixed(2)} at {draft.merchant} to ledger</span>
      </div>
    )
  }

  return (
    <div className="mt-2.5 p-3.5 bg-card border border-border rounded-xl shadow-xl space-y-3 font-mono">
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-emerald-500" /> New Transaction Detected
        </span>
        <span className="text-[10px] text-muted-foreground font-sans">
          {draft.date || "Today"}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-bold text-foreground truncate">{draft.merchant}</div>
          <div className="text-[10px] text-muted-foreground font-sans truncate">{draft.category || "Uncategorized"}</div>
        </div>
        <div className="text-sm font-bold text-foreground tabular-nums shrink-0">
          {draft.amount < 0 ? "-" : "+"}{currencySymbol}{Math.abs(draft.amount).toFixed(2)}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={status === "saving"}
          className="flex-1 h-8 bg-foreground text-background hover:bg-foreground/90 text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 cursor-pointer rounded-lg shadow-sm"
        >
          {status === "saving" ? "Adding to ledger..." : "Confirm & Add to Ledger"}
        </button>
        <button
          type="button"
          onClick={() => setStatus("cancelled")}
          disabled={status === "saving"}
          className="px-3 h-8 bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer rounded-lg border border-border/60"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export function LegerAIAssistant() {
  const { profile, user, refreshProfile, refreshData, currencySymbol, language, aiProvider, customApiKey, isPro, isSettingsOpen, setSettingsOpen, setSettingsActiveTab, setSubscriptionOnly } = useSystem()
  const pathname = usePathname()
  const sheetDragControls = useDragControls()
  
  const [isOpen, setIsOpen] = useState(false)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string>("")
  const [isHistoryViewOpen, setIsHistoryViewOpen] = useState(false)
  const [sessionToDelete, setSessionToDelete] = useState<ChatSession | null>(null)
  const [suggestionsVisible, setSuggestionsVisible] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  const sessionsStorageKey = `leger_chat_sessions_${profile?.id || "guest"}`
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

  const activeSession = useMemo(() => {
    return sessions.find(s => s.id === activeSessionId) || sessions[0] || null
  }, [sessions, activeSessionId])

  const messages = activeSession ? activeSession.messages : []

  const handleConfirmTransactionDraft = async (draft: TransactionDraft) => {
    if (!user) {
      toast.error("User session missing")
      return
    }

    const { error } = await supabase.from("tracker_expense").insert({
      user_id: user.id,
      merchant: draft.merchant,
      amount: draft.amount.toString(),
      date: draft.date || new Date().toISOString().split("T")[0],
      category_id: draft.categoryId || null,
      source: "ai_assistant"
    })

    if (error) {
      toast.error("Failed to add transaction")
      throw error
    }

    toast.success(`Logged ${currencySymbol}${Math.abs(draft.amount).toFixed(2)} at ${draft.merchant}!`)
    if (refreshData) refreshData()
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      const checkMobile = () => setIsMobile(window.innerWidth < 640)
      checkMobile()
      window.addEventListener("resize", checkMobile)
      return () => window.removeEventListener("resize", checkMobile)
    }
  }, [])
  const [inputVal, setInputVal] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)

  // Rotating placeholder messages
  const PLACEHOLDER_ROTATION = useMemo(() => [
    "Ask assistant...",
    "Type / for quick commands...",
    "Try /projection if 10€ burn...",
    "Try /portfolio compare ALAB...",
    "Try /breakdown, /radar, /audit...",
  ], [])
  const [placeholderIdx, setPlaceholderIdx] = useState(0)

  useEffect(() => {
    if (isListening || inputVal.trim()) return
    const timer = setInterval(() => {
      setPlaceholderIdx(prev => (prev + 1) % PLACEHOLDER_ROTATION.length)
    }, 2800)
    return () => clearInterval(timer)
  }, [isListening, inputVal, PLACEHOLDER_ROTATION.length])

  // Slash commands state & autocomplete
  const isSlashMode = inputVal.startsWith("/")
  const slashQuery = isSlashMode ? inputVal.slice(1).toLowerCase().split(" ")[0] : ""
  const filteredSlashCommands = useMemo(() => {
    if (!isSlashMode) return []
    if (!slashQuery) return SLASH_COMMANDS
    return SLASH_COMMANDS.filter(cmd => 
      cmd.command.slice(1).toLowerCase().includes(slashQuery) ||
      cmd.label.toLowerCase().includes(slashQuery) ||
      cmd.description.toLowerCase().includes(slashQuery)
    )
  }, [isSlashMode, slashQuery])
  
  // Dynamic suggested queries state
  const [suggestedQueries, setSuggestedQueries] = useState<string[]>([])
  // Client calculated telemetry stats
  const [telemetry, setTelemetry] = useState<any>(null)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const handleQueryRef = useRef<((queryText: string, targetSessionId?: string) => Promise<void>) | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Dynamic Floaty AI Pill Banner States (starts CLOSED by default)
  const [isPillExpanded, setIsPillExpanded] = useState(false)
  const [isPillDismissed, setIsPillDismissed] = useState(false)
  const userClickedPillRef = useRef(false)

  // Reset dismissal state cleanly when user navigates to a new page
  useEffect(() => {
    setIsPillDismissed(false)
    setIsPillExpanded(false)
  }, [pathname])

  // Listen for active bulk selection mode to dynamically adjust floating height
  const [isBulkActive, setIsBulkActive] = useState(false)

  useEffect(() => {
    const checkBulk = () => {
      setIsBulkActive(document.body.getAttribute("data-bulk-active") === "true")
    }
    checkBulk()
    const observer = new MutationObserver(checkBulk)
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-bulk-active"] })
    return () => observer.disconnect()
  }, [])

  // Listen for floating '+' FAB and cycle mobile bar presence to dynamically adjust pill width and floating height
  const [hasCycleBar, setHasCycleBar] = useState(false)
  const [hasFloatingFab, setHasFloatingFab] = useState(false)

  useEffect(() => {
    const checkFabAndCycle = () => {
      const fabEl = document.querySelector('button[aria-label="Add transaction"]') ||
                    document.querySelector('button[aria-label="Add position"]') ||
                    document.querySelector('button[aria-label="Pin recurring bill"]') ||
                    document.querySelector('button[aria-label="Ledger quick actions menu"]') ||
                    document.querySelector('[data-fab="true"]')
      setHasFloatingFab(!!fabEl || pathname === "/expenses" || pathname === "/portfolio" || pathname === "/radar")

      const cycleEl = document.querySelector('[data-cycle-bar="true"]') ||
                      document.querySelector('.cycle-mobile-bar')
      setHasCycleBar(!!cycleEl)
    }
    checkFabAndCycle()
    const t1 = setTimeout(checkFabAndCycle, 100)
    const t2 = setTimeout(checkFabAndCycle, 400)
    const observer = new MutationObserver(checkFabAndCycle)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true })
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      observer.disconnect()
    }
  }, [pathname])

  // State counter for smooth variation rotation across page visits
  const [variationIndex, setVariationIndex] = useState(0)

  // Rotate variation on route changes or when banner re-expands
  useEffect(() => {
    setVariationIndex(prev => prev + 1)
  }, [pathname])

  // Dynamic Page-Conscious Proactive AI Insight Generator (10+ Variations per Page)
  const pillScenario = useMemo(() => {
    const variations = getPagePillVariations(pathname, telemetry, profile, aiProvider)
    const idx = variationIndex % variations.length
    return variations[idx] || variations[0]
  }, [pathname, telemetry, profile, aiProvider, variationIndex])

  // Ref to track last banner auto-expansion timestamp (token & attention efficiency)
  const lastExpandedTimeRef = useRef(0)

  // Create a brand new chat session helper (30-day lifetime retention)
  const createNewChat = (customTitle?: string, initialMsgs?: Message[]) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsLoading(false)
    const now = Date.now()
    const newId = `session_${now}_${Math.random().toString(36).substr(2, 6)}`
    const initial = initialMsgs || [
      {
        sender: "assistant",
        text: `Hello **${userName}**, how can I help you manage your finances today?`,
        timestamp: now
      }
    ]
    const newSession: ChatSession = {
      id: newId,
      title: customTitle || "New Chat",
      createdAt: now,
      updatedAt: now,
      messages: initial
    }
    setSessions(prev => {
      const pruned = [newSession, ...prev.filter(s => now - (s.updatedAt || s.createdAt || now) <= THIRTY_DAYS_MS)]
      if (typeof window !== "undefined") {
        localStorage.setItem(sessionsStorageKey, JSON.stringify(pruned))
      }
      return pruned
    })
    setActiveSessionId(newId)
    setIsHistoryViewOpen(false)
    return newId
  }

  // Smart handlePillClick helper: Instantly creates a NEW chat session and executes the query
  const handlePillClick = () => {
    userClickedPillRef.current = true
    setIsOpen(true)
    setIsPillExpanded(false)

    if (pillScenario?.query) {
      const cleanTitle = pillScenario.banner ? pillScenario.banner.replace(/\.\.\.$/, "") : "Financial Telemetry"
      const newSessionId = createNewChat(cleanTitle)
      if (handleQueryRef.current) {
        handleQueryRef.current(pillScenario.query, newSessionId)
      }
    }
  }

  // Delete a chat session helper
  const deleteSession = (sessionId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setIsLoading(false)
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== sessionId)
      if (typeof window !== "undefined") {
        localStorage.setItem(sessionsStorageKey, JSON.stringify(filtered))
      }
      if (activeSessionId === sessionId) {
        setActiveSessionId(filtered.length > 0 ? filtered[0].id : "")
      }
      return filtered
    })
  }

  // Smart Event-Driven & Anti-Annoyance Auto-Expansion (Only triggers on urgent events or once-a-day insights)
  useEffect(() => {
    if (isPillDismissed) return
    userClickedPillRef.current = false
    setIsPillExpanded(false)

    // Evaluate urgent high-priority financial telemetry conditions
    const unclassified = telemetry?.unclassifiedCount || 0
    const velocity = telemetry?.velocity || 1.0
    const totalOut = telemetry?.totalOut || 0
    const limit = telemetry?.spendingLimit || profile?.target_monthly_spend || 1500
    const budgetPct = limit > 0 ? (totalOut / limit) * 100 : 0
    const isDeficitSpike = telemetry?.projectedSurplus !== undefined && telemetry.projectedSurplus < -50

    // High priority events always qualify for immediate attention
    const isUrgentEvent = unclassified > 0 || velocity > 1.25 || budgetPct > 85 || isDeficitSpike

    // Check daily frequency cap in localStorage for routine telemetry
    const lastSeenKey = `leger_pill_last_seen_${profile?.id || "default"}`
    let lastSeenTimestamp = 0
    try {
      lastSeenTimestamp = parseInt(localStorage.getItem(lastSeenKey) || "0", 10)
    } catch {}

    const now = Date.now()
    const hoursSinceLastSeen = (now - lastSeenTimestamp) / (1000 * 60 * 60)
    const isNewDayInsight = hoursSinceLastSeen >= 18

    // Only auto-expand if an urgent event occurred, OR (once-a-day insight on main dashboard)
    const shouldAutoExpand = isUrgentEvent || (isNewDayInsight && pathname === "/")

    if (!shouldAutoExpand) return

    try {
      localStorage.setItem(lastSeenKey, String(now))
    } catch {}

    const openTimer = setTimeout(() => {
      if (!isPillDismissed) {
        setIsPillExpanded(true)
      }
    }, 1500)

    const closeTimer = setTimeout(() => {
      if (!userClickedPillRef.current) {
        setIsPillExpanded(false)
      }
    }, 8500)

    return () => {
      clearTimeout(openTimer)
      clearTimeout(closeTimer)
    }
  }, [pathname, pillScenario.banner, telemetry, isPillDismissed, profile?.id])

  useEffect(() => {
    const handleExpand = () => setIsPillExpanded(true)
    window.addEventListener("leger_overrides_updated", handleExpand)
    return () => window.removeEventListener("leger_overrides_updated", handleExpand)
  }, [])

  // Framer Motion animation values for side-edge snapping magnetism
  const dragControls = useAnimation()
  const dragX = useMotionValue(0)
  const dragY = useMotionValue(0)

  const handleTriggerDragEnd = (_event: any, _info: any) => {
    if (typeof window === "undefined") return
    const screenWidth = window.innerWidth
    
    const curX = dragX.get()
    const curY = dragY.get()
    
    const buttonRightEdgeMargin = 16
    const buttonWidth = 48
    const initialRightX = screenWidth - buttonWidth - buttonRightEdgeMargin
    const currentAbsoluteX = initialRightX + curX
    
    // Snap to nearest side edge (left vs right half of screen)
    const targetX = currentAbsoluteX < (screenWidth / 2) 
      ? -(screenWidth - buttonWidth - (buttonRightEdgeMargin * 2)) 
      : 0
    
    dragControls.start({
      x: targetX,
      y: curY,
      transition: { type: "spring", stiffness: 380, damping: 25 }
    })
  }

  const userName = profile?.username || profile?.full_name || "User"

  // 1. Initialise reactive global telemetry & open-event listeners
  useEffect(() => {
    if (typeof window !== "undefined") {
      if ((window as any).__leger_cycle_telemetry) {
        setTelemetry((window as any).__leger_cycle_telemetry)
      }

      const handleTelemetryUpdate = () => {
        setTelemetry((window as any).__leger_cycle_telemetry)
      }
      const handleOpenAi = () => setIsOpen(true)

      window.addEventListener("leger_telemetry_updated", handleTelemetryUpdate)
      window.addEventListener("open-leger-ai", handleOpenAi)
      return () => {
        window.removeEventListener("leger_telemetry_updated", handleTelemetryUpdate)
        window.removeEventListener("open-leger-ai", handleOpenAi)
      }
    }
  }, [])

  // Web Speech API Voice query setup
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = false
        recognition.interimResults = false
        const speechLang = language || "en-US"
        recognition.lang = speechLang

        recognition.onstart = () => setIsListening(true)
        recognition.onend = () => setIsListening(false)
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript
          setInputVal(prev => (prev ? `${prev} ${transcript}` : transcript))
        }
        recognition.onerror = (event: any) => {
          setIsListening(false)
          if (event?.error === "language-not-supported" && speechLang.startsWith("pt")) {
            try {
              recognition.lang = "pt-BR"
              recognition.start()
              return
            } catch (e) {
              // Ignore fallback error
            }
          }
          toast.error("Voice input error. Try speaking closer to the microphone.")
        }
        recognitionRef.current = recognition
      }
    }
  }, [language])

  // Custom bridge window event listener to open chatbot from anywhere
  useEffect(() => {
    const handleOpen = () => setIsOpen(true)
    window.addEventListener("open_leger_assistant", handleOpen)
    return () => window.removeEventListener("open_leger_assistant", handleOpen)
  }, [])

  // Load chat sessions on user mount with 30-day auto-pruning
  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const raw = localStorage.getItem(sessionsStorageKey)
      let parsedSessions: ChatSession[] = []
      if (raw) {
        parsedSessions = JSON.parse(raw)
      } else {
        // Migration from legacy single chat history
        const legacyRaw = localStorage.getItem(`leger_chat_history_${profile?.id || "guest"}`)
        if (legacyRaw) {
          try {
            const legacyMsgs = JSON.parse(legacyRaw)
            if (Array.isArray(legacyMsgs) && legacyMsgs.length > 0) {
              parsedSessions = [{
                id: `session_${Date.now()}`,
                title: "Previous conversation",
                createdAt: Date.now(),
                updatedAt: Date.now(),
                messages: legacyMsgs
              }]
            }
          } catch (e) {}
        }
      }

      // Auto-prune sessions older than 30 days
      const now = Date.now()
      const validSessions = parsedSessions.filter(s => now - (s.updatedAt || s.createdAt || now) <= THIRTY_DAYS_MS)

      if (validSessions.length === 0) {
        const defaultSession: ChatSession = {
          id: `session_${Date.now()}`,
          title: "New Chat",
          createdAt: now,
          updatedAt: now,
          messages: [
            {
              sender: "assistant",
              text: `Hello **${userName}**, how can I help you manage your finances today?`,
              timestamp: now
            }
          ]
        }
        setSessions([defaultSession])
        setActiveSessionId(defaultSession.id)
        localStorage.setItem(sessionsStorageKey, JSON.stringify([defaultSession]))
      } else {
        setSessions(validSessions)
        setActiveSessionId(validSessions[0].id)
        localStorage.setItem(sessionsStorageKey, JSON.stringify(validSessions))
      }
    } catch (err) {
      console.error("Failed to load AI chat sessions:", err)
    }
  }, [profile?.id, userName])

  // Save session messages helper
  const saveSessionMessages = (sessionId: string, newMessages: Message[], titleOverride?: string) => {
    setSessions(prev => {
      const now = Date.now()
      const exists = prev.some(s => s.id === sessionId)
      let updated: ChatSession[]
      if (exists) {
        updated = prev.map(s => {
          if (s.id === sessionId) {
            let sessionTitle = s.title
            if (titleOverride) {
              sessionTitle = titleOverride
            } else if ((s.title === "New Chat" || s.title.startsWith("New Conversation")) && newMessages.length > 1) {
              const firstUserMsg = newMessages.find(m => m.sender === "user")
              if (firstUserMsg) {
                sessionTitle = firstUserMsg.text.slice(0, 32).trim() + (firstUserMsg.text.length > 32 ? "..." : "")
              }
            }
            return {
              ...s,
              title: sessionTitle,
              updatedAt: now,
              messages: newMessages
            }
          }
          return s
        })
      } else {
        const newSession: ChatSession = {
          id: sessionId,
          title: titleOverride || "New Chat",
          createdAt: now,
          updatedAt: now,
          messages: newMessages
        }
        updated = [newSession, ...prev]
      }
      
      const pruned = updated.filter(s => now - (s.updatedAt || s.createdAt || now) <= THIRTY_DAYS_MS)
      if (typeof window !== "undefined") {
        localStorage.setItem(sessionsStorageKey, JSON.stringify(pruned))
      }
      return pruned
    })
  }

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isOpen, isHistoryViewOpen])

  // Static Fallback Page Context recommendations
  const pageContext = useMemo(() => {
    switch (pathname) {
      case "/":
        return {
          name: "Dashboard",
          suggestions: [
            "How is my cycle going?",
            "What is my spending velocity?",
            "How much surplus am I projecting?"
          ]
        }
      case "/expenses":
        return {
          name: "Ledger",
          suggestions: [
            "Show my most expensive transactions",
            "Are there any unclassified items?",
            "List recent credit card spending"
          ]
        }
      case "/budgets":
        return {
          name: "Budgets",
          suggestions: [
            "Which budget is closest to the limit?",
            "Reset my category projections",
            "Help me set an expense limit"
          ]
        }
      case "/categories":
        return {
          name: "Categories",
          suggestions: [
            "List my top spending categories",
            "What color codes do my categories use?",
            "Manage my merchant rules"
          ]
        }
      case "/radar":
        return {
          name: "Subscription Radar",
          suggestions: [
            "List all detected monthly subscriptions",
            "Are there any silent price hikes flagged?",
            "What is my annual recurring commitment?"
          ]
        }
      default:
        return {
          name: "System Core",
          suggestions: [
            "How does LEGER_OS process bank extracts?",
            "Explain paycheck cycle rules",
            "How to sync bank notifications"
          ]
        }
    }
  }, [pathname])

  // Load initial fallback suggestions on context mount or when history cleared
  useEffect(() => {
    if (messages.length <= 1) {
      setSuggestedQueries(pageContext.suggestions)
    }
  }, [pageContext, messages.length])

  // Trigger page-aware context welcome if chat is empty or context switches
  const handleAssistantWelcome = () => {
    const welcomeText = `You're viewing your **${pageContext.name}**. I'm synced to your active cycle telemetry. What would you like to inspect or analyze?`
    
    if (messages.length > 0 && messages[messages.length - 1].text.includes(pageContext.name)) {
      return
    }

    if (activeSessionId) {
      saveSessionMessages(activeSessionId, [
        ...messages,
        {
          sender: "assistant",
          text: welcomeText,
          timestamp: Date.now()
        }
      ])
    }
    setSuggestedQueries(pageContext.suggestions)
  }

  // Auto welcome on open
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      const lastMsg = messages[messages.length - 1]
      if (Date.now() - lastMsg.timestamp > 5 * 60 * 1000) {
        handleAssistantWelcome()
      }
    }
  }, [isOpen, pathname])

  // Voice toggle listener
  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error("Web Speech input not supported in this browser.")
      return
    }
    if (isListening) {
      recognitionRef.current.stop()
    } else {
      recognitionRef.current.start()
    }
  }

  // Select / fill or execute slash command (mobile-friendly)
  const handleSelectSlashCommand = (cmd: SlashCommandItem, autoRun = false) => {
    if (cmd.isDirect) {
      if (cmd.command === "/clear") {
        createNewChat()
        setInputVal("")
        toast.success("Started a new conversation session.")
        return
      }
    }
    
    if (autoRun) {
      let promptToSend = ""
      if (typeof cmd.promptTemplate === "function") {
        promptToSend = cmd.promptTemplate("")
      } else {
        promptToSend = cmd.promptTemplate
      }
      setInputVal("")
      handleQuery(promptToSend)
      return
    }

    // Fill input with the command so the user can type custom parameters / scenarios
    setInputVal(`${cmd.command} `)
  }

  // Handle Query Submission (session-aware)
  const handleQuery = async (queryText: string, targetSessionId?: string) => {
    if (!queryText.trim() || isLoading) return

    // Intercept slash command text if user typed and submitted directly (e.g. /projection if i had 10€ burn)
    const trimmedInput = queryText.trim()
    const firstWord = trimmedInput.split(" ")[0].toLowerCase()
    const parts = trimmedInput.split(" ")
    const userArg = parts.length > 1 ? parts.slice(1).join(" ").trim() : ""
    const matchedCmd = SLASH_COMMANDS.find(c => c.command.toLowerCase() === firstWord)

    if (matchedCmd) {
      if (matchedCmd.isDirect && matchedCmd.command === "/clear") {
        createNewChat()
        setInputVal("")
        toast.success("Started a new conversation session.")
        return
      }
      if (typeof matchedCmd.promptTemplate === "function") {
        queryText = matchedCmd.promptTemplate(userArg)
      } else if (matchedCmd.promptTemplate) {
        queryText = userArg 
          ? `${matchedCmd.promptTemplate} User custom scenario: "${userArg}".` 
          : matchedCmd.promptTemplate
      }
    }

    let currentSessionId = targetSessionId || activeSessionId || (sessions[0]?.id)
    if (!currentSessionId) {
      currentSessionId = createNewChat()
    }

    if (!isPro) {
      toast.error("Conversational AI Queries are a LEGER_OS PRO feature.", {
        description: "Upgrade to PRO to unlock conversational overrides and custom projections.",
      })
      setSettingsActiveTab("pro")
      setSubscriptionOnly(true)
      setSettingsOpen(true)
      return
    }

    const currentSessionObj = sessions.find(s => s.id === currentSessionId)
    const existingMsgs = currentSessionObj ? currentSessionObj.messages : []

    const userMsg: Message = {
      sender: "user",
      text: trimmedInput.startsWith("/") ? `${trimmedInput} (${queryText})` : queryText,
      timestamp: Date.now()
    }
    const currentMsgs = [...existingMsgs, userMsg]
    saveSessionMessages(currentSessionId, currentMsgs)
    setInputVal("")
    setIsLoading(true)

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller
    const timeoutId = setTimeout(() => controller.abort(), 35000)

    try {
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("*")

      const statsPayload = telemetry || {
        currentBalance: 0,
        velocity: 1.0,
        daysElapsed: 1,
        spendingLimit: profile?.target_monthly_spend || 1500,
        categories: [],
        netDelta: 0
      }

      const response = await fetch("/api/leger-ai/query", {
        method: "POST",
        headers: getAIHeaders(aiProvider, customApiKey),
        signal: controller.signal,
        body: JSON.stringify({
          query: queryText,
          telemetry: statsPayload,
          categories: categoriesData || [],
          userName,
          clientDate: new Date().toISOString(),
          history: existingMsgs.map(m => ({
            role: m.sender === "user" ? "user" : "assistant",
            content: m.text
          }))
        })
      })

      const data = await response.json()
      if (response.ok) {
        const assistantMsg: Message = {
          sender: "assistant",
          text: data.message,
          timestamp: Date.now(),
          webSearched: data.webSearched,
          webSearchQuery: data.webSearchQuery,
          webSources: data.webSources,
        }
        saveSessionMessages(currentSessionId, [...currentMsgs, assistantMsg])

        if (data.suggestedQueries && data.suggestedQueries.length > 0) {
          setSuggestedQueries(data.suggestedQueries)
        } else {
          setSuggestedQueries(pageContext.suggestions)
        }

        if (data.override) {
          try {
            let updatedOverrides: any[] = []
            if (!data.override.reset) {
              const existing = profile?.projection_overrides || JSON.parse(localStorage.getItem("leger_cycle_overrides") || "[]")
              updatedOverrides = existing.filter((o: any) => o.categoryId !== data.override.categoryId)
              updatedOverrides.push(data.override)
            }
            
            localStorage.setItem("leger_cycle_overrides", JSON.stringify(updatedOverrides))
            
            if (user) {
              await supabase
                .from("profiles")
                .update({ projection_overrides: updatedOverrides })
                .eq("id", user.id)
              await refreshProfile()
            }
            
            window.dispatchEvent(new Event("leger_overrides_updated"))
            toast.success("AI projection overrides updated successfully!")
          } catch (e) {
             console.error("Failed to commit habit override: ", e)
          }
        }
      } else {
        const isSuperUser = profile?.is_admin === true || profile?.role === "admin" || profile?.role === "super_user" || profile?.username?.toLowerCase()?.includes("quinha") || profile?.username?.toLowerCase()?.includes("admin") || user?.email?.toLowerCase()?.includes("quinha") || user?.email?.toLowerCase()?.includes("admin") || process.env.NODE_ENV === "development"
        const isQuotaErr = data.isQuota || data.error?.includes("429") || data.error?.toLowerCase()?.includes("limit") || data.error?.toLowerCase()?.includes("quota")
        
        let displayError = ""
        if (isSuperUser) {
          displayError = isQuotaErr 
            ? `⚠️ Rate Limit Exceeded (429)\nTo bypass shared limits, configure an API key in System Settings.\n\n[Super User Debug: ${data.error}]`
            : `⚠️ Engine Error\n\n[Super User Debug: ${data.error || "Neural query failed to execute."}]`
        } else {
          displayError = data.userFriendlyMessage || (isQuotaErr 
            ? "The AI assistant is temporarily experiencing high request traffic. Please try asking again in a moment."
            : "I'm currently unable to complete this analysis. Please try asking again in a moment.")
        }

        const errVal: Message = {
          sender: "assistant",
          text: displayError,
          timestamp: Date.now()
        }
        saveSessionMessages(currentSessionId, [...currentMsgs, errVal])
      }
    } catch (err: any) {
      const isSuperUser = profile?.is_admin === true || profile?.role === "admin" || profile?.role === "super_user" || profile?.username?.toLowerCase()?.includes("quinha") || profile?.username?.toLowerCase()?.includes("admin") || user?.email?.toLowerCase()?.includes("quinha") || user?.email?.toLowerCase()?.includes("admin") || process.env.NODE_ENV === "development"
      
      let displayError = ""
      if (isSuperUser) {
        displayError = err?.name === "AbortError" 
          ? "Query timed out after 45s. [Super User Debug: AbortError]"
          : `Connection lost. [Super User Debug: ${err?.message || "Unable to reach AI engine"}]`
      } else {
        displayError = err?.name === "AbortError"
          ? "The request took a little too long to respond. Please try asking again."
          : "I'm having trouble connecting to the analysis engine right now. Please try again in a moment."
      }

      const errVal: Message = {
        sender: "assistant",
        text: displayError,
        timestamp: Date.now()
      }
      saveSessionMessages(currentSessionId, [...currentMsgs, errVal])
    } finally {
      clearTimeout(timeoutId)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    handleQueryRef.current = handleQuery
  })

  // Do not render on public auth views
  if (pathname === "/login" || pathname === "/signup") return null

  return (
    <div ref={dragRef} className="fixed inset-0 pointer-events-none z-[100000] overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        
        {/* Chat Drawer Window */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              drag="y"
              dragListener={false}
              dragControls={sheetDragControls}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(event, info) => {
                if (info.offset.y > 80 || info.velocity.y > 250) {
                  setIsOpen(false)
                }
              }}
              initial={{ y: "100%", opacity: 0.95 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="absolute pointer-events-auto bottom-0 left-0 right-0 sm:bottom-20 sm:left-auto sm:right-6 w-full sm:w-[410px] h-[82vh] sm:h-[540px] max-h-[90vh] sm:max-h-[calc(100vh-140px)] border-t border-x sm:border border-border bg-card/95 backdrop-blur-md shadow-2xl flex flex-col overflow-hidden rounded-t-2xl sm:rounded-xl font-sans z-[100000]"
            >
              {/* Full-width Drag Handle Bar with spacious hitbox */}
              <div 
                className="w-full flex justify-center py-3.5 cursor-grab active:cursor-grabbing border-b border-border/40 select-none shrink-0 bg-secondary/20 hover:bg-secondary/30 transition-colors touch-none" 
                onPointerDown={(e) => sheetDragControls.start(e)}
              >
                <div className="w-16 h-1.5 bg-muted-foreground/40 rounded-full" />
              </div>

              {/* Scanline background */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(128,128,128,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(128,128,128,0.01)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

              {/* Chat Header */}
              <div 
                className="px-3.5 py-3 border-b border-border bg-secondary/15 flex items-center justify-between z-10 cursor-grab active:cursor-grabbing select-none touch-none"
                onPointerDown={(e) => {
                  if (!(e.target as HTMLElement).closest('button, input, select, a')) {
                    sheetDragControls.start(e)
                  }
                }}
              >
                <div className="flex items-center gap-2 max-w-[55%]">
                  <div className="p-1.5 bg-primary/10 border border-primary/20 rounded-md shrink-0">
                    <Brain className="h-4 w-4 text-foreground animate-pulse" />
                  </div>
                  <button
                    onClick={() => setIsHistoryViewOpen(prev => !prev)}
                    className="text-left truncate group flex items-center gap-1.5 hover:bg-secondary/60 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                    title="Switch or view past chats (30-day retention)"
                  >
                    <div className="truncate">
                      <h3 className="text-xs font-bold uppercase tracking-wider font-sans truncate flex items-center gap-1">
                        <span className="truncate">{activeSession?.title || "Leger AI"}</span>
                        <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform shrink-0", isHistoryViewOpen && "rotate-180")} />
                      </h3>
                      <p className="text-[8px] font-mono text-muted-foreground uppercase truncate">Context: {pageContext.name}</p>
                    </div>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button 
                    onClick={() => createNewChat()}
                    title="New chat"
                    className="p-1.5 hover:bg-secondary border border-transparent hover:border-border transition-all cursor-pointer rounded text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <button 
                    onClick={() => setIsHistoryViewOpen(prev => !prev)}
                    title="30-day Chat History"
                    className={cn(
                      "p-1.5 border transition-all cursor-pointer rounded",
                      isHistoryViewOpen ? "bg-foreground text-background border-foreground" : "hover:bg-secondary border-transparent hover:border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <History className="h-3.5 w-3.5" />
                  </button>
                  <button 
                    onClick={() => setIsOpen(false)}
                    title="Close"
                    className="p-1.5 hover:bg-secondary border border-transparent hover:border-border transition-all cursor-pointer rounded text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Multiple Chat Sessions History Drawer Panel */}
              <AnimatePresence>
                {isHistoryViewOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 15 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 bg-card z-30 flex flex-col overflow-hidden rounded-t-2xl sm:rounded-xl font-sans"
                  >
                    {/* Drag Handle Bar */}
                    <div 
                      className="w-full flex justify-center py-3.5 cursor-grab active:cursor-grabbing border-b border-border/40 select-none shrink-0 bg-secondary/20 hover:bg-secondary/30 transition-colors touch-none" 
                      onPointerDown={(e) => sheetDragControls.start(e)}
                    >
                      <div className="w-16 h-1.5 bg-muted-foreground/40 rounded-full" />
                    </div>

                    {/* History Header */}
                    <div className="px-4 py-3 border-b border-border bg-secondary/15 flex items-center justify-between z-10 shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-primary/10 border border-primary/20 rounded-md shrink-0">
                          <History className="h-4 w-4 text-foreground" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider">Chat History</h4>
                          <p className="text-[8px] font-mono text-muted-foreground uppercase">Retained locally for 30 days</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsHistoryViewOpen(false)}
                        title="Close history"
                        className="p-1.5 hover:bg-secondary border border-transparent hover:border-border transition-all cursor-pointer rounded text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Scrollable Sessions List */}
                    <div className="flex-1 space-y-2 overflow-y-auto p-4 pb-20 scrollbar-thin">
                      {sessions.length === 0 ? (
                        <div className="h-full min-h-[200px] flex flex-col items-center justify-center p-6 text-center space-y-3 my-auto">
                          <div className="p-3 bg-secondary/40 border border-border/60 rounded-full text-muted-foreground">
                            <MessagesSquare className="h-5 w-5 opacity-60" />
                          </div>
                          <div className="space-y-1 font-mono">
                            <p className="text-xs font-bold uppercase tracking-wider text-foreground">No chat history</p>
                            <p className="text-[10px] text-muted-foreground">Start a new conversation using the + button.</p>
                          </div>
                        </div>
                      ) : (
                        sessions.map((sess) => {
                          const isActive = sess.id === activeSessionId
                          const daysRemaining = Math.max(1, 30 - Math.floor((Date.now() - (sess.updatedAt || sess.createdAt)) / (1000 * 60 * 60 * 24)))
                          const lastMsg = sess.messages[sess.messages.length - 1]
                          
                          return (
                            <div
                              key={sess.id}
                              onClick={() => {
                                setIsLoading(false)
                                setActiveSessionId(sess.id)
                                setIsHistoryViewOpen(false)
                              }}
                              className={cn(
                                "p-3 rounded-lg border text-left transition-all cursor-pointer group flex items-center justify-between gap-3",
                                isActive
                                  ? "bg-secondary/70 border-foreground/30 shadow-sm"
                                  : "bg-card hover:bg-secondary/30 border-border/70"
                              )}
                            >
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-2">
                                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                                  <h5 className="text-xs font-bold font-sans truncate text-foreground">
                                    {sess.title}
                                  </h5>
                                </div>
                                {lastMsg && (
                                  <p className="text-[10px] text-muted-foreground truncate font-sans">
                                    {lastMsg.text.replace(/\*\*/g, "").slice(0, 65)}
                                  </p>
                                )}
                                <div className="flex items-center gap-3 text-[9px] font-mono text-muted-foreground/70">
                                  <span>{sess.messages.length} messages</span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-2.5 w-2.5" />
                                    Expires in {daysRemaining}d
                                  </span>
                                </div>
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSessionToDelete(sess)
                                }}
                                title="Delete chat session"
                                className="p-2 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/15 transition-all rounded-md shrink-0 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )
                        })
                      )}
                    </div>

                    {/* Bottom Footer Notice */}
                    <div className="p-3 border-t border-border/40 text-[9px] font-mono text-muted-foreground text-center bg-card shrink-0">
                      Sessions auto-expire after 30 days.
                    </div>

                    {/* Floating Add FAB in Bottom Right (Portfolio/Ledger Standard) */}
                    <button
                      onClick={() => createNewChat()}
                      title="Start new chat"
                      className="absolute bottom-5 right-5 z-40 h-11 w-11 rounded-xl bg-white text-black font-extrabold shadow-2xl flex items-center justify-center hover:bg-gray-100 border border-white/20 cursor-pointer transition-transform active:scale-95"
                    >
                      <Plus className="h-5 w-5 stroke-[2.5]" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Normalized Delete Confirmation Dialog */}
              <AnimatePresence>
                {sessionToDelete && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                  >
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className="bg-[#09090b] border border-border rounded-xl p-5 w-full max-w-[320px] shadow-2xl space-y-4"
                    >
                      <div className="space-y-1.5">
                        <h4 className="text-sm font-bold text-foreground">Delete Chat Session</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Are you sure you want to permanently delete <span className="font-semibold text-foreground">&quot;{sessionToDelete.title}&quot;</span>? This action cannot be undone.
                        </p>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                        <button
                          onClick={() => setSessionToDelete(null)}
                          className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            deleteSession(sessionToDelete.id)
                            setSessionToDelete(null)
                            toast.success("Chat session deleted")
                          }}
                          className="px-3 py-1.5 text-xs font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md transition-colors cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Message Feed / PRO Gate */}
              {!isPro ? (
                <div className="flex-1 p-4 flex items-center justify-center">
                  <ProLockOverlay 
                    title="LEGER AI ASSISTANT (PRO)"
                    description="Conversational queries, natural language habit overrides, and dynamic projection simulation adjustments are exclusive to LEGER_OS PRO nodes."
                    className="w-full max-w-sm rounded-none shadow-xl border border-emerald-500/30"
                    onUpgrade={() => setIsOpen(false)}
                  />
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-4 space-y-4 z-10 scrollbar-thin">
                  {messages.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="flex gap-3 max-w-[85%] items-start mr-auto"
                    >
                      <div className="p-1.5 bg-foreground text-background border border-border h-fit shrink-0 rounded-md shadow-sm">
                        <Brain className="h-3 w-3" />
                      </div>
                      <div className="px-4 py-3 sm:p-3 rounded-2xl text-[15px] sm:text-sm leading-relaxed font-sans font-medium shadow-sm bg-secondary/40 text-foreground/90 border-border/40 rounded-tl-none">
                        Hello <strong>{userName}</strong>, how can I help you manage your finances today?
                      </div>
                    </motion.div>
                  ) : (
                    messages.map((msg, i) => {
                    const { cleanText, draft } = parseTransactionDraft(msg.text);
                    const hasComplexFormatting = cleanText.includes("|") || cleanText.includes("- ") || cleanText.includes("* ") || cleanText.includes("###") || cleanText.includes("##");
                    const isNewAssistantMessage = i === messages.length - 1 && msg.sender === "assistant" && (Date.now() - msg.timestamp < 15000) && !hasComplexFormatting;
                    
                    return (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className={cn(
                          "flex gap-3 max-w-[85%] items-start",
                          msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                        )}
                      >
                        {msg.sender === "assistant" && (
                          <div className="p-1.5 bg-foreground text-background border border-border h-fit shrink-0 rounded-md shadow-sm">
                            <Brain className="h-3 w-3" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div 
                            className={cn(
                              "px-4 py-3 sm:p-3 rounded-2xl text-[15px] sm:text-sm leading-relaxed font-sans font-medium shadow-sm transition-all",
                              msg.sender === "user" 
                                ? "bg-foreground text-background border-border rounded-tr-none" 
                                : "bg-secondary/40 text-foreground/90 border-border/40 rounded-tl-none"
                            )}
                          >
                            {msg.sender === "user" ? (
                              msg.text
                            ) : isNewAssistantMessage ? (
                              <TypewriterText text={cleanText} speed={6} />
                            ) : (
                              renderFormattedText(cleanText)
                            )}

                            {/* Live Web Search Sources Badge */}
                            {msg.webSearched && msg.webSources && msg.webSources.length > 0 && (() => {
                              const uniqueSources = Array.from(
                                new Map(
                                  msg.webSources.map((s) => {
                                    let key = s.source || ""
                                    if (!key && s.url) {
                                      try {
                                        key = new URL(s.url).hostname.replace(/^www\./, "")
                                      } catch (e) {
                                        key = s.url
                                      }
                                    }
                                    return [key, { ...s, displaySource: key }]
                                  })
                                ).values()
                              ).slice(0, 4)

                              return (
                                <div className="mt-2.5 pt-2 border-t border-border/30 space-y-1.5 font-mono text-[9px]">
                                  <div className="flex items-center gap-1.5 text-muted-foreground/70 tracking-wider">
                                    <Globe className="h-3 w-3 text-white shrink-0" />
                                    <span className="uppercase">Sources</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {uniqueSources.map((src, sIdx) => (
                                      <a 
                                        key={sIdx} 
                                        href={src.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-secondary/30 hover:bg-secondary/70 border border-border/40 text-muted-foreground hover:text-foreground transition-colors rounded text-[9px] font-mono"
                                      >
                                        <span className="truncate max-w-[130px]">{src.displaySource || src.title}</span>
                                        <ArrowUpRight className="h-2 w-2 opacity-50" />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )
                            })()}
                          </div>

                          {/* Interactive Transaction Draft Card */}
                          {draft && msg.sender === "assistant" && (
                            <TransactionDraftCard 
                              draft={draft}
                              onConfirm={handleConfirmTransactionDraft}
                              currencySymbol={currencySymbol}
                            />
                          )}
                        </div>
                      </motion.div>
                    )
                  }))}
                  {isLoading && messages.length > 0 && messages[messages.length - 1]?.sender === "user" && (
                    <ThinkingIndicator query={messages[messages.length - 1]?.text} />
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}

              {/* Suggestions Panel */}
              <AnimatePresence>
                {suggestionsVisible && suggestedQueries.length > 0 && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-4 py-2 border-t border-border bg-secondary/5 space-y-1.5 z-10 shrink-0 overflow-hidden"
                  >
                    <div className="flex items-center gap-1.5 text-[8px] font-mono text-muted-foreground uppercase opacity-70">
                      <Sparkles className="h-2 w-2 text-foreground/50 animate-pulse" />
                      <span>Suggested queries</span>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x">
                      {suggestedQueries.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleQuery(suggestion)}
                          disabled={isLoading}
                          className="px-2.5 py-1 bg-secondary hover:bg-secondary/80 border border-border text-[10px] sm:text-[9px] font-medium text-foreground tracking-tight rounded-full shrink-0 snap-start transition-colors cursor-pointer"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Slash Command Autocomplete Popover (Mobile-First Touch Architecture) */}
              <AnimatePresence>
                {isSlashMode && filteredSlashCommands.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="mx-3 mb-2 p-2 bg-card dark:bg-zinc-950 border border-border shadow-2xl z-20 font-mono text-xs overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-2 pb-1.5 border-b border-border/40 text-[9px] uppercase text-muted-foreground tracking-wider font-bold">
                      <span className="flex items-center gap-1.5 text-foreground">
                        <Command className="h-3 w-3" />
                        Quick Commands
                      </span>
                      <span className="text-[8px] text-muted-foreground/70 lowercase font-sans">tap to customize</span>
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-1 pt-1.5 scrollbar-thin">
                      {filteredSlashCommands.map((cmd) => {
                        const Icon = cmd.icon
                        return (
                          <div
                            key={cmd.command}
                            onClick={() => handleSelectSlashCommand(cmd, false)}
                            className="w-full flex items-center justify-between gap-2.5 p-2 rounded-md text-left transition-all cursor-pointer bg-secondary/20 hover:bg-secondary/60 border border-border/40 hover:border-border select-none"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className="w-6 h-6 rounded flex items-center justify-center shrink-0 border bg-card border-border/80 text-foreground">
                                <Icon className="h-3 w-3" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-xs text-foreground shrink-0">{cmd.command}</span>
                                  <span className="text-[9px] text-muted-foreground/60 uppercase font-sans shrink-0">{cmd.label}</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">{cmd.description}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSelectSlashCommand(cmd, true)
                              }}
                              className="px-2 py-1 rounded bg-secondary hover:bg-foreground hover:text-background text-muted-foreground border border-border text-[9px] font-sans font-bold uppercase transition-all shrink-0 cursor-pointer flex items-center gap-1"
                              title="Run default"
                            >
                              <span>Run</span>
                              <Send className="h-2 w-2" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Chat Input Area */}
              <div className="p-3 border-t border-border bg-card flex items-center gap-3.5 z-10 shrink-0 pb-6 sm:pb-3">
                <button
                  onClick={() => setSuggestionsVisible(prev => !prev)}
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 cursor-pointer border border-border/85",
                    suggestionsVisible 
                      ? "bg-foreground text-background border-foreground shadow-[0_0_10px_rgba(255,255,255,0.15)]" 
                      : "bg-secondary hover:bg-secondary/80 border-border text-muted-foreground"
                  )}
                  title="Toggle suggested queries"
                >
                  <Sparkles className="h-4 w-4" />
                </button>
                <div className="relative flex-1 flex items-center">
                  {/* Clean Animated Placeholder Overlay matching AI Thinking Indicator */}
                  {!inputVal && !isListening && (
                    <div className="absolute left-4 right-10 pointer-events-none overflow-hidden select-none flex items-center h-full z-10">
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={placeholderIdx}
                          initial={{ opacity: 0, y: 5, filter: "blur(2px)" }}
                          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                          exit={{ opacity: 0, y: -5, filter: "blur(2px)" }}
                          transition={{ duration: 0.28, ease: "easeInOut" }}
                          className="truncate block text-[13.5px] sm:text-xs text-muted-foreground/60 font-sans leading-none pointer-events-none"
                        >
                          {PLACEHOLDER_ROTATION[placeholderIdx]}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                  )}

                  <input
                    type="text"
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.preventDefault()
                        setInputVal("")
                        return
                      }
                      if (e.key === "Enter") {
                        handleQuery(inputVal)
                      }
                    }}
                    placeholder={isListening ? "Listening..." : ""}
                    disabled={isLoading}
                    className="w-full pl-4 pr-10 py-2 border border-border bg-secondary/35 outline-none text-[13.5px] sm:text-xs rounded-full text-foreground placeholder:text-muted-foreground/60 focus:border-foreground/30 focus:bg-secondary/50 transition-all h-9 relative z-0"
                  />
                  <button
                    onClick={inputVal.trim() ? () => handleQuery(inputVal) : toggleListening}
                    disabled={isLoading || (!inputVal.trim() && !recognitionRef.current)}
                    className={cn(
                      "absolute right-1.5 w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer",
                      inputVal.trim() 
                        ? "bg-foreground text-background" 
                        : isListening 
                          ? "bg-red-500 text-white animate-pulse" 
                          : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {inputVal.trim() ? (
                      <Send className="h-3 w-3" />
                    ) : (
                      isListening ? <MicOff className="h-3 w-3" /> : <Mic className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 1. Anchored Non-Draggable Proactive AI Pill Banner (Bottom-anchored, never covers '+' FAB) */}
        <AnimatePresence>
          {isPillExpanded && !isPillDismissed && !isOpen && !isSettingsOpen && pathname !== "/leger-ai" && (
            <motion.div
              key="anchored-pill-banner"
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 380, damping: 26 }}
              className={cn(
                "fixed z-[99990] select-none pointer-events-auto",
                // Mobile vertical positioning: docked cleanly above lowest active bottom bar
                hasCycleBar
                  ? "bottom-[100px]"
                  : "bottom-[64px]",
                // Mobile horizontal width: full width if no '+' FAB in view, or safe right clearance if FAB is present
                hasFloatingFab
                  ? "left-3 right-20 sm:left-4 sm:right-24 md:left-6 md:right-auto md:w-[460px]"
                  : "left-3 right-3 sm:left-4 sm:right-4 md:left-6 md:right-auto md:w-[460px]",
                "md:bottom-6"
              )}
            >
              <div className="group flex items-center gap-3 h-12 px-3 bg-card/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-border shadow-[0_12px_40px_rgba(0,0,0,0.5)] rounded-full text-foreground w-full select-none relative overflow-hidden">
                {/* Left Emblem Avatar Badge */}
                <button
                  onClick={handlePillClick}
                  className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center font-bold text-xs shrink-0 shadow-md cursor-pointer hover:scale-105 transition-transform"
                >
                  {!isPro ? (
                    <Lock className="h-4 w-4" />
                  ) : (
                    <Brain className="h-4 w-4 animate-pulse" />
                  )}
                </button>

                {/* Center Natural Context Insight */}
                <div
                  onClick={handlePillClick}
                  className="flex-1 min-w-0 cursor-pointer pr-1"
                >
                  <p className="text-xs font-semibold tracking-tight text-foreground truncate w-full">
                    {pillScenario.banner}
                  </p>
                </div>

                {/* Right Action Icons */}
                <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-border/40">
                  <button
                    onClick={handlePillClick}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Open Assistant"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setIsPillDismissed(true)
                      setIsPillExpanded(false)
                    }}
                    className="p-1 text-muted-foreground/60 hover:text-foreground transition-colors cursor-pointer"
                    title="Dismiss"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Subtle bottom accent glow */}
                <div className="absolute bottom-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 2. Dynamic Floaty AI Orb Trigger Node (Draggable + Edge Snapping) */}
        <motion.div
          drag
          dragMomentum={false}
          dragElastic={0.12}
          style={{ x: dragX, y: dragY }}
          animate={dragControls}
          onDragEnd={handleTriggerDragEnd}
          whileDrag={{ scale: 1.04, cursor: "grabbing" }}
          whileHover={{ scale: 1.02 }}
          className={cn(
            "fixed pointer-events-auto right-4 sm:right-6 md:right-6 z-[99998] cursor-grab active:cursor-grabbing",
            isBulkActive || pathname === "/expenses" || pathname === "/portfolio"
              ? "bottom-[168px] sm:bottom-24" 
              : hasCycleBar || pathname === "/" || pathname === "/budgets" || pathname === "/categories"
              ? "bottom-28" 
              : "bottom-20",
            "md:bottom-6",
            (isOpen || isSettingsOpen || pathname === "/leger-ai") && "hidden"
          )}
        >
          <motion.button
            key="collapsed-pill"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
            onClick={() => {
              userClickedPillRef.current = true
              setIsOpen(true)
            }}
            className="w-12 h-12 rounded-full bg-foreground text-background flex items-center justify-center shadow-2xl relative border border-border border-white/20 select-none overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] cursor-pointer"
          >
            {!isPro ? (
              <div className="relative flex items-center justify-center">
                <Brain className="h-5 w-5 text-background/80" />
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-card text-foreground rounded-full flex items-center justify-center border border-border shadow-md">
                  <Lock className="h-2.5 w-2.5 text-muted-foreground" />
                </span>
              </div>
            ) : (
              <div className="relative">
                <Brain className="h-5 w-5 text-background animate-pulse" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full border border-foreground animate-ping" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full border border-foreground" />
              </div>
            )}
          </motion.button>
        </motion.div>
        
      </div>
    </div>
  )
}
