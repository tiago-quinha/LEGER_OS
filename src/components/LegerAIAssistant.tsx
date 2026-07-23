"use client"

import React, { useState, useEffect, useRef, useMemo } from "react"
import { motion, AnimatePresence, useAnimation, useMotionValue, useDragControls } from "framer-motion"
import { Brain, Cpu, MessageSquare, Mic, MicOff, Send, X, RefreshCcw, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSystem } from "@/lib/SystemContext"
import { getAIHeaders } from "@/lib/ai-client"
import { usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface Message {
  sender: "user" | "assistant"
  text: string
  timestamp: number
}

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

  function renderInlineMarkup(str: string) {
    if (!str) return "";
    const parts = str.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
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

    // 2. Unordered List
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

    // 3. Numbered List
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

    // 4. Blockquote
    if (trimmedLine.startsWith(">")) {
      const content = line.substring(line.indexOf(">") + 1).trim();
      quoteLines.push(content);
      continue;
    } else if (quoteLines.length > 0) {
      flushQuote(i);
    }

    // 5. Horizontal Rule
    if (trimmedLine === "---" || trimmedLine === "___") {
      elements.push(<hr key={i} className="border-border/60 my-2" />);
      continue;
    }

    // 6. Normal Paragraph or Empty Line
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

export function LegerAIAssistant() {
  const { profile, user, refreshProfile, currencySymbol, language, aiProvider, customApiKey, isPro } = useSystem()
  const pathname = usePathname()
  const sheetDragControls = useDragControls()
  
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [suggestionsVisible, setSuggestionsVisible] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

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
  
  // Dynamic suggested queries state
  const [suggestedQueries, setSuggestedQueries] = useState<string[]>([])
  // Client calculated telemetry stats
  const [telemetry, setTelemetry] = useState<any>(null)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)

  // Framer Motion animation values for edge snapping magnetism
  const dragControls = useAnimation()
  const dragX = useMotionValue(0)
  const dragY = useMotionValue(0)

  const userName = profile?.username || profile?.full_name || "User"
  const historyKey = `leger_chat_history_${profile?.id || "guest"}`

  // 1. Initialise reactive global telemetry listener
  useEffect(() => {
    if (typeof window !== "undefined") {
      if ((window as any).__leger_cycle_telemetry) {
        setTelemetry((window as any).__leger_cycle_telemetry)
      }

      const handleTelemetryUpdate = () => {
        setTelemetry((window as any).__leger_cycle_telemetry)
      }
      window.addEventListener("leger_telemetry_updated", handleTelemetryUpdate)
      return () => window.removeEventListener("leger_telemetry_updated", handleTelemetryUpdate)
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
        recognition.lang = language || "en-US"

        recognition.onstart = () => setIsListening(true)
        recognition.onend = () => setIsListening(false)
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript
          setInputVal(prev => (prev ? `${prev} ${transcript}` : transcript))
        }
        recognition.onerror = () => {
          setIsListening(false)
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

  // Load chat history on user mount
  useEffect(() => {
    if (profile?.id) {
      const cached = localStorage.getItem(historyKey)
      if (cached) {
        try {
          setMessages(JSON.parse(cached))
        } catch (e) {
          setMessages([])
        }
      } else {
        setMessages([
          {
            sender: "assistant",
            text: `System online. Hello **${userName}**, I am the **LEGER_OS** central intelligence assistant. How can I protect your wealth today?`,
            timestamp: Date.now()
          }
        ])
      }
    }
  }, [profile?.id, userName])

  // Save chat history helper
  const saveHistory = (msgs: Message[]) => {
    setMessages(msgs)
    if (profile?.id) {
      localStorage.setItem(historyKey, JSON.stringify(msgs))
    }
  }

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isOpen])

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
      case "/analytics":
        return {
          name: "Analytics Node",
          suggestions: [
            "What is my daily burn rate?",
            "Compare current spend to my target limit",
            "Analyse current cycle anomalies"
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
    const welcomeText = `I noticed you are currently viewing your **${pageContext.name}** page. I have sync access to your client telemetry. What analysis would you like to run?`
    
    // Check if the last message is already about this page to prevent greeting spam
    if (messages.length > 0 && messages[messages.length - 1].text.includes(pageContext.name)) {
      return
    }

    const updated: Message[] = [
      ...messages,
      {
        sender: "assistant",
        text: welcomeText,
        timestamp: Date.now()
      }
    ]
    saveHistory(updated)
    setSuggestedQueries(pageContext.suggestions)
  }

  // Auto welcome on open
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      const lastMsg = messages[messages.length - 1]
      // Trigger greeting if last message is older than 5 minutes or context changed
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

  // Handle Query Submission
  const handleQuery = async (queryText: string) => {
    if (!queryText.trim() || isLoading) return

    if (!isPro) {
      toast.error("Conversational Queries are a LEGER_OS PRO feature.", {
        description: "Upgrade to PRO to unlock conversational overrides and custom projections.",
      })
      return
    }

    const userMsg: Message = {
      sender: "user",
      text: queryText,
      timestamp: Date.now()
    }
    const currentMsgs = [...messages, userMsg]
    saveHistory(currentMsgs)
    setInputVal("")
    setIsLoading(true)

    try {
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("*")

      // Use window-computed telemetry stats directly to avoid math hallucinations/token waste
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
        body: JSON.stringify({
          query: queryText,
          telemetry: statsPayload,
          categories: categoriesData || [],
          userName,
          clientDate: new Date().toISOString()
        })
      })

      const data = await response.json()
      if (response.ok) {
        const assistantMsg: Message = {
          sender: "assistant",
          text: data.message,
          timestamp: Date.now()
        }
        saveHistory([...currentMsgs, assistantMsg])

        // Dynamically update response suggested query replies matching the AI's closing question
        if (data.suggestedQueries && data.suggestedQueries.length > 0) {
          setSuggestedQueries(data.suggestedQueries)
        } else {
          setSuggestedQueries(pageContext.suggestions)
        }

        // Trigger projection overrides if AI outputs a multiplier change
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
        const errVal: Message = {
          sender: "assistant",
          text: `Error: ${data.error || "Neural query failed to execute."}`,
          timestamp: Date.now()
        }
        saveHistory([...currentMsgs, errVal])
      }
    } catch (err) {
      const errVal: Message = {
        sender: "assistant",
        text: "Error: Connection lost. mainframes are temporarily unreachable.",
        timestamp: Date.now()
      }
      saveHistory([...currentMsgs, errVal])
    } finally {
      setIsLoading(false)
    }
  }



  const clearChatHistory = () => {
    if (confirm("Reset current assistant chat history?")) {
      const welcome: Message[] = [
        {
          sender: "assistant",
          text: `Terminal re-initialised. Hello **${userName}**, I am the **LEGER_OS** central intelligence assistant.`,
          timestamp: Date.now()
        }
      ]
      saveHistory(welcome)
      setSuggestedQueries(pageContext.suggestions)
    }
  }

  // Do not render on public auth views
  if (pathname === "/login" || pathname === "/signup") return null

  return (
    <div ref={dragRef} className="fixed inset-0 pointer-events-none z-[100000] overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        
        {/* Chat Drawer Window */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              drag={isMobile ? "y" : false}
              dragListener={false}
              dragControls={sheetDragControls}
              dragConstraints={{ top: 0, bottom: 600 }}
              dragElastic={{ top: 0, bottom: 0.5 }}
              onDragEnd={(event, info) => {
                if (isMobile && info.offset.y > 120) {
                  setIsOpen(false)
                }
              }}
              initial={isMobile ? { y: "100%", opacity: 0.95 } : { opacity: 0, scale: 0.95, y: 30 }}
              animate={isMobile ? { y: 0, opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
              exit={isMobile ? { y: "100%", opacity: 0.95 } : { opacity: 0, scale: 0.95, y: 30 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="absolute pointer-events-auto bottom-0 left-0 right-0 sm:bottom-20 sm:left-auto sm:right-6 w-full sm:w-[380px] h-[72vh] sm:h-[520px] max-h-[85vh] sm:max-h-[calc(100vh-140px)] border-t border-x sm:border border-border bg-card/95 backdrop-blur-md shadow-2xl flex flex-col overflow-hidden rounded-t-2xl sm:rounded-xl font-sans z-[100000]"
            >
              {isMobile && (
                <div 
                  className="w-12 h-1.5 bg-border/80 rounded-full mx-auto my-2.5 shrink-0 cursor-pointer hover:bg-border transition-colors touch-none" 
                  onPointerDown={(e) => sheetDragControls.start(e)}
                />
              )}
              {/* Scanline background */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(128,128,128,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(128,128,128,0.01)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

              {/* Chat Header */}
              <div className="p-4 border-b border-border bg-secondary/15 flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary/10 border border-primary/20 rounded-md">
                    <Brain className="h-4 w-4 text-foreground animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider font-sans">LEGER_AI // Assistant</h3>
                    <p className="text-[8px] font-mono text-muted-foreground uppercase">Active Context: {pageContext.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={clearChatHistory}
                    title="Clear history"
                    className="p-1.5 hover:bg-secondary border border-transparent hover:border-border transition-all cursor-pointer rounded"
                  >
                    <RefreshCcw className="h-3 w-3 text-muted-foreground" />
                  </button>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 hover:bg-secondary border border-transparent hover:border-border transition-all cursor-pointer rounded"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 z-10 scrollbar-thin">
                {messages.map((msg, i) => {
                  // Only run typewriter typing animation on the latest incoming assistant message
                  const isNewAssistantMessage = i === messages.length - 1 && msg.sender === "assistant" && (Date.now() - msg.timestamp < 15000);
                  
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
                          <TypewriterText text={msg.text} speed={6} />
                        ) : (
                          renderFormattedText(msg.text)
                        )}
                      </div>
                    </motion.div>
                  )
                })}
                {isLoading && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-3 max-w-[85%] mr-auto items-start"
                  >
                    <div className="p-1.5 bg-foreground text-background border border-border h-fit shrink-0 rounded-md">
                      <Cpu className="h-3 w-3 animate-spin" />
                    </div>
                    <div className="p-3 bg-secondary/40 text-muted-foreground border border-border/60 rounded-lg rounded-tl-none text-xs italic animate-pulse flex items-center gap-2">
                      <span>Analyzing cycle delta variables</span>
                      <span className="flex gap-1">
                        <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" />
                      </span>
                    </div>
                  </motion.div>
                )}
                <div ref={chatEndRef} />
              </div>

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
                  <input
                    type="text"
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleQuery(inputVal)}
                    placeholder={isListening ? "Listening..." : "Ask assistant..."}
                    disabled={isLoading}
                    className="w-full pl-4 pr-10 py-2 border border-border bg-secondary/35 outline-none text-[13.5px] sm:text-xs rounded-full text-foreground placeholder:text-muted-foreground/60 focus:border-foreground/30 focus:bg-secondary/50 transition-all h-9"
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

        {/* Floating Triggable AI Node (Magnetic snap to Edge) */}
        <motion.div
          drag
          dragMomentum={false}
          dragElastic={0.08}
          style={{ x: dragX, y: dragY }}
          animate={dragControls}
          onDragEnd={(event, info) => {
            const screenWidth = window.innerWidth
            const screenHeight = window.innerHeight
            
            // Initial positioning offsets depending on breakpoint
            const isMobile = screenWidth < 768
            const bottomOffset = isMobile ? 80 : 24
            const rightOffset = 24
            
            // Current relative translation values
            const curX = dragX.get()
            const curY = dragY.get()
            
            // Calculate absolute coordinate positions relative to viewport
            const startX = screenWidth - 48 - rightOffset
            const absX = startX + curX
            
            const startY = screenHeight - 48 - bottomOffset
            
            // Snap to physically closest edge
            const targetX = absX < (screenWidth / 2) ? -(screenWidth - 48 - (rightOffset * 2)) : 0
            
            // Constrain vertical coordinate to prevent overflow
            const targetY = Math.max(-startY + 24, Math.min(16, curY))
            
            dragControls.start({
              x: targetX,
              y: targetY,
              transition: { type: "spring", stiffness: 300, damping: 22 }
            })
          }}
          className={cn(
            "absolute pointer-events-auto bottom-20 md:bottom-6 right-6 z-[9999] cursor-grab active:cursor-grabbing",
            isOpen && "hidden sm:block"
          )}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-12 h-12 rounded-full bg-foreground text-background flex items-center justify-center shadow-2xl relative border border-border border-white/20 select-none overflow-hidden transition-all duration-300 hover:shadow-[0_0_15px_rgba(255,255,255,0.25)] dark:hover:shadow-[0_0_15px_rgba(16,185,129,0.25)]"
          >
            {isOpen ? (
              <X className="h-5 w-5 animate-pulse" />
            ) : (
              <div className="relative">
                <Brain className="h-5 w-5 text-background animate-pulse" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full border border-foreground animate-ping" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full border border-foreground" />
              </div>
            )}
            
            {/* Scanline overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/[0.05] to-transparent h-4 w-full animate-scan pointer-events-none" />
          </button>
        </motion.div>
        
      </div>
    </div>
  )
}
