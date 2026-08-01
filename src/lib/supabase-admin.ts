import { createClient } from "@supabase/supabase-js";

let adminClient: any = null;

// Returns a singleton Supabase admin client (Service Role key). Use on server-only code.
export function getAdminClient(): any {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase admin credentials (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)");
  }

  adminClient = createClient(url, key);
  return adminClient;
}
