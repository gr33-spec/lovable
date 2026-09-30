#!/usr/bin/env bash
# Lance tous les tests de parcours contre une application déjà démarrée.
set -euo pipefail
cd "$(dirname "$0")/.."
npx tsx e2e/seed.mts
status=0
for t in data security pages; do
  echo "── $t"
  node "e2e/$t.mjs" || status=1
done
exit $status
