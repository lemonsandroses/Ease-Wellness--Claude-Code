import { Capacitor } from "@capacitor/core";
import { supabase } from "./supabase";
import { authRedirectUrl } from "./authRedirect";

/**
 * Loaded on demand rather than imported at the top.
 *
 * The plugin ships a web implementation that would otherwise sit in the
 * startup bundle for every launch — about 50KB to parse before the first
 * paint, on a screen most people pass through once. Nobody waits for it now
 * unless they actually reach for a provider button.
 */
const plugin = () => import("@capgo/capacitor-social-login").then((m) => m.SocialLogin);

/**
 * Sign in with Google and with Apple.
 *
 * Two different mechanisms behind one call:
 *
 * - On a phone the native sheet runs (Apple's system sheet, Google's account
 *   picker), hands back an OIDC id token, and that token is exchanged with
 *   Supabase. The browser redirect flow cannot be used here — inside the
 *   Capacitor shell the origin is `capacitor://localhost`, which no provider
 *   will accept as a redirect target.
 * - On the web it is the ordinary Supabase OAuth redirect.
 *
 * If Apple is offered on iOS then Google must be too and vice versa is fine,
 * but offering Google *without* Apple fails App Store review under guideline
 * 4.8. `availableProviders()` is what the UI asks, so that stays true.
 */

export type SocialProvider = "google" | "apple";

const GOOGLE_IOS_CLIENT_ID = (import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID ?? "").trim();
const GOOGLE_WEB_CLIENT_ID = (import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID ?? "").trim();
/** Apple Service ID — only needed for the web and Android flows. */
const APPLE_SERVICE_ID = (import.meta.env.VITE_APPLE_SERVICE_ID ?? "").trim();

const platform = Capacitor.getPlatform();
export const isNativeApp = Capacitor.isNativePlatform();

function googleConfigured(): boolean {
  if (!isNativeApp) return Boolean(GOOGLE_WEB_CLIENT_ID);
  return platform === "ios" ? Boolean(GOOGLE_IOS_CLIENT_ID) : Boolean(GOOGLE_WEB_CLIENT_ID);
}

function appleConfigured(): boolean {
  // iOS signs in against the app's own bundle id, so there is nothing extra to
  // configure. Everywhere else Apple needs a Service ID.
  if (isNativeApp && platform === "ios") return true;
  return Boolean(APPLE_SERVICE_ID);
}

/**
 * Which buttons to show. A provider that isn't configured is left out rather
 * than shown and failing on tap — and Apple is never dropped while Google is
 * still on screen, because that combination is an automatic rejection.
 */
export function availableProviders(): SocialProvider[] {
  if (!supabase) return [];
  const apple = appleConfigured();
  const google = googleConfigured();

  // Guideline 4.8 — Google without Apple is an App Store rejection — is
  // satisfied structurally rather than by a rule here: on iOS `appleConfigured`
  // is unconditionally true, so Apple can never be the one that's missing.
  // Play imposes no equivalent, so elsewhere Google stands on its own.
  return [...(apple ? (["apple"] as const) : []), ...(google ? (["google"] as const) : [])];
}

let started: Promise<void> | null = null;

/**
 * Initialise once per app run, and don't let one failure poison later tries.
 * Returns the plugin so callers don't load it twice.
 */
async function ensureStarted(): Promise<Awaited<ReturnType<typeof plugin>>> {
  const SocialLogin = await plugin();
  started ??= SocialLogin.initialize({
    ...(googleConfigured()
      ? { google: { iOSClientId: GOOGLE_IOS_CLIENT_ID, webClientId: GOOGLE_WEB_CLIENT_ID } }
      : {}),
    ...(appleConfigured()
      ? { apple: { clientId: APPLE_SERVICE_ID || undefined, redirectUrl: authRedirectUrl() } }
      : {}),
  }).catch((err) => {
    started = null;
    throw err;
  });
  await started;
  return SocialLogin;
}

function randomNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Raised when the person backs out of the provider sheet — not a failure. */
export class SocialCancelled extends Error {}

function wasCancelled(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err ?? "")).toLowerCase();
  return /cancel|abort|dismiss|1001|user closed|closed by user/.test(msg);
}

/**
 * Runs the provider sheet and exchanges the result for a Supabase session.
 * Resolves once the session exists; the store's auth listener does the rest.
 */
export async function signInWithProvider(provider: SocialProvider): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");

  if (!isNativeApp) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: authRedirectUrl() },
    });
    if (error) throw error;
    return; // The page navigates away; nothing else to do.
  }

  const SocialLogin = await ensureStarted();

  try {
    if (provider === "apple") {
      // Apple is shown the SHA-256 of the nonce and embeds that in the id
      // token; Supabase is given the raw value and hashes it to compare. Send
      // the same string to both and every sign-in is rejected.
      const raw = randomNonce();
      const res = await SocialLogin.login({
        provider: "apple",
        options: { scopes: ["name", "email"], nonce: await sha256Hex(raw) },
      });
      const token = res.result.idToken;
      if (!token) throw new Error("Apple did not return an identity token");
      const { error } = await supabase.auth.signInWithIdToken({ provider: "apple", token, nonce: raw });
      if (error) throw error;
      return;
    }

    // Google puts the nonce into the token verbatim rather than hashing it, so
    // the raw/hashed pairing above would never match. Omitted deliberately —
    // the token is still signature- and audience-checked by Supabase.
    const res = await SocialLogin.login({ provider: "google", options: { scopes: ["profile", "email"] } });
    // The plugin can answer in "offline" mode with a server auth code instead
    // of a token; that variant is for a backend exchange we don't do.
    const token = "responseType" in res.result && res.result.responseType === "offline" ? null : res.result.idToken;
    if (!token) throw new Error("Google did not return an identity token");
    const { error } = await supabase.auth.signInWithIdToken({ provider: "google", token });
    if (error) throw error;
  } catch (err) {
    if (wasCancelled(err)) throw new SocialCancelled();
    throw err;
  }
}

/** Ends the provider session too, so the next sign-in shows the picker again. */
export async function signOutProviders(): Promise<void> {
  if (!isNativeApp || !started) return;
  const SocialLogin = await plugin();
  for (const provider of availableProviders()) {
    try {
      await SocialLogin.logout({ provider });
    } catch {
      // Already signed out, or never signed in with this one.
    }
  }
}
