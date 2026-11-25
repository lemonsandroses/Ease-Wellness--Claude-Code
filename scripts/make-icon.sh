#!/usr/bin/env bash
# Renders design/app-icon.svg into the iOS AppIcon set.
#
# The source of truth is the SVG, so the mark stays editable rather than being
# a PNG nobody can change. Rasterising uses qlmanage because neither
# rsvg-convert nor cairosvg is installed here; it is macOS-only, which is fine
# for an iOS icon.
#
# Two App Store rules are enforced at the end, because both are silent
# rejections at upload rather than build errors:
#   • exactly 1024x1024
#   • no alpha channel
set -euo pipefail
cd "$(dirname "$0")/.."

SVG="design/app-icon.svg"
OUT="ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

qlmanage -t -s 1024 -o "$TMP" "$SVG" >/dev/null 2>&1
RENDERED="$TMP/$(basename "$SVG").png"
[ -f "$RENDERED" ] || { echo "qlmanage produced nothing for $SVG" >&2; exit 1; }

python3 - "$RENDERED" "$OUT" <<'PY'
import sys
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src)
# Flatten onto the gradient's own top-left colour rather than white, so any
# edge pixel the renderer left translucent does not fringe pale.
if im.mode in ("RGBA", "LA", "P"):
    im = im.convert("RGBA")
    bg = Image.new("RGBA", im.size, (255, 79, 163, 255))
    im = Image.alpha_composite(bg, im)
im = im.convert("RGB").resize((1024, 1024), Image.LANCZOS)
im.save(dst, "PNG")
print(f"{dst}  mode={im.mode}  size={im.size}")
PY
