"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSystem } from "@/lib/SystemContext";
import { PrivacyValue } from "@/components/ui/privacy-value";
import { ProLockOverlay } from "@/components/ProLockOverlay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
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

const PRELOADED_ICONS: Record<string, string> = {
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
  SHIB: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/shib.svg",
  UNI: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/uni.svg",
  LTC: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/ltc.svg",
  NEAR: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/near.svg",
  ATOM: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/atom.svg",
  ICP: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/icp.svg",
};

// Eagerly pre-warm browser memory cache on module load for 0ms instant rendering
if (typeof window !== "undefined") {
  Object.values(PRELOADED_ICONS).forEach((url) => {
    const img = new Image();
    img.src = url;
  });
}

function AssetLogo({ symbol, assetType, name }: { symbol?: string | null; assetType: string; name: string }) {
  const [imgError, setImgError] = useState(false);

  const cleanSym = (symbol || "").toUpperCase().trim();
  const config = ASSET_TYPE_CONFIG[assetType] || ASSET_TYPE_CONFIG.other;

  const imageUrl = useMemo(() => {
    if (!cleanSym || imgError) return null;
    if (PRELOADED_ICONS[cleanSym]) return PRELOADED_ICONS[cleanSym];
    if (assetType === "crypto") {
      return `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/${cleanSym.toLowerCase()}.svg`;
    }
    return null;
  }, [cleanSym, assetType, imgError]);

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

export function PortfolioView() {
  const { formatCurrency, currencySymbol, isPro } = useSystem();

  const [assets, setAssets] = useState<PortfolioAsset[]>([]);
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [liquidBalance, setLiquidBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshingPrices, setRefreshingPrices] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<PortfolioAsset | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [presetSearch, setPresetSearch] = useState("");
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null); // Start with NONE selected
  const [isCustomMode, setIsCustomMode] = useState(false);

  // Form State
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

  // Fetch Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [assetsRes, snapshotsRes] = await Promise.all([
        fetch("/api/portfolio/assets"),
        fetch("/api/portfolio/snapshots"),
      ]);

      if (assetsRes.ok) {
        const data = await assetsRes.json();
        setAssets(data.assets || []);
        if (typeof data.liquidBalance === "number") {
          setLiquidBalance(data.liquidBalance);
        }
      }

      if (snapshotsRes.ok) {
        const snapData = await snapshotsRes.json();
        const snaps = snapData.snapshots || [];
        setSnapshots(snaps);
        if (snaps.length > 0 && snaps[snaps.length - 1]?.liquid_cash) {
          setLiquidBalance(Number(snaps[snaps.length - 1].liquid_cash));
        }
      }
    } catch (err) {
      console.error("Failed to load portfolio data:", err);
      toast.error("Failed to load holdings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Silent automatic background price sync on page load (updates stale prices >1hr old)
    fetch("/api/portfolio/market-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force: false }),
    }).then((res) => {
      if (res.ok) {
        fetchData();
      }
    }).catch(() => {});
  }, []);

  // Open Add Drawer Modal (Start with NONE selected)
  const handleOpenAddModal = () => {
    if (!isPro && assets.length >= 15) {
      toast.error("Core Free tier is limited to 15 assets. Upgrade to LEGER_OS PRO for unlimited asset tracking.");
      return;
    }
    setEditingAsset(null);
    setPresetSearch("");
    setIsCustomMode(false);
    setSelectedPresetId(null); // Start with NONE selected
    
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
    setIsAddModalOpen(true);
  };

  // Select Popular Preset Card
  const handleSelectPresetCard = (preset: PopularAssetPreset) => {
    setSelectedPresetId(preset.id);
    setIsCustomMode(false);
    const estPriceStr = preset.estPrice.toFixed(2);
    setFormData((prev) => ({
      ...prev,
      asset_name: preset.name,
      symbol: preset.symbol,
      asset_type: preset.type,
      quantity: "1",
      buy_price: estPriceStr,
      current_price: estPriceStr,
    }));
  };

  // Switch to Custom Asset Entry
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

  // Quick Quantity Step
  const handleStepQuantity = (delta: number) => {
    const cleanQtyStr = formData.quantity.replace(/,/g, "");
    const current = parseFloat(cleanQtyStr) || 0;
    const next = Math.max(0, current + delta);
    const valStr = Number.isInteger(next) ? next.toString() : next.toFixed(2);
    setFormData((prev) => ({ ...prev, quantity: valStr }));
  };

  // Open Edit Drawer Modal
  const handleOpenEditModal = (asset: PortfolioAsset) => {
    setEditingAsset(asset);
    setIsCustomMode(true);
    setFormData({
      asset_name: asset.asset_name,
      symbol: asset.symbol || "",
      asset_type: asset.asset_type,
      quantity: asset.quantity.toString(),
      buy_price: format2Decimals(asset.buy_price),
      current_price: format2Decimals(asset.current_price),
      institution: asset.institution || "",
      notes: asset.notes || "",
    });
    setIsAddModalOpen(true);
  };

  // Form Submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.asset_name.trim()) {
      toast.error("Please select an asset from popular picks or enter a custom asset name.");
      return;
    }
    const qty = parseFloat(formData.quantity.replace(/,/g, ""));
    const buyPrice = parseFloat(formData.buy_price.replace(/,/g, ""));
    if (isNaN(qty) || qty <= 0) {
      toast.error("Quantity must be greater than zero.");
      return;
    }
    if (isNaN(buyPrice) || buyPrice < 0) {
      toast.error("Buy price must be a valid number.");
      return;
    }

    try {
      setFormSubmitting(true);
      const isEditing = !!editingAsset;
      const method = isEditing ? "PATCH" : "POST";
      const payload = isEditing ? { id: editingAsset.id, ...formData } : formData;

      const res = await fetch("/api/portfolio/assets", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save asset.");
        return;
      }

      toast.success(isEditing ? "Asset updated." : "Asset position added.");
      setIsAddModalOpen(false);
      await fetchData();
      fetch("/api/portfolio/snapshots", { method: "POST" });
    } catch (err: any) {
      toast.error(err.message || "Failed to save asset.");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Asset
  const handleDeleteAsset = async (id: string) => {
    try {
      setDeletingId(id);
      const res = await fetch(`/api/portfolio/assets?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to delete asset.");
        return;
      }
      toast.success("Asset removed.");
      setAssets((prev) => prev.filter((a) => a.id !== id));
      fetch("/api/portfolio/snapshots", { method: "POST" });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete asset.");
    } finally {
      setDeletingId(null);
    }
  };

  // Financial Metrics
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

      // 24h Change calculation from asset metadata
      const change24hPct = Number(asset.metadata?.change24h || 0);
      if (change24hPct !== 0) {
        const prevPrice = curr / (1 + change24hPct / 100);
        total24hChange += valuation - qty * prevPrice;
      }

      const type = asset.asset_type || "other";
      breakdown[type] = (breakdown[type] || 0) + valuation;
    });

    // Fallback to 24h snapshot delta if metadata is unpopulated
    if (total24hChange === 0 && snapshots.length >= 2) {
      const latestSnap = snapshots[0];
      const yesterdaySnap = snapshots.find((s) => {
        const d = new Date(s.snapshot_date).getTime();
        return Date.now() - d >= 20 * 3600 * 1000;
      }) || snapshots[1];

      if (latestSnap && yesterdaySnap) {
        total24hChange = latestSnap.total_net_worth - yesterdaySnap.total_net_worth;
      }
    }

    const total24hChangePct =
      totalValuation > 0 && totalValuation - total24hChange > 0
        ? (total24hChange / (totalValuation - total24hChange)) * 100
        : 0;

    const totalPnL = totalValuation - totalInvested;
    const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;
    const totalNetWorth = liquidBalance + totalValuation;

    return {
      totalInvested,
      totalValuation,
      totalPnL,
      totalPnLPercent,
      totalNetWorth,
      total24hChange,
      total24hChangePct,
      breakdown,
    };
  }, [assets, snapshots, liquidBalance]);

  const [selectedChartMode, setSelectedChartMode] = useState<string>("all");

  // Chart Data memo: handles ALL ASSETS, category types, or individual assets by ID
  const chartData = useMemo(() => {
    const hasSnapshots = snapshots && snapshots.length > 0;

    if (selectedChartMode === "all") {
      if (hasSnapshots) {
        return snapshots.map((s) => ({
          date: s.snapshot_date,
          valuation: s.total_net_worth || 0,
          invested: s.invested_capital || 0,
          gainLoss: s.total_gain_loss || 0,
        }));
      } else {
        const today = new Date();
        return Array.from({ length: 30 }).map((_, i) => {
          const d = new Date(today);
          d.setDate(d.getDate() - (29 - i));
          const dateStr = d.toISOString().split("T")[0];
          const progress = i / 29;
          const startVal = (metrics.totalNetWorth || 1000) * 0.92;
          const currentVal = startVal + ((metrics.totalNetWorth || 1000) - startVal) * progress;
          return {
            date: dateStr,
            valuation: parseFloat(currentVal.toFixed(2)),
            invested: parseFloat((metrics.totalInvestedCapital || 0).toFixed(2)),
            gainLoss: parseFloat((currentVal - (metrics.totalInvestedCapital || 0)).toFixed(2)),
          };
        });
      }
    } else if (["stock_etf", "crypto", "commodity", "cash_equivalent"].includes(selectedChartMode)) {
      const categoryAssets = assets.filter((a) => a.asset_type === selectedChartMode);
      const categoryInvested = categoryAssets.reduce((sum, a) => sum + (a.quantity || 0) * (a.buy_price || 0), 0);
      const categoryValuation = categoryAssets.reduce((sum, a) => sum + (a.quantity || 0) * (a.current_price || a.buy_price || 0), 0);

      if (hasSnapshots) {
        return snapshots.map((s) => {
          const typeBreakdown = s.asset_breakdown?.[selectedChartMode];
          const val = typeBreakdown ? typeBreakdown.valuation : 0;
          return {
            date: s.snapshot_date,
            valuation: val,
            invested: categoryInvested,
            gainLoss: val - categoryInvested,
          };
        });
      } else {
        const today = new Date();
        return Array.from({ length: 30 }).map((_, i) => {
          const d = new Date(today);
          d.setDate(d.getDate() - (29 - i));
          const dateStr = d.toISOString().split("T")[0];
          const progress = i / 29;
          const startVal = categoryValuation * 0.90;
          const currentVal = startVal + (categoryValuation - startVal) * progress;
          return {
            date: dateStr,
            valuation: parseFloat(currentVal.toFixed(2)),
            invested: parseFloat(categoryInvested.toFixed(2)),
            gainLoss: parseFloat((categoryValuation - categoryInvested).toFixed(2)),
          };
        });
      }
    } else {
      // Individual Asset by ID
      const targetAsset = assets.find((a) => a.id === selectedChartMode);
      if (!targetAsset) return [];

      const qty = targetAsset.quantity || 0;
      const buyP = targetAsset.buy_price || 0;
      const currP = targetAsset.current_price || buyP;
      const costBasis = qty * buyP;
      const currentValuation = qty * currP;
      const change24hPct = targetAsset.metadata?.change24h || 0;

      const today = new Date();
      return Array.from({ length: 30 }).map((_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - (29 - i));
        const dateStr = d.toISOString().split("T")[0];
        const daysFromEnd = 29 - i;

        const priceRatio = 1 - (daysFromEnd / 29) * (change24hPct / 100);
        const historicalPrice = currP * Math.max(0.2, priceRatio);
        const historicalValuation = qty * historicalPrice;

        return {
          date: dateStr,
          valuation: parseFloat(historicalValuation.toFixed(2)),
          invested: parseFloat(costBasis.toFixed(2)),
          gainLoss: parseFloat((historicalValuation - costBasis).toFixed(2)),
        };
      });
    }
  }, [selectedChartMode, snapshots, assets, metrics]);

  // Filtered Assets
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
    return (
      <div className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-10 md:space-y-12 pb-36 md:pb-8 w-full font-mono">
        <div className="space-y-3">
          <Skeleton className="h-4 w-36 bg-secondary/80" />
          <Skeleton className="h-10 w-64 bg-secondary/80" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-6 md:p-8 bg-card/20 border border-border space-y-3">
              <Skeleton className="h-3 w-28 bg-secondary/60" />
              <Skeleton className="h-10 w-44 bg-secondary/80" />
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <Skeleton className="h-8 w-full bg-secondary/40" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-20 bg-secondary/60" />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-3.5 bg-card/40 border border-border/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-xl bg-secondary/60" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-28 bg-secondary/80" />
                  <Skeleton className="h-3 w-20 bg-secondary/40" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px] p-4 md:p-8 space-y-10 md:space-y-12 pb-36 md:pb-8 w-full">
      {/* 1. Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8 border-b border-foreground/10 pb-6 md:pb-8 relative">
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-[9px] md:text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
            <span>PORTFOLIO MANAGEMENT</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter uppercase leading-none break-words">
            PORTFOLIO
          </h1>
        </div>
      </header>

      {/* 2. Executive Ledger Summary Cards with 24H Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Tilt rotationFactor={6} className="p-6 md:p-8 space-y-3 bg-card/20 border border-border relative group overflow-hidden flex flex-col justify-between glow-card">
          <span className="technical-label text-[9px] border-b border-dotted border-muted-foreground/30 w-fit z-10">TOTAL NET WORTH</span>
          <div className="space-y-1 z-10">
            <div className="text-3xl md:text-5xl font-mono font-bold tracking-tighter">
              <PrivacyValue>{formatCurrency(metrics.totalNetWorth)}</PrivacyValue>
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              <span className={cn(
                "px-1.5 py-0.5 border text-[9px] font-mono font-bold uppercase",
                metrics.total24hChange >= 0
                  ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5"
                  : "text-rose-500 border-rose-500/20 bg-rose-500/5"
              )}>
                <PrivacyValue>
                  {metrics.total24hChange >= 0 ? "+" : ""}{formatCurrency(metrics.total24hChange)} ({metrics.total24hChangePct >= 0 ? "+" : ""}{format2Decimals(metrics.total24hChangePct)}%)
                </PrivacyValue>
              </span>
              <span className="text-[9px] text-muted-foreground/70 uppercase font-mono tracking-widest font-semibold">24H</span>
            </div>
          </div>
          <ClippedCircle circleClassName="bg-foreground/5" circleSize={400} />
        </Tilt>

        <Tilt rotationFactor={6} className="p-6 md:p-8 space-y-3 bg-card/20 border border-border relative group overflow-hidden flex flex-col justify-between glow-card">
          <span className="technical-label text-[9px] border-b border-dotted border-muted-foreground/30 w-fit z-10">PORTFOLIO VALUATION</span>
          <div className="space-y-1 z-10">
            <div className="text-3xl md:text-5xl font-mono font-bold tracking-tighter">
              <PrivacyValue>{formatCurrency(metrics.totalValuation)}</PrivacyValue>
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              <span className={cn(
                "px-1.5 py-0.5 border text-[9px] font-mono font-bold uppercase",
                metrics.total24hChange >= 0
                  ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5"
                  : "text-rose-500 border-rose-500/20 bg-rose-500/5"
              )}>
                <PrivacyValue>
                  {metrics.total24hChange >= 0 ? "+" : ""}{formatCurrency(metrics.total24hChange)} ({metrics.total24hChangePct >= 0 ? "+" : ""}{format2Decimals(metrics.total24hChangePct)}%)
                </PrivacyValue>
              </span>
              <span className="text-[9px] text-muted-foreground/70 uppercase font-mono tracking-widest font-semibold">24H</span>
            </div>
          </div>
          <ClippedCircle circleClassName="bg-foreground/5" circleSize={400} />
        </Tilt>

        <Tilt rotationFactor={6} className="p-6 md:p-8 space-y-3 bg-card/20 border border-border relative group overflow-hidden flex flex-col justify-between glow-card">
          <span className="technical-label text-[9px] border-b border-dotted border-muted-foreground/30 w-fit z-10">ALL-TIME RETURN</span>
          <div className="space-y-1 z-10">
            <div className="text-3xl md:text-5xl font-mono font-bold tracking-tighter flex items-baseline gap-2">
              <PrivacyValue>
                {metrics.totalPnL >= 0 ? "+" : ""}
                {formatCurrency(metrics.totalPnL)}
              </PrivacyValue>
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              <span className={cn(
                "px-1.5 py-0.5 border text-[9px] font-mono font-bold uppercase",
                metrics.total24hChange >= 0
                  ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5"
                  : "text-rose-500 border-rose-500/20 bg-rose-500/5"
              )}>
                <PrivacyValue>
                  {metrics.total24hChange >= 0 ? "+" : ""}{formatCurrency(metrics.total24hChange)} ({metrics.total24hChangePct >= 0 ? "+" : ""}{format2Decimals(metrics.total24hChangePct)}%)
                </PrivacyValue>
              </span>
              <span className="text-[9px] text-muted-foreground/70 uppercase font-mono tracking-widest font-semibold">24H</span>
            </div>
          </div>
          <ClippedCircle circleClassName="bg-foreground/5" circleSize={400} />
        </Tilt>
      </div>

      {/* 3. Portfolio & Individual Asset Valuation Graph */}
      <Tilt rotationFactor={4} className="p-6 md:p-8 bg-card/20 border border-border relative group overflow-hidden glow-card space-y-6">
        {!isPro && <ProLockOverlay />}

        {/* Header & Mode Selector Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-10 relative">
          <div className="space-y-1">
            <span className="technical-label text-[9px] border-b border-dotted border-muted-foreground/30 w-fit">
              PORTFOLIO TRAJECTORY & ASSET PERFORMANCE
            </span>
            <h2 className="text-xl font-bold uppercase tracking-tight font-mono">
              {selectedChartMode === "all"
                ? "Total Net Worth & Portfolio Valuation"
                : selectedChartMode === "stock_etf"
                ? "Stocks & ETFs Valuation"
                : selectedChartMode === "crypto"
                ? "Crypto Assets Valuation"
                : selectedChartMode === "commodity"
                ? "Commodities Valuation"
                : selectedChartMode === "cash_equivalent"
                ? "Savings & Cash Equivalents"
                : assets.find((a) => a.id === selectedChartMode)?.asset_name.toUpperCase() || "Asset Performance"}
            </h2>
          </div>

          {/* Quick Filters + Individual Asset Dropdown */}
          <div className="flex items-center gap-2 flex-wrap z-10">
            <div className="flex items-center gap-1 bg-card/40 border border-border/80 p-0.5 font-mono text-[9px]">
              <button
                onClick={() => setSelectedChartMode("all")}
                className={cn(
                  "px-2.5 py-1 uppercase font-bold transition-all cursor-pointer select-none",
                  selectedChartMode === "all" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                )}
              >
                All
              </button>
              <button
                onClick={() => setSelectedChartMode("stock_etf")}
                className={cn(
                  "px-2.5 py-1 uppercase font-bold transition-all cursor-pointer select-none",
                  selectedChartMode === "stock_etf" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Stocks
              </button>
              <button
                onClick={() => setSelectedChartMode("crypto")}
                className={cn(
                  "px-2.5 py-1 uppercase font-bold transition-all cursor-pointer select-none",
                  selectedChartMode === "crypto" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Crypto
              </button>
            </div>

            {/* Individual Asset Selector Dropdown */}
            {assets.length > 0 && (
              <select
                value={selectedChartMode}
                onChange={(e) => setSelectedChartMode(e.target.value)}
                className="h-7 px-2 border border-border bg-card text-foreground font-mono text-[9px] uppercase outline-none cursor-pointer rounded-none min-w-[140px]"
              >
                <option value="all">Total Portfolio (All Assets)</option>
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

        {/* Recharts Area Chart */}
        <div className="h-[260px] md:h-[280px] w-full z-10 relative">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsAreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="portfolioValuationGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="rgba(255,255,255,0.3)"
                fontSize={9}
                fontFamily="var(--font-geist-mono)"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="rgba(255,255,255,0.3)"
                fontSize={9}
                fontFamily="var(--font-geist-mono)"
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `${currencySymbol}${val}`}
              />
              <RechartsTooltip content={<CustomPortfolioTooltip formatCurrency={formatCurrency} />} />
              <RechartsArea
                type="monotone"
                dataKey="valuation"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#portfolioValuationGrad)"
              />
              {chartData.some((d) => d.invested > 0) && (
                <ReferenceLine
                  y={chartData[chartData.length - 1]?.invested || 0}
                  stroke="rgba(255,255,255,0.25)"
                  strokeDasharray="4 4"
                  label={{
                    value: "Cost Basis",
                    fill: "rgba(255,255,255,0.4)",
                    fontSize: 8,
                    fontFamily: "var(--font-geist-mono)",
                    position: "right",
                  }}
                />
              )}
            </RechartsAreaChart>
          </ResponsiveContainer>
        </div>
        <ClippedCircle circleClassName="bg-foreground/5" circleSize={500} />
      </Tilt>

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
                          {qty} @ <PrivacyValue>{currencySymbol}{format2Decimals(currP)}</PrivacyValue>
                        </p>
                      </div>
                    </div>

                    {/* Right: Valuation on Top + PnL/Return on Bottom matching screenshot 100% */}
                    <div className="text-right shrink-0">
                      <p className="font-mono font-bold text-sm text-foreground">
                        <PrivacyValue>{currencySymbol}{format2Decimals(valuation)}</PrivacyValue>
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
                            <span className="text-foreground font-bold"><PrivacyValue>{currencySymbol}{format2Decimals(buyP)}</PrivacyValue></span>
                          </div>
                          <div>
                            <span className="technical-label text-[9px]">MARKET PRICE:</span>{" "}
                            <span className="text-foreground font-bold"><PrivacyValue>{currencySymbol}{format2Decimals(currP)}</PrivacyValue></span>
                          </div>
                          <div>
                            <span className="technical-label text-[9px]">COST BASIS:</span>{" "}
                            <span className="text-foreground font-bold"><PrivacyValue>{currencySymbol}{format2Decimals(invested)}</PrivacyValue></span>
                          </div>
                          <div>
                            <span className="technical-label text-[9px]">UNREALIZED RETURN:</span>{" "}
                            <span className={cn("font-bold", pnl >= 0 ? "text-emerald-500" : "text-rose-500")}>
                              <PrivacyValue>{pnl >= 0 ? "+" : ""}{currencySymbol}{format2Decimals(pnl)}</PrivacyValue>
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

      {/* Floating White Plus Button (+), 100% rock solid static */}
      <button
        type="button"
        onClick={handleOpenAddModal}
        className="fixed bottom-20 right-4 z-50 h-12 w-12 rounded-xl bg-white text-black font-extrabold shadow-2xl flex items-center justify-center hover:bg-gray-100 border border-white/20 cursor-pointer select-none"
      >
        <Plus className="h-6 w-6 stroke-[3]" />
      </button>

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
                {/* Popular Asset Cards Selection List */}
                {!editingAsset && (
                  <div className="space-y-3 border-b border-border/40 pb-4">
                    <div className="flex items-center justify-between">
                      <span className="technical-label text-[9px]">SELECT ASSET (POPULAR PICKS)</span>
                      <button
                        type="button"
                        onClick={handleSelectCustomMode}
                        className={cn(
                          "text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 border transition-all",
                          isCustomMode
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30 font-bold"
                            : "bg-secondary/20 text-muted-foreground hover:text-foreground border-border"
                        )}
                      >
                        + Custom Unlisted Asset
                      </button>
                    </div>

                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/40" />
                      <Input
                        placeholder="SEARCH POPULAR COINS & STOCKS..."
                        value={presetSearch}
                        onChange={(e) => setPresetSearch(e.target.value)}
                        className="pl-8 text-[11px] h-8 rounded-none border-border/60 bg-secondary/10 uppercase"
                      />
                    </div>

                    {/* Popular Asset Cards - Stacked List with Skeleton Support */}
                    <div className="flex flex-col gap-1.5 max-h-[36vh] sm:max-h-[38vh] overflow-y-auto scrollbar-thin p-0.5">
                      {filteredPresets.map((preset) => {
                        const isSelected = !isCustomMode && selectedPresetId === preset.id;
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
                                €{format2Decimals(preset.estPrice)}
                              </p>
                              {isSelected && (
                                <span className="text-[8px] font-mono text-emerald-500 font-bold uppercase">
                                  ✓ SELECTED
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
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
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-muted-foreground uppercase font-semibold">Quick Quantity Adjust</span>
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
                  disabled={formSubmitting}
                  className="w-full rounded-none h-11 font-mono text-[10px] uppercase tracking-widest font-bold bg-foreground text-background hover:bg-foreground/80 cursor-pointer"
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
  );
}
