import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

/**
 * Server-side Supabase client (lazily initialised).
 * ⚠️ Uses service role key — NEVER import this into client components.
 */
export const supabaseServer: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_client) {
      _client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
      );
    }
    const val = (_client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof val === "function" ? val.bind(_client) : val;
  },
});