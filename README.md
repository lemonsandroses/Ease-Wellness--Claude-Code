# Ease

A menstrual health and lifestyle app that syncs your cycle with nutrition, movement and daily life — built for women managing PCOS symptoms without it feeling like a second job.

Ease is designed around one user in particular: a founder and content creator with irregular periods, hair fall, acne and inflammation, who's been told to "change her lifestyle" and has no idea where to start. Everything here optimises for low friction over completeness. One tap to log a symptom. One free pillar of nutrition advice before anything is asked of her.

---

## What it does

**Tracks without demanding precision.** Cycle position is inferred from what you actually log. When your cycles vary — as they often do with PCOS — the app says "around day 7" instead of inventing false certainty. You are never asked to self-label as irregular; it's derived from your data.

**Turns the cycle into a plan.** Each phase carries specific guidance for what to eat and how to move, and the Calendar puts your real events next to your phases so demanding work can land in the weeks you'll have energy for it.

**Explains the mechanism, not just the rule.** Body content names why PCOS symptoms travel together — insulin resistance driving cravings, androgen excess driving acne and hair fall — in plain language, with no nutrition background assumed.

**Finds patterns you can't see day to day.** Symptoms, sleep, energy, mood and nutrition charted against your cycle, with correlations surfaced as short plain statements.

**Rewards showing up.** Streaks, trophies and badges, because consistency is what makes any of the data meaningful.

## Screens

| | |
|---|---|
| **Home** | Cycle ring, phase guidance, daily log, nutrient bank, streak |
| **Calendar** | Month view with period, predicted and phase overlay; events and tasks |
| **Body** | Six pillars — nutrition, exercise, stress, metabolism, skin, hair |
| **Patterns** | Success journey plus detailed analytics across everything tracked |

## Free vs premium

Free covers tracking, Home, Calendar, the nutrition pillar, cycle length and regularity, the streak counter, and connecting and importing Google Calendar.

Premium unlocks the remaining five Body pillars, detailed patterns and correlations, trophies and badges, and creating your own events and tasks.

₹699/month or ₹6,999/year with a 7-day free trial, sold through App Store and Play Store billing.

---

## Stack

- **React 19 + TypeScript + Vite**, Tailwind v4
- **Capacitor** for iOS and Android builds
- **Supabase** — Postgres, auth, row-level security, Edge Functions
- **Recharts** for analytics, **Motion** for animation

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase URL and anon key
npm run dev                  # http://localhost:3000
```

Run the migrations in `supabase/migrations/` in order, via the Supabase SQL editor, then deploy the Edge Function:

```bash
npx supabase functions deploy delete-account
```

### Native builds

```bash
npm run build && npx cap sync   # rebuild web assets and copy into both platforms
npx cap open ios                # Xcode
npx cap open android            # Android Studio
```

`npx cap sync` must be re-run after every web change — the native projects bundle a copy of `dist/`, they don't read it live.

### Sign in with Google and Apple

Both run natively on a phone: the provider's own sheet returns an OIDC id token
and that is exchanged with Supabase via `signInWithIdToken`. The browser
redirect flow can't be used inside the app, because the origin there is
`capacitor://localhost` and no provider accepts it as a redirect target. See
`src/lib/socialAuth.ts`.

A button only appears once its provider is configured, so a half-finished setup
hides the button instead of failing when someone taps it. **Google is also
hidden while Apple is unconfigured** — offering third-party sign-in without
Sign in with Apple is an automatic rejection under App Store guideline 4.8.

**Apple.** In the developer portal enable the Sign In with Apple capability on
the `app.easetracker` App ID, then create a Service ID and a sign-in key
(.p8). Put the Service ID, Team ID, Key ID and key contents into Supabase →
Authentication → Providers → Apple. iOS needs nothing in `.env` — it signs in
against the bundle id. The `com.apple.developer.applesignin` entitlement is
already committed at `ios/App/App/App.entitlements`.

**Google.** In Google Cloud create an OAuth consent screen and two clients: an
**iOS** client (bundle id `app.easetracker`) and a **Web** client. Then:

- `VITE_GOOGLE_IOS_CLIENT_ID` = the iOS client id
- `VITE_GOOGLE_WEB_CLIENT_ID` = the web client id
- Supabase → Authentication → Providers → Google: the **web** client id and secret
- `ios/App/App/Info.plist` needs a `CFBundleURLTypes` entry whose scheme is the
  iOS client id **reversed** (`com.googleusercontent.apps.123-abc`), or the
  sign-in sheet has no way back into the app

Android additionally needs the SHA-1 of the signing certificate registered on an
Android OAuth client.

### Staying up when the backend isn't

The app is local-first and every path assumes the network may be slow, rate
limited or gone:

- The first paint waits at most five seconds for the session check, then opens
  on cached data regardless (`store.tsx`). A struggling backend delays syncing,
  never access.
- Writes queue locally and replay with exponential backoff **and jitter**, so a
  shared blip doesn't turn every phone into a synchronised retry spike.
- Requests the server has definitively refused (constraint violations, RLS) are
  dropped rather than retried forever, so one bad row can't wedge the queue.
- Regaining signal or returning to the foreground resets the backoff and retries
  at once.
- The session is read from a single `onAuthStateChange` subscription, and token
  refreshes don't re-pull the tables — both of which used to double the reads on
  every launch.

## Project layout

```
src/
  screens/      Splash, Onboarding, Auth, Paywall, Home, Calendar, Body, Patterns
  components/   Shared UI, sheets, cycle ring, locked-feature wrapper
  lib/          Cycle maths, sync store, Supabase client, entitlement, motion
  data/         PCOS content — the six pillars, symptoms, achievements
supabase/
  migrations/   Schema and row-level security
  functions/    Edge Functions (account deletion)
ios/ android/   Native projects, generated by Capacitor
```

## Security and privacy

This app holds reproductive health data, which is special-category under GDPR and sensitive under India's DPDP Act. The architecture reflects that:

- **Row-level security on every table.** Verified by test: one account cannot read, write, update or delete another's data.
- **Entitlements are server-owned.** The `subscriptions` table is read-only to clients, so nobody can grant themselves a paid plan from the browser console.
- **Account deletion is real.** A service-role Edge Function removes the `auth.users` record, and the cascade erases every owned row atomically. The user ID comes from the verified JWT, never the request body.
- **No third-party analytics.** Health data is not shared with advertisers.
- **Only the anon key ships to the client**, and it's inert without a session.

## Known gaps

- There is no paywall and no in-app purchase. Every feature is free, the RevenueCat SDK has been removed, and nothing in the binary links StoreKit or Play Billing.
- Google Calendar needs a Google Cloud OAuth client before the connect button works.
- Font licences: Futura PT and any display face must be properly licensed before release. The files used in development are not licensed for production.
