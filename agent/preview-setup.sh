#!/bin/bash
# agent/preview-setup.sh: build this worktree into $PREVIEW_ROOT, the way
# scripts/deploy.sh builds production: .env from the agent directory, npm ci,
# npm run build, then dist/ published. Run by swe-bridge (PREVIEW_MODE=build)
# right after the worktree is created and again after every agent turn, so the
# preview always shows the tree as it is. Idempotent; the worktree is never served.
#
# By hand, from a worktree:
#   PREVIEW_ROOT=$HOME/previews/lillyrosenthal-smoke/www bash agent/preview-setup.sh
#
# Keep this in step with scripts/deploy.sh: both must build the same thing.
set -euo pipefail
OUT="${PREVIEW_ROOT:?set PREVIEW_ROOT to the directory the preview vhost serves}"
AGENT_DIR="${AGENT_DIR:-$HOME/agents/lillyrosenthal.org}"

# Node 22+ (package.json: engines.node >= 22.12). The bridge runs without a
# login shell, so load nvm here if it is installed; otherwise whatever node is
# on the PATH is used, as long as it is new enough.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    set +u; . "$NVM_DIR/nvm.sh"; nvm use 22 >/dev/null 2>&1 || true; set -u
fi
command -v node >/dev/null 2>&1 || { echo "node not found: install Node 22 via nvm (docs/engineer-agent.md step 1)" >&2; exit 1; }
major="$(node -v | sed 's/^v//; s/\..*//')"
[ "$major" -ge 22 ] || { echo "node $(node -v) is too old; the site needs 22.12 or newer (nvm install 22)" >&2; exit 1; }
export UV_THREADPOOL_SIZE="${UV_THREADPOOL_SIZE:-2}" NODE_OPTIONS="--v8-pool-size=2 ${NODE_OPTIONS:-}"

# The build needs PUBLIC_MEDIA_BASE (media comes from the Cloudflare bucket;
# the server has no clips). The agent directory holds the preview .env.
if [ -f "$AGENT_DIR/.env" ]; then
    install -m 600 "$AGENT_DIR/.env" .env
fi
grep -Eq '^PUBLIC_MEDIA_BASE=https?://' .env 2>/dev/null \
    || { echo "PUBLIC_MEDIA_BASE not set: put PUBLIC_MEDIA_BASE=https://... in $AGENT_DIR/.env" >&2; exit 1; }

npm ci --no-audit --no-fund --silent
npm run build --silent
[ -d dist ] || { echo "the build produced no dist/" >&2; exit 1; }

mkdir -p "$OUT"
rsync -a --delete --exclude gitwebhook.php --exclude config.local.php dist/ "$OUT/"
find "$OUT" -type d -exec chmod 0755 {} +
find "$OUT" -type f -exec chmod 0644 {} +
echo "preview assembled at $OUT"
