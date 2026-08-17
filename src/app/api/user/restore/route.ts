import { getAdminClient } from "@/lib/supabase-admin"
import { createClient as createServerClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabaseServer = await createServerClient()
    const { data: { user } } = await supabaseServer.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await request.json()

    if (!payload || (!payload.vault && !payload.expenses)) {
      return NextResponse.json({ error: "Invalid backup format. Missing 'vault' object." }, { status: 400 })
    }

    const vault = payload.vault || payload
    const supabaseAdmin = getAdminClient()

    let restoredStats = {
      categories: 0,
      budgets: 0,
      expenses: 0,
      incomes: 0,
      balances: 0,
      rules: 0,
      portfolioAssets: 0
    }

    // 1. Categories Restore & Mapping
    const categoryIdMap = new Map<string, number>()
    const { data: existingCats } = await supabaseAdmin.from("categories").select("*").eq("user_id", user.id)
    const existingCatByName = new Map<string, number>((existingCats || []).map((c: any) => [c.name.toLowerCase(), Number(c.id)]))

    if (vault.categories && Array.isArray(vault.categories)) {
      for (const cat of vault.categories) {
        if (!cat.name) continue
        const normName = cat.name.trim().toLowerCase()
        if (existingCatByName.has(normName)) {
          categoryIdMap.set(cat.id?.toString(), existingCatByName.get(normName)!)
        } else {
          const { data: newCat, error: catErr } = await supabaseAdmin.from("categories").insert({
            user_id: user.id,
            name: cat.name.trim(),
            color: cat.color || "#10b981",
            icon: cat.icon || "tag"
          }).select().single()

          if (!catErr && newCat) {
            categoryIdMap.set(cat.id?.toString(), newCat.id)
            existingCatByName.set(normName, newCat.id)
            restoredStats.categories++
          }
        }
      }
    }

    // 2. Budgets Restore
    if (vault.budgets && Array.isArray(vault.budgets)) {
      for (const b of vault.budgets) {
        const mappedCatId = categoryIdMap.get(b.category_id?.toString()) || b.category_id
        if (!mappedCatId) continue
        
        // Upsert budget
        const { error: bErr } = await supabaseAdmin.from("budgets").upsert({
          user_id: user.id,
          category_id: mappedCatId,
          amount: parseFloat(b.amount || 0)
        }, { onConflict: "user_id, category_id" })

        if (!bErr) restoredStats.budgets++
      }
    }

    // 3. Transactions Restore (with deduplication)
    if (vault.expenses && Array.isArray(vault.expenses)) {
      // Get existing expenses to deduplicate
      const { data: existingExpenses } = await supabaseAdmin
        .from("tracker_expense")
        .select("date, merchant, amount")
        .eq("user_id", user.id)

      const existingFingerprints = new Set(
        (existingExpenses || []).map((e: any) => `${e.date}_${(e.merchant || "").toLowerCase()}_${parseFloat(e.amount).toFixed(2)}`)
      )

      const batchToInsert: any[] = []
      for (const e of vault.expenses) {
        if (!e.date || !e.amount) continue
        const amtStr = parseFloat(e.amount).toFixed(2)
        const fp = `${e.date}_${(e.merchant || "").toLowerCase()}_${amtStr}`
        
        if (!existingFingerprints.has(fp)) {
          existingFingerprints.add(fp)
          const mappedCatId = e.category_id ? (categoryIdMap.get(e.category_id.toString()) ?? null) : null
          batchToInsert.push({
            user_id: user.id,
            date: e.date,
            merchant: e.merchant || "Unknown",
            amount: parseFloat(e.amount),
            category_id: mappedCatId,
            raw_text: e.raw_text || null
          })
        }
      }

      if (batchToInsert.length > 0) {
        // Chunk into groups of 100 for safety
        for (let i = 0; i < batchToInsert.length; i += 100) {
          const chunk = batchToInsert.slice(i, i + 100)
          const { error: insErr } = await supabaseAdmin.from("tracker_expense").insert(chunk)
          if (!insErr) {
            restoredStats.expenses += chunk.length
          } else {
            console.error("Batch insert error during restore:", insErr)
          }
        }
      }
    }

    // 4. Incomes Restore
    if (vault.incomes && Array.isArray(vault.incomes)) {
      for (const inc of vault.incomes) {
        if (!inc.date || !inc.amount) continue
        const { error: incErr } = await supabaseAdmin.from("income").insert({
          user_id: user.id,
          date: inc.date,
          amount: parseFloat(inc.amount),
          source: inc.source || "Deloitte"
        })
        if (!incErr) restoredStats.incomes++
      }
    }

    // 5. Account Balance Snapshots
    if (vault.balances && Array.isArray(vault.balances)) {
      for (const bal of vault.balances) {
        if (!bal.date || bal.balance === undefined) continue
        const { error: balErr } = await supabaseAdmin.from("account_balance").insert({
          user_id: user.id,
          date: bal.date,
          balance: parseFloat(bal.balance)
        })
        if (!balErr) restoredStats.balances++
      }
    }

    // 6. Portfolio Assets Restore
    if (vault.portfolio_assets && Array.isArray(vault.portfolio_assets)) {
      for (const asset of vault.portfolio_assets) {
        if (!asset.symbol || !asset.name) continue
        const { error: assetErr } = await supabaseAdmin.from("portfolio_assets").insert({
          user_id: user.id,
          symbol: asset.symbol.toUpperCase(),
          name: asset.name,
          asset_class: asset.asset_class || "stocks",
          quantity: parseFloat(asset.quantity || 0),
          buy_price: parseFloat(asset.buy_price || 0),
          currency: asset.currency || "EUR"
        })
        if (!assetErr) restoredStats.portfolioAssets++
      }
    }

    // 7. Profile Overrides & Journal Merge
    if (vault.profile) {
      const updates: any = {}
      if (vault.profile.ai_journal && Array.isArray(vault.profile.ai_journal)) {
        updates.ai_journal = vault.profile.ai_journal
      }
      if (vault.profile.projection_overrides && Array.isArray(vault.profile.projection_overrides)) {
        updates.projection_overrides = vault.profile.projection_overrides
      }
      if (Object.keys(updates).length > 0) {
        await supabaseAdmin.from("profiles").update(updates).eq("id", user.id)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Vault restore complete: ${restoredStats.expenses} transactions, ${restoredStats.categories} categories, ${restoredStats.portfolioAssets} portfolio assets restored.`,
      stats: restoredStats
    })
  } catch (err: any) {
    console.error("Vault restore error:", err)
    return NextResponse.json({ error: err.message || "Failed to restore backup" }, { status: 500 })
  }
}
