#!/usr/bin/env bash
#
# Wire up Google Sign-In once the OAuth clients exist in Google Cloud Console.
#
#   ./scripts/setup-google.sh <IOS_CLIENT_ID> <WEB_CLIENT_ID>
#
# Does the three things that are easy to get wrong by hand:
#   1. writes both ids into .env.local
#   2. adds the REVERSED ios client id to Info.plist as a URL scheme, which is
#      how Google's sheet finds its way back into the app
#   3. rebuilds, syncs and reinstalls to the connected iPhone
#
# It does not touch Supabase — that half is the dashboard (see the README).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLIST="$ROOT/ios/App/App/Info.plist"
ENV_FILE="$ROOT/.env.local"
DEVICE="${EASE_DEVICE_UDID:-00008140-001E58AE26C2801C}"

IOS_ID="${1:-}"
WEB_ID="${2:-}"

if [[ -z "$IOS_ID" || -z "$WEB_ID" ]]; then
  echo "usage: $0 <IOS_CLIENT_ID> <WEB_CLIENT_ID>" >&2
  echo >&2
  echo "Both end in .apps.googleusercontent.com. The iOS one is from the OAuth" >&2
  echo "client of type iOS; the web one from the client of type Web." >&2
  exit 1
fi

for id in "$IOS_ID" "$WEB_ID"; do
  if [[ "$id" != *.apps.googleusercontent.com ]]; then
    echo "error: '$id' doesn't look like a Google client id" >&2
    exit 1
  fi
done

# Google's iOS redirect scheme is the client id with its two halves swapped:
#   123-abc.apps.googleusercontent.com -> com.googleusercontent.apps.123-abc
PREFIX="${IOS_ID%%.apps.googleusercontent.com}"
SCHEME="com.googleusercontent.apps.$PREFIX"

echo "iOS client   : $IOS_ID"
echo "web client   : $WEB_ID"
echo "URL scheme   : $SCHEME"
echo

# --- 1. env ------------------------------------------------------------------
touch "$ENV_FILE"
set_env () {
  local key="$1" val="$2"
  if grep -q "^${key}=" "$ENV_FILE"; then
    # In-place edit, portable between GNU and BSD sed.
    sed -i.bak "s|^${key}=.*|${key}=\"${val}\"|" "$ENV_FILE" && rm -f "$ENV_FILE.bak"
  else
    printf '%s="%s"\n' "$key" "$val" >> "$ENV_FILE"
  fi
}
set_env VITE_GOOGLE_IOS_CLIENT_ID "$IOS_ID"
set_env VITE_GOOGLE_WEB_CLIENT_ID "$WEB_ID"
echo "✓ .env.local updated"

# --- 2. Info.plist URL scheme ------------------------------------------------
# Idempotent: rebuild the entry from scratch so re-running can't stack copies.
/usr/libexec/PlistBuddy -c "Delete :CFBundleURLTypes" "$PLIST" >/dev/null 2>&1 || true
/usr/libexec/PlistBuddy \
  -c "Add :CFBundleURLTypes array" \
  -c "Add :CFBundleURLTypes:0 dict" \
  -c "Add :CFBundleURLTypes:0:CFBundleURLName string google-signin" \
  -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes array" \
  -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes:0 string $SCHEME" \
  "$PLIST"
echo "✓ Info.plist URL scheme added"

# --- 3. build and install ----------------------------------------------------
cd "$ROOT"
npm run build >/dev/null
npx cap sync ios >/dev/null 2>&1
echo "✓ web assets built and synced"

cd "$ROOT/ios/App"
xcodebuild -project App.xcodeproj -scheme App -configuration Debug \
  -destination "platform=iOS,id=$DEVICE" \
  -derivedDataPath ./build-device \
  -allowProvisioningUpdates -allowProvisioningDeviceRegistration \
  build 2>&1 | grep -E "BUILD SUCCEEDED|BUILD FAILED|error:" || true

APP="./build-device/Build/Products/Debug-iphoneos/App.app"
if [[ -d "$APP" ]]; then
  xcrun devicectl device install app --device "$DEVICE" "$APP" >/dev/null
  xcrun devicectl device process launch --device "$DEVICE" com.easewellness.app >/dev/null
  echo "✓ installed and launched on device"
else
  echo "build did not produce an app bundle — see the errors above" >&2
  exit 1
fi

echo
echo "Still to do in the Supabase dashboard (Authentication → Providers → Google):"
echo "  Client ID              $WEB_ID"
echo "  Client Secret          the web client's secret"
echo "  Authorized Client IDs  $IOS_ID"
echo
echo "Then: node scripts/verify-providers.mjs"
