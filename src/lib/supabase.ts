import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** False until both env vars are set — the app runs local-only until then. */
export const isConfigured = Boolean(url && anonKey);

if (!isConfigured && import.meta.env.DEV) {
  console.warn(
    "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local. " +
      "Running in local-only mode: data stays on this device.",
  );
}

export const supabaseUrl = url;
export const supabaseAnonKey = anonKey;

export const supabase = isConfigured
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;
