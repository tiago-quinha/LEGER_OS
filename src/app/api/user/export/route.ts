import { getAdminClient } from "@/lib/supabase-admin"
import { createClient as createServerClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const supabaseServer = await createServerClient()
    const { data: { user } } = await supabaseServer.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get("format") || "json"
    const type = searchParams.get("type") || "vault"

    const supabaseAdmin = getAdminClient()

    // Fetch all user datasets concurrently
    const [
      profileRes,
      categoriesRes,
      budgetsRes,
      expensesRes,
      incomeRes,
      balanceRes,
      rulesRes,
      portfolioRes,
      snapshotsRes
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("id", user.id).single(),
      supabaseAdmin.from("categories").select("*").eq("user_id", user.id),
      supabaseAdmin.from("budgets").select("*").eq("user_id", user.id),
      supabaseAdmin.from("tracker_expense").select("*").eq("user_id", user.id).order("date", { ascending: false }),
      supabaseAdmin.from("income").select("*").eq("user_id", user.id).order("date", { ascending: false }),
      supabaseAdmin.from("account_balance").select("*").eq("user_id", user.id).order("date", { ascending: false }),
      supabaseAdmin.from("merchant_rules").select("*").eq("user_id", user.id),
      supabaseAdmin.from("portfolio_assets").select("*").eq("user_id", user.id),
      supabaseAdmin.from("portfolio_snapshots").select("*").eq("user_id", user.id).order("snapshot_date", { ascending: false })
    ])

    const categories = categoriesRes.data || []
    const catMap = new Map<string, string>(categories.map((c: any) => [c.id?.toString(), String(c.name || "")]))

    // 1. CSV EXPORT FOR TRANSACTIONS
    if (format === "csv" && type === "transactions") {
      const expenses = expensesRes.data || []
      const headers = ["ID", "Date", "Merchant", "Amount", "Category", "Category_ID", "Raw_Text"]
      const rows = expenses.map((e: any) => [
        `"${e.id || ""}"`,
        `"${e.date || ""}"`,
        `"${String(e.merchant || "").replace(/"/g, '""')}"`,
        parseFloat(e.amount || 0).toFixed(2),
        `"${String(catMap.get(e.category_id?.toString()) || "Uncategorized").replace(/"/g, '""')}"`,
        `"${e.category_id || ""}"`,
        `"${String(e.raw_text || "").replace(/"/g, '""')}"`
      ])

      const csvContent = [headers.join(","), ...rows.map((r: string[]) => r.join(","))].join("\r\n")
      const filename = `leger_transactions_${new Date().toISOString().split("T")[0]}.csv`

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`
        }
      })
    }

    // 2. CSV EXPORT FOR PORTFOLIO
    if (format === "csv" && type === "portfolio") {
      const assets = portfolioRes.data || []
      const headers = ["ID", "Symbol", "Name", "Asset_Class", "Quantity", "Average_Buy_Price", "Currency"]
      const rows = assets.map((a: any) => [
        `"${a.id || ""}"`,
        `"${String(a.symbol || "").replace(/"/g, '""')}"`,
        `"${String(a.name || "").replace(/"/g, '""')}"`,
        `"${String(a.asset_class || "").replace(/"/g, '""')}"`,
        parseFloat(a.quantity || 0).toString(),
        parseFloat(a.buy_price || 0).toFixed(2),
        `"${String(a.currency || "EUR").replace(/"/g, '""')}"`
      ])

      const csvContent = [headers.join(","), ...rows.map((r: string[]) => r.join(","))].join("\r\n")
      const filename = `leger_portfolio_${new Date().toISOString().split("T")[0]}.csv`

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`
        }
      })
    }

    // 3. FULL MAIN VAULT JSON BACKUP
    const fullVault = {
      version: "1.0",
      mainframe: "LEGER_OS",
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email
      },
      vault: {
        profile: profileRes.data || null,
        categories: categories,
        budgets: budgetsRes.data || [],
        expenses: expensesRes.data || [],
        incomes: incomeRes.data || [],
        balances: balanceRes.data || [],
        merchant_rules: rulesRes.data || [],
        portfolio_assets: portfolioRes.data || [],
        portfolio_snapshots: snapshotsRes.data || []
      }
    }

    const jsonString = JSON.stringify(fullVault, null, 2)
    const filename = `leger_os_vault_backup_${new Date().toISOString().split("T")[0]}.json`

    return new NextResponse(jsonString, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    })
  } catch (err: any) {
    console.error("Data export error:", err)
    return NextResponse.json({ error: err.message || "Failed to export data" }, { status: 500 })
  }
}
