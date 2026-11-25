import { Capacitor } from "@capacitor/core";

/**
 * Where Supabase sends people after they click a confirmation or password-reset
 * link.
 *
 * On the web `window.location.origin` is right. Inside the native shell it is
 * `capacitor://localhost` (iOS) or `http://localhost` (Android) — neither is a
 * URL a mail client can open, and neither can be added to Supabase's redirect
 * allow-list, so links silently fall back to the project's Site URL and dead-end
 * on whatever is hosted there.
 *
 * So the native builds use an explicit https URL instead. Set
 * VITE_AUTH_REDIRECT_URL to a page you control and add it to
 * Authentication → URL Configuration → Redirect URLs in Supabase. Until that
 * page can hand the session back to the app (a universal link, or a custom
 * scheme registered in Info.plist), the honest flow is: confirm in the browser,
 * then return to Ease and sign in — which is what the "I've confirmed — sign in"
 * button on the check-your-inbox screen is for.
 */
const CONFIGURED = import.meta.env.VITE_AUTH_REDIRECT_URL?.trim();

export function authRedirectUrl(): string | undefined {
  if (CONFIGURED) return CONFIGURED;
  if (Capacitor.isNativePlatform()) {
    // Nothing usable to fall back to. Returning undefined lets Supabase use the
    // project's Site URL, which is at least an address someone configured.
    return undefined;
  }
  return window.location.origin;
}
