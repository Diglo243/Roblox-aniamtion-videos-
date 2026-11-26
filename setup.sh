#!/usr/bin/env bash
# One-time setup of the Roblox TikTok director pipeline.
set -e
cd "$(dirname "$0")"
command -v ffmpeg >/dev/null || { echo "ffmpeg is required (apt-get install ffmpeg)"; exit 1; }
command -v node >/dev/null || { echo "Node.js >= 18 is required"; exit 1; }
npm install --no-audit --no-fund
# Playwright + Chromium (skip download if a Chromium is already provided by the system)
node -e "require('playwright')" 2>/dev/null || { npm install --no-save playwright && npx playwright install chromium; }
pip3 install --quiet numpy pillow fonttools brotli
python3 - <<'PY'
from fontTools.ttLib import TTFont
import os
os.makedirs("assets/fonts", exist_ok=True)
f = TTFont("node_modules/@fontsource/luckiest-guy/files/luckiest-guy-latin-400-normal.woff"); f.flavor = None
f.save("assets/fonts/LuckiestGuy-Regular.ttf")
print("font ok")
PY
echo "Setup done. Run: python3 director/run.py projects/<name>"
