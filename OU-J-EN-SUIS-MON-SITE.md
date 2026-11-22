# Où j'en suis — discussion « messagerie / Mon site » (à lire en premier à chaque reprise)

Mis à jour : 22 novembre 2026, soir. Session : https://claude.ai/code/session_0188g8PcmvctNcTq82VPRdt3

## En ligne (test.mobiiz.fr, commit 5e925054, chaîne 123 verte, vérifié par /version)
- PARTIE 1 FAITE : e-mails entrants blindés (SPF/DKIM/DMARC, pièces dangereuses, message externe jamais habillé en Mobiiz,
  Indésirables + admin « E-mails bloqués », alerte 30/h, rattachement seulement si négoce de la demande ET authentifié).
  Saboteur : 53 attaques, toutes bloquées. DMARC de mobiiz.fr en `p=reject` (vérifié en ligne).
- « Ajoute ta quantité » (achats groupés) validé par Greg ; défilement « ce qui apparaît se montre ».

## PARTIE 2, la messagerie : EN LIGNE (commit 3867235c, chaîne 125 verte, /version vérifié)
- Code écrit dans une copie à part : worktree `/home/user/wt-p2`, branche locale `messagerie-p2`, commit 41edc97f
  (partie du commit 5d815abc, donc AVANT les fusions du soir : à fusionner dans la branche de test, conflits possibles).
  Si le worktree a disparu (nouveau conteneur), la branche locale est perdue : tout refaire d'après la liste ci-dessous.
- Fait dans la copie :
  - serveur : table `message_envoye` (migration additive `20261122120000_messages_envoyes`), journal des envois
    (`platform/email/journal-envois.ts`, champ `envoi` sur l'e-mail ; posé sur demande de prix, bon de commande, relance,
    « prévenir les autres », réponse) ; `POST /v1/recus/:id/repondre` (part de l'adresse Mobiiz, au négoce de la demande,
    avec son étiquette, refusé si non rattaché) ; `POST /v1/recus/:id/indesirable` ; `GET /v1/recus/indesirables` ;
    `GET /v1/messagerie` (Reçus par chantier, « N réponses sur M », un négoce une fois, autres messages) ;
    `GET /v1/messagerie/envoyes[/:id]` ; `GET /v1/messagerie/fil/:recipientId` ; étape `parties` de `/v1/projects` ;
    test `apps/api/test/messagerie.test.ts` (5 tests) ; isolation : routes ajoutées.
  - écran : `components/messagerie.tsx` (Reçus / Envoyés / Indésirables, pastille camion jaune / poignée de main grise,
    chantier qui se déplie, deux colonnes sur ordinateur, Retour au même endroit par sessionStorage), message de négoce
    (`ReponseNegoce` : fil, « Répondre », « Signaler comme indésirable », « Ce n'est pas un indésirable », plus de mailto
    ni « Appeler »), `/messages/envoye/[id]`, brouillons repliés « À terminer (N) » en bas de Demandes, fiche : un négoce
    une seule fois (plus de « Écrire à »), e2e `e2e/messagerie.spec.ts`, mises à jour `missions.spec.ts`.
- RESTE : fusionner, `tsc`/`eslint`, tests ciblés (messagerie, isolation, adresse-mobiiz, demandes), construire, e2e
  ciblés (messagerie, missions, ma-page, accueil-mes-listes, parcours-artisan « Mes demandes »), captures petit iPhone
  et ordinateur clair/sombre, chaîne complète, fusion de la branche de test, push, vérifier /version, CLAUDE.md, rapport court.
- Notifications : une réponse de négoce rattachée allume déjà la cloche ; la pastille de l'onglet Messages compte les non-lus.

## PARTIE 3, la dictée du quantitatif : CODÉE, chaîne 126 en cours (commit bf3ba91b)
- Fait : `lib/dictee.ts` (écoute continue, pas de doublon Android), `chat-mobiiz.tsx` (`EcouteEnCours` : onde jaune
  Web Audio, chrono, Annuler, gros bouton rouge centré), `journey.tsx` (à l'arrêt, le message part en bulle ; toucher la
  bulle la rouvre). Test e2e « la dictée du quantitatif » (téléphone + ordinateur) vert ; assistant inchangé (vert).
- Captures : scratchpad `captures-dictee/` (Pixel 7 et ordinateur, clair et sombre). Reste : petit iPhone.
- RESTE : chaîne verte → refusionner la branche de test → pousser → /version → rapport court (dire à Greg de tester sur
  son iPhone : Safari peut couper l'écoute après un long silence).

## Règles en cours (Greg)
- Jamais main ni production ; aucun e-mail réel à un négoce ; aucun paiement ; aucun appel IA payant hors site de test
  dans `BUDGET_IA_JOUR` ; e-mails réels seulement vers les adresses de Greg ; Stripe test seulement.
- Ne pas toucher au moteur, au calcul, aux suggestions ni aux questions du quantitatif (discussion du banc d'essai).
- L'écran de la liste de matériaux (`supply-list.tsx`) est au banc d'essai (flèche, « Calculé / À vérifier », maquette
  « Fournitures » déjà faite sur sa branche) : ne pas y toucher. Voir `banc-quantitatif/COORDINATION.md`.
- Pousser sur la branche de test seulement un commit dont TOUTE la chaîne est verte, après avoir fusionné la branche de
  test ; vérifier ensuite que https://test.mobiiz.fr/version ET https://api-test.mobiiz.fr/version donnent ce commit.
  La branche bouge souvent (autres discussions) : fusionner juste avant la chaîne, revérifier juste avant de pousser.
- Chaîne : `scratchpad/chaineNN.sh` (copie de chaine118.sh avec finalNN) ; ~1 h 45 ; rien de lourd en parallèle ;
  ne jamais modifier les sources pendant une chaîne (travailler dans le worktree).
- Commits : `git -c user.name=Claude -c user.email=noreply@anthropic.com commit`, fin du message :
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` et `Claude-Session: …session_0188g8PcmvctNcTq82VPRdt3`.
  Après un push : `git branch -f achats-groupes-v1 HEAD`.
- Chaque règle changée se dit « Règle changée : avant → après » ; rapport court en français, tutoiement.
- Migrations additives et réversibles ; aucune suppression de données ; aucune nouvelle dépendance sans accord.
