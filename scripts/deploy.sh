#!/bin/bash
# Server-side deploy, run by public/gitwebhook.php on each GitHub push
# (or by hand: bash scripts/deploy.sh). Pulls the repo, builds, and publishes
# dist/ into the web root.
#
# One-time server setup is in README.md ("Deploying").
set -euo pipefail

REPO="${REPO:-/home/lillydebate/lillyrosenthal.com}"        # git checkout, OUTSIDE the web root
WEBROOT="${WEBROOT:-/home/lillydebate/lillyrosenthal.org}"  # what Apache serves
BRANCH="${BRANCH:-main}"

# The webhook runs under PHP with a minimal PATH; pick up nvm / a local node if present.
[ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1 || true
export PATH="$HOME/.local/bin:/usr/local/bin:$PATH"

echo "== deploy $(date '+%F %T') as $(whoami)"
command -v node >/dev/null || { echo "node not found in PATH ($PATH)"; exit 1; }
echo "node $(node -v), npm $(npm -v)"

cd "$REPO"
[ -f .env ] || { echo "missing $REPO/.env (needs PUBLIC_MEDIA_BASE); copy .env.example"; exit 1; }
git fetch --quiet origin
git reset --hard --quiet "origin/$BRANCH"
echo "at $(git rev-parse --short HEAD): $(git log -1 --pretty=%s)"

npm ci --no-audit --no-fund --silent
npm run build

mkdir -p "$WEBROOT"
# --delete keeps the web root identical to dist/, except the webhook's own
# secret config, which lives only on the server.
rsync -a --delete --exclude 'config.local.php' dist/ "$WEBROOT"/
echo "== published to $WEBROOT"
