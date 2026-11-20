#!/bin/bash
# Démarre l'API et le site avec les réglages des parcours e2e, base e2e vidée, trois négoces Sirene de démonstration.
# Usage : bash docs/groupe/test-complet/servir.sh (depuis baticlair/), puis le script parcours.mjs.
set -u
R=$(cd "$(dirname "$0")/../../.." && pwd)
fuser -k 3000/tcp 4000/tcp >/dev/null 2>&1; sleep 1
export NODE_ENV=test PORT=4000 DATABASE_URL=${E2E_DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/baticlair_e2e} AUTH_SECRET=e2e-secret-e2e-secret-e2e-secret-0000 API_PUBLIC_URL=http://localhost:3000 WEB_APP_URL=http://localhost:3000 EMAIL_PROVIDER=capture CRON_SECRET=e2e-secret-de-la-tache RESEND_WEBHOOK_SECRET='whsec_ZTJlLXNlY3JldC1kdS13ZWJob29rLTAwMDA=' REPONSES_DOMAINE=reponses.example.com FACTURE_EMETTEUR_NOM='BATI INVEST' FACTURE_EMETTEUR_FORME=SARL FACTURE_EMETTEUR_SIRET='910 796 325 00017' FACTURE_EMETTEUR_ADRESSE='6 impasse du Ouipoure, 22620 Ploubazlanec' FACTURE_EMETTEUR_TVA=FR61910796325 AI_PROVIDER=fake PLAN_ACTIVATION_CODES=E2E-SOLO-CODE:solo PAYWALL=on LOG_LEVEL=warn RATE_LIMIT=off GROUPE=on GROUPE_ADMINS=admin-groupe@example.fr SIRET_VERIFICATION=forme
cd "$R/apps/api" && npx prisma migrate deploy >/dev/null 2>&1 && node scripts/vider-base-e2e.mjs >/dev/null 2>&1
psql "$DATABASE_URL" -q -c "INSERT INTO negoce_sirene (siret, siren, nom, adresse, \"codePostal\", commune, departement, naf) VALUES ('44306184100047','443061841','POINT P PAIMPOL','ZONE DE KERPUNS','22500','PAIMPOL','22','46.73A'), ('33333333300011','333333333','LA RIVIERE MATERIAUX','12 RUE DE LA GARE','22300','LANNION','22','46.73B'), ('55555555500022','555555555','POINT P BREST','RUE DE L ARSENAL','29200','BREST','29','46.73A') ON CONFLICT DO NOTHING;"
nohup npx tsx src/main.ts > /tmp/test-complet-api.log 2>&1 &
cd "$R/apps/web" && API_URL=http://localhost:4000 nohup pnpm start > /tmp/test-complet-web.log 2>&1 &
for i in $(seq 1 60); do curl -sf http://localhost:4000/v1/health >/dev/null && curl -sf http://localhost:3000/connexion >/dev/null && echo "Prêt : http://localhost:3000" && exit 0; sleep 2; done
echo "Pas prêt (voir /tmp/test-complet-api.log et /tmp/test-complet-web.log)"; exit 1
