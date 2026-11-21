# Audit avant commercialisation — 11 octobre 2026

Point de départ : `main` à 2f10b32 (PR #227). Demande du fondateur : « Refais une vérification complète de l'application. Tout doit être fonctionnel et fiable à 100 % car je veux commercialiser. »

Ce qui a été vérifié :

- **Toutes les suites de tests**, sur `main` puis après chaque correction : domaine (775), API (282 à la fin), parcours e2e sur téléphone et ordinateur (66 à la fin), types, lint, build.
- **L'isolation entre entreprises, route par route.** Un nouveau test permanent relève toutes les routes de l'API sur l'application elle-même. L'entreprise B appelle chacune avec les identifiants de l'entreprise A, en deux passes : un corps quelconque, puis un corps valide avec fichier. Résultat : aucune fuite.
- **Les routes sans session** : toutes refusent, sauf la santé et la connexion.
- **Les dépendances** (`pnpm audit`), les en-têtes de sécurité, la configuration de l'authentification et les limites de débit.
- **Les cas d'échec du parcours** : prestataire d'e-mail en panne, double appui, écran qui plante, adresse inconnue, session expirée, budget IA.

Ce qui n'a pas pu l'être d'ici :

- **La production elle-même.** Le réseau de cette session bloque `*.vercel.app`, donc la liste de contrôle ci-dessous est à faire de ton côté.
- **Une vraie lecture IA d'un devis.** Les tests utilisent un lecteur simulé.

Classement : **bloquant** (faux résultat, donnée exposée, demande perdue, ou interdit de vendre en l'état), **gênant**, **détail**.

## Corrigé pendant l'audit

| # | Constat | Correction | PR |
|---|---------|------------|----|
| B1 | **Une demande passait « envoyée » sans que le mail parte.** Resend refusait le mail (clé, quota, adresse rejetée) ou était en panne : l'échec était seulement journalisé. L'artisan attendait une réponse que le fournisseur n'avait jamais reçue. | Un mail fournisseur doit partir (`mustDeliver`). Sinon l'artisan lit « Le mail n'est pas parti chez le fournisseur. Rien n'est envoyé : réessaie dans un instant. », et la demande reste « à envoyer ». | #229 |
| B2 | **« Répondre » écrivait à BatiClair, pas à l'artisan.** Le mail n'avait pas d'adresse de réponse. | `reply_to` = l'e-mail de l'entreprise, sinon celui du compte. | #229 |
| B3 | **Double envoi.** Après une panne sur le 2e fournisseur, rappuyer sur « Envoyer » renvoyait le mail au 1er. | Un fournisseur déjà servi n'est jamais renvoyé. | #229 |
| G1 | **Un écran qui plante affichait la page blanche anglaise de Next** (« Application error »), et personne n'était prévenu. | Écran « Oups, cet écran a eu un souci », avec « Réessayer » et « Retour à l'accueil ». L'erreur part à l'équipe par les alertes, sans donnée de client. | #228 |
| G2 | **Une adresse inconnue affichait la 404 anglaise de Next.** | « Page introuvable », avec « Retour à l'accueil ». | #228 |
| G3 | **Next 16.3.6 : 6 failles connues**, dont une SSRF dans l'optimisation d'image. | Next 16.3.8. | #228 |
| D1 | Le micro restait autorisé, alors que la voix est retirée. | `microphone=()`. | #228 |
| D2 | Le message « métier non couvert » disait encore « couverture et plâtrerie ». Il y a 22 métiers. | Message corrigé. | #229 |

Tests permanents ajoutés : `isolation-toutes-routes`, `erreurs-navigateur`, `envoi-fiable`, et l'e2e « adresse inconnue ».

## À faire de ton côté avant de vendre (bloquants hors code)

Ces points demandent des informations que toi seul as. Je peux écrire les pages dès que tu me les donnes ; pour les textes juridiques, une relecture par un juriste reste conseillée.

| # | Constat | Ce qu'il faut |
|---|---------|---------------|
| L1 | **Pas de mentions légales.** Elles sont obligatoires pour tout site (LCEN, art. 6). | Raison sociale, forme juridique, capital, SIRET / RCS, siège, directeur de la publication, contact. L'hébergeur (Vercel) est déjà connu. |
| L2 | **Pas de CGU / CGV.** Il en faut pour vendre un abonnement. | Prix HT, durée, résiliation, et surtout une **clause de responsabilité** : la liste est une aide au chiffrage, l'artisan vérifie et reste responsable de sa commande. |
| L3 | **Confidentialité incomplète.** Les données, leur durée, les hébergeurs et la CNIL y sont, mais pas **qui** est responsable du traitement ni **comment le joindre**. | Le nom de ta société et une adresse de contact. |
| L4 | **Aucun moyen de joindre le support dans l'application.** | Une adresse (ou un numéro) à afficher dans « Compte ». |
| L5 | **Pas d'encaissement en ligne ni de facture.** Les formules s'activent à la main, par code, et le paywall est en pause (PR #227). | Choisir : paiement en ligne (Stripe…), ou facturation à la main au début. |

## À vérifier en production (je ne peux pas y accéder d'ici)

1. Ouvre `https://<ton-api>/v1/health`. La réponse doit dire `"email": true, "ai": true, "alerts": true`. Un `false` signifie respectivement : pas d'envoi réel, pas de lecture IA, personne n'est prévenu d'une panne.
2. Resend :
   - le domaine de `EMAIL_FROM` doit être **vérifié** (SPF et DKIM), sinon les mails partent en spam ou sont refusés ;
   - avec la correction B1, un refus se voit maintenant à l'écran : c'est voulu.
3. Alertes : `ALERT_WEBHOOK_URL` ou `ALERT_EMAIL` renseigné.
4. `PAYWALL` absent (en pause) tant que tu ne veux pas le rallumer.
5. Neon : vérifier la durée de restauration (sauvegardes) de ton offre.
6. Pour que je vérifie moi-même la production, autorise `*.vercel.app` dans l'accès réseau de cet environnement.

## Gênant, à décider

| # | Constat | Proposition |
|---|---------|-------------|
| G4 | **N'importe qui peut s'inscrire sans vérifier son e-mail**, puis envoyer jusqu'à 60 mails par heure, depuis le domaine BatiClair, à n'importe quelle adresse saisie comme « fournisseur ». Un mauvais usage (spam) abîmerait la réputation du domaine, et les mails de tous les clients partiraient en spam. | Exiger un e-mail vérifié avant le premier envoi à un fournisseur. C'est un clic dans le mail d'inscription, sans gêne pour un vrai artisan. |
| G5 | Le site n'a pas de politique de contenu (CSP). Les autres en-têtes de sécurité sont en place (cadre interdit, HSTS, nosniff, référent). | À ajouter avec prudence, après tests, car une CSP trop stricte casse l'affichage. |

## Détails

- D3 : trois listes (documents, lecture, demandes d'un chantier) répondent « vide » au lieu de « introuvable » pour le chantier d'une autre entreprise. Aucune donnée n'est exposée (vérifié par le test d'isolation).
- D4 : `pnpm audit` signale encore 4 alertes. Elles concernent uniquement des outils de développement (CLI Prisma : mysql2, deepmerge-ts ; vitest : source-map-js), jamais exécutés en production. MySQL n'est pas utilisé.

## Ce que « fiable à 100 % » veut dire ici

Aucun logiciel n'est fiable à 100 %. Ce qui est garanti, c'est que chaque règle est tenue par un test permanent, qui casse la CI au moindre écart : 775 tests du moteur, 282 de l'API, 66 parcours sur téléphone et ordinateur. Ce qui ne peut pas l'être ici, c'est la lecture réelle par l'IA d'un devis inconnu. C'est le rôle de la campagne de 20 devis réels, toujours en attente du réseau.
