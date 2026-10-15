#!/usr/bin/env bash
# Starts the demo website inside a GitHub Codespace (.devcontainer/devcontainer.json).
set -euo pipefail
cd "$(dirname "$0")/.."

export PORT="${PORT:-3000}"
if [ -n "${CODESPACE_NAME:-}" ]; then
  export APP_URL="https://${CODESPACE_NAME}-${PORT}.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
fi

if curl -sf "http://localhost:${PORT}/api/health" >/dev/null 2>&1; then
  echo "The website is already running: ${APP_URL:-http://localhost:$PORT}"
  echo "If no tab opened, open the PORTS tab and click the globe next to port ${PORT}."
  exit 0
fi

[ -f .next/BUILD_ID ] || npm run build

# Demo appointments are dated relative to when the data was loaded, so reload
# it once a day; otherwise "today's" visits and consults drift into the past.
today="$(TZ=Asia/Kolkata date +%F)"
if [ "$(cat .data/demo-date 2>/dev/null || true)" != "$today" ]; then
  echo "Loading fresh demo data for $today ..."
  npm run db:reset
  mkdir -p .data && echo "$today" > .data/demo-date
fi

echo
echo "Starting the website at ${APP_URL:-http://localhost:$PORT}"
echo "When it says Ready, a new tab opens. If not, open the PORTS tab and click the globe next to port ${PORT}."
echo "Pick any demo account on the login page. Login codes appear on screen; no real payments."
echo
exec npx next start -p "$PORT"
