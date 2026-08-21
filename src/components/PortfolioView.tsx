"use client";

import { useState, useEffect, useMemo, useCallback, useTransition, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { useSystem } from "@/lib/SystemContext";
import { PrivacyValue } from "@/components/ui/privacy-value";
import { ProLockOverlay } from "@/components/ProLockOverlay";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import PortfolioLoading from "@/app/portfolio/loading";
import { toast } from "sonner";
import { useCycleSwipe } from "@/hooks/useCycleSwipe";
import { CycleMobileBar } from "@/components/ui/cycle-mobile-bar";
import { SwipeCycleWrapper } from "@/components/ui/swipe-cycle-wrapper";
import type { Cycle } from "@/lib/cycles";
import {
  TrendingUp,
  Coins,
  Landmark,
  Layers,
  Search,
  Plus,
  RefreshCw,
  Clock,
  Trash2,
  Edit2,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tilt } from "@/components/unlumen-ui/tilt";
import { ClippedCircle } from "@/components/unlumen-ui/clipped-circle";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Area as RechartsArea,
  AreaChart as RechartsAreaChart,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

export interface PortfolioAsset {
  id: string;
  user_id: string;
  asset_name: string;
  symbol: string | null;
  asset_type: "stock_etf" | "crypto" | "cash_equivalent" | "commodity" | "other";
  quantity: number;
  buy_price: number;
  current_price: number;
  currency: string;
  institution?: string;
  notes?: string;
  metadata?: {
    change24h?: number;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
}

export interface PortfolioSnapshot {
  id: string;
  snapshot_date: string;
  total_net_worth: number;
  liquid_cash: number;
  invested_capital: number;
  total_gain_loss: number;
  min_valuation?: number;
  max_valuation?: number;
  closing_valuation?: number;
  asset_breakdown: Record<string, { valuation: number; count: number }>;
}

interface PopularAssetPreset {
  id: string;
  name: string;
  symbol: string;
  type: "stock_etf" | "crypto" | "commodity" | "cash_equivalent";
  estPrice: number;
  badgeLabel: string;
}

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

const POPULAR_PRESETS: PopularAssetPreset[] = [
  // Crypto
  { id: "btc", name: "Bitcoin", symbol: "BTC", type: "crypto", estPrice: 62000.0, badgeLabel: "CRYPTO" },
  { id: "eth", name: "Ethereum", symbol: "ETH", type: "crypto", estPrice: 3400.0, badgeLabel: "CRYPTO" },
  { id: "sol", name: "Solana", symbol: "SOL", type: "crypto", estPrice: 155.0, badgeLabel: "CRYPTO" },
  { id: "ada", name: "Cardano", symbol: "ADA", type: "crypto", estPrice: 0.45, badgeLabel: "CRYPTO" },
  { id: "xrp", name: "Ripple", symbol: "XRP", type: "crypto", estPrice: 0.58, badgeLabel: "CRYPTO" },
  { id: "bnb", name: "Binance Coin", symbol: "BNB", type: "crypto", estPrice: 580.0, badgeLabel: "CRYPTO" },
  { id: "link", name: "Chainlink", symbol: "LINK", type: "crypto", estPrice: 14.5, badgeLabel: "CRYPTO" },
  { id: "doge", name: "Dogecoin", symbol: "DOGE", type: "crypto", estPrice: 0.12, badgeLabel: "CRYPTO" },
  { id: "dot", name: "Polkadot", symbol: "DOT", type: "crypto", estPrice: 6.2, badgeLabel: "CRYPTO" },
  { id: "avax", name: "Avalanche", symbol: "AVAX", type: "crypto", estPrice: 24.5, badgeLabel: "CRYPTO" },
  { id: "matic", name: "Polygon", symbol: "MATIC", type: "crypto", estPrice: 0.42, badgeLabel: "CRYPTO" },
  { id: "shib", name: "Shiba Inu", symbol: "SHIB", type: "crypto", estPrice: 0.000018, badgeLabel: "CRYPTO" },
  { id: "uni", name: "Uniswap", symbol: "UNI", type: "crypto", estPrice: 7.8, badgeLabel: "CRYPTO" },
  { id: "ltc", name: "Litecoin", symbol: "LTC", type: "crypto", estPrice: 65.0, badgeLabel: "CRYPTO" },
  { id: "near", name: "NEAR Protocol", symbol: "NEAR", type: "crypto", estPrice: 4.8, badgeLabel: "CRYPTO" },
  { id: "sui", name: "Sui Network", symbol: "SUI", type: "crypto", estPrice: 0.95, badgeLabel: "CRYPTO" },
  { id: "atom", name: "Cosmos", symbol: "ATOM", type: "crypto", estPrice: 5.4, badgeLabel: "CRYPTO" },
  { id: "render", name: "Render Network", symbol: "RENDER", type: "crypto", estPrice: 5.9, badgeLabel: "CRYPTO" },

  // Stocks & ETFs
  { id: "xtb", name: "XTB S.A.", symbol: "XTB", type: "stock_etf", estPrice: 130.33, badgeLabel: "STOCKS" },
  { id: "aapl", name: "Apple Inc.", symbol: "AAPL", type: "stock_etf", estPrice: 224.0, badgeLabel: "STOCKS" },
  { id: "msft", name: "Microsoft Corp.", symbol: "MSFT", type: "stock_etf", estPrice: 445.0, badgeLabel: "STOCKS" },
  { id: "nvda", name: "NVIDIA Corp.", symbol: "NVDA", type: "stock_etf", estPrice: 128.0, badgeLabel: "STOCKS" },
  { id: "tsla", name: "Tesla Inc.", symbol: "TSLA", type: "stock_etf", estPrice: 215.0, badgeLabel: "STOCKS" },
  { id: "amzn", name: "Amazon.com Inc.", symbol: "AMZN", type: "stock_etf", estPrice: 186.0, badgeLabel: "STOCKS" },
  { id: "googl", name: "Alphabet Inc.", symbol: "GOOGL", type: "stock_etf", estPrice: 165.0, badgeLabel: "STOCKS" },
  { id: "meta", name: "Meta Platforms", symbol: "META", type: "stock_etf", estPrice: 520.0, badgeLabel: "STOCKS" },
  { id: "amd", name: "Advanced Micro Devices", symbol: "AMD", type: "stock_etf", estPrice: 142.0, badgeLabel: "STOCKS" },
  { id: "nflx", name: "Netflix Inc.", symbol: "NFLX", type: "stock_etf", estPrice: 660.0, badgeLabel: "STOCKS" },
  { id: "spy", name: "SPDR S&P 500 ETF Trust", symbol: "SPY", type: "stock_etf", estPrice: 545.0, badgeLabel: "ETF" },
  { id: "qqq", name: "Invesco QQQ Trust ETF", symbol: "QQQ", type: "stock_etf", estPrice: 475.0, badgeLabel: "ETF" },
  { id: "vwce", name: "Vanguard All-World ETF", symbol: "VWCE.DE", type: "stock_etf", estPrice: 121.0, badgeLabel: "ETF" },
  { id: "sxr8", name: "iShares S&P 500 ETF", symbol: "SXR8.DE", type: "stock_etf", estPrice: 525.0, badgeLabel: "ETF" },

  // Commodities
  { id: "xau", name: "Gold Spot", symbol: "XAU", type: "commodity", estPrice: 2450.0, badgeLabel: "COMMODITY" },
  { id: "xag", name: "Silver Spot", symbol: "XAG", type: "commodity", estPrice: 28.5, badgeLabel: "COMMODITY" },
  { id: "wti", name: "Crude Oil WTI", symbol: "WTI", type: "commodity", estPrice: 78.0, badgeLabel: "COMMODITY" },
];

const ASSET_TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  stock_etf: { label: "STOCKS & ETFS", icon: TrendingUp, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20" },
  crypto: { label: "CRYPTO", icon: Coins, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20" },
  commodity: { label: "COMMODITIES", icon: Layers, color: "text-purple-500", bg: "bg-purple-500/10 border-purple-500/20" },
  other: { label: "CUSTOM ASSETS", icon: Landmark, color: "text-gray-400", bg: "bg-gray-500/10 border-gray-500/20" },
};

function format2Decimals(num: number): string {
  if (isNaN(num)) return "0.00";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatSmartPrice(num: number): string {
  if (isNaN(num) || num === 0) return "0.00";
  const abs = Math.abs(num);
  if (abs < 0.0001) {
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 6,
      maximumFractionDigits: 8,
    });
  }
  if (abs < 0.01) {
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 4,
      maximumFractionDigits: 6,
    });
  }
  if (abs < 1) {
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  }
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatSmartQuantity(num: number): string {
  if (isNaN(num)) return "0";
  if (Number.isInteger(num)) return num.toLocaleString("en-US");
  return num.toLocaleString("en-US", {
    maximumFractionDigits: 8,
  });
}

function getRawPriceString(num: number): string {
  if (isNaN(num) || num === 0) return "";
  if (num < 0.01) {
    return num.toFixed(8).replace(/\.?0+$/, "");
  }
  return num.toFixed(2);
}

const PRELOADED_ICONS: Record<string, string> = {
  // Top Cryptocurrencies (SpotHQ SVG CDN)
  BTC: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/btc.svg",
  ETH: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/eth.svg",
  SOL: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/sol.svg",
  ADA: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/ada.svg",
  XRP: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/xrp.svg",
  BNB: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/bnb.svg",
  LINK: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/link.svg",
  DOGE: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/doge.svg",
  DOT: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/dot.svg",
  AVAX: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/avax.svg",
  MATIC: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/matic.svg",
  POL: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/matic.svg",
  SHIB: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/shib.svg",
  UNI: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/uni.svg",
  LTC: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/ltc.svg",
  NEAR: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/near.svg",
  ATOM: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/atom.svg",
  ICP: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/icp.svg",
  TRX: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/trx.svg",
  XMR: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/xmr.svg",
  XLM: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/xlm.svg",
  BCH: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/bch.svg",
  ETC: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/etc.svg",
  FIL: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/fil.svg",
  ALGO: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/algo.svg",
  VET: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/vet.svg",
  AAVE: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/aave.svg",
  MKR: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/mkr.svg",
  CRV: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/crv.svg",
  GRT: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/grt.svg",
  USDT: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/usdt.svg",
  USDC: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/usdc.svg",

  // Stocks & ETFs Logos (High Resolution Parqet Financial CDN)
  AAPL: "https://assets.parqet.com/logos/symbol/AAPL?format=png",
  MSFT: "https://assets.parqet.com/logos/symbol/MSFT?format=png",
  NVDA: "https://assets.parqet.com/logos/symbol/NVDA?format=png",
  TSLA: "https://assets.parqet.com/logos/symbol/TSLA?format=png",
  AMZN: "https://assets.parqet.com/logos/symbol/AMZN?format=png",
  GOOGL: "https://assets.parqet.com/logos/symbol/GOOGL?format=png",
  GOOG: "https://assets.parqet.com/logos/symbol/GOOG?format=png",
  META: "https://assets.parqet.com/logos/symbol/META?format=png",
  AMD: "https://assets.parqet.com/logos/symbol/AMD?format=png",
  NFLX: "https://assets.parqet.com/logos/symbol/NFLX?format=png",
  PLTR: "https://assets.parqet.com/logos/symbol/PLTR?format=png",
  SPY: "https://assets.parqet.com/logos/symbol/SPY?format=png",
  QQQ: "https://assets.parqet.com/logos/symbol/QQQ?format=png",
  VOO: "https://assets.parqet.com/logos/symbol/VOO?format=png",
  VTI: "https://assets.parqet.com/logos/symbol/VTI?format=png",
  "VWCE.DE": "https://assets.parqet.com/logos/symbol/VWCE.DE?format=png",
  "SXR8.DE": "https://assets.parqet.com/logos/symbol/SXR8.DE?format=png",
  COIN: "https://assets.parqet.com/logos/symbol/COIN?format=png",
  DIS: "https://assets.parqet.com/logos/symbol/DIS?format=png",
  ARM: "https://assets.parqet.com/logos/symbol/ARM?format=png",
  UBER: "https://assets.parqet.com/logos/symbol/UBER?format=png",
  INTC: "https://assets.parqet.com/logos/symbol/INTC?format=png",
};

// Eagerly pre-warm browser memory cache on module load for 0ms instant rendering
if (typeof window !== "undefined") {
  Object.values(PRELOADED_ICONS).forEach((url) => {
    const img = new Image();
    img.src = url;
  });
}

function AssetLogo({ symbol, assetType, name, customIconUrl, className }: { symbol?: string | null; assetType: string; name: string; customIconUrl?: string; className?: string }) {
  const [imgError, setImgError] = useState(false);

  const cleanSym = (symbol || "").toUpperCase().trim();
  const config = ASSET_TYPE_CONFIG[assetType] || ASSET_TYPE_CONFIG.other;

  const imageUrl = useMemo(() => {
    if (customIconUrl && !imgError) return customIconUrl;
    if (!cleanSym || imgError) return null;
    if (PRELOADED_ICONS[cleanSym]) return PRELOADED_ICONS[cleanSym];
    if (assetType === "crypto") {
      return `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/${cleanSym.toLowerCase()}.svg`;
    }
    if (assetType === "stock_etf") {
      return `https://assets.parqet.com/logos/symbol/${cleanSym}?format=png`;
    }
    return null;
  }, [cleanSym, assetType, imgError, customIconUrl]);

  if (imageUrl && !imgError) {
    return (
      <div className={cn("h-10 w-10 rounded-xl border border-border/80 bg-secondary/30 flex items-center justify-center shrink-0 p-1 overflow-hidden relative shadow-xs", className)}>
        <img
          src={imageUrl}
          alt={name}
          loading="eager"
          fetchPriority="high"
          className="h-full w-full object-contain rounded-lg"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div className={cn("h-10 w-10 rounded-xl border flex items-center justify-center shrink-0 font-mono text-[11px] font-bold uppercase tracking-tighter", config.bg, config.color, className)}>
      {cleanSym ? cleanSym.slice(0, 3) : name.slice(0, 2).toUpperCase()}
    </div>
  );
}

const ASSET_LINE_COLORS = [
  "#ffffff", // White / primary
  "#10b981", // Emerald
  "#3b82f6", // Blue
  "#f59e0b", // Amber
  "#a855f7", // Purple
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#84cc16", // Lime
];

function CustomPortfolioTooltip({ active, payload, label, formatCurrency, selectedChartMode, assets }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isAllMode = selectedChartMode === "all";
    const isCompareMode = selectedChartMode === "compare";
    const hasIntradayRange = typeof data.maxValuation === "number" && typeof data.minValuation === "number" && data.maxValuation > data.minValuation;

    if (isCompareMode) {
      return (
        <div className="bg-card/95 backdrop-blur-xs border border-border p-2.5 md:p-3 font-mono text-[9px] md:text-[10px] space-y-2 shadow-md z-50 rounded-none min-w-[200px] pointer-events-none select-none">
          <p className="font-bold border-b border-border pb-1 uppercase tracking-wider">{label} - HOLDINGS</p>
          <div className="space-y-1.5">
            {assets.map((a: any, idx: number) => {
              const val = data[`asset_${a.id}`];
              if (val == null) return null;
              const color = ASSET_LINE_COLORS[idx % ASSET_LINE_COLORS.length];
              return (
                <div key={a.id} className="flex items-center justify-between gap-4 text-[9px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="h-2 w-2 rounded-xs shrink-0" style={{ backgroundColor: color }} />
                    <span className="font-bold uppercase text-foreground truncate">{a.symbol?.toUpperCase() || a.asset_name}</span>
                  </div>
                  <span className="font-mono font-bold text-foreground shrink-0">{formatCurrency(val)}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div className="bg-card/95 backdrop-blur-xs border border-border p-2 md:p-3 font-mono text-[9px] md:text-[10px] space-y-1.5 md:space-y-2 shadow-md z-50 rounded-none min-w-[190px] pointer-events-none select-none">
        <p className="font-bold border-b border-border pb-1 uppercase">{label}</p>
        <div className="space-y-1">
          <p className="flex justify-between gap-6 md:gap-8 uppercase">
            <span>{isAllMode ? "Closing / Total:" : "Closing Valuation:"}</span>
            <span className="font-bold text-foreground">{formatCurrency(data.closingValuation ?? data.actualValuation ?? data.projectionValuation ?? data.valuation)}</span>
          </p>
          {hasIntradayRange && (
            <div className="border-y border-border/40 py-1 space-y-0.5 text-[8.5px] md:text-[9px]">
              <p className="flex justify-between gap-4 text-emerald-500 uppercase font-semibold">
                <span>Day High (Max):</span>
                <span>{formatCurrency(data.maxValuation)}</span>
              </p>
              <p className="flex justify-between gap-4 text-rose-500 uppercase font-semibold">
                <span>Day Low (Min):</span>
                <span>{formatCurrency(data.minValuation)}</span>
              </p>
              <p className="flex justify-between gap-4 opacity-60 uppercase text-[8px]">
                <span>Intraday Spread:</span>
                <span>{formatCurrency(data.maxValuation - data.minValuation)}</span>
              </p>
            </div>
          )}
          {data.invested > 0 && (
            <p className="flex justify-between gap-6 md:gap-8 opacity-60 uppercase">
              <span>Cost Basis:</span>
              <span>{formatCurrency(data.invested)}</span>
            </p>
          )}
          {isAllMode && assets && assets.length > 0 && (
            <div className="border-t border-border/40 pt-1 space-y-0.5">
              {assets.map((a: any) => {
                const val = data[`asset_${a.id}`];
                if (val == null || val === 0) return null;
                return (
                  <p key={a.id} className="flex justify-between gap-4 opacity-50 uppercase text-[8px]">
                    <span>{a.symbol?.toUpperCase() || a.asset_name}</span>
                    <span>{formatCurrency(val)}</span>
                  </p>
                );
              })}
            </div>
          )}
          {/* Day Return (Daily / 24H Return) */}
          {data.dayReturn != null && (
            <p className="flex justify-between gap-6 md:gap-8 uppercase text-[9px] border-t border-border/40 pt-1">
              <span>Day Return:</span>
              <span className={data.dayReturn >= 0 ? "text-emerald-500 font-semibold" : "text-destructive font-semibold"}>
                {data.dayReturn >= 0 ? "+" : ""}{formatCurrency(data.dayReturn)}
                {data.dayReturnPct != null && !isNaN(data.dayReturnPct) && ` (${data.dayReturnPct >= 0 ? "+" : ""}${data.dayReturnPct.toFixed(2)}%)`}
              </span>
            </p>
          )}

          {/* Total Unrealized Return */}
          <p className="flex justify-between gap-6 md:gap-8 uppercase text-[9px] border-t border-border/40 pt-1">
            <span>Total Return:</span>
            <span className={data.gainLoss >= 0 ? "text-emerald-500 font-semibold" : "text-destructive font-semibold"}>
              {data.gainLoss >= 0 ? "+" : ""}{formatCurrency(data.gainLoss)}
              {data.invested > 0 && ` (${data.gainLoss >= 0 ? "+" : ""}${((data.gainLoss / data.invested) * 100).toFixed(2)}%)`}
            </span>
          </p>
        </div>
      </div>
    );
  }
  return null;
}

interface PortfolioViewProps {
  cycles?: Cycle[];
  currentCycleId?: string;
  initialAssets?: PortfolioAsset[];
  initialLiquidBalance?: number;
  expenses?: any[];
  injectedStartBalance?: number;
}

export function PortfolioView({
  cycles = [],
  currentCycleId,
  initialAssets = [],
  initialLiquidBalance = 0,
  expenses = [],
  injectedStartBalance = 0,
}: PortfolioViewProps) {
  const router = useRouter();
  const { formatCurrency, currencySymbol, isPro, isAdmin, isLoading } = useSystem();

  const [isPending, startTransition] = useTransition();
  const [selectedCycleId, setSelectedCycleId] = useState<string>(currentCycleId || cycles[0]?.id || "");

  useEffect(() => {
    if (currentCycleId) {
      setSelectedCycleId(currentCycleId);
    }
  }, [currentCycleId]);

  const currentCycle = cycles.find((c) => c.id === selectedCycleId) || cycles[0];
  const currentIndex = cycles.findIndex((c) => c.id === (currentCycle?.id || ""));

  const handleCycleSelect = (newCycleId: string) => {
    setSelectedCycleId(newCycleId);
    startTransition(() => {
      router.replace(`/portfolio?cycleId=${newCycleId}`, { scroll: false });
    });
  };

  const navigateCycle = (direction: "prev" | "next") => {
    const nextIndex = direction === "prev" ? currentIndex + 1 : currentIndex - 1;
    if (cycles[nextIndex]) {
      handleCycleSelect(cycles[nextIndex].id);
    }
  };

  const [assets, setAssets] = useState<PortfolioAsset[]>(initialAssets);
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [liquidBalance, setLiquidBalance] = useState<number>(initialLiquidBalance);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<PortfolioAsset | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [presetSearch, setPresetSearch] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [apiSearchResults, setApiSearchResults] = useState<SearchAssetResult[]>([]);
  const [isSearchingApi, setIsSearchingApi] = useState(false);
  const [fetchingPriceForSymbol, setFetchingPriceForSymbol] = useState<string | null>(null);

  // 500ms debounced live multi-asset search querying Yahoo Finance & CoinGecko
  useEffect(() => {
    const q = presetSearch.trim();
    if (q.length < 2) {
      setApiSearchResults([]);
      setIsSearchingApi(false);
      return;
    }

    setIsSearchingApi(true);
    const handler = setTimeout(async () => {
      try {
        const res = await fetch(`/api/portfolio/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          setApiSearchResults(data.results || []);
        } else {
          setApiSearchResults([]);
        }
      } catch (err) {
        console.error("API asset search failed:", err);
        setApiSearchResults([]);
      } finally {
        setIsSearchingApi(false);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [presetSearch]);

  const [formData, setFormData] = useState({
    asset_name: "",
    symbol: "",
    asset_type: "stock_etf",
    quantity: "",
    buy_price: "",
    current_price: "",
    institution: "",
    notes: "",
  });
  const sheetDragControls = useDragControls();
  const [priceInputMode, setPriceInputMode] = useState<"unit" | "total">("unit");
  const [totalSpentInput, setTotalSpentInput] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [timeToNextSync, setTimeToNextSync] = useState<string>("15:00");

  const [isSyncing, setIsSyncing] = useState(false);
  const [presetLivePrices, setPresetLivePrices] = useState<Record<string, number>>({});

  const fetchPresetLivePrices = useCallback(async () => {
    try {
      const res = await fetch("/api/portfolio/market-data");
      if (res.ok) {
        const data = await res.json();
        if (data.prices) {
          const mapped: Record<string, number> = {};
          Object.entries(data.prices).forEach(([sym, p]: [string, any]) => {
            if (p && typeof p.price === "number") {
              mapped[sym.toUpperCase()] = p.price;
            }
          });
          setPresetLivePrices((prev) => ({ ...prev, ...mapped }));
        }
      }
    } catch (err) {
      console.warn("Failed to fetch preset live prices:", err);
    }
  }, []);

  const fetchPortfolioData = useCallback(async () => {
    try {
      const [assetsRes, snapshotsRes] = await Promise.all([
        fetch("/api/portfolio/assets"),
        fetch("/api/portfolio/snapshots"),
      ]);

      if (assetsRes.ok) {
        const data = await assetsRes.json();
        setAssets(data.assets || []);
        if (typeof data.liquidBalance === "number" && data.liquidBalance > 0) {
          setLiquidBalance(data.liquidBalance);
        }
      }

      if (snapshotsRes.ok) {
        const data = await snapshotsRes.json();
        setSnapshots(data.snapshots || []);
      }
    } catch (err) {
      console.error("Failed to load portfolio data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const syncLiveMarketPrices = useCallback(async (force = false, showToast = false) => {
    try {
      setIsSyncing(true);
      if (showToast) {
        toast.info("Fetching live market prices...");
      }
      const res = await fetch("/api/portfolio/market-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      if (res.ok) {
        const data = await res.json();
        await fetchPortfolioData();
        if (showToast) {
          toast.success(`Market quotes updated (${data.updatedCount || 0} positions synced).`);
        }
      } else if (res.status === 429) {
        const errData = await res.json();
        if (showToast) {
          toast.warning(errData.error || "Rate limit reached. Please wait 30s.");
        }
      }
    } catch (err) {
      console.warn("Live market sync failed:", err);
      if (showToast) {
        toast.error("Failed to sync live market quotes.");
      }
    } finally {
      setIsSyncing(false);
    }
  }, [fetchPortfolioData]);

  useEffect(() => {
    setMounted(true);
    fetchPortfolioData();
    fetchPresetLivePrices();
    syncLiveMarketPrices(false);

    setIsMobile(window.innerWidth < 768);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);

    let lastSlotKey = "";

    const updateCountdown = () => {
      const now = new Date();
      const mins = now.getMinutes();
      const secs = now.getSeconds();
      const nextQuarter = (Math.floor(mins / 15) + 1) * 15;
      const diffSecs = (nextQuarter - mins) * 60 - secs;
      const remMins = Math.floor(diffSecs / 60);
      const remSecs = diffSecs % 60;

      // Slot key format: e.g. "21:45"
      const slotKey = `${now.getHours()}:${Math.floor(mins / 15) * 15}`;

      // When crossing the 15-minute slot boundary (:00, :15, :30, :45), trigger live price sync
      if (mins % 15 === 0 && secs <= 2 && lastSlotKey !== slotKey) {
        lastSlotKey = slotKey;
        syncLiveMarketPrices(true);
      }

      setTimeToNextSync(
        `${String(remMins).padStart(2, "0")}:${String(remSecs).padStart(2, "0")}`
      );
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => {
      clearInterval(timer);
      window.removeEventListener("resize", handleResize);
    };
  }, [fetchPortfolioData, fetchPresetLivePrices, syncLiveMarketPrices]);

  // Supabase Realtime: Dynamically update UI without refresh whenever portfolio_assets or snapshots change
  useEffect(() => {
    const channel = supabase
      .channel("portfolio_live_db_sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "portfolio_assets",
        },
        () => {
          fetchPortfolioData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "portfolio_snapshots",
        },
        () => {
          fetchPortfolioData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPortfolioData]);

  useEffect(() => {
    if (isAddModalOpen) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [isAddModalOpen]);

  const handleOpenAddModal = () => {
    setEditingAsset(null);
    setSelectedPresetId(null);
    setIsCustomMode(false);
    setPresetSearch("");
    setApiSearchResults([]);
    setPriceInputMode("unit");
    setTotalSpentInput("");
    setFormData({
      asset_name: "",
      symbol: "",
      asset_type: "stock_etf",
      quantity: "",
      buy_price: "",
      current_price: "",
      institution: "",
      notes: "",
    });
    setIsAddModalOpen(true);
  };

  const handleSelectPresetCard = (preset: PopularAssetPreset) => {
    setSelectedPresetId(preset.id);
    setIsCustomMode(false);
    const livePrice = presetLivePrices[preset.symbol.toUpperCase()] || preset.estPrice;
    const estPriceStr = getRawPriceString(livePrice);
    setFormData((prev) => ({
      ...prev,
      asset_name: preset.name,
      symbol: preset.symbol,
      asset_type: preset.type,
      quantity: preset.symbol === "SHIB" ? "1000000" : "1",
      buy_price: estPriceStr,
      current_price: estPriceStr,
    }));
  };

  const handleSelectApiSearchResult = async (item: SearchAssetResult) => {
    setSelectedPresetId(item.id);
    setIsCustomMode(false);

    // Set basic metadata immediately
    setFormData((prev) => ({
      ...prev,
      asset_name: item.name,
      symbol: item.symbol,
      asset_type: item.type,
      quantity: item.symbol === "SHIB" ? "1000000" : "1",
      buy_price: "",
      current_price: "",
    }));

    // Auto-fetch real live quote normalized to active profile currency
    if (item.symbol) {
      setFetchingPriceForSymbol(item.symbol);
      try {
        const targetCurr = currencySymbol === "$" ? "USD" : "EUR";
        const res = await fetch(`/api/portfolio/market-data?symbols=${encodeURIComponent(item.symbol)}&currency=${encodeURIComponent(targetCurr)}`);
        if (res.ok) {
          const data = await res.json();
          const priceInfo = data.prices?.[item.symbol.toUpperCase()];
          if (priceInfo && typeof priceInfo.price === "number" && priceInfo.price > 0) {
            const pStr = getRawPriceString(priceInfo.price);
            setFormData((prev) => ({
              ...prev,
              buy_price: prev.buy_price || pStr,
              current_price: pStr,
            }));
          }
        }
      } catch (e) {
        console.warn("Live quote quick-fill failed:", e);
      } finally {
        setFetchingPriceForSymbol(null);
      }
    }
  };

  const handleSelectCustomMode = () => {
    setIsCustomMode(true);
    setSelectedPresetId("custom");
    setFormData({
      asset_name: "",
      symbol: "",
      asset_type: "stock_etf",
      quantity: "1",
      buy_price: "",
      current_price: "",
      institution: "",
      notes: "",
    });
  };

  const handleStepQuantity = (delta: number) => {
    const cleanQtyStr = formData.quantity.replace(/,/g, "");
    const current = parseFloat(cleanQtyStr) || 0;
    const next = Math.max(0, current + delta);
    const valStr = Number.isInteger(next) ? next.toString() : next.toFixed(2);
    setFormData((prev) => ({ ...prev, quantity: valStr }));
  };

  const handleOpenEditModal = (asset: PortfolioAsset) => {
    setEditingAsset(asset);
    setIsCustomMode(true);
    setPriceInputMode("unit");
    const totalSpent = (Number(asset.quantity || 0) * Number(asset.buy_price || 0));
    setTotalSpentInput(totalSpent > 0 ? totalSpent.toFixed(2) : "");
    setFormData({
      asset_name: asset.asset_name,
      symbol: asset.symbol || "",
      asset_type: asset.asset_type,
      quantity: asset.quantity.toString(),
      buy_price: getRawPriceString(asset.buy_price),
      current_price: getRawPriceString(asset.current_price),
      institution: asset.institution || "",
      notes: asset.notes || "",
    });
    setIsAddModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.asset_name.trim()) {
      toast.error("Please select an asset from popular picks or enter a custom asset name.");
      return;
    }
    const qty = parseFloat(formData.quantity.replace(/,/g, ""));
    const buyP = parseFloat(formData.buy_price.replace(/,/g, ""));
    const currP = formData.current_price ? parseFloat(formData.current_price.replace(/,/g, "")) : buyP;

    if (isNaN(qty) || qty <= 0) {
      toast.error("Quantity must be greater than zero.");
      return;
    }
    if (isNaN(buyP) || buyP < 0) {
      toast.error("Please enter a valid buy price.");
      return;
    }

    try {
      setFormSubmitting(true);
      const payload = {
        asset_name: formData.asset_name.trim(),
        symbol: formData.symbol ? formData.symbol.trim().toUpperCase() : null,
        asset_type: formData.asset_type,
        quantity: qty,
        buy_price: buyP,
        current_price: isNaN(currP) ? buyP : currP,
        institution: formData.institution ? formData.institution.trim() : null,
        notes: formData.notes ? formData.notes.trim() : null,
      };

      if (editingAsset) {
        const res = await fetch("/api/portfolio/assets", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingAsset.id, ...payload }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to update asset.");
        }
        const data = await res.json();
        toast.success("Position updated.");
        setAssets((prev) => prev.map((a) => (a.id === editingAsset.id ? data.asset : a)));
      } else {
        const res = await fetch("/api/portfolio/assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to add asset.");
        }
        const data = await res.json();
        toast.success("Position recorded in portfolio.");
        setAssets((prev) => [data.asset, ...prev]);
      }

      setIsAddModalOpen(false);
      setEditingAsset(null);
      fetch("/api/portfolio/snapshots", { method: "POST" });
    } catch (err: any) {
      toast.error(err.message || "Failed to save asset.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteAsset = async (id: string) => {
    try {
      setDeletingId(id);
      // Optimistic instant state update
      setAssets((prev) => prev.filter((a) => a.id !== id));
      if (selectedChartMode === id) {
        setSelectedChartMode("all");
      }
      setDeleteConfirmOpen(false);
      setDeleteTargetId(null);

      const res = await fetch(`/api/portfolio/assets?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to delete asset.");
        fetchPortfolioData();
        return;
      }
      toast.success("Asset removed.");
      fetch("/api/portfolio/snapshots", { method: "POST" });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete asset.");
      fetchPortfolioData();
    } finally {
      setDeletingId(null);
    }
  };

  const metrics = useMemo(() => {
    let totalInvested = 0;
    let totalValuation = 0;
    let total24hChange = 0;

    const breakdown: Record<string, number> = {
      stock_etf: 0,
      crypto: 0,
      cash_equivalent: 0,
      commodity: 0,
      other: 0,
    };

    assets.forEach((asset) => {
      const qty = Number(asset.quantity || 0);
      const buy = Number(asset.buy_price || 0);
      const curr = Number(asset.current_price || buy);

      const invested = qty * buy;
      const valuation = qty * curr;

      totalInvested += invested;
      totalValuation += valuation;

      const change24hPct = Number(asset.metadata?.change24h || 0);
      if (change24hPct !== 0) {
        const prevPrice = curr / (1 + change24hPct / 100);
        total24hChange += valuation - qty * prevPrice;
      }

      const type = asset.asset_type || "other";
      breakdown[type] = (breakdown[type] || 0) + valuation;
    });

    const total24hChangePct =
      totalValuation > 0 && totalValuation - total24hChange > 0
        ? (total24hChange / (totalValuation - total24hChange)) * 100
        : 0;

    const totalPnL = totalValuation - totalInvested;
    const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;
    const totalNetWorth = liquidBalance + totalValuation;

    const isCurrentCycle = !currentCycle || currentIndex === 0;

    return {
      totalInvested,
      totalValuation,
      totalPnL,
      totalPnLPercent,
      totalNetWorth,
      total24hChange,
      total24hChangePct,
      displayNetWorth: totalNetWorth,
      displayValuation: totalValuation,
      displayChange: total24hChange,
      displayChangePct: total24hChangePct,
      isCurrentCycle,
      breakdown,
    };
  }, [assets, liquidBalance, currentCycle, currentIndex]);

  const [selectedChartMode, setSelectedChartMode] = useState<string>("all");
  const chartSectionRef = useRef<HTMLElement>(null);

  const handleSelectAssetChart = (mode: string) => {
    setSelectedChartMode(mode);
    if (chartSectionRef.current) {
      chartSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Chart Data memo: exact day-by-day trajectory reflecting asset purchase dates + future dashed separation
  const chartData = useMemo(() => {
    const formatChartDate = (dateStr: string) => {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    };

    // Determine earliest active acquisition / snapshot date
    let earliestActiveDate: string | null = null;
    (snapshots || []).forEach((s) => {
      if (s.snapshot_date && (Number(s.invested_capital) > 0 || Number(s.closing_valuation) > 0 || Number(s.min_valuation) > 0)) {
        const dStr = s.snapshot_date.split("T")[0];
        if (!earliestActiveDate || dStr < earliestActiveDate) {
          earliestActiveDate = dStr;
        }
      }
    });

    (assets || []).forEach((a) => {
      if (a.created_at) {
        const dStr = a.created_at.split("T")[0];
        if (!earliestActiveDate || dStr < earliestActiveDate) {
          earliestActiveDate = dStr;
        }
      }
    });

    // If no assets or snapshots exist, return empty chartData
    if (!earliestActiveDate && assets.length === 0) {
      return [];
    }

    // Strictly compute cycle boundary from currentCycle.startDate (e.g. 28 Jul -> 27/28 Aug)
    const cycleStartD = currentCycle ? new Date(currentCycle.startDate) : new Date(Date.now() - 29 * 86400000);
    const cycleEndD = currentCycle && currentCycle.endDate 
      ? new Date(currentCycle.endDate) 
      : new Date(cycleStartD.getTime() + 30 * 86400000);

    // If earliest active holding is after cycle start, start chart from active date, but end strictly at cycleEndD
    let startD = cycleStartD;
    if (earliestActiveDate) {
      const activeD = new Date(earliestActiveDate);
      if (activeD > cycleStartD && activeD <= cycleEndD) {
        startD = activeD;
      }
    }

    const endD = cycleEndD;
    const diffDays = Math.round((endD.getTime() - startD.getTime()) / (1000 * 3600 * 24));
    const cycleDaysCount = Math.max(1, diffDays + 1);
    const todayStr = new Date().toISOString().split("T")[0];

    const snapMap = new Map<string, PortfolioSnapshot>();
    (snapshots || []).forEach((s) => {
      if (s.snapshot_date) {
        snapMap.set(s.snapshot_date.split("T")[0], s);
      }
    });

    if (selectedChartMode === "compare") {
      const totalTodayVal = assets.reduce(
        (sum, a) => sum + (Number(a.quantity) || 0) * (Number(a.current_price) || Number(a.buy_price) || 0),
        0
      );

      return Array.from({ length: cycleDaysCount }).map((_, i) => {
        const d = new Date(startD);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split("T")[0];
        const dateLabel = formatChartDate(dateStr);

        const isPast = dateStr < todayStr;
        const isToday = dateStr === todayStr;
        const recordedSnap = snapMap.get(dateStr);
        const snapRatio = recordedSnap?.closing_valuation && totalTodayVal > 0 
          ? Number(recordedSnap.closing_valuation) / totalTodayVal 
          : 1;

        const perAsset: Record<string, number | null> = {};
        for (const a of assets) {
          const key = `asset_${a.id}`;
          const qty = Number(a.quantity) || 0;
          const buyPrice = Number(a.buy_price) || Number(a.current_price) || 0;
          const currPrice = Number(a.current_price) || buyPrice;
          const assetAcqDate = a.created_at ? a.created_at.split("T")[0] : (earliestActiveDate || "2026-08-17");

          if (dateStr < assetAcqDate) {
            perAsset[key] = null;
          } else if (dateStr === assetAcqDate) {
            perAsset[key] = parseFloat((qty * buyPrice).toFixed(2));
          } else if (isToday) {
            perAsset[key] = parseFloat((qty * currPrice).toFixed(2));
          } else if (isPast) {
            if (recordedSnap?.closing_valuation) {
              perAsset[key] = parseFloat((qty * currPrice * snapRatio).toFixed(2));
            } else {
              const change24h = Number(a.metadata?.change24h || 0);
              const prev = change24h !== 0 ? currPrice / (1 + change24h / 100) : buyPrice;
              perAsset[key] = parseFloat((qty * prev).toFixed(2));
            }
          } else {
            perAsset[key] = null;
          }
        }

        return {
          date: dateStr,
          dateLabel,
          valuation: 0,
          actualValuation: null,
          minValuation: null,
          maxValuation: null,
          closingValuation: null,
          projectionValuation: null,
          invested: 0,
          gainLoss: 0,
          dayReturn: null,
          dayReturnPct: null,
          ...perAsset,
        };
      });
    } else if (selectedChartMode === "all") {
      return Array.from({ length: cycleDaysCount }).map((_, i) => {
        const d = new Date(startD);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split("T")[0];
        const dateLabel = formatChartDate(dateStr);

        const isPast = dateStr < todayStr;
        const isToday = dateStr === todayStr;
        const isFuture = dateStr > todayStr;

        const dayAssetValuation = assets.reduce(
          (sum, a) => sum + (Number(a.quantity) || 0) * (Number(a.current_price) || Number(a.buy_price) || 0),
          0
        );
        const dayAssetInvested = assets.reduce(
          (sum, a) => sum + (Number(a.quantity) || 0) * (Number(a.buy_price) || 0),
          0
        );

        const dayValuation = parseFloat(dayAssetValuation.toFixed(2));
        const dayInvested = parseFloat(dayAssetInvested.toFixed(2));
        const dayGainLoss = parseFloat((dayAssetValuation - dayAssetInvested).toFixed(2));

        let dayCloseVal = dayValuation;
        let dayMinVal = dayValuation;
        let dayMaxVal = dayValuation;

        if (dateStr <= (earliestActiveDate || "2026-08-17")) {
          // On day of acquisition, initial starting valuation is cost basis
          dayCloseVal = dayInvested;
          dayMinVal = dayInvested;
          dayMaxVal = dayInvested;
        } else if (isPast || isToday) {
          const recordedSnap = snapMap.get(dateStr);
          if (recordedSnap) {
            const snapClose = Number(recordedSnap.closing_valuation);
            const snapMin = Number(recordedSnap.min_valuation);
            const snapMax = Number(recordedSnap.max_valuation);
            if (!isNaN(snapClose) && snapClose > 0) dayCloseVal = isToday ? dayValuation : snapClose;
            if (!isNaN(snapMin) && snapMin > 0) dayMinVal = snapMin;
            if (!isNaN(snapMax) && snapMax > 0) dayMaxVal = snapMax;
          }
        }

        const dayReturn = isToday ? metrics.total24hChange : null;
        const dayReturnPct = isToday ? metrics.total24hChangePct : null;

        return {
          date: dateStr,
          dateLabel,
          valuation: dayCloseVal,
          actualValuation: isPast || isToday ? dayCloseVal : null,
          minValuation: isPast || isToday ? dayMinVal : null,
          maxValuation: isPast || isToday ? dayMaxVal : null,
          closingValuation: isPast || isToday ? dayCloseVal : null,
          projectionValuation: isToday || isFuture ? dayCloseVal : null,
          invested: dayInvested,
          gainLoss: dayGainLoss,
          dayReturn,
          dayReturnPct,
        };
      });
    } else if (["stock_etf", "crypto", "commodity"].includes(selectedChartMode)) {
      const categoryAssets = assets.filter((a) => a.asset_type === selectedChartMode);
      const totalTodayVal = assets.reduce(
        (sum, a) => sum + (Number(a.quantity) || 0) * (Number(a.current_price) || Number(a.buy_price) || 0),
        0
      );
      const categoryTodayVal = categoryAssets.reduce(
        (sum, a) => sum + (Number(a.quantity) || 0) * (Number(a.current_price) || Number(a.buy_price) || 0),
        0
      );
      const invested = categoryAssets.reduce((sum, a) => sum + (Number(a.quantity) || 0) * (Number(a.buy_price) || 0), 0);

      return Array.from({ length: cycleDaysCount }).map((_, i) => {
        const d = new Date(startD);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split("T")[0];
        const dateLabel = formatChartDate(dateStr);

        const isPast = dateStr < todayStr;
        const isToday = dateStr === todayStr;
        const recordedSnap = snapMap.get(dateStr);

        let val = 0;

        if (dateStr <= (earliestActiveDate || "2026-08-17")) {
          val = invested;
        } else if (isToday) {
          val = categoryTodayVal;
        } else if (isPast) {
          if (recordedSnap?.asset_breakdown?.[selectedChartMode]?.valuation) {
            val = Number(recordedSnap.asset_breakdown[selectedChartMode].valuation);
          } else if (recordedSnap?.closing_valuation && totalTodayVal > 0) {
            val = categoryTodayVal * (Number(recordedSnap.closing_valuation) / totalTodayVal);
          } else {
            val = categoryTodayVal;
          }
        }

        const formattedVal = parseFloat(val.toFixed(2));
        const formattedInvested = parseFloat(invested.toFixed(2));

        return {
          date: dateStr,
          dateLabel,
          valuation: formattedVal,
          actualValuation: isPast || isToday ? formattedVal : null,
          minValuation: isPast || isToday ? formattedVal : null,
          maxValuation: isPast || isToday ? formattedVal : null,
          closingValuation: isPast || isToday ? formattedVal : null,
          projectionValuation: null,
          invested: formattedInvested,
          gainLoss: parseFloat((val - invested).toFixed(2)),
          dayReturn: null,
          dayReturnPct: null,
        };
      });
    } else {
      const targetAsset = assets.find(
        (a) => String(a.id) === String(selectedChartMode) || (a.symbol && a.symbol.toLowerCase() === selectedChartMode.toLowerCase())
      );

      const qty = Number(targetAsset?.quantity) || 0;
      const buyPrice = Number(targetAsset?.buy_price) || Number(targetAsset?.current_price) || 0;
      const currPrice = Number(targetAsset?.current_price) || buyPrice;
      const assetInvested = parseFloat((qty * buyPrice).toFixed(2));
      const assetCurrentVal = parseFloat((qty * currPrice).toFixed(2));
      const assetGainLoss = parseFloat((assetCurrentVal - assetInvested).toFixed(2));

      const change24hPct = Number(targetAsset?.metadata?.change24h || 0);
      const prevPrice = change24hPct !== 0 ? currPrice / (1 + change24hPct / 100) : buyPrice;
      const todayDayReturn = change24hPct !== 0 
        ? parseFloat((assetCurrentVal - qty * prevPrice).toFixed(2)) 
        : parseFloat((assetCurrentVal - assetInvested).toFixed(2));
      const todayDayReturnPct = change24hPct !== 0 ? change24hPct : (assetInvested > 0 ? (assetGainLoss / assetInvested) * 100 : 0);

      const assetAcquisitionDate = targetAsset?.created_at
        ? targetAsset.created_at.split("T")[0]
        : (earliestActiveDate || "2026-08-17");

      const totalTodayVal = assets.reduce(
        (sum, a) => sum + (Number(a.quantity) || 0) * (Number(a.current_price) || Number(a.buy_price) || 0),
        0
      );

      return Array.from({ length: cycleDaysCount }).map((_, i) => {
        const d = new Date(startD);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split("T")[0];
        const dateLabel = formatChartDate(dateStr);

        const isPast = dateStr < todayStr;
        const isToday = dateStr === todayStr;
        const recordedSnap = snapMap.get(dateStr);
        const snapRatio = recordedSnap?.closing_valuation && totalTodayVal > 0
          ? Number(recordedSnap.closing_valuation) / totalTodayVal
          : 1;

        let val: number | null = null;
        let dayReturn: number | null = null;
        let dayReturnPct: number | null = null;

        if (dateStr < assetAcquisitionDate) {
          val = null;
        } else if (dateStr === assetAcquisitionDate) {
          val = assetInvested;
          dayReturn = 0;
          dayReturnPct = 0;
        } else if (isToday) {
          val = assetCurrentVal;
          dayReturn = todayDayReturn;
          dayReturnPct = todayDayReturnPct;
        } else if (isPast) {
          if (recordedSnap?.closing_valuation) {
            val = parseFloat((assetCurrentVal * snapRatio).toFixed(2));
            const prevD = new Date(d);
            prevD.setDate(prevD.getDate() - 1);
            const prevDateStr = prevD.toISOString().split("T")[0];
            const prevSnap = snapMap.get(prevDateStr);
            const prevRatio = prevSnap?.closing_valuation && totalTodayVal > 0 
              ? Number(prevSnap.closing_valuation) / totalTodayVal 
              : (prevDateStr === assetAcquisitionDate ? assetInvested / (assetCurrentVal || 1) : snapRatio);
            const prevVal = parseFloat((assetCurrentVal * prevRatio).toFixed(2));
            dayReturn = parseFloat((val - prevVal).toFixed(2));
            dayReturnPct = prevVal > 0 ? parseFloat((((val - prevVal) / prevVal) * 100).toFixed(2)) : 0;
          } else {
            val = parseFloat((qty * prevPrice).toFixed(2));
            dayReturn = 0;
            dayReturnPct = 0;
          }
        }

        return {
          date: dateStr,
          dateLabel,
          valuation: val ?? 0,
          actualValuation: val,
          minValuation: val,
          maxValuation: val,
          closingValuation: val,
          projectionValuation: null,
          invested: assetInvested,
          gainLoss: assetGainLoss,
          dayReturn,
          dayReturnPct,
        };
      });
    }
  }, [selectedChartMode, assets, snapshots, currentCycle, expenses, injectedStartBalance, liquidBalance, metrics]);

  // Clean dynamic integer vertical domain with dynamic zoom and increments (no commas or decimals)
  const { yAxisDomain, yAxisTicks, yAxisTickFormatter } = useMemo(() => {
    const vals: number[] = [];
    if (selectedChartMode === "compare") {
      chartData.forEach((d: any) => {
        assets.forEach((a) => {
          const v = d[`asset_${a.id}`];
          if (v != null && !isNaN(v) && v > 0) vals.push(v);
        });
      });
    } else {
      chartData.forEach((d: any) => {
        if (d.actualValuation != null && !isNaN(d.actualValuation) && d.actualValuation > 0) vals.push(d.actualValuation);
        if (d.projectionValuation != null && !isNaN(d.projectionValuation) && d.projectionValuation > 0) vals.push(d.projectionValuation);
        if (d.minValuation != null && !isNaN(d.minValuation) && d.minValuation > 0) vals.push(d.minValuation);
        if (d.maxValuation != null && !isNaN(d.maxValuation) && d.maxValuation > 0) vals.push(d.maxValuation);
      });
    }

    if (vals.length === 0) {
      return {
        yAxisDomain: [0, 50],
        yAxisTicks: [0, 10, 20, 30, 40, 50],
        yAxisTickFormatter: (val: number) => `${currencySymbol}${Math.round(val)}`,
      };
    }

    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const spread = max - min;

    // Pick dynamic clean step based on spread
    let step = 1;
    if (spread > 250) step = 50;
    else if (spread > 120) step = 25;
    else if (spread > 50) step = 10;
    else if (spread > 20) step = 5;
    else if (spread > 8) step = 2;
    else if (spread > 2) step = 1;
    else step = 0.5;

    // Tight dynamic bounds centered around the active holdings
    const low = Math.max(0, Math.floor((min - (spread === 0 ? step * 2 : step * 0.5)) / step) * step);
    const high = Math.max(low + step * 2, Math.ceil((max + (spread === 0 ? step * 2 : step * 0.5)) / step) * step);

    const ticks: number[] = [];
    for (let t = low; t <= high; t += step) {
      ticks.push(t);
    }

    return {
      yAxisDomain: [low, high],
      yAxisTicks: ticks,
      yAxisTickFormatter: (val: number) => step < 1 ? `${currencySymbol}${val.toFixed(1)}` : `${currencySymbol}${Math.round(val)}`,
    };
  }, [chartData, currencySymbol, selectedChartMode, assets]);

  const isChartEmpty = useMemo(() => {
    if (assets.length === 0 && (!snapshots || snapshots.length === 0)) return true;
    if (selectedChartMode === "compare") {
      return assets.length === 0;
    }
    return chartData.every(
      (d) => d.actualValuation == null && d.projectionValuation == null && d.valuation == null
    );
  }, [chartData, assets, snapshots, selectedChartMode]);

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesTab = activeTab === "all" || asset.asset_type === activeTab;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        asset.asset_name.toLowerCase().includes(query) ||
        (asset.symbol && asset.symbol.toLowerCase().includes(query)) ||
        (asset.institution && asset.institution.toLowerCase().includes(query));

      return matchesTab && matchesSearch;
    });
  }, [assets, activeTab, searchQuery]);

  // Filtered Presets
  const filteredPresets = useMemo(() => {
    const q = presetSearch.toLowerCase().trim();
    if (!q) return POPULAR_PRESETS;
    return POPULAR_PRESETS.filter(
      (p) => p.name.toLowerCase().includes(q) || p.symbol.toLowerCase().includes(q)
    );
  }, [presetSearch]);

  if (loading) {
    return <PortfolioLoading />;
  }

  return (
    <>
      <SwipeCycleWrapper
        cycles={cycles}
        currentCycleId={selectedCycleId}
        route="/portfolio"
        onCycleChange={handleCycleSelect}
      >
        <div className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-10 md:space-y-12 pb-36 md:pb-8 w-full">
      {/* 1. Header (Matching Dashboard Layout) */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8 border-b border-foreground/10 pb-6 md:pb-8 relative">
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-[9px] md:text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Active Paycheck Cycle</span>
            </div>
            <span className="text-muted-foreground/30">•</span>
            {isAdmin ? (
              <button
                onClick={() => syncLiveMarketPrices(true, true)}
                disabled={isSyncing}
                className="flex items-center gap-1.5 text-foreground/80 font-bold hover:text-foreground transition-colors cursor-pointer select-none group"
                title="Admin Quote Refresh"
              >
                <span className={cn("h-1.5 w-1.5 rounded-full bg-emerald-500", isSyncing ? "animate-ping" : "animate-pulse")} />
                <RefreshCw className={cn("h-3 w-3 text-muted-foreground group-hover:text-foreground transition-all", isSyncing && "animate-spin text-emerald-500")} />
                <span>SYNC: {isSyncing ? "UPDATING..." : timeToNextSync}</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 text-foreground/80 font-bold select-none">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span>SYNC: {timeToNextSync}</span>
              </div>
            )}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase leading-none break-words">
            {isPending ? (
              <Skeleton className="h-10 w-64 rounded-none" />
            ) : currentCycle ? (
              currentCycle.label.replace("Cycle: ", "")
            ) : (
              "PORTFOLIO"
            )}
          </h1>
        </div>

        {cycles.length > 0 && (
          <div className="hidden md:flex items-center border border-border ledger-border bg-card overflow-hidden shrink-0 font-mono">
            <button 
              onClick={() => navigateCycle('prev')} 
              disabled={isPending || currentIndex >= cycles.length - 1} 
              className="px-3.5 py-2 hover:bg-muted transition-colors disabled:opacity-40 border-r border-border cursor-pointer disabled:cursor-not-allowed"
              aria-label="Previous paycheck cycle"
            >
              <ChevronLeft className="h-3.5 w-3.5 text-foreground" />
            </button>
            <button 
              onClick={() => navigateCycle('next')} 
              disabled={isPending || currentIndex <= 0} 
              className="px-3.5 py-2 hover:bg-muted transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              aria-label="Next paycheck cycle"
            >
              <ChevronRight className="h-3.5 w-3.5 text-foreground" />
            </button>
          </div>
        )}
      </header>

      {/* 2. Portfolio Valuation Graph FIRST (Clean Dashboard Layout) */}
      <section ref={chartSectionRef} className="space-y-4 border border-border ledger-border p-4 md:p-6 bg-card/20 relative scroll-mt-6" data-no-swipe="true">
        {!isLoading && !isPro && (
          <div className="absolute inset-0 z-30 bg-background/95 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center">
            <ProLockOverlay
              title="PORTFOLIO TRAJECTORY & ANALYTICS"
              description="Upgrade to LEGER_OS PRO to unlock multi-asset historical valuation charts and holdings analytics."
            />
          </div>
        )}

        {/* Clean Header Bar with Title on Left and Filter Tabs on Right */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/40 pb-4">
          <h2 className="text-xl md:text-2xl font-bold uppercase tracking-tighter font-sans shrink-0">
            {selectedChartMode === "all"
              ? "Total Portfolio Trajectory"
              : selectedChartMode === "compare"
              ? "Multi-Asset Holdings Comparison"
              : selectedChartMode === "stock_etf"
              ? "Stocks & ETFs Trajectory"
              : selectedChartMode === "crypto"
              ? "Crypto Assets Trajectory"
              : selectedChartMode === "commodity"
              ? "Commodities Trajectory"
              : assets.find((a) => a.id === selectedChartMode)?.asset_name.toUpperCase() || "Asset Performance"}
          </h2>

          {/* Quick Category Filters + Individual Asset Dropdown */}
          <div className="flex flex-wrap items-center gap-2 z-10">
            <div className="flex items-center border border-border ledger-border bg-card overflow-x-auto scrollbar-hide shrink-0 font-mono text-[9px] p-0.5">
              <button
                onClick={() => setSelectedChartMode("all")}
                className={cn(
                  "px-3 py-1 uppercase font-bold transition-all cursor-pointer select-none shrink-0",
                  selectedChartMode === "all" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Total
              </button>
              <button
                onClick={() => setSelectedChartMode("compare")}
                className={cn(
                  "px-3 py-1 uppercase font-bold transition-all border-l border-border/60 cursor-pointer select-none shrink-0",
                  selectedChartMode === "compare" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Compare
              </button>
              <button
                onClick={() => setSelectedChartMode("stock_etf")}
                className={cn(
                  "px-3 py-1 uppercase font-bold transition-all border-l border-border/60 cursor-pointer select-none shrink-0",
                  selectedChartMode === "stock_etf" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Stocks
              </button>
              <button
                onClick={() => setSelectedChartMode("crypto")}
                className={cn(
                  "px-3 py-1 uppercase font-bold transition-all border-l border-border/60 cursor-pointer select-none shrink-0",
                  selectedChartMode === "crypto" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Crypto
              </button>
              <button
                onClick={() => setSelectedChartMode("commodity")}
                className={cn(
                  "px-3 py-1 uppercase font-bold transition-all border-l border-border/60 cursor-pointer select-none shrink-0",
                  selectedChartMode === "commodity" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Commodities
              </button>
            </div>

            {/* Individual Asset Selector Dropdown */}
            {assets.length > 0 && (
              <select
                value={selectedChartMode}
                onChange={(e) => setSelectedChartMode(e.target.value)}
                className="h-7 px-2 border border-border bg-card text-foreground font-mono text-[9px] uppercase outline-none cursor-pointer rounded-none min-w-[130px]"
              >
                <option value="all">Total Portfolio (Net Worth)</option>
                <option value="compare">Multi-Asset Comparison (All)</option>
                <option value="stock_etf">Stocks & ETFs</option>
                <option value="crypto">Crypto</option>
                <option value="commodity">Commodities</option>
                <optgroup label="Individual Holdings">
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.symbol ? `${a.symbol.toUpperCase()} - ${a.asset_name}` : a.asset_name}
                    </option>
                  ))}
                </optgroup>
              </select>
            )}
          </div>
        </div>

        {/* Multi-Asset Comparison Color Legend */}
        {selectedChartMode === "compare" && assets.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {assets.map((a, idx) => {
              const color = ASSET_LINE_COLORS[idx % ASSET_LINE_COLORS.length];
              const currVal = (Number(a.quantity) || 0) * (Number(a.current_price) || Number(a.buy_price) || 0);
              return (
                <div key={a.id} className="flex items-center gap-1.5 bg-secondary/30 px-2 py-0.5 border border-border/60 font-mono text-[9px]">
                  <span className="h-2 w-2 rounded-xs shrink-0" style={{ backgroundColor: color }} />
                  <span className="font-bold uppercase text-foreground">{a.symbol?.toUpperCase() || a.asset_name}</span>
                  <span className="text-muted-foreground font-bold">({currencySymbol}{format2Decimals(currVal)})</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Recharts Area Chart */}
        <div className="h-[300px] md:h-[350px] w-full mt-4 md:mt-0 cursor-pointer relative" data-no-swipe="true">
          {/* Empty State Overlay when no active positions exist in cycle */}
          {isChartEmpty && (
            <div className="absolute inset-0 z-30 bg-background/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
              <div className="max-w-md w-full space-y-4">
                <div className="w-11 h-11 rounded-none bg-secondary/40 border border-border flex items-center justify-center mx-auto text-foreground shadow-sm">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-sm sm:text-base font-bold font-mono uppercase tracking-wider text-foreground">
                    Portfolio Engine Calibrated
                  </h3>
                  <p className="text-xs text-muted-foreground font-sans leading-relaxed">
                    You have no active assets or recorded positions in this cycle yet. Add your first position or select a market preset to generate your net worth trajectory.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                  <Button
                    type="button"
                    onClick={() => {
                      setIsCustomMode(false);
                      setIsAddModalOpen(true);
                    }}
                    className="w-full sm:w-auto h-11 rounded-none bg-foreground text-background hover:bg-foreground/90 font-mono text-xs uppercase font-bold tracking-wider cursor-pointer flex items-center justify-center gap-2 px-5 shadow-sm"
                  >
                    <Plus className="h-4 w-4" /> Add Position
                  </Button>
                </div>
              </div>
            </div>
          )}

          <ResponsiveContainer width="100%" height="100%">
            <RechartsAreaChart data={chartData} margin={{ top: 12, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="activeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--foreground)" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="var(--foreground)" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="projectionGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--foreground)" stopOpacity={0.06}/>
                  <stop offset="95%" stopColor="var(--foreground)" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="dateLabel"
                axisLine={false}
                tickLine={false}
                interval={isMobile ? Math.max(1, Math.floor(chartData.length / 3)) : Math.max(1, Math.floor(chartData.length / 6))}
                style={{ fontSize: "9px", fontFamily: "var(--font-geist-mono)", fill: "#86868B" }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                domain={yAxisDomain}
                ticks={yAxisTicks}
                allowDataOverflow={true}
                style={{ fontSize: "9px", fontFamily: "var(--font-geist-mono)", fill: "#86868B" }}
                tickFormatter={yAxisTickFormatter}
              />
              <RechartsTooltip 
                content={<CustomPortfolioTooltip formatCurrency={formatCurrency} selectedChartMode={selectedChartMode} assets={assets} />}
                cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                position={isMobile ? { y: 0 } : undefined}
                wrapperStyle={{ pointerEvents: "none", zIndex: 40 }}
              />
              {/* Multi-Asset Comparison Lines (Dedicated Compare Mode) */}
              {selectedChartMode === "compare" && assets.map((a, idx) => {
                const color = ASSET_LINE_COLORS[idx % ASSET_LINE_COLORS.length];
                return (
                  <RechartsArea
                    key={`compare_${a.id}`}
                    type="stepAfter"
                    dataKey={`asset_${a.id}`}
                    stroke={color}
                    strokeWidth={2}
                    fill="none"
                    name={a.symbol?.toUpperCase() || a.asset_name}
                    connectNulls={false}
                    baseValue="dataMin"
                    isAnimationActive={true}
                    animationBegin={0}
                    animationDuration={1000}
                    animationEasing="ease-out"
                  />
                );
              })}
              {/* Intraday High/Low Range Channel (Total Mode Only) - Colored High/Low Points */}
              {selectedChartMode === "all" && (
                <RechartsArea
                  type="stepAfter"
                  dataKey="maxValuation"
                  stroke="none"
                  fill="none"
                  name="Day High (Max)"
                  connectNulls={false}
                  baseValue="dataMin"
                  isAnimationActive={true}
                  activeDot={(props: any) => {
                    const { cx, cy, payload } = props;
                    if (!payload || payload.maxValuation == null) return null;
                    return (
                      <circle
                        key={`max-dot-${cx}-${cy}`}
                        cx={cx}
                        cy={cy}
                        r={4.5}
                        fill="#10b981"
                        stroke="#09090b"
                        strokeWidth={2}
                      />
                    );
                  }}
                />
              )}
              {selectedChartMode === "all" && (
                <RechartsArea
                  type="stepAfter"
                  dataKey="minValuation"
                  stroke="none"
                  fill="none"
                  name="Day Low (Min)"
                  connectNulls={false}
                  baseValue="dataMin"
                  isAnimationActive={true}
                  activeDot={(props: any) => {
                    const { cx, cy, payload } = props;
                    if (!payload || payload.minValuation == null) return null;
                    return (
                      <circle
                        key={`min-dot-${cx}-${cy}`}
                        cx={cx}
                        cy={cy}
                        r={4.5}
                        fill="#f43f5e"
                        stroke="#09090b"
                        strokeWidth={2}
                      />
                    );
                  }}
                />
              )}
              {selectedChartMode !== "compare" && (
                <RechartsArea
                  type="stepAfter"
                  dataKey="actualValuation"
                  stroke="var(--foreground)"
                  strokeWidth={2}
                  fill="url(#activeGradient)"
                  fillOpacity={1}
                  name="Closing Valuation"
                  connectNulls={false}
                  baseValue="dataMin"
                  isAnimationActive={true}
                  animationBegin={0}
                  animationDuration={1000}
                  animationEasing="ease-out"
                  activeDot={(props: any) => {
                    const { cx, cy } = props;
                    return (
                      <circle
                        key={`actual-dot-${cx}-${cy}`}
                        cx={cx}
                        cy={cy}
                        r={5}
                        fill="var(--foreground)"
                        stroke="#09090b"
                        strokeWidth={2}
                      />
                    );
                  }}
                />
              )}
              {selectedChartMode !== "compare" && (
                <RechartsArea
                  type="monotone"
                  dataKey="projectionValuation"
                  stroke="var(--foreground)"
                  strokeOpacity={0.5}
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  fill="url(#projectionGradient)"
                  fillOpacity={1}
                  name="Projection"
                  connectNulls={false}
                  baseValue="dataMin"
                  isAnimationActive={true}
                  animationBegin={0}
                  animationDuration={1000}
                  animationEasing="ease-out"
                />
              )}
              </RechartsAreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 3. Executive Ledger Summary Cards SECOND (1 Big, 2 Side by Side - Exact Dashboard Layout) */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {/* Card 1: Total Net Worth (Big - col-span-2 on mobile, col-span-1 on desktop) */}
        <div className="col-span-2 md:col-span-1 min-w-0">
          <Tilt rotationFactor={6} className="p-4 sm:p-6 md:p-8 space-y-3 bg-card/20 border border-border relative group overflow-hidden flex flex-col justify-between glow-card h-full min-w-0">
            <span className="technical-label text-[8px] sm:text-[9px] border-b border-dotted border-muted-foreground/30 w-fit z-10 whitespace-nowrap truncate">TOTAL NET WORTH</span>
            <div className="space-y-1 z-10 min-w-0">
              <div className="text-2xl sm:text-3xl md:text-5xl font-mono font-bold tracking-tighter truncate tabular-nums">
                <PrivacyValue>{formatCurrency(metrics.displayNetWorth)}</PrivacyValue>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5 min-w-0">
                <span className={cn(
                  "px-1.5 py-0.5 border text-[8px] sm:text-[9px] font-mono font-bold uppercase truncate max-w-full inline-flex items-center gap-1",
                  metrics.displayChange >= 0
                    ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5"
                    : "text-rose-500 border-rose-500/20 bg-rose-500/5"
                )}>
                  <span className="opacity-75 tracking-wider font-extrabold">{metrics.isCurrentCycle ? "24H" : "CYCLE"}</span>
                  <span className="opacity-40">·</span>
                  <PrivacyValue>
                    {metrics.displayChange >= 0 ? "+" : ""}{formatCurrency(metrics.displayChange)} ({metrics.displayChangePct >= 0 ? "+" : ""}{format2Decimals(metrics.displayChangePct)}%)
                  </PrivacyValue>
                </span>
              </div>
            </div>
            <ClippedCircle circleClassName="bg-foreground/5" circleSize={400} />
          </Tilt>
        </div>

        {/* Card 2: Portfolio Valuation (col-span-1) */}
        <div className="col-span-1 min-w-0">
          <Tilt rotationFactor={6} className="p-3.5 sm:p-6 md:p-8 space-y-2 sm:space-y-3 bg-card/20 border border-border relative group overflow-hidden flex flex-col justify-between glow-card h-full min-w-0">
            <span className="technical-label text-[8px] sm:text-[9px] border-b border-dotted border-muted-foreground/30 w-fit z-10 whitespace-nowrap truncate">PORTFOLIO VALUE</span>
            <div className="space-y-1 z-10 min-w-0">
              <div className="text-lg xs:text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-mono font-bold tracking-tighter truncate tabular-nums">
                <PrivacyValue>{formatCurrency(metrics.displayValuation)}</PrivacyValue>
              </div>
              <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 pt-0.5 min-w-0">
                <span className={cn(
                  "px-1 sm:px-1.5 py-0.5 border text-[7.5px] sm:text-[9px] font-mono font-bold uppercase truncate max-w-full inline-flex items-center gap-1",
                  metrics.displayChange >= 0
                    ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5"
                    : "text-rose-500 border-rose-500/20 bg-rose-500/5"
                )}>
                  <span className="opacity-75 tracking-wider font-extrabold">{metrics.isCurrentCycle ? "24H" : "CYCLE"}</span>
                  <span className="opacity-40">·</span>
                  <PrivacyValue>
                    {metrics.displayChange >= 0 ? "+" : ""}{formatCurrency(metrics.displayChange)} ({metrics.displayChangePct >= 0 ? "+" : ""}{format2Decimals(metrics.displayChangePct)}%)
                  </PrivacyValue>
                </span>
              </div>
            </div>
            <ClippedCircle circleClassName="bg-foreground/5" circleSize={400} />
          </Tilt>
        </div>

        {/* Card 3: All-Time Return (col-span-1) */}
        <div className="col-span-1 min-w-0">
          <Tilt rotationFactor={6} className="p-3.5 sm:p-6 md:p-8 space-y-2 sm:space-y-3 bg-card/20 border border-border relative group overflow-hidden flex flex-col justify-between glow-card h-full min-w-0">
            <span className="technical-label text-[8px] sm:text-[9px] border-b border-dotted border-muted-foreground/30 w-fit z-10 whitespace-nowrap truncate">
              {metrics.isCurrentCycle ? "ALL-TIME RETURN" : "CYCLE RETURN"}
            </span>
            <div className="space-y-1 z-10 min-w-0">
              <div className={cn(
                "text-lg xs:text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-mono font-bold tracking-tighter truncate tabular-nums",
                (metrics.isCurrentCycle ? metrics.totalPnL : metrics.displayChange) >= 0 ? "text-emerald-500" : "text-rose-500"
              )}>
                <PrivacyValue>
                  {(metrics.isCurrentCycle ? metrics.totalPnL : metrics.displayChange) >= 0 ? "+" : ""}
                  {formatCurrency(metrics.isCurrentCycle ? metrics.totalPnL : metrics.displayChange)}
                </PrivacyValue>
              </div>
              <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 pt-0.5 min-w-0">
                <span className={cn(
                  "px-1 sm:px-1.5 py-0.5 border text-[7.5px] sm:text-[9px] font-mono font-bold uppercase truncate max-w-full inline-flex items-center gap-1",
                  (metrics.isCurrentCycle ? metrics.totalPnLPercent : metrics.displayChangePct) >= 0
                    ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5"
                    : "text-rose-500 border-rose-500/20 bg-rose-500/5"
                )}>
                  <span className="opacity-75 tracking-wider font-extrabold">{metrics.isCurrentCycle ? "ALL" : "CYCLE"}</span>
                  <span className="opacity-40">·</span>
                  <PrivacyValue>
                    {(metrics.isCurrentCycle ? metrics.totalPnLPercent : metrics.displayChangePct) >= 0 ? "+" : ""}
                    {format2Decimals(metrics.isCurrentCycle ? metrics.totalPnLPercent : metrics.displayChangePct)}%
                  </PrivacyValue>
                </span>
              </div>
            </div>
            <ClippedCircle circleClassName="bg-foreground/5" circleSize={400} />
          </Tilt>
        </div>
      </div>

      {/* 3. Search + Dynamic Filter Tabs (Exact match to /memory page) */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search holdings..."
            className="w-full h-8 pl-9 pr-3 text-xs bg-card border border-border/60 rounded-none focus:outline-none focus:border-foreground/30 font-sans text-foreground placeholder:text-muted-foreground/40"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-hide border-b border-border/30">
          <button
            onClick={() => setActiveTab("all")}
            className={cn(
              "px-3.5 py-1.5 text-[9px] font-mono font-bold uppercase tracking-wider border cursor-pointer select-none transition-all shrink-0",
              activeTab === "all"
                ? "bg-foreground border-foreground text-background font-black"
                : "bg-card border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
            )}
          >
            All ({assets.length})
          </button>
          {Object.entries(ASSET_TYPE_CONFIG).map(([typeKey, config]) => {
            const count = assets.filter((a) => a.asset_type === typeKey).length;
            const isActive = activeTab === typeKey;
            return (
              <button
                key={typeKey}
                onClick={() => setActiveTab(typeKey)}
                className={cn(
                  "px-3.5 py-1.5 text-[9px] font-mono font-bold uppercase tracking-wider border cursor-pointer select-none transition-all shrink-0",
                  isActive
                    ? "bg-foreground border-foreground text-background font-black"
                    : "bg-card border-border/60 text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                {config.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Full-Width Holdings Cards List */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between border-b border-border/40 pb-2 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <h2 className="text-xl md:text-2xl font-bold tracking-tighter uppercase font-sans">
              Holdings
            </h2>
            <span className="text-[10px] font-mono text-muted-foreground bg-secondary/40 px-2 py-0.5 border border-border/60 uppercase">
              {filteredAssets.length} {filteredAssets.length === 1 ? "Asset" : "Assets"}
            </span>
          </div>

          {/* Live Server Sync Status & 15-Minute Countdown Clock */}
          {isAdmin ? (
            <button
              onClick={() => syncLiveMarketPrices(true, true)}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-2.5 py-1 border border-border/60 bg-card/60 text-muted-foreground font-mono text-[9px] hover:border-foreground/40 hover:text-foreground transition-all cursor-pointer select-none group"
              title="Admin Quote Refresh"
            >
              <span className={cn("h-1.5 w-1.5 rounded-full bg-emerald-500", isSyncing ? "animate-ping" : "animate-pulse")} />
              <RefreshCw className={cn("h-2.5 w-2.5 text-muted-foreground group-hover:text-foreground transition-all", isSyncing && "animate-spin text-emerald-500")} />
              <span className="uppercase text-[9px] font-bold tracking-wider hidden xs:inline">{isSyncing ? "UPDATING" : "NEXT SYNC:"}</span>
              <span className="text-foreground font-mono font-bold">{isSyncing ? "LIVE..." : timeToNextSync}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 border border-border/60 bg-card/60 text-muted-foreground font-mono text-[9px] select-none">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="uppercase text-[9px] font-bold tracking-wider hidden xs:inline">NEXT SYNC:</span>
              <span className="text-foreground font-mono font-bold">{timeToNextSync}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {filteredAssets.length > 0 ? (
            filteredAssets.map((asset) => {
              const qty = Number(asset.quantity || 0);
              const buyP = Number(asset.buy_price || 0);
              const currP = Number(asset.current_price || buyP);

              const invested = qty * buyP;
              const valuation = qty * currP;
              const pnl = valuation - invested;
              const pnlPercent = invested > 0 ? (pnl / invested) * 100 : 0;
              const isExpanded = expandedAssetId === asset.id;

              return (
                <div
                  key={asset.id}
                  className="bg-card/40 border border-border/80 hover:border-foreground/30 transition-all p-3.5 space-y-2 w-full"
                >
                  <div
                    onClick={() => setExpandedAssetId(isExpanded ? null : asset.id)}
                    className="flex items-center justify-between cursor-pointer select-none gap-3 w-full"
                  >
                    {/* Left: Square logo/icon + Symbol + Category Pill Badge + 3 @ 130.33 subtext */}
                    <div className="flex items-center gap-3 min-w-0">
                      <AssetLogo symbol={asset.symbol} assetType={asset.asset_type} name={asset.asset_name} />

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono text-sm uppercase text-foreground truncate">
                            {asset.symbol || asset.asset_name}
                          </span>
                          <span className="inline-flex items-center justify-center text-[9px] font-mono leading-none px-2 py-1 rounded-full bg-secondary/60 border border-border/80 text-muted-foreground uppercase shrink-0 font-bold tracking-wider">
                            {asset.asset_type === "stock_etf" ? "STOCKS" : asset.asset_type.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-muted-foreground/80 mt-0.5 truncate">
                          {formatSmartQuantity(qty)} @ <PrivacyValue>{currencySymbol}{formatSmartPrice(currP)}</PrivacyValue>
                        </p>
                      </div>
                    </div>

                    {/* Right: Valuation on Top + PnL/Return on Bottom matching screenshot 100% */}
                    <div className="text-right shrink-0">
                      <p className="font-mono font-bold text-sm text-foreground">
                        <PrivacyValue>{currencySymbol}{valuation > 0 && valuation < 0.01 ? formatSmartPrice(valuation) : format2Decimals(valuation)}</PrivacyValue>
                      </p>
                      <p
                        className={cn(
                          "text-[10px] font-mono font-bold mt-0.5",
                          pnl >= 0 ? "text-emerald-500" : "text-rose-500"
                        )}
                      >
                        <PrivacyValue>
                          {pnl >= 0 ? "+" : ""}{format2Decimals(pnl)} ({pnlPercent >= 0 ? "+" : ""}{format2Decimals(pnlPercent)}%)
                        </PrivacyValue>
                      </p>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="border-t border-border bg-secondary/10 p-3 text-xs font-mono space-y-3 mt-2"
                      >
                        <div className="grid grid-cols-2 gap-3 text-[11px]">
                          <div>
                            <span className="technical-label text-[9px]">BUY PRICE:</span>{" "}
                            <span className="text-foreground font-bold"><PrivacyValue>{currencySymbol}{formatSmartPrice(buyP)}</PrivacyValue></span>
                          </div>
                          <div>
                            <span className="technical-label text-[9px]">MARKET PRICE:</span>{" "}
                            <span className="text-foreground font-bold"><PrivacyValue>{currencySymbol}{formatSmartPrice(currP)}</PrivacyValue></span>
                          </div>
                          <div>
                            <span className="technical-label text-[9px]">COST BASIS:</span>{" "}
                            <span className="text-foreground font-bold"><PrivacyValue>{currencySymbol}{invested > 0 && invested < 0.01 ? formatSmartPrice(invested) : format2Decimals(invested)}</PrivacyValue></span>
                          </div>
                          <div>
                            <span className="technical-label text-[9px]">UNREALIZED RETURN:</span>{" "}
                            <span className={cn("font-bold", pnl >= 0 ? "text-emerald-500" : "text-rose-500")}>
                              <PrivacyValue>{pnl >= 0 ? "+" : ""}{currencySymbol}{Math.abs(pnl) > 0 && Math.abs(pnl) < 0.01 ? formatSmartPrice(pnl) : format2Decimals(pnl)}</PrivacyValue>
                            </span>
                          </div>
                        </div>

                        {asset.notes && (
                          <p className="text-[11px] text-muted-foreground italic border-t border-border/40 pt-2">
                            "{asset.notes}"
                          </p>
                        )}

                        <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectAssetChart(asset.id);
                            }}
                            className="h-8 rounded-none font-mono text-[9px] uppercase tracking-widest border-border hover:bg-secondary cursor-pointer"
                          >
                            <TrendingUp className="h-3 w-3 mr-1" /> Chart
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditModal(asset);
                            }}
                            className="h-8 rounded-none font-mono text-[9px] uppercase tracking-widest border-border hover:bg-secondary"
                          >
                            <Edit2 className="h-3 w-3 mr-1" /> Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTargetId(asset.id);
                              setDeleteConfirmOpen(true);
                            }}
                            disabled={deletingId === asset.id}
                            className="h-8 rounded-none font-mono text-[9px] uppercase tracking-widest text-rose-500 hover:text-rose-400 hover:bg-rose-500/10"
                          >
                            <Trash2 className="h-3 w-3 mr-1" /> Delete
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center font-mono text-xs text-muted-foreground border border-dashed border-border">
              NO TRANSACTIONS FOUND
            </div>
          )}
        </div>
      </div>

      {/* Native Draggable Bottom Drawer mounted cleanly via Portal outside transformed containers */}
      {mounted && typeof document !== "undefined" && createPortal(
        <AnimatePresence mode="wait">
          {isAddModalOpen && (
            <motion.div
              key="drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setIsAddModalOpen(false)}
              className="fixed inset-0 z-[100010] bg-background/80 backdrop-blur-sm flex items-end justify-center font-mono p-0 sm:p-6 select-none"
            >
            <motion.div
              key="drawer-modal-container"
              onClick={(e) => e.stopPropagation()}
              initial={{ y: "100%", opacity: 0.95 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              drag="y"
              dragListener={false}
              dragControls={sheetDragControls}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 80 || info.velocity.y > 250) {
                  setIsAddModalOpen(false);
                }
              }}
              className="w-full max-w-xl bg-[#09090b] border-t sm:border border-border text-foreground shadow-2xl flex flex-col overflow-hidden h-[85vh] rounded-t-2xl sm:rounded-2xl justify-between"
            >
              {/* Top Drag Handle Bar */}
              <div 
                onPointerDown={(e) => sheetDragControls.start(e)}
                className="w-full flex justify-center py-2.5 cursor-grab active:cursor-grabbing border-b border-border/40 select-none shrink-0 bg-secondary/10 hover:bg-secondary/20 transition-colors touch-none"
              >
                <div className="w-12 h-1 bg-muted-foreground/40 rounded-full" />
              </div>

              {/* Drawer Header */}
              <div 
                onPointerDown={(e) => sheetDragControls.start(e)}
                className="px-5 py-3 border-b border-border flex items-center justify-between bg-card/40 shrink-0 cursor-grab active:cursor-grabbing select-none touch-none"
              >
                <div>
                  <h3 className="text-xs uppercase tracking-widest font-mono font-bold">
                    {editingAsset ? "EDIT POSITION" : "ADD POSITION"}
                  </h3>
                  <p className="text-[10px] text-muted-foreground uppercase font-mono mt-0.5">
                    Select a popular asset card below or configure custom asset.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1.5 hover:bg-secondary border border-transparent hover:border-border transition-all cursor-pointer rounded"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                </button>
              </div>

              {/* Scrollable Form Content */}
              <div className="p-5 overflow-y-auto space-y-4 flex-1 overscroll-contain">
                {/* Asset Selection List (Live Search or Curated Picks) */}
                {!editingAsset && (
                  <div className="space-y-3 border-b border-border/40 pb-4">
                    <div className="flex items-center justify-between">
                      <span className="technical-label text-[9px]">
                        {presetSearch.trim().length >= 2
                          ? "LIVE MARKET SEARCH RESULTS"
                          : "SELECT ASSET (POPULAR PICKS)"}
                      </span>
                      <button
                        type="button"
                        onClick={handleSelectCustomMode}
                        className={cn(
                          "text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 border transition-all cursor-pointer",
                          isCustomMode
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 font-bold"
                            : "bg-secondary/20 text-muted-foreground hover:text-foreground border-border"
                        )}
                      >
                        + Custom Unlisted Asset
                      </button>
                    </div>

                    <div className="relative">
                      {isSearchingApi ? (
                        <Loader2 className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/60 animate-spin" />
                      ) : (
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/40" />
                      )}
                      <Input
                        placeholder="SEARCH ANY STOCK, ETF, CRYPTO, OR COMMODITY..."
                        value={presetSearch}
                        onChange={(e) => setPresetSearch(e.target.value)}
                        className="pl-8 pr-8 text-[11px] h-8 rounded-none border-border/60 bg-secondary/10 uppercase"
                      />
                      {presetSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setPresetSearch("");
                            setApiSearchResults([]);
                          }}
                          className="absolute right-2 top-2 p-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    {/* Results List: Live API Results or Curated Presets */}
                    <div className="flex flex-col gap-1.5 max-h-[36vh] sm:max-h-[38vh] overflow-y-auto scrollbar-thin p-0.5">
                      {isSearchingApi ? (
                        // Skeleton loading during API query
                        <div className="space-y-1.5">
                          {[1, 2, 3].map((idx) => (
                            <div
                              key={idx}
                              className="p-2 border border-border/40 bg-card/20 flex items-center justify-between gap-2.5 w-full animate-pulse"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="h-10 w-10 rounded-xl bg-secondary/40 shrink-0" />
                                <div className="space-y-1.5 min-w-0">
                                  <div className="h-3 w-16 bg-secondary/60 rounded" />
                                  <div className="h-2.5 w-28 bg-secondary/30 rounded" />
                                </div>
                              </div>
                              <div className="h-3 w-12 bg-secondary/30 rounded" />
                            </div>
                          ))}
                        </div>
                      ) : presetSearch.trim().length >= 2 ? (
                        // Live API search results
                        apiSearchResults.length > 0 ? (
                          apiSearchResults.map((item) => {
                            const isSelected = !isCustomMode && selectedPresetId === item.id;
                            const isFetchingPrice = fetchingPriceForSymbol === item.symbol;
                            return (
                              <div
                                key={item.id}
                                onClick={() => handleSelectApiSearchResult(item)}
                                className={cn(
                                  "p-2 border rounded-none cursor-pointer select-none transition-all flex items-center justify-between gap-2.5 w-full",
                                  isSelected
                                    ? "bg-emerald-500/10 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                                    : "bg-card/40 border-border hover:border-foreground/40 hover:bg-secondary/20"
                                )}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <AssetLogo
                                    symbol={item.symbol}
                                    assetType={item.type}
                                    name={item.name}
                                    customIconUrl={item.iconUrl}
                                  />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-bold text-xs uppercase text-foreground truncate font-mono">
                                        {item.symbol}
                                      </span>
                                      <span className="inline-flex items-center justify-center text-[8px] font-mono leading-none px-1.5 py-0.5 rounded-full bg-secondary/60 border border-border text-muted-foreground uppercase shrink-0 font-bold tracking-wider">
                                        {item.badgeLabel}
                                      </span>
                                      {item.exchange && (
                                        <span className="text-[8px] font-mono text-muted-foreground/60 uppercase truncate">
                                          {item.exchange}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground uppercase truncate font-mono mt-0.5">
                                      {item.name}
                                    </p>
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  {isFetchingPrice ? (
                                    <div className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground">
                                      <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                      <span>PRICE...</span>
                                    </div>
                                  ) : isSelected ? (
                                    <span className="text-[8px] font-mono text-emerald-500 font-bold uppercase">
                                      ✓ SELECTED
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-mono text-muted-foreground uppercase hover:text-foreground">
                                      SELECT →
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          // No results matched
                          <div className="p-4 border border-dashed border-border bg-secondary/10 text-center space-y-2">
                            <p className="text-[10px] text-muted-foreground uppercase font-mono">
                              No live tickers found for &ldquo;{presetSearch.toUpperCase()}&rdquo;
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setIsCustomMode(true);
                                setSelectedPresetId("custom");
                                setFormData({
                                  asset_name: presetSearch.toUpperCase(),
                                  symbol: "",
                                  asset_type: "stock_etf",
                                  quantity: "1",
                                  buy_price: "",
                                  current_price: "",
                                  institution: "",
                                  notes: "",
                                });
                              }}
                              className="text-[10px] font-mono uppercase px-3 py-1 bg-secondary text-foreground hover:bg-muted border border-border transition-colors cursor-pointer"
                            >
                              + Create Custom Asset &ldquo;{presetSearch.toUpperCase()}&rdquo;
                            </button>
                          </div>
                        )
                      ) : (
                        // Default Curated Popular Presets
                        filteredPresets.map((preset) => {
                          const isSelected = !isCustomMode && selectedPresetId === preset.id;
                          const livePrice = presetLivePrices[preset.symbol.toUpperCase()] || preset.estPrice;
                          return (
                            <div
                              key={preset.id}
                              onClick={() => handleSelectPresetCard(preset)}
                              className={cn(
                                "p-2 border rounded-none cursor-pointer select-none transition-all flex items-center justify-between gap-2.5 w-full",
                                isSelected
                                  ? "bg-emerald-500/10 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.15)]"
                                  : "bg-card/40 border-border hover:border-foreground/40 hover:bg-secondary/20"
                              )}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <AssetLogo symbol={preset.symbol} assetType={preset.type} name={preset.name} />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-xs uppercase text-foreground truncate font-mono">
                                      {preset.symbol}
                                    </span>
                                    <span className="inline-flex items-center justify-center text-[8px] font-mono leading-none px-1.5 py-0.5 rounded-full bg-secondary/60 border border-border text-muted-foreground uppercase shrink-0 font-bold tracking-wider">
                                      {preset.badgeLabel}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground uppercase truncate font-mono mt-0.5">
                                    {preset.name}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <p className="text-xs font-mono font-bold text-foreground">
                                  €{formatSmartPrice(livePrice)}
                                </p>
                                {isSelected && (
                                  <span className="text-[8px] font-mono text-emerald-500 font-bold uppercase">
                                    ✓ SELECTED
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* Position Form */}
                <form id="portfolio-asset-form" onSubmit={handleFormSubmit} className="space-y-4 font-mono text-xs">
                  {/* If custom mode or editing, show custom asset name & ticker inputs */}
                  {(isCustomMode || editingAsset) && (
                    <div className="grid grid-cols-2 gap-4 border-b border-border/40 pb-4">
                      <div className="space-y-1.5">
                        <Label className="technical-label">Asset Name *</Label>
                        <Input
                          placeholder="e.g. APPLE INC or BITCOIN"
                          value={formData.asset_name}
                          onChange={(e) => setFormData({ ...formData, asset_name: e.target.value })}
                          className="rounded-none h-10 sm:h-9 text-base sm:text-xs uppercase"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="technical-label">Ticker Symbol</Label>
                        <Input
                          placeholder="AAPL, BTC"
                          value={formData.symbol}
                          onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                          className="rounded-none h-10 sm:h-9 text-base sm:text-xs uppercase font-mono"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Price Input Mode Selector */}
                    <div className="flex items-center justify-between border-b border-border/40 pb-2">
                      <Label className="technical-label">Entry Mode</Label>
                      <div className="flex items-center gap-1 border border-border/80 p-0.5 bg-secondary/30">
                        <button
                          type="button"
                          onClick={() => {
                            setPriceInputMode("unit");
                          }}
                          className={cn(
                            "px-2.5 py-1 text-[9px] font-mono font-bold uppercase transition-all select-none cursor-pointer",
                            priceInputMode === "unit" ? "bg-foreground text-background font-black shadow-sm" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          Price per Share
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPriceInputMode("total");
                            const q = parseFloat(formData.quantity);
                            const b = parseFloat(formData.buy_price);
                            if (!isNaN(q) && !isNaN(b) && q > 0 && b > 0) {
                              setTotalSpentInput((q * b).toFixed(2));
                            }
                          }}
                          className={cn(
                            "px-2.5 py-1 text-[9px] font-mono font-bold uppercase transition-all select-none cursor-pointer",
                            priceInputMode === "total" ? "bg-foreground text-background font-black shadow-sm" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          Total Invested ({currencySymbol})
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="technical-label">Quantity *</Label>
                        <Input
                          type="number"
                          step="any"
                          placeholder="1"
                          value={formData.quantity}
                          onChange={(e) => {
                            const qVal = e.target.value;
                            setFormData((prev) => {
                              const updated = { ...prev, quantity: qVal };
                              if (priceInputMode === "total") {
                                const tot = parseFloat(totalSpentInput);
                                const q = parseFloat(qVal);
                                if (!isNaN(tot) && !isNaN(q) && q > 0) {
                                  const unitP = (tot / q).toFixed(4);
                                  updated.buy_price = unitP;
                                  updated.current_price = unitP;
                                }
                              }
                              return updated;
                            });
                          }}
                          className="rounded-none h-10 sm:h-9 text-base sm:text-xs"
                          required
                        />
                      </div>

                      {priceInputMode === "unit" ? (
                        <div className="space-y-1.5">
                          <Label className="technical-label">Buy Price ({currencySymbol}) *</Label>
                          <Input
                            type="number"
                            step="any"
                            placeholder="130.33"
                            value={formData.buy_price}
                            onChange={(e) => {
                              const bVal = e.target.value;
                              setFormData((prev) => ({ ...prev, buy_price: bVal, current_price: bVal }));
                              const q = parseFloat(formData.quantity);
                              const b = parseFloat(bVal);
                              if (!isNaN(q) && !isNaN(b) && q > 0 && b > 0) {
                                setTotalSpentInput((q * b).toFixed(2));
                              }
                            }}
                            className="rounded-none h-10 sm:h-9 text-base sm:text-xs"
                            required
                          />
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <Label className="technical-label">Total Spent ({currencySymbol}) *</Label>
                          <Input
                            type="number"
                            step="any"
                            placeholder="10.00"
                            value={totalSpentInput}
                            onChange={(e) => {
                              const totVal = e.target.value;
                              setTotalSpentInput(totVal);
                              const tot = parseFloat(totVal);
                              const q = parseFloat(formData.quantity);
                              if (!isNaN(tot) && !isNaN(q) && q > 0) {
                                const unitP = (tot / q).toFixed(4);
                                setFormData((prev) => ({ ...prev, buy_price: unitP, current_price: unitP }));
                              }
                            }}
                            className="rounded-none h-10 sm:h-9 text-base sm:text-xs font-bold text-foreground"
                            required
                          />
                        </div>
                      )}
                    </div>

                    {/* Dynamic Calculation Helper Banner */}
                    <div className="p-2.5 bg-secondary/30 border border-border text-[10px] font-mono flex items-center justify-between">
                      <span className="text-muted-foreground">
                        {priceInputMode === "total" ? "Calculated Share Price:" : "Total Position Cost:"}
                      </span>
                      <span className="font-bold text-foreground">
                        {priceInputMode === "total"
                          ? formData.buy_price && !isNaN(parseFloat(formData.buy_price))
                            ? `${currencySymbol}${parseFloat(formData.buy_price).toFixed(2)} / share`
                            : "—"
                          : formData.quantity && formData.buy_price
                            ? `${currencySymbol}${(parseFloat(formData.quantity) * parseFloat(formData.buy_price)).toFixed(2)}`
                            : "—"}
                      </span>
                    </div>

                    {/* Quick Quantity Step Buttons */}
                    <div className="space-y-2 pt-1.5">
                      <Label className="technical-label block">Quick Quantity Adjust</Label>
                      <div className="grid grid-cols-6 gap-1.5">
                        {[-5, -2, -1, 1, 2, 5].map((delta) => (
                          <button
                            key={delta}
                            type="button"
                            onClick={() => handleStepQuantity(delta)}
                            className="py-1.5 text-[10px] font-mono font-bold uppercase border border-border/80 bg-secondary/30 hover:bg-secondary hover:border-foreground/50 text-foreground transition-all rounded-none cursor-pointer text-center select-none active:scale-95"
                          >
                            {delta > 0 ? `+${delta}` : delta}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </form>
              </div>

              {/* Pinned Bottom Footer - ALWAYS DOCKED SOLIDLY TO BOTTOM */}
              <div className="mt-auto shrink-0 w-full px-5 py-3.5 pb-6 border-t border-border bg-[#09090b] grid grid-cols-2 gap-3 z-30">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-full rounded-none h-11 font-mono text-[10px] uppercase tracking-widest border-border cursor-pointer"
                >
                  CANCEL
                </Button>
                <Button
                  type="submit"
                  form="portfolio-asset-form"
                  onClick={(e) => {
                    const form = document.getElementById("portfolio-asset-form") as HTMLFormElement;
                    if (form && !form.checkValidity()) {
                      form.reportValidity();
                      return;
                    }
                    handleFormSubmit(e);
                  }}
                  disabled={formSubmitting}
                  className="w-full rounded-none h-11 font-mono text-[10px] uppercase tracking-widest font-bold bg-foreground text-background hover:bg-foreground/80 cursor-pointer active:scale-95 transition-all"
                >
                  {formSubmitting ? "SAVING..." : editingAsset ? "SAVE CHANGES" : "ADD POSITION"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    )}

      {/* Deletion Confirmation Dialog matching /expenses */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="bg-card border border-border rounded-none p-6 font-mono text-xs w-[90vw] max-w-sm">
          <DialogHeader className="border-b border-border pb-4 mb-4">
            <DialogTitle className="text-xs uppercase tracking-widest font-mono flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" /> Deletion Warning
            </DialogTitle>
            <DialogDescription className="text-[9px] uppercase font-mono tracking-wider opacity-60 text-muted-foreground mt-1">
              Confirm permanent database removal
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-[11px] leading-relaxed text-muted-foreground uppercase">
              Are you sure you want to permanently delete this asset position? This action is irreversible and will update portfolio valuations.
            </p>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmOpen(false)}
                className="flex-1 rounded-none h-10 font-mono text-[9px] uppercase tracking-widest font-bold border border-border hover:bg-secondary transition-colors cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (deleteTargetId) {
                    const targetId = deleteTargetId;
                    setDeleteConfirmOpen(false);
                    setDeleteTargetId(null);
                    handleDeleteAsset(targetId);
                  }
                }}
                className="flex-1 rounded-none h-10 font-mono text-[9px] uppercase tracking-widest font-bold bg-destructive text-white hover:bg-destructive/80 transition-colors cursor-pointer"
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      </div>

      {/* 5. Mobile Sticky Cycle Bottom Navigation Bar */}
      {cycles.length > 0 && (
        <CycleMobileBar
          cycles={cycles}
          currentCycleId={selectedCycleId}
          route="/portfolio"
          onCycleChange={handleCycleSelect}
        />
      )}
    </SwipeCycleWrapper>

    {/* Floating Action Button (FAB) matching Ledger floating style */}
    <button
      type="button"
      onClick={handleOpenAddModal}
      className="fixed bottom-[108px] md:bottom-8 right-4 md:right-8 z-50 h-12 w-12 rounded-xl bg-white text-black font-extrabold shadow-2xl flex items-center justify-center hover:bg-gray-100 border border-white/20 cursor-pointer select-none transition-all active:scale-95"
      aria-label="Add asset manual entry"
    >
      <Plus className="h-6 w-6 stroke-[3]" />
    </button>
  </>
  );
}
