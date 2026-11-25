# Screen time on iOS

Automatic daily screen time in the Patterns tab. One permission, one app
picker, then nothing to type in.

**Status: written, not wired.** The TypeScript side ships today and renders
nothing. The Swift files are in the repo but are not members of any Xcode
target, so the current archive and TestFlight pipeline is untouched. Turning it
on is gated on Apple, not on more code.

---

## Why it works the way it does

Apple does not let an app read the Screen Time totals shown in Settings.

`DeviceActivityReport` can *draw* those totals, but its extension runs in a
sandbox that blocks every route back out — no network, no App Group, no
inter-process anything. Developers have confirmed writes that appear to
succeed and then read back `nil`. Apple staff have said on the forums that
this is the intent, not a defect.

The one callback that escapes is `DeviceActivityMonitor`, which fires when
usage crosses a threshold registered in advance. So we lay a ladder of
thresholds and count rungs. Each rung is 5 minutes.

That gives these limits, which are inherent and are stated in the UI:

| | |
|---|---|
| Resolution | 5 minutes, not 1 |
| History | none — counting starts the day it's switched on |
| Coverage | the apps picked in the system picker, **not** the whole device |
| Accuracy | will not match Settings exactly |

There is no published "all apps" token. Apple's documentation does not say
that empty `applications`/`categories`/`webDomains` sets mean "everything",
and the working examples in the wild all pass a non-empty selection from
`FamilyActivityPicker`. That is why the user picks apps once. If you find that
empty sets do mean "all" on a current iOS, the picker step can be dropped —
test it on a device, don't assume.

The estimate never leaves the phone. It is device-derived, meaningless on a
second phone, and syncing it would add a health-adjacent column to Supabase for
no benefit. It is also one less thing to declare in App Privacy.

---

## Step 1 — Request the entitlement (do this first; it is the long pole)

`com.apple.developer.family-controls` is a **restricted** entitlement. The
development variant works locally; **distribution requires Apple's approval**.

Apply at <https://developer.apple.com/contact/request/family-controls-distribution>.

Sign in to the Developer account that owns the app **first**. Signed out, the
URL bounces to Apple's sign-in page and looks dead. Note the `/request/`
segment — without it the URL 404s.

Three things to know before you file:

- **Apple reviews each request by hand.** Reported waits run from about three
  weeks to over a month, with threads describing requests sitting in
  "Submitted" with no update.
- **It is granted per bundle ID.** The app *and* the monitor extension each
  need it — two requests: `com.easewellness.app` and
  `com.easewellness.app.ScreenTimeMonitor`.
- **Approval is not a formality.** Family Controls is aimed at parental-control
  and screen-time apps. A cycle-tracking app asking for it is an unusual case,
  so say plainly what it is for: showing the user their own screen time beside
  their own symptoms, on their own device, with nothing leaving the phone and
  no third-party monitoring.

If Apple declines, none of the rest of this applies, and the honest fallback is
a manual field in the check-in.

Once granted, enable the capability on each identifier in App Store Connect →
Identifiers → Additional Capabilities. The option only appears after approval.

## Step 2 — App Group

Create `group.com.easewellness.app.screentime` and add it to **both** targets.
A missing App Group entitlement on the extension is the single most common
cause of `eventDidReachThreshold` never firing.

The name appears in three places and must match exactly:

- `ios/App/App/ScreenTime/ScreenTimePlugin.swift` → `appGroup`
- `ios/App/ScreenTimeMonitor/EaseActivityMonitor.swift` → `appGroup`
- both targets' `.entitlements`

## Step 3 — Add the plugin to the App target

Add `ios/App/App/ScreenTime/ScreenTimePlugin.swift` to the **App** target.
Capacitor 8 discovers it through `CAPBridgedPlugin` — no `.m` file and no
manual registration.

## Step 4 — Add the monitor extension target

Xcode → File → New → Target → **Device Activity Monitor Extension**.

- Product name: `ScreenTimeMonitor`
- Bundle ID: `com.easewellness.app.ScreenTimeMonitor`
- Replace the generated principal class with
  `ios/App/ScreenTimeMonitor/EaseActivityMonitor.swift`
- Set `NSExtensionPrincipalClass` to `$(PRODUCT_MODULE_NAME).EaseActivityMonitor`
- Add the App Group and the Family Controls entitlement to this target too

## Step 5 — Flip the flag

```ts
// src/lib/screenTime.ts
export const SCREEN_TIME_ENABLED: boolean = true;
```

Then `npm run build && npx cap sync ios`.

---

## Testing

**The simulator cannot test this.** Authorization never completes, the picker
shows no apps, and the monitor extension never runs. Physical device only.

Worth checking specifically:

- The permission sheet appears once, not on every launch.
- After picking apps, `status()` returns `ready`.
- Use a chosen app for 10+ minutes, background Ease, reopen it: the Patterns
  card should move by at least one rung.
- Compare against Settings → Screen Time after a full day. Expect it to be
  close, not equal. If it is wildly over, see the phantom-threshold note below.

## Known iOS faults this code already guards against

- **Phantom thresholds (iOS 26).** `eventDidReachThreshold` has been reported
  firing in bursts with no real usage; Apple acknowledged it on the forums.
  `EaseActivityMonitor` drops any rung arriving sooner than one rung-interval
  after the last one. It would rather undercount than invent screen time and
  chart it against someone's symptoms.
- **Schedules starting "now" are booked for tomorrow** — silently, with no
  error. The twelve two-hour blocks are fixed wall-clock windows, so the one
  containing the current time starts immediately.
- **The ~20 simultaneous activity limit.** Twelve blocks sits under it, leaving
  headroom. Don't add more without checking.
- **`stopMonitoring()` fires `intervalDidEnd`.** Harmless here — nothing is
  shielded — but don't add side effects to that callback.

## If Apple says no

Keep `SCREEN_TIME_ENABLED` false. The card disappears on its own and nothing
else in the app references it. The fallback is a screen-time field in the
check-in, which correlates in Patterns exactly the same way — it just has to be
typed in.
