import { NextResponse } from "next/server";
import { generateAIContent } from "@/lib/ai-bridge";
import { verifyAndConsumeQuota } from "@/lib/server-auth";
import { getAdminClient } from "@/lib/supabase-admin";
import { calculateServerTelemetry } from "@/lib/server-telemetry";

// GET: Fetch all memories (structured and converted legacy string records)
export async function GET(request: Request) {
  try {
    const { allowed, reason, userId } = await verifyAndConsumeQuota(request);
    if (!allowed || !userId) {
      return NextResponse.json({ error: reason || "Unauthorized" }, { status: 403 });
    }

    const supabaseAdmin = getAdminClient();
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("ai_journal")
      .eq("id", userId)
      .single();

    if (error) {
      return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
    }

    const rawJournal = profile?.ai_journal || [];
    const normalizedMemories = normalizeJournal(rawJournal);

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

    const prompt = `
      You are the memory parsing node of LEGER_OS, a personal finance terminal.
      I will provide a natural language statement about a user's current situation, routine changes, goals, or lifestyle updates.
      Your task is to parse this into a structured JSON memory object.

      Input: "${text}"

      Determine:
      1. "content": A clean, concise summary of the fact (e.g. "Low grade fever reported", "Working hybrid", "Started saving for Tokyo trip").
      2. "category": Choose the most logical one: "lifestyle" | "goal" | "health" | "financial" | "other".
      3. "durationDays": A reasonable number of days this fact will remain active/relevant. 
         CRITICAL PAYCHECK CYCLE DURATION RULE:
         Current Cycle Status: Day ${daysElapsed} of ${totalDaysInCycle} Total Days (${remainingDaysInCycle} Days Remaining in current cycle).
         If the user input mentions "this cycle", "for this cycle", "until next paycheck", "the rest of the cycle", or "this month's cycle", set "durationDays" to EXACTLY ${remainingDaysInCycle}.
         For explicit timeframes:
         - "on vacation for a week" -> 7
         - "fever/flu today" -> 5
         - "rehab for my knee for a month" -> 30
         - Permanent updates (e.g., "got a dog", "new job", "started hybrid work") -> null (representing infinite/long-term duration)

      Format your response as a strict JSON object:
      {
        "content": "string",
        "category": "lifestyle" | "goal" | "health" | "financial" | "other",
        "durationDays": number | null
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
      .select("ai_journal")
      .eq("id", userId)
      .single();

    if (getErr) {
      return NextResponse.json({ error: "Failed to fetch profile journal" }, { status: 500 });
    }

    const existingJournal = profile?.ai_journal || [];
    
    // Create new structured memory object
    const newMemory = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: content,
      category: parsed.category || "other",
      createdAt: new Date().toISOString(),
      expiresAt: parsed.durationDays ? new Date(Date.now() + parsed.durationDays * 24 * 60 * 60 * 1000).toISOString() : null,
      status: "active"
    };

    const updatedJournal = [...existingJournal, newMemory];
    
    const { error: updateErr } = await supabaseAdmin
      .from("profiles")
      .update({ ai_journal: updatedJournal })
      .eq("id", userId);

    if (updateErr) {
      return NextResponse.json({ error: "Failed to update profile journal" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      memory: newMemory,
      memories: normalizeJournal(updatedJournal) 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Mainframe error" }, { status: 500 });
  }
}

// DELETE: Remove a memory by its unique ID
export async function DELETE(request: Request) {
  try {
    const { allowed, reason, userId } = await verifyAndConsumeQuota(request);
    if (!allowed || !userId) {
      return NextResponse.json({ error: reason || "Unauthorized" }, { status: 403 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Memory ID is required" }, { status: 400 });
    }

    const supabaseAdmin = getAdminClient();
    const { data: profile, error: getErr } = await supabaseAdmin
      .from("profiles")
      .select("ai_journal")
      .eq("id", userId)
      .single();

    if (getErr) {
      return NextResponse.json({ error: "Failed to fetch profile journal" }, { status: 500 });
    }

    const existingJournal = profile?.ai_journal || [];
    const normalizedExisting = normalizeJournal(existingJournal);
    
    // Filter out the deleted memory
    const updatedJournal = normalizedExisting.filter((item: any) => item.id !== id);

    const { error: updateErr } = await supabaseAdmin
      .from("profiles")
      .update({ ai_journal: updatedJournal })
      .eq("id", userId);

    if (updateErr) {
      return NextResponse.json({ error: "Failed to update profile journal" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      memories: normalizeJournal(updatedJournal) 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Mainframe error" }, { status: 500 });
  }
}

// PUT: Update an existing memory (content, category, or expiration date)
export async function PUT(request: Request) {
  try {
    const { allowed, reason, userId } = await verifyAndConsumeQuota(request);
    if (!allowed || !userId) {
      return NextResponse.json({ error: reason || "Unauthorized" }, { status: 403 });
    }

    const { id, content, category, expiresAt } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Memory ID is required" }, { status: 400 });
    }

    const supabaseAdmin = getAdminClient();
    const { data: profile, error: getErr } = await supabaseAdmin
      .from("profiles")
      .select("ai_journal")
      .eq("id", userId)
      .single();

    if (getErr) {
      return NextResponse.json({ error: "Failed to fetch profile journal" }, { status: 500 });
    }

    const existingJournal = profile?.ai_journal || [];
    const normalizedExisting = normalizeJournal(existingJournal);

    const updatedJournal = normalizedExisting.map((item: any) => {
      if (item.id === id) {
        const newExpiresAt = expiresAt !== undefined ? expiresAt : item.expiresAt;
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

    const { error: updateErr } = await supabaseAdmin
      .from("profiles")
      .update({ ai_journal: updatedJournal })
      .eq("id", userId);

    if (updateErr) {
      return NextResponse.json({ error: "Failed to update profile journal" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      memories: normalizeJournal(updatedJournal) 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Mainframe error" }, { status: 500 });
  }
}

// Helper to normalize mixed string/object journals and resolve active/expired states
function normalizeJournal(journal: any[]): any[] {
  const now = new Date();
  return journal.map((item: any, idx: number) => {
    if (typeof item === "string") {
      return {
        id: `legacy-${idx}`,
        content: item,
        category: "other",
        createdAt: new Date().toISOString(),
        expiresAt: null,
        status: "active"
      };
    }

    // Determine status based on expiration date
    let status = item.status || "active";
    if (item.expiresAt && new Date(item.expiresAt) < now) {
      status = "expired";
    }

    return {
      id: item.id || `mem-${idx}`,
      content: item.content || "",
      category: item.category || "other",
      createdAt: item.createdAt || new Date().toISOString(),
      expiresAt: item.expiresAt || null,
      status: status
    };
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
