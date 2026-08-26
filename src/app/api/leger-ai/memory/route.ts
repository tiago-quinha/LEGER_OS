import { NextResponse } from "next/server";
import { generateAIContent } from "@/lib/ai-bridge";
import { verifyAndConsumeQuota } from "@/lib/server-auth";
import { getAdminClient } from "@/lib/supabase-admin";
import { calculateServerTelemetry } from "@/lib/server-telemetry";
import { createClient } from "@/lib/supabase-server";
import { normalizeJournal, buildUpdatedJournal, MemoryItem } from "@/lib/journal-utils";

// GET: Fetch all memories (structured and converted legacy string records)
export async function GET(request: Request) {
  try {
    const supabaseServer = await createClient();
    const { data: { user } } = await supabaseServer.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = getAdminClient();
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("ai_journal")
      .eq("id", user.id)
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
    }

    const normalizedMemories = normalizeJournal(profile?.ai_journal);

    return NextResponse.json({ memories: normalizedMemories });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Mainframe error" }, { status: 500 });
  }
}

// POST: Add new memory by parsing natural language statement with Gemini
export async function POST(request: Request) {
  try {
    const { allowed, reason, userId } = await verifyAndConsumeQuota(request);
    if (!allowed || !userId) {
      return NextResponse.json({ error: reason || "Unauthorized" }, { status: 403 });
    }

    const { text } = await request.json();
    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Text prompt is required" }, { status: 400 });
    }

    const supabaseAdmin = getAdminClient();
    const serverDataRes = await calculateServerTelemetry(supabaseAdmin, userId).catch(() => null);
    const daysElapsed = serverDataRes?.daysElapsed || 1;
    const totalDaysInCycle = serverDataRes?.totalDaysInCycle || 30;
    const remainingDaysInCycle = Math.max(1, totalDaysInCycle - daysElapsed);

    const userCategories = serverDataRes?.categoriesDetailed || [];
    const categoriesListStr = userCategories.map((c: any) => `- "${c.name}" (ID: ${c.id})`).join("\n");

    const prompt = `
      You are the memory parsing node of LEGER_OS, a personal finance terminal.
      I will provide a natural language statement about a user's current situation, routine changes, goals, or lifestyle updates.
      Your task is to parse this into a structured JSON memory object.

      Input: "${text}"

      User's Active Financial Categories:
      ${categoriesListStr.length > 0 ? categoriesListStr : "- No custom categories defined"}

      Determine:
      1. "content": A clean, concise summary of the fact (e.g. "Working hybrid - 30% lower gas spend", "Low grade fever reported", "Saving for Tokyo trip").
      2. "category": If the input relates directly to an expense category in the User's Active Financial Categories above, set "category" to that category name (e.g., "${userCategories[0]?.name || "Transportation"}"). If it is a general health/goal fact without a direct budget category match, set "category" to one of: "goal" | "health" | "financial" | "other".
      3. "categoryId": The numerical ID of the matched User Category if applicable, or null if it's a general context memory.
      4. "durationDays": A reasonable number of days this fact will remain active/relevant. 
         CRITICAL PAYCHECK CYCLE DURATION RULE:
         Current Cycle Status: Day ${daysElapsed} of ${totalDaysInCycle} Total Days (${remainingDaysInCycle} Days Remaining in current cycle).
         If the user input mentions "this cycle", "for this cycle", "until next paycheck", "the rest of the cycle", or "this month's cycle", set "durationDays" to EXACTLY ${remainingDaysInCycle}.
         For explicit timeframes:
         - "on vacation for a week" -> 7
         - "fever/flu today" -> 5
         - "rehab for my knee for a month" -> 30
         - Permanent updates (e.g., "got a dog", "new job", "started hybrid work") -> null (representing infinite/long-term duration)
      5. "projectionOverride": CRITICAL — If the input implies a QUANTIFIABLE spending change for a specific category, you MUST extract it as a projection override object. This is how the memory actually affects the financial projection engine. Rules:
         - If the user says "reducing [category] by X%", "X% less [category]", "cutting [category] in half", etc.:
           Set "projectionOverride" to { "multiplier": <decimal>, "reason": "<short reason>" }
           Examples: "30% less gas" -> multiplier: 0.70. "Cut groceries in half" -> multiplier: 0.50. "Double entertainment spend" -> multiplier: 2.0. "No more uber" -> multiplier: 0.0
         - If the user says "saving €X on [category]" or "spending €X more on [category]" (a fixed euro/dollar amount change, NOT a percentage):
           Set "projectionOverride" to { "fixedDelta": <number>, "reason": "<short reason>" }
           Examples: "Saving €50 on food" -> fixedDelta: -50. "Extra €100 on rent" -> fixedDelta: 100
         - If the input has NO quantifiable spending change (e.g. "got a cold", "thinking about saving", "started gym"), set "projectionOverride" to null.
         - The override MUST reference the same categoryId as field 3. If categoryId is null (no matched category), set projectionOverride to null.

      Format your response as a strict JSON object:
      {
        "content": "string",
        "category": "string",
        "categoryId": number | null,
        "durationDays": number | null,
        "projectionOverride": { "multiplier": number, "reason": "string" } | { "fixedDelta": number, "reason": "string" } | null
      }
    `;

    const parsedText = await generateAIContent(prompt, {
      jsonMode: true,
      modelType: "flash",
      provider: request.headers.get("x-ai-provider") || undefined,
      customKey: request.headers.get("x-custom-api-key") || undefined
    });

    const parsed = JSON.parse(parsedText);
    const content = parsed.content?.trim();

    if (!content) {
      return NextResponse.json({ error: "Failed to parse text into memory" }, { status: 400 });
    }

    const { data: profile, error: getErr } = await supabaseAdmin
      .from("profiles")
      .select("ai_journal, projection_overrides")
      .eq("id", userId)
      .single();

    if (getErr) {
      return NextResponse.json({ error: "Failed to fetch profile journal" }, { status: 500 });
    }

    const rawJournal = profile?.ai_journal;
    const existingMemories = normalizeJournal(rawJournal);
    
    const memoryId = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create new structured memory object
    const newMemory: MemoryItem = {
      id: memoryId,
      content: content,
      category: parsed.category || "other",
      categoryId: parsed.categoryId || null,
      createdAt: new Date().toISOString(),
      expiresAt: parsed.durationDays ? new Date(Date.now() + parsed.durationDays * 24 * 60 * 60 * 1000).toISOString() : null,
      status: "active"
    };

    const newMemoriesList = [newMemory, ...existingMemories];
    const updatedJournal = buildUpdatedJournal(rawJournal, newMemoriesList);
    
    // Build the update payload — always update ai_journal
    const updatePayload: Record<string, any> = { ai_journal: updatedJournal };

    // If the AI extracted a projection override, merge it into projection_overrides
    let appliedOverride: any = null;
    if (parsed.projectionOverride && parsed.categoryId) {
      const existingOverrides: any[] = profile?.projection_overrides || [];
      const catIdStr = String(parsed.categoryId);
      const matchedCat = userCategories.find((c: any) => String(c.id) === catIdStr);

      const newOverride: Record<string, any> = {
        id: `ov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        memoryId: memoryId,
        categoryId: catIdStr,
        categoryName: matchedCat?.name || parsed.category,
        reason: parsed.projectionOverride.reason || content,
        expiresAt: newMemory.expiresAt,
      };

      if (parsed.projectionOverride.multiplier !== undefined) {
        newOverride.multiplier = parsed.projectionOverride.multiplier;
      } else {
        newOverride.multiplier = 1.0;
      }

      if (parsed.projectionOverride.fixedDelta !== undefined) {
        newOverride.fixedDelta = parsed.projectionOverride.fixedDelta;
      }

      // Replace any existing override for this category (from a previous memory), then append
      const updatedOverrides = existingOverrides.filter(
        (o: any) => !(o.categoryId && String(o.categoryId) === catIdStr && o.memoryId)
      );
      updatedOverrides.push(newOverride);
      updatePayload.projection_overrides = updatedOverrides;
      appliedOverride = newOverride;
    }

    const { error: updateErr } = await supabaseAdmin
      .from("profiles")
      .update(updatePayload)
      .eq("id", userId);

    if (updateErr) {
      return NextResponse.json({ error: "Failed to update profile journal" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      memory: newMemory,
      memories: newMemoriesList,
      override: appliedOverride
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Mainframe error" }, { status: 500 });
  }
}

// DELETE: Remove a memory by its unique ID
export async function DELETE(request: Request) {
  try {
    const supabaseServer = await createClient();
    const { data: { user } } = await supabaseServer.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Memory ID is required" }, { status: 400 });
    }

    const supabaseAdmin = getAdminClient();
    const { data: profile, error: getErr } = await supabaseAdmin
      .from("profiles")
      .select("ai_journal, projection_overrides")
      .eq("id", user.id)
      .single();

    if (getErr) {
      return NextResponse.json({ error: "Failed to fetch profile journal" }, { status: 500 });
    }

    const rawJournal = profile?.ai_journal;
    const existingMemories = normalizeJournal(rawJournal);
    const updatedMemories = existingMemories.filter((item: MemoryItem) => item.id !== id);
    const updatedJournal = buildUpdatedJournal(rawJournal, updatedMemories);

    const existingOverrides: any[] = profile?.projection_overrides || [];
    const updatedOverrides = existingOverrides.filter((o: any) => o.memoryId !== id);

    const { error: updateErr } = await supabaseAdmin
      .from("profiles")
      .update({ 
        ai_journal: updatedJournal,
        projection_overrides: updatedOverrides
      })
      .eq("id", user.id);

    if (updateErr) {
      return NextResponse.json({ error: "Failed to update profile journal" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      memories: updatedMemories 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Mainframe error" }, { status: 500 });
  }
}

// PUT: Update an existing memory (content, category, or expiration date)
export async function PUT(request: Request) {
  try {
    const supabaseServer = await createClient();
    const { data: { user } } = await supabaseServer.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, content, category, expiresAt } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Memory ID is required" }, { status: 400 });
    }

    const supabaseAdmin = getAdminClient();
    const { data: profile, error: getErr } = await supabaseAdmin
      .from("profiles")
      .select("ai_journal, projection_overrides")
      .eq("id", user.id)
      .single();

    if (getErr) {
      return NextResponse.json({ error: "Failed to fetch profile journal" }, { status: 500 });
    }

    const rawJournal = profile?.ai_journal;
    const existingMemories = normalizeJournal(rawJournal);

    let finalExpiresAt: string | null = null;
    const updatedMemories = existingMemories.map((item: MemoryItem) => {
      if (item.id === id) {
        const newExpiresAt = expiresAt !== undefined ? expiresAt : item.expiresAt;
        finalExpiresAt = newExpiresAt;
        let newStatus = "active";
        if (newExpiresAt && new Date(newExpiresAt) < new Date()) {
          newStatus = "expired";
        }
        return {
          ...item,
          content: content !== undefined ? content : item.content,
          category: category !== undefined ? category : item.category,
          expiresAt: newExpiresAt,
          status: newStatus
        };
      }
      return item;
    });

    const updatedJournal = buildUpdatedJournal(rawJournal, updatedMemories);

    const existingOverrides: any[] = profile?.projection_overrides || [];
    const updatedOverrides = existingOverrides.map((o: any) => {
      if (o.memoryId === id) {
        return { ...o, expiresAt: finalExpiresAt !== null ? finalExpiresAt : o.expiresAt };
      }
      return o;
    });

    const { error: updateErr } = await supabaseAdmin
      .from("profiles")
      .update({ 
        ai_journal: updatedJournal,
        projection_overrides: updatedOverrides
      })
      .eq("id", user.id);

    if (updateErr) {
      return NextResponse.json({ error: "Failed to update profile journal" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      memories: updatedMemories 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Mainframe error" }, { status: 500 });
  }
}
