# Les e-mails réels de Mobiiz

Décision de Greg, 24 octobre 2026 : jouer un cycle complet sur iPhone avec de vrais e-mails. Cette page dit comment
brancher le domaine et ce qui protège les vrais destinataires pendant les tests.

## 1. Ce qui part, et comment

- Le prestataire est **Resend**. Il est déjà dans le registre des sous-traitants (`RGPD-SOUS-TRAITANTS.md`).
- **Chaque e-mail passe par la même mise en page** (`apps/api/src/platform/email/mise-en-page.ts`) :
  - le logo Mobiiz en haut ;
  - le texte du service ;
  - un pied légal : « Mobiiz, service édité par BATI INVEST, SARL, 6 impasse du Ouipoure, 22620 Ploubazlanec. SIRET 910 796 325 00017. » ;
  - un lien pour ne plus recevoir d'e-mails, avec l'en-tête `List-Unsubscribe` : celui de l'e-mail quand il en a un, sinon « Gérer tes e-mails » vers la page Compte.
- Les **relances** ont toujours leur propre lien, en un clic et sans connexion : notifications de la commande, grille envoyée au négoce, rappels de fin d'essai.
- Un e-mail de compte (code, mot de passe, facture) part même quand les notifications sont coupées.
- Test permanent : `apps/api/test/emails-reels.test.ts`. Il rejoue un cycle (inscription, négoce, clôture, rappel d'essai) et vérifie chaque e-mail capturé.

## 2. Les variables (projet `baticlair-api` sur Vercel)

| Variable | Exemple | Rôle |
|---|---|---|
| `RESEND_API_KEY` | (dans Vercel, jamais ailleurs) | Clé Resend. |
| `EMAIL_DOMAINE` | `mobiiz.fr` | Domaine vérifié chez Resend. |
| `EMAIL_EXPEDITEUR` | `bonjour` (par défaut) | Adresse d'envoi : l'expéditeur devient « Mobiiz <bonjour@mobiiz.fr> ». |
| `EMAIL_FROM` | — | Ancienne variable. Si elle est donnée, elle l'emporte. |
| `EMAILS_AUTORISES` | `greg@…` | **Prévisualisation seulement** : adresses ou domaines qui reçoivent vraiment. Obligatoire pour envoyer depuis une prévisualisation : sans elle, l'API refuse de démarrer. |
| `EMAIL_REDIRECTION` | ton adresse | Où vont les e-mails des autres destinataires, objet « [TEST → destinataire réel] … ». Par défaut, la première adresse de la liste blanche. |

En production (`VERCEL_ENV=production`), la liste blanche est éteinte : chacun reçoit ses e-mails.

## 3. Brancher le domaine (une fois, environ 30 minutes)

1. Resend → **Domains** → **Add domain** : `mobiiz.fr`, région Europe (Irlande).
2. Chez le registraire du domaine, ajouter les enregistrements DNS que Resend affiche :
   - **SPF** : un enregistrement `TXT` sur le sous-domaine `send` (`v=spf1 include:amazonses.com ~all`), avec l'enregistrement `MX` de retour que Resend donne.
   - **DKIM** : un enregistrement `TXT` `resend._domainkey` (la clé publique fournie par Resend).
   - **DMARC** : un enregistrement `TXT` `_dmarc`. Pour commencer, en surveillance : `v=DMARC1; p=none; rua=mailto:<ton adresse>`. Après deux semaines sans rejet, passer à `p=quarantine`.
3. Attendre que Resend affiche « Verified » (de quelques minutes à quelques heures).
4. Mettre `EMAIL_DOMAINE=mobiiz.fr` et `RESEND_API_KEY` dans Vercel, puis redéployer.
5. Vérifier : `GET /v1/health` doit dire `"email": true` dans `features`. Ensuite, s'inscrire avec une adresse de la liste blanche : le code arrive, avec le logo et le pied légal.

## 4. Pendant les tests sur iPhone (prévisualisation)

- `EMAILS_AUTORISES` : ton adresse (et celles des testeurs qui jouent avec toi).
- Les faux comptes de démo (`@demo.baticlair.fr`, domaine qui ne reçoit rien) ne sont pas sur la liste : leurs e-mails arrivent chez toi, objet « [TEST → artisan1@demo.baticlair.fr] … ». Tu vois ainsi ce que reçoit chaque faux artisan et chaque faux négoce.
- Tous les autres e-mails (un vrai négoce, un vrai artisan) arrivent chez toi, avec le vrai destinataire dans l'objet. Rien ne part chez quelqu'un qui n'a rien demandé.
- Sans `EMAIL_REDIRECTION` ni adresse complète dans la liste, un e-mail hors liste ne part pas du tout (il est seulement noté dans les journaux).
