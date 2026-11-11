# Vérification avant validation (demande de Greg du 11 novembre 2026)

Rien ici ne concerne la production (branche git `main`, branche Neon `main`). Tout se passe sur la branche
`claude/saas-achat-artisans-prompt-1lyihx`, la base de test, `test.mobiiz.fr` et `api-test.mobiiz.fr`.
Les résultats chiffrés des suites sont dans le rapport remis à Greg et dans le livrable de preuves (hors dépôt, pour que
la version testée et la version déployée restent un seul et même commit).

## 1. Quelle version était en ligne

Constat du 11 novembre au matin : les deux domaines de test servaient le commit `99840674`, et non `81409636` comme
l'annonçait le rapport du 10. `99840674` est le commit de documents posé juste après ; `git diff 81409636 99840674` ne
touche que quatre fichiers `.md`. Le code était donc bien celui de `81409636`, qui contient les deux corrections
(compilation du profil public en mode non strict, livraison comptée en jours). Cause : `test.mobiiz.fr` et
`api-test.mobiiz.fr` suivent automatiquement le dernier déploiement de la branche ; un rattachement à la main est remplacé
à la poussée suivante. Règle retenue : la version finale est UN commit, on ne pousse plus rien après l'avoir testée.

## 2. Tests à dates figées

Méthode : `apps/api/test/support/horloge-decalee.ts`.
- `TEST_DECALAGE_JOURS=30 npx vitest run` fait croire au code testé qu'il est 30 jours plus tard. Lancé à +11, +26 et
  +62 jours avant correction : 9 fichiers (12 tests) cassaient, dont 7 dès le 21 novembre 2026.
- `horlogeAu("2026-11-05T09:00:00.000Z")` en tête d'un fichier fixe son horloge : il ne dépend plus du jour ni de l'heure.
  Aucune règle métier n'a été modifiée, seuls les tests le sont.

Les 27 fichiers de `apps/api/test` qui portent une date de novembre ou décembre 2026, plus `relances-lot-final` qui
dépendait de l'heure :

| État | Fichiers |
|---|---|
| Horloge fixée (16) | `abonnement`, `cap-22-octobre`, `demande-perso-recentrage`, `facturation-negoce-eteinte`, `groupe-admin`, `groupe-commande`, `groupe-demande`, `groupe-donnees`, `groupe-entree-besoin`, `groupe-multi-agences`, `groupe-notifications`, `groupe-onglet`, `groupe-rapport-mensuel`, `groupe-regroupement`, `liste-existante`, `relances-lot-final` |
| Dates relatives (1) | `groupe-choix` (fenêtre calculée depuis le jour du test) |
| Laissés tels quels (11) | `boucle-negoce`, `charge`, `commande-du-mois`, `commande-garantie`, `espace-negoce`, `groupe-sirene`, `isolation-toutes-routes`, `negocie-humain`, `suivi-des-demandes`, `suppression-listes`, `trois-cycles` : leurs dates passent par le paramètre `maintenant` des tâches (horloge déjà contrôlée) ou sont de simples valeurs |

Ce qui cassait et pourquoi : sept fichiers partagent une fenêtre de livraison « du 2 au 20 novembre 2026 » (un devis
déposé après le 10 avec dix jours de délai sort de la fenêtre) ; `abonnement` et `demande-perso-recentrage` portent une
date de besoin au 1er décembre 2026 ; `relances-lot-final` fabrique une échéance à minuit et cassait après 23 h UTC.
Après correction, la suite API complète passe sans échec à +200 jours, +400 jours et à 23 h 25 ; le domaine passe à
+26 et +400 jours. Non éprouvé de cette façon : les parcours de navigateur (`apps/web/e2e`), qui calculent déjà leurs
dates depuis le jour du test, sauf une date dans `parcours-artisan.spec.ts`.

