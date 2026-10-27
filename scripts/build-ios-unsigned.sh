#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo 'An iPhone IPA must be compiled on macOS with Xcode (local Mac or EAS cloud).' >&2
  exit 1
fi

TASK_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$TASK_ROOT"
if [[ ! -d ios/TJMuse.xcworkspace ]]; then
  echo 'Missing ios/TJMuse.xcworkspace. Run expo prebuild --platform ios, then pod install.' >&2
  exit 1
fi

TASK_BUILD_DIR="$(mktemp -d "${TMPDIR:-/tmp}/tjmuse-unsigned.XXXXXX")"
TASK_ARCHIVE="$TASK_BUILD_DIR/TJMuse.xcarchive"
mkdir -p "$TASK_ROOT/releases" "$TASK_BUILD_DIR/package/Payload"
export CI=1
export RCT_NO_LAUNCH_PACKAGER=1

xcodebuild archive \
  -workspace ios/TJMuse.xcworkspace \
  -scheme TJMuse \
  -configuration Release \
  -sdk iphoneos \
  -destination 'generic/platform=iOS' \
  -archivePath "$TASK_ARCHIVE" \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY=''

TASK_APP="$TASK_ARCHIVE/Products/Applications/TJMuse.app"
test -d "$TASK_APP"
TASK_EXECUTABLE="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleExecutable' "$TASK_APP/Info.plist")"
file "$TASK_APP/$TASK_EXECUTABLE" | tee "$TASK_ROOT/releases/ios-executable.txt"
if ! file "$TASK_APP/$TASK_EXECUTABLE" | grep -q 'arm64'; then
  echo 'Expected a real iPhone arm64 binary, not an iOS simulator app.' >&2
  exit 1
fi

ditto "$TASK_APP" "$TASK_BUILD_DIR/package/Payload/TJMuse.app"
TASK_IPA="$TASK_ROOT/releases/TJMuse-0.1.0-unsigned.ipa"
ditto -c -k --keepParent "$TASK_BUILD_DIR/package/Payload" "$TASK_IPA"
unzip -t "$TASK_IPA"
shasum -a 256 "$TASK_IPA" | tee "$TASK_ROOT/releases/TJMuse-0.1.0-unsigned.ipa.sha256"
echo "Unsigned IPA ready: $TASK_IPA"
