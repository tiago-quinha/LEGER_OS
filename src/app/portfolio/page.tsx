import { Metadata } from "next";
import { createClient } from "@/lib/supabase-server";
import { PortfolioView } from "@/components/PortfolioView";
import { getCycles } from "@/lib/cycles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Portfolio & Net Worth // LEGER_OS",
  description: "Track multi-asset holdings, stocks, ETFs, crypto, cash balances, and total net worth analytics by paycheck cycle.",
};

interface PageProps {
  searchParams: Promise<{ cycleId?: string }>;
}

export default async function PortfolioPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [cycles, assetsRes, balancesRes, txsRes] = await Promise.all([
    getCycles(supabase, user.id),
    supabase
      .from("portfolio_assets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("account_balance")
      .select("amount, date")
      .eq("user_id", user.id)
      .order("date", { ascending: false }),
    supabase
      .from("tracker_expense")
      .select("amount, date")
      .eq("user_id", user.id)
      .order("date", { ascending: true }),
  ]);

  if (cycles.length === 0) {
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    cycles.push({
      id: "default-0",
      label: `Cycle: 01 ${now.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" })} - Present`,
      startDate: startOfMonth,
      endDate: null,
      paycheckAmount: 0,
    });
  }

  const balances = balancesRes.data || [];
  const allTxs = txsRes.data || [];
  let liveLiquidBalance = 0;

  if (balances.length > 0) {
    const latestBalanceSnap = balances[0];
    const snapDate = new Date(latestBalanceSnap.date);
    const snapAmount = parseFloat(latestBalanceSnap.amount) || 0;

    const txsSinceSnap = allTxs
      .filter((tx) => new Date(tx.date) >= snapDate)
      .reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0);

    liveLiquidBalance = parseFloat((snapAmount + txsSinceSnap).toFixed(2));
  }

  const selectedCycle = params.cycleId
    ? cycles.find((c) => c.id === params.cycleId) || cycles[0]
    : cycles[0];

  const startDateStr = selectedCycle.startDate;
  const endDateStr = selectedCycle.endDate || "9999-12-31";

  // Cycle expenses
  const selectedCycleExpenses = allTxs.filter((tx) => tx.date >= startDateStr && tx.date < endDateStr);
  const previousTx = allTxs.filter((tx) => tx.date < startDateStr);

  // Helper to calculate starting balance for the cycle
  const calculateStartBalance = (cycleStartDateStr: string, allBalances: any[], txs: any[]) => {
    const cycleStartDate = new Date(cycleStartDateStr);
    const snapshot = allBalances
      .filter((b) => new Date(b.date) <= cycleStartDate)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    if (!snapshot) return 0;

    const snapDate = new Date(snapshot.date);
    const snapAmount = parseFloat(snapshot.amount);

    const transitionTxSum = txs
      .filter((tx) => {
        const txDate = new Date(tx.date);
        return txDate >= snapDate && txDate < cycleStartDate;
      })
      .reduce((sum, tx) => sum + (parseFloat(tx.amount) || 0), 0);

    return snapAmount + transitionTxSum;
  };

  const injectedStartBalance = calculateStartBalance(selectedCycle.startDate, balances, previousTx);

  return (
    <PortfolioView
      cycles={cycles}
      currentCycleId={selectedCycle?.id}
      initialAssets={assetsRes.data || []}
      initialLiquidBalance={liveLiquidBalance}
      expenses={selectedCycleExpenses}
      injectedStartBalance={injectedStartBalance}
    />
  );
}
