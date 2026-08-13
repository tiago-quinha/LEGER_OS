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

// GET: List all assets for authenticated user
export async function GET(req: Request) {
  try {
    const { user } = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminDb = getAdminClient();
    const [{ data: assets, error }, balanceRes] = await Promise.all([
      adminDb
        .from("portfolio_assets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      adminDb
        .from("account_balance")
        .select("amount, date")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (error) {
      console.error("Failed to fetch portfolio assets:", error);
      return NextResponse.json({ error: "Database fetch failed" }, { status: 500 });
    }

    let balanceData = balanceRes?.data;
    let liquidBalance = 0;
    if (!balanceData) {
      const { data: fallbackBalance } = await adminDb
        .from("account_balance")
        .select("amount, date")
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();
      balanceData = fallbackBalance;
    }

    if (balanceData?.amount) {
      const baseSnap = parseFloat(balanceData.amount) || 0;
      const snapDate = balanceData.date;

      const { data: txs } = await adminDb
        .from("tracker_expense")
        .select("amount")
        .eq("user_id", user.id)
        .gte("date", snapDate);

      const netTx = (txs || []).reduce((sum: number, tx: any) => sum + (parseFloat(tx.amount) || 0), 0);
      liquidBalance = baseSnap + netTx;
    }

    return NextResponse.json({ assets: assets || [], liquidBalance });
  } catch (error: any) {
    console.error("GET /api/portfolio/assets error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// POST: Add a new asset
export async function POST(req: Request) {
  try {
    const { user } = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { asset_name, symbol, asset_type, quantity, buy_price, current_price, currency, institution, notes } = body;

    if (!asset_name || typeof asset_name !== "string" || !asset_name.trim()) {
      return NextResponse.json({ error: "Asset name is required" }, { status: 400 });
    }

    const validTypes = ["stock_etf", "crypto", "cash_equivalent", "commodity", "other"];
    if (!asset_type || !validTypes.includes(asset_type)) {
      return NextResponse.json({ error: "Invalid asset type" }, { status: 400 });
    }

    const parsedQty = parseFloat(quantity);
    const parsedBuyPrice = parseFloat(buy_price);
    const parsedCurrentPrice = current_price ? parseFloat(current_price) : parsedBuyPrice;

    if (isNaN(parsedQty) || parsedQty <= 0) {
      return NextResponse.json({ error: "Quantity must be greater than zero" }, { status: 400 });
    }
    if (isNaN(parsedBuyPrice) || parsedBuyPrice < 0) {
      return NextResponse.json({ error: "Purchase price must be a non-negative number" }, { status: 400 });
    }

    const adminDb = getAdminClient();

    // Check user tier & quota (Core Free tier: max 15 assets)
    const { data: profile } = await adminDb
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();

    const isPro = profile?.subscription_tier === "PRO";

    if (!isPro) {
      const { count } = await adminDb
        .from("portfolio_assets")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (count !== null && count >= 15) {
        return NextResponse.json(
          { error: "Core Free tier is limited to 15 portfolio assets. Upgrade to LEGER_OS PRO for unlimited asset tracking." },
          { status: 403 }
        );
      }
    }

    const { data: newAsset, error: insertError } = await adminDb
      .from("portfolio_assets")
      .insert({
        user_id: user.id,
        asset_name: asset_name.trim(),
        symbol: symbol ? symbol.trim().toUpperCase() : null,
        asset_type,
        quantity: parsedQty,
        buy_price: parsedBuyPrice,
        current_price: parsedCurrentPrice,
        currency: currency || "EUR",
        institution: institution ? institution.trim() : "",
        notes: notes ? notes.trim() : "",
        metadata: {}
      })
      .select("*")
      .single();

    if (insertError) {
      console.error("Failed to insert asset:", insertError);
      return NextResponse.json({ error: "Failed to add portfolio asset" }, { status: 500 });
    }

    return NextResponse.json({ asset: newAsset });
  } catch (error: any) {
    console.error("POST /api/portfolio/assets error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// PATCH: Update an existing asset
export async function PATCH(req: Request) {
  try {
    const { user } = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, asset_name, symbol, asset_type, quantity, buy_price, current_price, currency, institution, notes } = body;

    if (!id) {
      return NextResponse.json({ error: "Asset ID is required" }, { status: 400 });
    }

    const adminDb = getAdminClient();

    // Verify ownership
    const { data: existing } = await adminDb
      .from("portfolio_assets")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Asset not found or unauthorized" }, { status: 404 });
    }

    const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (asset_name !== undefined) updatePayload.asset_name = asset_name.trim();
    if (symbol !== undefined) updatePayload.symbol = symbol ? symbol.trim().toUpperCase() : null;
    if (asset_type !== undefined) updatePayload.asset_type = asset_type;
    if (quantity !== undefined) updatePayload.quantity = parseFloat(quantity);
    if (buy_price !== undefined) updatePayload.buy_price = parseFloat(buy_price);
    if (current_price !== undefined) updatePayload.current_price = parseFloat(current_price);
    if (currency !== undefined) updatePayload.currency = currency;
    if (institution !== undefined) updatePayload.institution = institution.trim();
    if (notes !== undefined) updatePayload.notes = notes.trim();

    const { data: updated, error: updateError } = await adminDb
      .from("portfolio_assets")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      console.error("Failed to update asset:", updateError);
      return NextResponse.json({ error: "Failed to update portfolio asset" }, { status: 500 });
    }

    return NextResponse.json({ asset: updated });
  } catch (error: any) {
    console.error("PATCH /api/portfolio/assets error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// DELETE: Remove an asset
export async function DELETE(req: Request) {
  try {
    const { user } = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Asset ID parameter required" }, { status: 400 });
    }

    const adminDb = getAdminClient();
    const { error: deleteError } = await adminDb
      .from("portfolio_assets")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Failed to delete asset:", deleteError);
      return NextResponse.json({ error: "Failed to delete asset" }, { status: 500 });
    }

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error("DELETE /api/portfolio/assets error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
