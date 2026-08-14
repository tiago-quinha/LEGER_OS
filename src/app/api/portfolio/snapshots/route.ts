import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerCookieClient } from "@/lib/supabase-server";
import { getAdminClient } from "@/lib/supabase-admin";

async function getAuthUser(req: Request) {
  let user: any = null;
  let supabaseClient: any = null;

  const authHeader = req.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    supabaseClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    const { data } = await supabaseClient.auth.getUser(token);
    user = data?.user;
  }

  if (!user) {
    supabaseClient = await createServerCookieClient();
    const { data } = await supabaseClient.auth.getUser();
    user = data?.user;
  }

  return { user, supabaseClient };
}

// GET: Fetch historical daily snapshots
export async function GET(req: Request) {
  try {
    const { user } = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminDb = getAdminClient();
    const { data: snapshots, error } = await adminDb
      .from("portfolio_snapshots")
      .select("*")
      .eq("user_id", user.id)
      .order("snapshot_date", { ascending: true })
      .limit(90);

    if (error) {
      console.error("Failed to fetch portfolio snapshots:", error);
      return NextResponse.json({ error: "Database query failed" }, { status: 500 });
    }

    return NextResponse.json({ snapshots: snapshots || [] });
  } catch (error: any) {
    console.error("GET /api/portfolio/snapshots error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// POST: Trigger a new daily snapshot recalculation & persistence
export async function POST(req: Request) {
  try {
    const { user } = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminDb = getAdminClient();

    // 1. Fetch liquid cash balance snapshot + transactions
    const { data: balanceData } = await adminDb
      .from("account_balance")
      .select("amount, date")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    let liquidCash = 0;
    if (balanceData?.amount) {
      const baseSnap = parseFloat(balanceData.amount) || 0;
      const snapDateStr = typeof balanceData.date === "string" 
        ? balanceData.date.split("T")[0] 
        : new Date(balanceData.date).toISOString().split("T")[0];

      const { data: txs } = await adminDb
        .from("tracker_expense")
        .select("amount")
        .eq("user_id", user.id)
        .gte("date", `${snapDateStr}T00:00:00.000Z`);

      const netTx = (txs || []).reduce((sum: number, tx: any) => sum + (parseFloat(tx.amount) || 0), 0);
      liquidCash = parseFloat((baseSnap + netTx).toFixed(2));
    }

    // 2. Fetch portfolio assets
    const { data: assets } = await adminDb
      .from("portfolio_assets")
      .select("*")
      .eq("user_id", user.id);

    let investedCapital = 0;
    let portfolioValuation = 0;
    const breakdown: Record<string, { valuation: number; count: number }> = {
      stock_etf: { valuation: 0, count: 0 },
      crypto: { valuation: 0, count: 0 },
      cash_equivalent: { valuation: 0, count: 0 },
      commodity: { valuation: 0, count: 0 },
      other: { valuation: 0, count: 0 },
    };

    if (assets && assets.length > 0) {
      assets.forEach((asset: any) => {
        const qty = parseFloat(asset.quantity || 0);
        const buyP = parseFloat(asset.buy_price || 0);
        const currP = parseFloat(asset.current_price || buyP);

        const assetInvested = qty * buyP;
        const assetValuation = qty * currP;

        investedCapital += assetInvested;
        portfolioValuation += assetValuation;

        const type = asset.asset_type || "other";
        if (!breakdown[type]) breakdown[type] = { valuation: 0, count: 0 };
        breakdown[type].valuation += assetValuation;
        breakdown[type].count += 1;
      });
    }

    const totalNetWorth = liquidCash + portfolioValuation;
    const totalGainLoss = portfolioValuation - investedCapital;
    const todayStr = new Date().toISOString().split("T")[0];

    const { data: snapshot, error: snapshotError } = await adminDb
      .from("portfolio_snapshots")
      .upsert(
        {
          user_id: user.id,
          snapshot_date: todayStr,
          total_net_worth: parseFloat(totalNetWorth.toFixed(2)),
          liquid_cash: parseFloat(liquidCash.toFixed(2)),
          invested_capital: parseFloat(investedCapital.toFixed(2)),
          total_gain_loss: parseFloat(totalGainLoss.toFixed(2)),
          asset_breakdown: breakdown,
          created_at: new Date().toISOString(),
        },
        { onConflict: "user_id,snapshot_date" }
      )
      .select("*")
      .single();

    if (snapshotError) {
      console.error("Failed to persist snapshot:", snapshotError);
      return NextResponse.json({ error: "Failed to persist snapshot" }, { status: 500 });
    }

    return NextResponse.json({ snapshot });
  } catch (error: any) {
    console.error("POST /api/portfolio/snapshots error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
