# Améliorations UX/UI, lot 1 (Greg, 1er novembre 2026, suite de l'audit Impeccable)

Méthode : les guides d'Impeccable (critique, audit, distill), appliqués avec nos outils (Playwright, axe-core). Impeccable
n'est pas installé (accord de Greg) : aucun hook, aucun programme externe, aucune dépendance ajoutée. Identité MOBIIZ
inchangée (jaune #FED206, noir profond, blanc et ivoire, mêmes polices et composants).

## 1. Corrigé dans ce lot

| # | Défaut (audit) | Correction | Fichiers |
|---|---|---|---|
| F1 | L'assistant répétait « J'ai préparé ta liste… » à chaque réouverture | Le fil gardé reste entier ; l'état du moment ne s'ajoute que s'il dit autre chose que le dernier message de Mobiiz ; les doublons déjà gardés sur l'appareil sont repliés (`filALaReouverture`) | `packages/domain/src/assistant/assistant.ts`, `apps/web/src/components/assistant-mobiiz.tsx` |
| D1 | iPhone SE : « Terminées » chevauchait « Sélectionner » (Mes listes) | La ligne des filtres passe à la ligne seulement quand la place manque ; « Sélectionner » reste à droite | `apps/web/src/app/(app)/chantiers/page.tsx` |
| D3 | Afficheur PDF : « Télécharger » blanc sur jaune (1,45:1) ; « Fermer » encre sur fond sombre en thème sombre (1,47:1) | Texte encre `#130901` sur le jaune (le jaune ne change pas) ; « Fermer » blanc écrit sur le bouton (la règle du thème sombre lui remettait l'encre) | `apps/web/src/components/file-viewer.tsx` |
| D3 bis | Même blanc sur jaune sur les écrans d'erreur et « Page introuvable » | Texte encre | `apps/web/src/app/error.tsx`, `apps/web/src/app/not-found.tsx` |
| D4 | Assistant sur ordinateur : « Touche une ligne pour la modifier » à 2,05:1 | Ivoire à 75 % (le panneau de l'aperçu est toujours sombre) | `assistant-mobiiz.tsx` |
| D8 | Menu du bas : libellés à 10,5 px | 12 px | `apps/web/src/components/app-nav.tsx` |
| D13 | Le texte de dessous se lisait à travers le menu du bas | Verre à 92 % (au lieu de 78 %), l'effet reste | `apps/web/src/app/globals.css` |
| D10 | Actions sous 44 px | 44 px : « Valider » / « Préciser » de la liste, « Modifier » du bref et des lignes ouvertes, croix et « Voir PDF » de l'assistant, réponses en boutons de l'assistant, « Compris », « Comment fonctionne l'analyse ? », liens légaux dans Profil | `supply-list.tsx`, `chat-mobiiz.tsx`, `assistant-mobiiz.tsx`, `coup-de-main-ia.tsx`, `legal.tsx` |
| D9 | Deux styles de retour | « Ma liste de matériaux » et « Mon abonnement » prennent le retour rond à côté du titre, comme un chantier et les rubriques de Profil | `chantiers/nouveau/page.tsx`, `abonnement/page.tsx` |
| D14 | « Assistant Mob… » tronqué sur iPhone SE ; « ? » seul en début de ligne | « Assistant » seul sous 400 px ; espace insécable avant « ? » dans les deux titres concernés | `chat-mobiiz.tsx`, `saisir-ma-liste.tsx`, `achat-groupe.tsx` |
| D11 | Compteur d'analyses : `dl` neutralisé par `role="status"` (lecteur d'écran) | Le rôle passe sur un conteneur | `coup-de-main-ia.tsx` |
| D16 | L'aperçu PDF qui défile n'était pas atteignable au clavier | `tabIndex=0` sur la zone | `pdf-pages.tsx` |
| D5 (partie sûre) | « Fournisseurs », « Mes fournisseurs », « Mes négoces » ; « Aucun négoce encore » au-dessus de négoces listés | « Mes négoces » partout (titre, menu, boutons, recherche, vide, archivage, suppression) ; le bloc du regroupement s'appelle « Négoces des achats groupés », passe sous le carnet, et dit « Aucun négoce pour les achats groupés » ; routes, données et envois inchangés | `fournisseurs/page.tsx`, `mes-negoces.tsx`, `menu-artisan.tsx` |
| — | « les demandes de le regroupement », « ajoute un chantier à le regroupement » | « du regroupement », « au regroupement » | `mes-negoces.tsx`, `groupe/page.tsx` |

## 2. Le regroupement sur une liste individuelle (décision du 22 octobre) — à décider par Greg

**Pourquoi la fonctionnalité existe.** Nouveau cap du 22 octobre (DECISIONS, lignes du 22/10) : « Paie tes matériaux moins
cher ». Le regroupement (aujourd'hui « achat groupé ») additionne les MÊMES lignes de plusieurs artisans d'un secteur
pour obtenir un meilleur prix. Pour que deux lignes soient « les mêmes », elles doivent être PRÉCISES (format, origine,
modèle, teinte… : `precisionDeLigne`, `packages/domain/src/groupe/precision.ts`). Une ligne VAGUE (« Ardoise naturelle
32×22 » sans origine ni qualité) ne peut pas être regroupée.

**À quoi sert la pastille.** Décision de Greg du 22 octobre : « la ligne vague ne bloque rien, mais elle n'entre pas dans la
commande commune ». La pastille orange « Précise pour l'ajouter au regroupement » invite l'artisan à préciser sa ligne
pour qu'elle PUISSE rejoindre un regroupement ; ses questions sont en boutons ; la réponse s'écrit dans la désignation.

**Ce qui est volontaire.** (1) La ligne vague part quand même chez le négoce de l'artisan (rien ne bloque l'envoi
individuel). (2) Seules les lignes précises sont regroupées ; l'API refuse une ligne vague (400 `ligne_vague`). (3) Les
questions de précision sont celles du comptoir (rien d'inventé).

**Ce qui est une confusion UX** (constaté sur captures) : sur une liste de DEMANDE DE PRIX INDIVIDUELLE, la ligne vague a
la même bordure orange et le même bouton « Préciser » que les lignes qui bloquent l'envoi, alors que le compteur dit « 1
ligne à vérifier » (il compte, à raison, seulement ce qui bloque). L'artisan voit 3 lignes orange pour 1 à régler, et lit
une invitation à l'achat groupé au milieu d'une demande individuelle.

**Proposition la plus simple, sans toucher aux règles métier** : sur une liste individuelle, la ligne vague n'est plus
orange ni « à régler » : elle reste neutre (pas de bordure, pas de bouton « Préciser ») ; la phrase « Précise pour
l'ajouter au regroupement » et ses questions restent dans la ligne ouverte (rien n'est supprimé). Dans le parcours d'achat
groupé (« Ajouter ma liste à un achat groupé »), rien ne change : la ligne vague y garde sa pastille et reste refusée. Le
compteur, l'envoi, l'API et `precisionDeLigne` ne changent pas. Capture simulée : `comparatif-B` (rapport d'audit).
**Rien n'est modifié tant que Greg n'a pas décidé.**

## 3. « Mes négoces » : fusionner les deux carnets ? — impact, à décider par Greg

Deux carnets distincts existent et servent deux choses différentes :

| | Carnet des demandes de prix | Négoces des achats groupés |
|---|---|---|
| Données | table `supplier` (`/v1/suppliers`) | tables `negoce` et `negoce_artisan` (`/v1/groupe/negoces`) |
| Sert à | choisir à qui envoyer une demande de prix individuelle | recevoir les demandes du regroupement de son secteur, favori, familles vendues, numéro de compte |
| Effets | aucun e-mail à l'ajout | à l'entrée dans la base du secteur, un e-mail d'information part au négoce (avec son lien « stop ») |

Fusionner en un seul carnet obligerait à décider, pour chaque négoce, s'il rejoint la base du secteur (et reçoit
l'e-mail) : c'est un changement de fonctionnement et de données, pas de présentation. Ce lot ne fusionne rien : il donne
un nom unique (« Mes négoces ») au carnet principal et un titre explicite au second (« Négoces des achats groupés »),
placé dessous. Une fusion éventuelle demande ta décision (option : une seule liste, avec un interrupteur « aussi pour les
achats groupés » par négoce).

## 4. Propositions intermédiaires (à valider, rien de fait)

1. **Matériaux plus vite sur l'écran d'une liste (téléphone)** : fusionner « Ta liste est là. Règle N lignes… » (frise) et
   la pastille « N lignes à vérifier » en un seul bandeau ; replier « Le chantier en bref » sur téléphone (« Modifier le
   bref » l'ouvre) ; la carte « Ouvrir l'assistant » passe en une ligne. Gain : la première ligne de la liste visible sur
   un iPhone SE sans défiler. Risque faible à moyen (e2e de l'écran). 1 jour.
2. **Saisie sur téléphone** : clavier numérique (`inputmode="decimal"`) sur toutes les quantités (déjà sur la liste) ;
   « Suivant » du clavier qui passe au champ suivant dans Mon entreprise et le formulaire d'un négoce ; la recherche de
   « Saisir ma liste » qui s'ouvre directement. ½ jour.
3. **Boutons et actions** : un seul verbe par action (« Ajouter », « Demander les prix », « Envoyer »), « Aperçu » écrit
   en toutes lettres quand la place le permet (sur iPhone SE, l'œil seul reste : sinon « Demander les prix à mes
   négoces », tes mots, ne tient plus sur une ligne). ½ jour.
4. **Navigation homogène** : le retour rond à côté du titre partout (reste : pages d'administration, formulaire de
   modification d'un chantier, ancienne page des formules) ; « Mon compte » du menu de l'initiale renommé « Profil »
   comme l'onglet. ½ jour.
5. **Répétitions et espaces** : carte « Économisé grâce au regroupement » masquée à 0,00 € ; « C'est ce que reçoit le
   négoce » et le « ? » de « Ton chantier » regroupés ; marges verticales entre cartes harmonisées (16 px téléphone,
   24 px ordinateur). ½ jour.

## 5. Restant à traiter

- Pages légales (CGU, confidentialité) : « l'accès à le regroupement », « les négoces de le regroupement » : textes
  juridiques, non modifiés sans Greg.
- Le message d'ouverture de l'assistant annonce « Il me manque N précisions » quand l'écran n'en montre qu'une à la fois :
  c'est le texte de la maquette de Greg (31 octobre), non modifié ; proposition : « (1/N) » sur la question active.
- Lignes cliquables du PDF de l'assistant sur ordinateur (23 px de haut) : elles suivent la hauteur des lignes du PDF ;
  les agrandir changerait le PDF : laissé.

## 6. Tests du lot 1 (niveau « modification importante » : ciblés + fonctions liées)

| Série | Résultat |
|---|---|
| Domaine (types, 937 tests, build) | vert (937/937, dont 3 nouveaux : le fil de l'assistant à la réouverture) |
| API (types) | vert |
| Web (types, lint, tests unitaires, build) | vert |
| e2e liés (assistant, accueil, Mes listes, Profil, clavier, responsive, adresse Mobiiz, parcours artisan ciblé, achats groupés ; téléphone et ordinateur) | 122 réussis, 28 ignorés, 2 en échec (le nouveau test créait une 4e liste au-delà de l'offre gratuite des e2e), corrigé puis 2/2 réussis |
| Nouveaux e2e | « rouvert trois fois, l'assistant ne répète pas son message d'ouverture » ; « iPhone SE : Sélectionner ne chevauche plus les filtres ; Télécharger lisible (encre sur jaune) et Fermer blanc, en clair et en sombre ; menu du bas en 12 px » |
| axe après le lot (19 écrans clés, iPhone SE et ordinateur, clair et sombre) | plus aucune erreur de contraste ni de débordement ; restent les lignes cliquables du PDF de l'assistant sur ordinateur (23 px, §5) et un lien recouvert par le menu de l'initiale quand il est ouvert (état passager) |

Non déployé (modification importante : pas de déploiement automatique).
