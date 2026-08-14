#!/bin/bash
# Post-merge setup: runs automatically after a task merge.
# Installs dependencies and syncs the dev database schema.
set -e

cd "$(dirname "$0")/.."

echo "── API deps ──"
(cd Api && npm install --no-audit --no-fund)

echo "── Prisma schema sync + client ──"
(cd Api && npx prisma db push --skip-generate && npx prisma generate)

echo "── Admin panel deps ──"
(cd Admin.Web && npm install --no-audit --no-fund)

echo "── Storefront deps ──"
(cd Frontend.WEB && npm install --no-audit --no-fund)

echo "Post-merge setup complete."
