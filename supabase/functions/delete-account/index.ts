// Permanently deletes the caller's account and every row belonging to them.
//
// This runs server-side because removing an auth.users record requires the
// service role key, which must never reach the browser bundle.
//
// Deploy:  supabase functions deploy delete-account
//
// SECURITY: the user id comes from the verified JWT, never from the request
// body. Accepting an id from the client would let anyone delete anyone.
//
// ORDERING: the auth user is deleted FIRST. Every table references
// auth.users(id) ON DELETE CASCADE, so that single statement removes all of
// their data atomically. Deleting table-by-table first meant one failing table
// (a migration not yet run) left the account half-erased — logs gone, account
// still alive — while reporting that nothing had been removed.

import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Not signed in" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;

  // Identify the caller from their own token.
  const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: whoErr,
  } = await asUser.auth.getUser();

  if (whoErr || !user) return json({ error: "Not signed in" }, 401);

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  // One statement, all-or-nothing: the cascade removes every owned row.
  const { error: authErr } = await admin.auth.admin.deleteUser(user.id);
  if (authErr) {
    console.error("delete-account: deleting auth user failed", authErr.message);
    return json({ error: "Could not delete your account. Nothing was removed." }, 500);
  }

  // Best-effort sweep for anything a cascade might not cover. The account is
  // already gone at this point, so a failure here is logged, never surfaced as
  // a failed deletion — the user's account really has been closed.
  for (const table of ["day_logs", "meals", "events", "achievements", "subscriptions"]) {
    const { error } = await admin.from(table).delete().eq("user_id", user.id);
    if (error) console.warn(`delete-account: sweep of ${table} skipped — ${error.message}`);
  }
  const { error: profileErr } = await admin.from("profiles").delete().eq("id", user.id);
  if (profileErr) console.warn(`delete-account: sweep of profiles skipped — ${profileErr.message}`);

  return json({ ok: true });
});
