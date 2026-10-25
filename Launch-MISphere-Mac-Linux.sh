#!/usr/bin/env bash
# Opens MISphere in its own app window using Chrome / Chromium / Edge. No install needed.
cd "$(dirname "$0")" && URL="file://$PWD/index.html"
for b in "google-chrome" "chromium" "chromium-browser" "microsoft-edge" "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"; do
  if command -v "$b" >/dev/null 2>&1 || [ -x "$b" ]; then "$b" --app="$URL" --window-size=1360,880 >/dev/null 2>&1 & exit 0; fi
done
( command -v xdg-open >/dev/null && xdg-open "$URL" ) || open "$URL"