Seul test ignoré de la suite API : `charge.test.ts` (200 artisans, 50 lots, 1 000 besoins). Il ne tourne que sur demande
(variable d'environnement), dure plusieurs minutes et mesure des temps de réponse. Il ne couvre aucune règle : sa
désactivation ne masque pas un défaut de fonctionnement, seulement l'absence d'une mesure de charge récente.

## 3. Branches Neon (projet `royal-mountain-39478482`, plafond : 10 branches, atteint)

| Nom exact | Créée le | Copie de | Environnement | Utilité connue | Données uniques | Si on la supprime |
|---|---|---|---|---|---|---|
| `main` | 1er oct. | (origine) | PRODUCTION | la base de production | oui | INTERDIT |
| `preview/claude/saas-achat-artisans-prompt-1lyihx` | 1er oct. | `main` | TEST (test.mobiiz.fr) | la base de test | oui | INTERDIT, et elle porte quatre sauvegardes |
| `preview/claude/baticlair-analysis-g3vbth` | 19 oct. | `main` au 19 oct. | prévisualisation d'une ancienne branche git | aucune depuis le 19 oct. | non (copie de la production du 19 oct.) | la prévisualisation de cette branche git perd sa base ; la plateforme en recrée une à sa prochaine poussée |
| `sauvegarde-prod-2026-10-24` | 24 oct. | `main` au 24 oct. 04 h 08 | sauvegarde de la PRODUCTION | seul point de retour durable de la production | oui (état du 24 oct.) | on perd la seule sauvegarde de la production : à garder |
| `preview/dependabot/npm_and_yarn/boutique/mineures-59dc27f00b` | 1er nov. | `main` au 1er nov. | prévisualisation automatique d'une mise à jour de dépendances | aucune depuis le 1er nov. | non (copie de la production du 1er nov.) | la prévisualisation de cette mise à jour perd sa base ; recréée si la branche git est repoussée |
| `sauvegarde-avant-mes-listes` | 1er nov. 11 h 10 | la base de test | sauvegarde du TEST | retour avant « Mes listes » | oui : seul état du test d'avant le 1er nov. | plus de retour possible avant le 1er novembre |
| `sauvegarde-avant-rapprochement` | 6 nov. 13 h 19 | la base de test | sauvegarde du TEST | retour avant le rapprochement | oui : état du 6 nov. | plus de retour au 6 novembre |
| `sauvegarde-avant-lots-prompt-maitre` | 7 nov. 05 h 38 | la base de test | sauvegarde du TEST | retour avant les lots du prompt maître | presque pas : une autre sauvegarde existe une heure plus tard | on ne peut plus revenir exactement à 05 h 38 ; on peut toujours revenir au 6 nov. 13 h 19 ou au 7 nov. 06 h 38 |
| `sauvegarde-avant-acces-demo` | 7 nov. 06 h 38 | la base de test | sauvegarde du TEST | retour avant l'accès démo | oui : état du 7 nov. matin | plus de retour au 7 novembre matin |
| `sauvegarde-avant-achats-groupes-v1` | 7 nov. 19 h 39 | la base de test | sauvegarde du TEST | retour avant les achats groupés V1 | oui : dernier état avant les achats groupés | à garder |

Recommandation : supprimer `sauvegarde-avant-lots-prompt-maitre` (`br-noisy-frog-b2wy0xkl`). Elle ne touche que le test,
elle double presque `sauvegarde-avant-acces-demo` prise une heure après, et ce qu'elle protégeait (les lots du prompt
maître) est en service depuis. Autre choix possible : l'une des deux prévisualisations, qui ne sont pas des sauvegardes ;
mais elles tiennent à des branches git encore ouvertes et la plateforme les recréerait, reprenant la place libérée.
Aucune suppression n'est faite sans l'accord explicite de Greg. Dès l'accord : supprimer la branche choisie, créer
`sauvegarde-avant-ux-complet-2026-11-11` depuis la base de test, puis vérifier qu'elle est utilisable (lecture du nombre
de tables et de lignes par un point d'accès en lecture, comparé au relevé du jour) avec
`docs/groupe/recette-en-ligne/sauvegarde-neon.mjs` et `releve-base-test.mjs`.

## 4. Test réel de la réception des réponses négoces (prêt, non exécuté)

Script : `docs/groupe/recette-en-ligne/reception-negoce.mjs`. Sans `--envoyer`, il n'envoie rien.

Ce qui existe : le domaine `mobiiz.fr` reçoit le courrier chez Resend ; UN SEUL webhook entrant existe, vers
`https://api-test.mobiiz.fr/v1/webhooks/resend` (vérifié en lecture le 11 novembre). Aucun courrier entrant n'atteint donc
la production ; le script refuse de partir si un autre webhook entrant apparaît.

Ce que le test fera, sur des comptes créés pour l'occasion puis supprimés :
1. vrai e-mail avec PDF à l'adresse de réponse du négoce 1 : bon quantitatif, bon négoce, PDF devenu le devis reçu du
   négoce 1 et pas du négoce 2, alerte courte dans la cloche ;
2. une autre entreprise ne lit ni l'e-mail ni le fichier (404) ;
3. doublon : le même e-mail renvoyé est gardé, le devis n'est ni remplacé ni doublé ;
4. réponse reconnue par le repère de l'objet, sans étiquette dans l'adresse ;
5. e-mail sans repère : dans « Mes reçus », non rattaché, puis rattaché à la main ;
6. adresse que personne n'a : mis de côté pour l'admin, invisible pour les artisans.

