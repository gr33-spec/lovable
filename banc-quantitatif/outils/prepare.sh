#!/usr/bin/env bash
# Prépare le moteur de calcul de l'appli (branche de test, sans IA) dans banc-quantitatif/.moteur
# Rien n'est modifié dans l'appli : c'est une copie de lecture, construite à part.
set -euo pipefail
ICI="$(cd "$(dirname "$0")/.." && pwd)"
COMMIT="${1:-9d79748e5b5c0df85ce13b4c573cd4b4f268334b}"   # origin/claude/saas-achat-artisans-prompt-1lyihx (fiche roofing-2026.11.20-62)
cd "$ICI/.."
git fetch -q origin claude/saas-achat-artisans-prompt-1lyihx || true
[ -d "$ICI/.moteur" ] || git worktree add -q --detach "$ICI/.moteur" "$COMMIT"
cd "$ICI/.moteur/baticlair"
pnpm install --filter @baticlair/domain --frozen-lockfile >/dev/null
cd packages/domain && pnpm -s build
echo "moteur prêt : $(git rev-parse --short HEAD)"
