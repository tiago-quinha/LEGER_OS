import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerCookieClient } from "./supabase-server";
import { getAdminClient } from "./supabase-admin";

export async function isUserPro(req?: Request): Promise<boolean> {
  try {
    let user: any = null;
    let supabaseClient: any = null;

    // 1. Check for Authorization header bearer token
    const authHeader = req?.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      supabaseClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
      );
      const { data } = await supabaseClient.auth.getUser(token);
      user = data?.user;
    }

    // 2. Fallback to session cookies if no bearer token found
    if (!user) {
      supabaseClient = await createServerCookieClient();
      const { data } = await supabaseClient.auth.getUser();
      user = data?.user;
    }

    if (!user) return false;

    // Fetch user profile subscription tier
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();

    return profile?.subscription_tier === "PRO";
  } catch (error) {
    console.error("Error verifying user subscription status on server:", error);
    return false;
  }
}

export async function verifyAndConsumeQuota(req?: Request): Promise<{ 
  allowed: boolean; 
  isPro: boolean; 
  reason?: string;
  customApiKey?: string;
  aiProvider?: string;
  userId?: string;
}> {
  try {
    let user: any = null;
    let supabaseClient: any = null;

    // 1. Resolve Auth context
    const authHeader = req?.headers.get("Authorization");
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

    if (!user) {
      return { allowed: false, isPro: false, reason: "Authentication session expired. Please log in." };
    }

    // 2. Fetch profile quota status using admin client to bypass anonymous RLS query restrictions on server side
    const supabaseAdmin = getAdminClient();

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("subscription_tier, custom_api_key, ai_provider, ai_quota_usage, ai_quota_limit")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("[verifyAndConsumeQuota] Profile query error:", profileError);
    }

    console.log("[verifyAndConsumeQuota] Resolved Profile info:", {
      userId: user.id,
      email: user.email,
      profile: profile
    });

    const isPro = profile?.subscription_tier === "PRO";

    // Immediate gate: Free tier does not have access to AI at all
    if (!isPro) {
      const safeProfile = profile ? {
        ...profile,
        custom_api_key: profile.custom_api_key ? "[REDACTED]" : ""
      } : null;
      const debugInfo = `(Debug: userId=${user.id}, profile=${JSON.stringify(safeProfile)}, error=${JSON.stringify(profileError)}, hasServiceKey=${!!process.env.SUPABASE_SERVICE_ROLE_KEY})`;
      return { 
        allowed: false, 
        isPro: false, 
        reason: `AI features are exclusive to LEGER_OS PRO nodes. Please upgrade your subscription to access neural strategy models. ${debugInfo}` 
      };
    }

    const customKey = (profile?.custom_api_key || "").trim();
    const aiProvider = (profile?.ai_provider || "").trim();

    // 3. Bypass quotas if using a personal key (unmetered by host)
    if (customKey) {
      return { 
        allowed: true, 
        isPro: true, 
        userId: user.id, 
        customApiKey: customKey, 
        aiProvider: aiProvider || undefined 
      };
    }

    // 4. Validate quota limit (PRO users get 300 queries by default)
    const usage = profile?.ai_quota_usage ?? 0;
    const limit = profile?.ai_quota_limit ?? 300;

    if (usage >= limit) {
      return {
        allowed: false,
        isPro: true,
        reason: `Monthly AI Quota Exceeded (${usage}/${limit} consumed). Configure a custom API key in System Settings for unlimited access.`
      };
    }

    // 5. Record request consumption using admin client
    await supabaseAdmin
      .from("profiles")
      .update({ ai_quota_usage: usage + 1 })
      .eq("id", user.id);

    return { 
      allowed: true, 
      isPro: true, 
      userId: user.id,
      customApiKey: undefined,
      aiProvider: undefined
    };
  } catch (error) {
    console.error("Error verifying AI quota consumption:", error);
    return { allowed: false, isPro: false, reason: "Quota verification server error." }; // safety fallback
  }
}