Envois : une vingtaine d'e-mails (deux confirmations de compte, deux demandes vers des boîtes de test Resend, cinq e-mails
de test partant de `recette@mobiiz.fr`, les avis à l'artisan, un code d'admin) sur le plafond gratuit de 100 par jour.
Coût : 0 €. Aucun vrai négoce, aucun paiement, aucun appel IA. Aucune manipulation manuelle. Durée : environ dix minutes.
Reste en base de test après le passage : l'e-mail « mis de côté » (il n'appartient à aucun compte).
Le script n'a jamais tourné : une première exécution peut révéler un défaut du script lui-même.

Limites connues du circuit, à connaître avant le test :
- Un doublon n'est reconnu que si Resend rejoue le même événement. Un négoce qui envoie deux fois le même e-mail produit
  deux e-mails reçus ; seul le premier PDF devient le devis.
- Le rattachement tient à l'étiquette de l'adresse ou au repère de l'objet, pas à l'adresse de l'expéditeur : un
  commercial qui répond d'une autre boîte est accepté, et quiconque connaît l'adresse étiquetée peut y écrire.
- Le montant d'un devis PDF reçu par e-mail n'est pas lu (aucune lecture IA des devis de négoce depuis le 28 octobre).

## 5. Écarts restants avec les maquettes : Quantitatifs

Complexité : S = moins d'une demi-journée, M = un à deux jours, L = plus de deux jours.

| Capture | Route et écran actuels | Différence | Déjà opérationnel | Travail restant | Risque de régression | Complexité |
|---|---|---|---|---|---|---|
| 02 Mes quantitatifs | `/chantiers`, `chantiers/page.tsx` | bouton « Créer » pleine largeur sur la maquette, petit bouton et « ? » ici ; quatre filtres (En cours, Envoyés, Réponses, Terminés) contre cinq ici ; la pastille d'état au-dessus du nom sur la maquette, sous le nom ici ; « Sélectionner » et le menu « … » absents de la maquette | recherche, filtres, suppression, sélection multiple | redessiner l'en-tête et la carte, décider du sort du cinquième filtre | moyen : douze tests de parcours lisent ces libellés | M |
| 03 Créer un quantitatif | `/chantiers/nouveau`, `nouveau-quantitatif.tsx` | quatre cartes (Parler, Importer, Photo, Saisir) et l'encart « Tu gardes toujours le dernier mot » sur la maquette ; ici une question à la fois (décision du 8 novembre) | les quatre entrées existent | présenter les quatre entrées en cartes | moyen : parcours d'entrée testés sur deux appareils | M |
| 27 Assistant, clarification | conversation de `nouveau-quantitatif.tsx` | bulles jaunes et claires, boutons de choix, encart « Pourquoi cette question ? » | questions, choix, réponse libre, dictée | reprise visuelle des bulles et de l'encart | faible | M |
| 28 Assistant, liste prête | même écran | carte « Ta liste en cours » avec lot, « Ajouter un autre matériau », « Créer mon quantitatif » | la liste se construit et se valide | carte récapitulative dans la conversation | moyen : touche la validation | M |
| 29 Fiche du quantitatif | `/chantiers/[id]`, `project-takeoff.tsx` | maquette : état, articles par lot, deux cartes d'action, « Modifier » ; ici une frise d'étapes, « Ouvrir l'assistant », « Ton chantier », les fournitures, une barre « Aperçu / Demander les prix », un bloc regroupement | tout le suivi et les deux actions | refonte de la fiche | ÉLEVÉ : écran le plus testé et régi par le référentiel (§48 à §50) | L |
| 30 Choisir les négoces | feuille « À qui j'envoie ? », `project-price-requests.tsx` | page entière avec recherche et « jusqu'à 3 négoces » ; ici une feuille, limite de 1 ou 5 selon la formule | carnet, spécialités, envoi | page dédiée ; limite à trancher par Greg | moyen : droits des formules | M |
| 31 Demande envoyée | `/chantiers/[id]`, onglet Suivi, `dossier-demande.tsx` | écran de confirmation dédié (coche, « Envoyée à », « Et maintenant ? ») ; ici on arrive sur le dossier de la demande | suivi, relance, écrire au négoce | écran de confirmation | faible | S |
| 32 Comparer les propositions | onglet Offres, `project-offers.tsx` | cartes avec total, « Meilleur total », livraison, « 3/3 articles chiffrés » ; ici le devis reçu s'ouvre en PDF, la comparaison chiffrée n'existe que pour une réponse saisie par le lien | réponse par lien comparée article par article | cartes de totaux ; le total d'un PDF demande une lecture (IA payante ou saisie) | moyen ; dépend d'une décision sur la lecture des devis | L |
| (hors maquette) | page « Page introuvable » | s'affiche sur fond clair même en thème sombre | fonctionne | suivre le thème | faible | S |

## 6. Écarts restants avec les maquettes : Achats groupés

