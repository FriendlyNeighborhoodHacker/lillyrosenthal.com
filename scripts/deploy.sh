#!/bin/bash
set -e

export HOME="/home/lillydebate"
export NVM_DIR="/home/lillydebate/.nvm"

if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
else
  echo "ERROR: nvm.sh not found at $NVM_DIR/nvm.sh"
  exit 1
fi

nvm use 22

echo "Node is: $(which node)"
echo "Node version: $(node -v)"
echo "npm is: $(which npm)"
echo "npm version: $(npm -v)"
set -euo pipefail
cd /home/lillydebate/deploy/lillyrosenthal.org
git fetch --prune
git reset --hard origin/main
             
cp -f /home/lillydebate/deploy/lillyrosenthal.org.secrets/.env .env
chmod 600 .env
grep -Eq '^PUBLIC_MEDIA_BASE=https?://' .env || { echo "PUBLIC_MEDIA_BASE not set in secrets .env"; exit 1; }
    

# Optional build steps here (composer install, cache clear, etc.)
npm run build
rm -rf /home/lillydebate/lillyrosenthal.org.old
if [ -d /home/lillydebate/lillyrosenthal.org ]; then
  mv /home/lillydebate/lillyrosenthal.org /home/lillydebate/lillyrosenthal.org.old
fi
mv /home/lillydebate/deploy/lillyrosenthal.org/dist /home/lillydebate/lillyrosenthal.org
