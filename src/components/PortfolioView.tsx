"use client";

import { useState, useEffect, useMemo, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSystem } from "@/lib/SystemContext";
import { PrivacyValue } from "@/components/ui/privacy-value";
import { ProLockOverlay } from "@/components/ProLockOverlay";
import { Button } from "@/components/ui/button";
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

  // Commodities & Cash
  { id: "xau", name: "Gold Spot", symbol: "XAU", type: "commodity", estPrice: 2450.0, badgeLabel: "COMMODITY" },
  { id: "xag", name: "Silver Spot", symbol: "XAG", type: "commodity", estPrice: 28.5, badgeLabel: "COMMODITY" },
  { id: "wti", name: "Crude Oil WTI", symbol: "WTI", type: "commodity", estPrice: 78.0, badgeLabel: "COMMODITY" },
  { id: "eur", name: "Euro Cash / Savings", symbol: "EUR", type: "cash_equivalent", estPrice: 1.0, badgeLabel: "SAVINGS" },
  { id: "usd", name: "US Dollar Reserve", symbol: "USD", type: "cash_equivalent", estPrice: 1.08, badgeLabel: "SAVINGS" },
];

const ASSET_TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  stock_etf: { label: "STOCKS & ETFS", icon: TrendingUp, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20" },
  crypto: { label: "CRYPTO", icon: Coins, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20" },
  cash_equivalent: { label: "CASH & SAVINGS", icon: Landmark, color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20" },
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

function AssetLogo({ symbol, assetType, name, customIconUrl }: { symbol?: string | null; assetType: string; name: string; customIconUrl?: string }) {
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
      <div className="h-10 w-10 rounded-xl border border-border/80 bg-secondary/20 flex items-center justify-center shrink-0 p-1.5 overflow-hidden">
        <img
          src={imageUrl}
          alt={name}
          loading="eager"
          fetchPriority="high"
          className="h-full w-full object-contain"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div className={cn("h-10 w-10 rounded-xl border flex items-center justify-center shrink-0 font-mono text-[11px] font-bold uppercase tracking-tighter", config.bg, config.color)}>
      {cleanSym ? cleanSym.slice(0, 3) : name.slice(0, 2).toUpperCase()}
    </div>
  );
}

function CustomPortfolioTooltip({ active, payload, label, formatCurrency }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-3 bg-card border border-border ledger-border font-mono shadow-2xl space-y-1.5 text-xs rounded-none min-w-[170px]">
        <p className="text-[9px] text-muted-foreground uppercase font-bold border-b border-border/40 pb-1">{label}</p>
        <div className="flex items-center justify-between gap-4 text-[11px]">
          <span className="text-muted-foreground uppercase text-[9px]">Valuation:</span>
          <span className="font-bold text-foreground">{formatCurrency(data.valuation)}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-[11px]">
          <span className="text-muted-foreground uppercase text-[9px]">Cost Basis:</span>
          <span className="font-bold text-muted-foreground">{formatCurrency(data.invested)}</span>
        </div>
        <div className="flex items-center justify-between gap-4 text-[11px] border-t border-border/40 pt-1">
          <span className="text-muted-foreground uppercase text-[9px]">Return:</span>
          <span className={cn("font-bold", data.gainLoss >= 0 ? "text-emerald-500" : "text-rose-500")}>
            {data.gainLoss >= 0 ? "+" : ""}{formatCurrency(data.gainLoss)}
          </span>
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
  const { formatCurrency, currencySymbol, isPro } = useSystem();

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

  useCycleSwipe({
    cycles,
    currentCycleId: selectedCycleId,
    route: "/portfolio",
    onCycleChange: handleCycleSelect,
  });

  const [assets, setAssets] = useState<PortfolioAsset[]>(initialAssets);
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [liquidBalance, setLiquidBalance] = useState<number>(initialLiquidBalance);
  const [loading, setLoading] = useState(false);
  const [refreshingPrices, setRefreshingPrices] = useState(false);
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
  const [formSubmitting, setFormSubmitting] = useState(false);

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

  useEffect(() => {
    fetchPortfolioData();
    fetchPresetLivePrices();
  }, [fetchPortfolioData, fetchPresetLivePrices]);

  const handleRefreshMarketPrices = async () => {
    try {
      setRefreshingPrices(true);
      const res = await fetch("/api/portfolio/market-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });

      if (!res.ok) {
        const errData = await res.json();
        if (res.status === 429) {
          toast.info(errData.error || "Prices are updated. Please wait a moment before refreshing again.");
          return;
        }
        throw new Error(errData.error || "Failed to update market prices.");
      }

      const data = await res.json();
      toast.success(data.message || `Updated live market prices for ${data.updatedCount || 0} assets.`);
      fetchPortfolioData();
    } catch (err: any) {
      toast.error(err.message || "Failed to refresh market prices.");
    } finally {
      setRefreshingPrices(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingAsset(null);
    setSelectedPresetId(null);
    setIsCustomMode(false);
    setPresetSearch("");
    setApiSearchResults([]);
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

    // Auto-fetch real live quote for the selected ticker to prepopulate buy/current price
    if (item.symbol) {
      setFetchingPriceForSymbol(item.symbol);
      try {
        if (item.type === "stock_etf" || item.type === "commodity") {
          const yfUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(item.symbol)}?interval=1d&range=1d`;
          const yfRes = await fetch(yfUrl);
          if (yfRes.ok) {
            const yfData = await yfRes.json();
            const price = yfData?.chart?.result?.[0]?.meta?.regularMarketPrice;
            if (typeof price === "number" && price > 0) {
              const pStr = getRawPriceString(price);
              setFormData((prev) => ({
                ...prev,
                buy_price: prev.buy_price || pStr,
                current_price: pStr,
              }));
            }
          }
        } else if (item.type === "crypto") {
          const cgId = item.id.replace(/^cg-/, "") || item.symbol.toLowerCase();
          const cgUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(cgId)}&vs_currencies=eur,usd`;
          const cgRes = await fetch(cgUrl);
          if (cgRes.ok) {
            const cgData = await cgRes.json();
            const coinData = cgData[cgId];
            const price = coinData ? (coinData.eur || coinData.usd) : null;
            if (typeof price === "number" && price > 0) {
              const pStr = getRawPriceString(price);
              setFormData((prev) => ({
                ...prev,
                buy_price: prev.buy_price || pStr,
                current_price: pStr,
              }));
            }
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

  // Chart Data memo: exact day-by-day trajectory reflecting asset purchase dates + future dashed separation
  const chartData = useMemo(() => {
    const formatChartDate = (dateStr: string) => {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    };

    const startD = currentCycle ? new Date(currentCycle.startDate) : new Date(Date.now() - 29 * 86400000);
    const endD = currentCycle && currentCycle.endDate ? new Date(currentCycle.endDate) : new Date(startD.getTime() + 30 * 86400000);
    
    const diffDays = Math.round((endD.getTime() - startD.getTime()) / (1000 * 3600 * 24));
    const cycleDaysCount = Math.max(30, Math.min(60, diffDays + 1));
    const todayStr = new Date().toISOString().split("T")[0];

    const snapMap = new Map<string, PortfolioSnapshot>();
    (snapshots || []).forEach((s) => {
      if (s.snapshot_date) {
        snapMap.set(s.snapshot_date.split("T")[0], s);
      }
    });

    if (selectedChartMode === "all") {
      return Array.from({ length: cycleDaysCount }).map((_, i) => {
        const d = new Date(startD);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split("T")[0];
        const dateLabel = formatChartDate(dateStr);

        const dateEnd = new Date(d);
        dateEnd.setHours(23, 59, 59, 999);

        const isPast = dateStr < todayStr;
        const isToday = dateStr === todayStr;
        const isFuture = dateStr > todayStr;

        // For past days, check if a historical snapshot was recorded. Today and future days use live asset calculations.
        const recordedSnap = isPast ? snapMap.get(dateStr) : null;
        let dayValuation = 0;
        let dayInvested = 0;
        let dayGainLoss = 0;

        if (recordedSnap && recordedSnap.total_net_worth) {
          dayValuation = Number(recordedSnap.total_net_worth || 0);
          dayInvested = Number(recordedSnap.invested_capital || 0);
          dayGainLoss = Number(recordedSnap.total_gain_loss || 0);
        } else {
          let dayBankBalance = injectedStartBalance;
          if (expenses && expenses.length > 0) {
            const sumTx = expenses
              .filter((e: any) => new Date(e.date) <= dateEnd)
              .reduce((sum: number, e: any) => sum + (parseFloat(e.amount) || 0), 0);
            dayBankBalance = injectedStartBalance + sumTx;
          } else if (isPast || isToday) {
            dayBankBalance = liquidBalance;
          }

          // Only include assets created/acquired on or before this day
          const activeAssetsOnDay = assets.filter((a) => {
            if (!a.created_at) return true;
            return new Date(a.created_at) <= dateEnd;
          });

          const dayAssetValuation = activeAssetsOnDay.reduce(
            (sum, a) => sum + (Number(a.quantity) || 0) * (Number(a.current_price) || Number(a.buy_price) || 0),
            0
          );
          const dayAssetInvested = activeAssetsOnDay.reduce(
            (sum, a) => sum + (Number(a.quantity) || 0) * (Number(a.buy_price) || 0),
            0
          );

          dayValuation = parseFloat((dayBankBalance + dayAssetValuation).toFixed(2));
          dayInvested = parseFloat(dayAssetInvested.toFixed(2));
          dayGainLoss = parseFloat((dayValuation - dayInvested).toFixed(2));
        }

        return {
          date: dateStr,
          dateLabel,
          valuation: dayValuation,
          actualValuation: isPast || isToday ? dayValuation : null,
          projectionValuation: isToday || isFuture ? dayValuation : null,
          invested: dayInvested,
          gainLoss: dayGainLoss,
        };
      });
    } else if (["stock_etf", "crypto", "commodity", "cash_equivalent"].includes(selectedChartMode)) {
      const categoryAssets = assets.filter((a) => a.asset_type === selectedChartMode);

      return Array.from({ length: cycleDaysCount }).map((_, i) => {
        const d = new Date(startD);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split("T")[0];
        const dateLabel = formatChartDate(dateStr);

        const dateEnd = new Date(d);
        dateEnd.setHours(23, 59, 59, 999);

        const isPast = dateStr < todayStr;
        const isToday = dateStr === todayStr;
        const isFuture = dateStr > todayStr;

        const recordedSnap = isPast ? snapMap.get(dateStr) : null;
        let val = 0;
        let invested = 0;

        if (recordedSnap && recordedSnap.asset_breakdown?.[selectedChartMode]) {
          const catBreakdown = recordedSnap.asset_breakdown[selectedChartMode];
          val = catBreakdown.valuation || 0;
          invested = (catBreakdown as any).invested || 0;
        } else if (selectedChartMode === "cash_equivalent") {
          if (expenses && expenses.length > 0) {
            const sumTx = expenses
              .filter((e: any) => new Date(e.date) <= dateEnd)
              .reduce((sum: number, e: any) => sum + (parseFloat(e.amount) || 0), 0);
            val = injectedStartBalance + sumTx;
          } else if (isPast || isToday) {
            val = liquidBalance;
          } else {
            val = injectedStartBalance;
          }
        } else {
          const activeAssetsOnDay = categoryAssets.filter((a) => {
            if (!a.created_at) return true;
            return new Date(a.created_at) <= dateEnd;
          });
          val = activeAssetsOnDay.reduce(
            (sum, a) => sum + (Number(a.quantity) || 0) * (Number(a.current_price) || Number(a.buy_price) || 0),
            0
          );
          invested = activeAssetsOnDay.reduce((sum, a) => sum + (Number(a.quantity) || 0) * (Number(a.buy_price) || 0), 0);
        }

        const formattedVal = parseFloat(val.toFixed(2));
        const formattedInvested = parseFloat(invested.toFixed(2));

        return {
          date: dateStr,
          dateLabel,
          valuation: formattedVal,
          actualValuation: isPast || isToday ? formattedVal : null,
          projectionValuation: isToday || isFuture ? formattedVal : null,
          invested: formattedInvested,
          gainLoss: parseFloat((val - invested).toFixed(2)),
        };
      });
    } else {
      const targetAsset = assets.find((a) => a.id === selectedChartMode);

      return Array.from({ length: cycleDaysCount }).map((_, i) => {
        const d = new Date(startD);
        d.setDate(d.getDate() + i);
        const dateStr = d.toISOString().split("T")[0];
        const dateLabel = formatChartDate(dateStr);

        const dateEnd = new Date(d);
        dateEnd.setHours(23, 59, 59, 999);

        const isPast = dateStr < todayStr;
        const isToday = dateStr === todayStr;
        const isFuture = dateStr > todayStr;

        const isOwnedOnDay = targetAsset && (!targetAsset.created_at || new Date(targetAsset.created_at) <= dateEnd);
        const assetInvested = isOwnedOnDay ? (targetAsset.quantity || 0) * (targetAsset.buy_price || 0) : 0;
        const assetValuation = isOwnedOnDay ? (targetAsset.quantity || 0) * (targetAsset.current_price || targetAsset.buy_price || 0) : 0;

        const formattedVal = parseFloat(assetValuation.toFixed(2));
        const formattedInvested = parseFloat(assetInvested.toFixed(2));

        return {
          date: dateStr,
          dateLabel,
          valuation: formattedVal,
          actualValuation: isPast || isToday ? formattedVal : null,
          projectionValuation: isToday || isFuture ? formattedVal : null,
          invested: formattedInvested,
          gainLoss: parseFloat((assetValuation - assetInvested).toFixed(2)),
        };
      });
    }
  }, [selectedChartMode, assets, snapshots, currentCycle, expenses, injectedStartBalance, liquidBalance]);

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
          <div className="flex items-center gap-3 text-[9px] md:text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Active Paycheck Cycle</span>
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
      <section className="space-y-4 border border-border ledger-border p-4 md:p-6 bg-card/20 relative" data-no-swipe="true">
        {!isPro && (
          <div className="absolute inset-0 z-30 bg-background/95 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center">
            <ProLockOverlay
              title="PORTFOLIO TRAJECTORY & ANALYTICS"
              description="Upgrade to LEGER_OS PRO to unlock multi-asset historical valuation charts and holdings analytics."
            />
          </div>
        )}

        {/* Clean Header Bar with Title on Left and Filter Tabs on Right */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/40 pb-4">
          <h2 className="text-xl font-bold uppercase tracking-tight font-mono shrink-0">
            {selectedChartMode === "all"
              ? "Net Worth Trajectory"
              : selectedChartMode === "stock_etf"
              ? "Stocks & ETFs Trajectory"
              : selectedChartMode === "crypto"
              ? "Crypto Assets Trajectory"
              : selectedChartMode === "commodity"
              ? "Commodities Trajectory"
              : selectedChartMode === "cash_equivalent"
              ? "Savings & Cash Trajectory"
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
                All
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
                onClick={() => setSelectedChartMode("cash_equivalent")}
                className={cn(
                  "px-3 py-1 uppercase font-bold transition-all border-l border-border/60 cursor-pointer select-none shrink-0",
                  selectedChartMode === "cash_equivalent" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Savings
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
                <option value="all">Total Portfolio (All Assets)</option>
                <option value="stock_etf">Stocks & ETFs</option>
                <option value="crypto">Crypto</option>
                <option value="cash_equivalent">Savings & Cash</option>
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

        {/* Recharts Area Chart */}
        <div className="h-[280px] md:h-[320px] w-full mt-4 cursor-pointer">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsAreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="portfolioValuationGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--foreground)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="var(--foreground)" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="portfolioProjectionGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--foreground)" stopOpacity={0.05} />
                  <stop offset="95%" stopColor="var(--foreground)" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="dateLabel"
                axisLine={false}
                tickLine={false}
                interval={5}
                style={{ fontSize: "9px", fontFamily: "var(--font-geist-mono)", fill: "#86868B" }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                style={{ fontSize: "9px", fontFamily: "var(--font-geist-mono)", fill: "#86868B" }}
                tickFormatter={(val) => `${currencySymbol}${Math.round(val)}`}
              />
              <RechartsTooltip content={<CustomPortfolioTooltip formatCurrency={formatCurrency} />} />
              <RechartsArea
                type="stepAfter"
                dataKey="actualValuation"
                stroke="var(--foreground)"
                strokeWidth={2}
                fill="url(#portfolioValuationGrad)"
                fillOpacity={1}
                connectNulls={true}
              />
              <RechartsArea
                type="monotone"
                dataKey="projectionValuation"
                stroke="var(--foreground)"
                strokeOpacity={0.6}
                strokeWidth={1.5}
                strokeDasharray="5 5"
                fill="url(#portfolioProjectionGrad)"
                fillOpacity={1}
                connectNulls={true}
              />
              {chartData.some((d) => d.invested > 0) && (
                <ReferenceLine
                  y={chartData[chartData.length - 1]?.invested || 0}
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                  label={{
                    value: "Cost Basis",
                    fill: "#86868B",
                    fontSize: 8,
                    fontFamily: "var(--font-geist-mono)",
                    position: "right",
                  }}
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
                  "px-1.5 py-0.5 border text-[8px] sm:text-[9px] font-mono font-bold uppercase truncate max-w-full inline-block",
                  metrics.displayChange >= 0
                    ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5"
                    : "text-rose-500 border-rose-500/20 bg-rose-500/5"
                )}>
                  <PrivacyValue>
                    {metrics.displayChange >= 0 ? "+" : ""}{formatCurrency(metrics.displayChange)} ({metrics.displayChangePct >= 0 ? "+" : ""}{format2Decimals(metrics.displayChangePct)}%)
                  </PrivacyValue>
                </span>
                <span className="text-[8px] sm:text-[9px] text-muted-foreground/70 uppercase font-mono tracking-widest font-semibold shrink-0">
                  {metrics.isCurrentCycle ? "24H" : "CYCLE"}
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
                  "px-1 sm:px-1.5 py-0.5 border text-[7.5px] sm:text-[9px] font-mono font-bold uppercase truncate max-w-full inline-block",
                  metrics.displayChange >= 0
                    ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5"
                    : "text-rose-500 border-rose-500/20 bg-rose-500/5"
                )}>
                  <PrivacyValue>
                    {metrics.displayChange >= 0 ? "+" : ""}{formatCurrency(metrics.displayChange)} ({metrics.displayChangePct >= 0 ? "+" : ""}{format2Decimals(metrics.displayChangePct)}%)
                  </PrivacyValue>
                </span>
                <span className="text-[7.5px] sm:text-[9px] text-muted-foreground/70 uppercase font-mono tracking-widest font-semibold shrink-0 hidden xs:inline-block">
                  {metrics.isCurrentCycle ? "24H" : "CYCLE"}
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
                  "px-1 sm:px-1.5 py-0.5 border text-[7.5px] sm:text-[9px] font-mono font-bold uppercase truncate max-w-full inline-block",
                  (metrics.isCurrentCycle ? metrics.totalPnLPercent : metrics.displayChangePct) >= 0
                    ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5"
                    : "text-rose-500 border-rose-500/20 bg-rose-500/5"
                )}>
                  <PrivacyValue>
                    {(metrics.isCurrentCycle ? metrics.totalPnLPercent : metrics.displayChangePct) >= 0 ? "+" : ""}
                    {format2Decimals(metrics.isCurrentCycle ? metrics.totalPnLPercent : metrics.displayChangePct)}%
                  </PrivacyValue>
                </span>
                <span className="text-[7.5px] sm:text-[9px] text-muted-foreground/70 uppercase font-mono tracking-widest font-semibold shrink-0 hidden xs:inline-block">
                  {metrics.isCurrentCycle ? "ALL" : "CYCLE"}
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
        <div className="flex items-center justify-between border-b border-border/40 pb-2">
          <h2 className="text-xl md:text-2xl font-bold tracking-tighter uppercase font-sans">
            Holdings
          </h2>
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
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-secondary/50 border border-border/80 text-muted-foreground uppercase shrink-0 font-semibold">
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

      {/* Native Draggable Bottom Drawer matching AI Assistant Window physics 100% */}
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
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 80 || info.velocity.y > 250) {
                  setIsAddModalOpen(false);
                }
              }}
              className="w-full max-w-xl bg-[#09090b] border-t sm:border border-border text-foreground shadow-2xl flex flex-col overflow-hidden h-[85vh] rounded-t-2xl sm:rounded-2xl justify-between"
            >
              {/* Top Drag Handle */}
              <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto my-2.5 cursor-grab active:cursor-grabbing shrink-0" />

              {/* Drawer Header */}
              <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-card/40 shrink-0">
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
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
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
                                      <span className="text-[8px] font-mono px-1.5 py-0.2 rounded-full bg-secondary/60 border border-border text-muted-foreground uppercase shrink-0 font-semibold">
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
                                    <span className="text-[8px] font-mono px-1.5 py-0.2 rounded-full bg-secondary/60 border border-border text-muted-foreground uppercase shrink-0 font-semibold">
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
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="technical-label">Quantity *</Label>
                        <Input
                          type="number"
                          step="any"
                          placeholder="1"
                          value={formData.quantity}
                          onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                          className="rounded-none h-10 sm:h-9 text-base sm:text-xs"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="technical-label">Buy Price ({currencySymbol}) *</Label>
                        <Input
                          type="number"
                          step="any"
                          placeholder="130.33"
                          value={formData.buy_price}
                          onChange={(e) => setFormData({ ...formData, buy_price: e.target.value, current_price: e.target.value })}
                          className="rounded-none h-10 sm:h-9 text-base sm:text-xs"
                          required
                        />
                      </div>
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
      </AnimatePresence>

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
