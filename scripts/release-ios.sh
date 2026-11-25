#!/usr/bin/env bash
# Build, archive and export Ease for App Store Connect.
#
# Prerequisites that live outside this script:
#   • An "Apple Distribution" certificate in this Mac's keychain.
#     Xcode → Settings → Accounts → your Apple ID → Manage Certificates → +
#   • An App Store Connect record for com.easewellness.app.
#
# Produces build/Ease.ipa, ready to upload with Transporter or altool.
set -euo pipefail

cd "$(dirname "$0")/.."

SCHEME="App"
PROJECT="ios/App/App.xcodeproj"
ARCHIVE="ios/App/build/Ease.xcarchive"
EXPORT_DIR="ios/App/build/export"

echo "==> Web build"
npm run check
npm run build

echo "==> Sync to iOS"
npx cap sync ios

echo "==> Archive (Release)"
# generic/platform=iOS, not a device id: an archive must not be tied to the
# phone that happens to be plugged in.
xcodebuild archive \
  -project "$PROJECT" \
  -scheme "$SCHEME" \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE" \
  -allowProvisioningUpdates

echo "==> Export for App Store"
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE" \
  -exportOptionsPlist ios/App/exportOptions.plist \
  -exportPath "$EXPORT_DIR" \
  -allowProvisioningUpdates

echo
echo "Done. IPA:"
ls -la "$EXPORT_DIR"/*.ipa

cat <<'NEXT'

Next — upload, either way:

  Transporter.app  → drag the .ipa in, Deliver.

  or, with an App Store Connect API key in ~/.appstoreconnect/private_keys:
    xcrun altool --upload-app -f ios/App/build/export/App.ipa -t ios \
      --apiKey <KEY_ID> --apiIssuer <ISSUER_ID>

The build then appears under TestFlight in App Store Connect after
processing (usually 10-30 minutes).
NEXT
