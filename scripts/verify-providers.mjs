// Run after enabling the providers in Supabase: node verify-providers.mjs
import fs from "node:fs";
const env = Object.fromEntries(
  fs.readFileSync("/Users/mac/Ease /claude code/ease/.env.local","utf8")
    .split("\n").filter(l=>l.includes("=")&&!l.trim().startsWith("#"))
    .map(l=>{const i=l.indexOf("=");return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^["']|["']$/g,"")];}));

const s = await (await fetch(`${env.VITE_SUPABASE_URL}/auth/v1/settings`,
  { headers:{ apikey: env.VITE_SUPABASE_ANON_KEY } })).json();

const row = (label, ok, extra="") =>
  console.log(`${ok ? "PASS" : "FAIL"}  ${label.padEnd(34)}${extra}`);

console.log("Supabase provider status\n");
row("Apple provider enabled",  s.external?.apple  === true);
row("Google provider enabled", s.external?.google === true);
row("Email provider enabled",  s.external?.email  === true);

console.log("\nApp-side credentials (.env.local)\n");
const need = {
  VITE_GOOGLE_IOS_CLIENT_ID: "required for Google on iOS",
  VITE_GOOGLE_WEB_CLIENT_ID: "required for Google on web/Android",
  VITE_APPLE_SERVICE_ID:     "only needed for Apple on web/Android; iOS uses the bundle id",
};
for (const [k, why] of Object.entries(need)) {
  const v = (env[k] || "").trim();
  row(k, Boolean(v), v ? "" : `— empty (${why})`);
}

const ready = s.external?.apple && s.external?.google;
console.log(`\n${ready ? "Both providers are live." : "Not ready yet — see the failures above."}`);
