#!/bin/bash
# Fail when the ad-hoc signature does not verify. spctl rejection is expected.
set -euo pipefail

apps=$(find release -type d -name '*.app' | sort)
if [ -z "$apps" ]; then
  echo "No .app under release/" >&2
  exit 1
fi
if ! printf '%s\n' "$apps" | grep -q arm64; then
  echo "No arm64 .app under release/" >&2
  exit 1
fi

while IFS= read -r app; do
  echo "codesign --verify --deep --strict --verbose=4 $app"
  codesign --verify --deep --strict --verbose=4 "$app"
  echo "spctl -a -vv $app"
  echo "(an ad-hoc signature is expected to be rejected)"
  spctl -a -vv "$app" || true
done <<EOF
$apps
EOF