| Capture | Route et écran actuels | Différence | Déjà opérationnel | Travail restant | Risque de régression | Complexité |
|---|---|---|---|---|---|---|
| 04 Achats groupés | `/achats-groupes`, `ag-v1-accueil.tsx` | maquette : carte « Mes participations », recherche d'un matériau, filtre de métier, liste, bouton « Ajouter un besoin depuis un quantitatif » ; ici « Mes besoins » en liste, « Achats ouverts » avec un sélecteur de métier, lien « Ajouter un matériau sans quantitatif », pas de recherche | besoins, achats ouverts, deux entrées | carte de participations, champ de recherche, bouton jaune | moyen : 24 parcours sur trois appareils | M |
| 04b Filtre des métiers | sélecteur de la même page | page entière avec recherche et grille de métiers ; ici un menu déroulant | filtrage par métier | page de choix du métier | faible | S |
| 05 Détail d'un achat groupé | `/achats-groupes/[id]` | « Besoins actuellement confirmés : 86 palettes par 8 entreprises », « Ton besoin », « Comprendre le fonctionnement » ; ici les volumes ne se montrent qu'à partir de 5 entreprises, et l'écran dit « Un achat groupé correspond » | rejoindre, comprendre les volumes | mise en page ; la règle des 5 entreprises reste | faible | S |
| 33 Sélection des articles | `/achats-groupes/quantitatif/[projectId]`, `ag-v1-quantitatif.tsx` | très proche ; maquette avec bloc « À préciser ou non disponibles » et « Sélectionner les recommandations » ; ici « Cocher les articles conseillés » et « Pourquoi ? » par ligne | classement par lot, lignes jamais cachées | libellés et bloc du bas | faible | S |
| 34 Quantité, livraison, date | `/achats-groupes/nouveau`, étape « Combien, où et pour quand ? », `ag-v1-direct.tsx` | maquette en lignes à chevrons (une valeur par ligne) ; ici un formulaire direct ; « Contraintes de livraison (camion 19 t) » n'existe pas | quantité, réception, lieu privé, zone, date | lignes à chevrons ; la contrainte de camion est une donnée nouvelle | moyen si la donnée est ajoutée (migration) | M |
| 42 Vérification de l'entreprise | étape « Ton entreprise » | maquette : pastille « INSEE vérifié », fonction, case « autorisé à représenter » ; ici trois lignes cochées et la fonction déclarée | SIRET vérifié, e-mail confirmé, fonction | pastille et case à cocher explicite | faible | S |
| 35 Confirmer les besoins | étape « Vérifie et valide » / « Confirmer mon besoin » | pastilles « Rejoindra » / « Ouvrira » par ligne sur la maquette ; ici une phrase par ligne | confirmation, engagement écrit | pastilles | faible | S |
| 48 Aucun achat compatible | même écran | très proche ; boutons « Ouvrir cet achat groupé » et « Garder cette ligne dans mon quantitatif » | ouvrir un achat | libellés des deux boutons | faible | S |
| 36 Besoins ajoutés | retour à l'accueil avec un bandeau vert « C'est fait » | maquette : écran dédié, coche, pastilles « Rejoint » / « Nouveau », « Voir mes participations » | les besoins sont suivis | écran de confirmation | faible | S |
| 37 Mes participations | `/achats-groupes/mes-besoins` | maquette : onglets En cours / À faire / Terminés et bouton d'action sur la carte ; ici une liste « À faire » puis le reste, sans onglets | reconfirmer, examiner, suivre | onglets | faible | S |
| 38 Détail d'une participation | `/achats-groupes/besoins/[id]`, `ag-v1-besoins.tsx` | maquette en trois blocs (état, ton besoin, volumes) ; ici titre du produit en très grand, deux blocs | modifier, retirer, historique | mise en page ; titre trop grand sur petit écran | faible | S |
| 39 Reconfirmation | même écran, état « Préparation de la consultation » | maquette : case à cocher puis « Reconfirmer 10 palettes », « Modifier avant de reconfirmer » ; ici un bouton « Reconfirmer ma quantité » | reconfirmation, échéance | case et second bouton | faible | S |
| 40 Offre à examiner | même écran, état « Offre à examiner » | maquette : montant estimé, écart en pourcentage, volume final, « Télécharger le détail » ; ici le calcul ligne à ligne, bouton final grisé | offre complète, bouton final désactivé (V1) | carte de montant, écart, téléchargement | moyen : chiffres affichés à l'artisan | M |
| 41 Modifier ou retirer | feuilles « Modifier » et « Retirer » | maquette : une page « Que veux-tu faire ? » avec motif ; ici deux gestes séparés, « Garder mon besoin » d'abord | modifier, reporter, retirer avec confirmation | page unique et motif | faible | S |

Total estimé de la reprise graphique : environ huit à douze jours de travail, dont la fiche du quantitatif (29) et la
comparaison (32) font la moitié. Ce chantier est séparé et n'a pas commencé.
