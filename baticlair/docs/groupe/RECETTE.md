# BatiClair : cahier de recette

Demande de Greg du 22 octobre 2026, mise à jour le soir même pour le nouveau cap (liste, Commande commune, livraison, partage). C'est la liste de ce qu'il faut voir de ses yeux avant de dire « on fusionne dans `main` ». Chaque ligne indique ce que tu fais, ce que tu dois voir, et le test automatique qui le vérifie déjà à chaque poussée.

À ne pas confondre avec deux autres documents :
- `TEST-COMPLET.md` est le parcours que j'ai joué moi-même le 21 octobre, avec le détail des défauts trouvés.
- `MISE-EN-PROD.md` est la checklist du jour J : variables, migrations, ordre de fusion.

## Les 20 tests iPhone (plan « finition », 23 octobre)

À faire dans l'ordre, sur ton iPhone, sur la prévisualisation de #284 (adresse ci-dessous). Une vingtaine de minutes. Chaque test a son résultat attendu ; un écart = une capture, et je corrige. Le détail par écran, avec le test automatique de chaque ligne, suit dans les sections 1 à 7.

| # | Tu fais | Résultat attendu |
|---|---|---|
| 1 | Ouvrir l'adresse en navigation privée | La démo guidée en haut, d'un coup, sans que la page saute : « Ta liste, remise au propre », la carte « Photo de ta liste », « Suivant », « Passer ». |
| 2 | « Passer », puis recharger la page | La démo ne revient pas. L'accroche « Marre de te faire enfumer sur le prix de tes matériaux ? » est en haut. « Revoir la démo », en bas, la rouvre. |
| 3 | Lire la landing jusqu'en bas | « Gratuit pour l'artisan. Sans engagement. », les trois étapes, « Un geste par ligne pour la préciser », la liste d'exemple (2 760 pièces, 0,92 €). Rien sur l'abonnement ni sur les 2 %. |
| 4 | « Envoyer sur WhatsApp », puis « Copier le lien » | WhatsApp s'ouvre avec le message prérempli et le lien ; « Lien copié » s'affiche. |
| 5 | Les quatre pages légales, en bas de la landing | BATI INVEST, Vercel et Neon nommés ; « Aujourd'hui, BatiClair est gratuit pour l'artisan » ; une section « Cookies » ; aucun « 2 % » ; « Retour à l'accueil » ramène à la landing. |
| 6 | « Je rejoins le mouvement », créer ton compte | « Ta liste remise au propre en deux minutes. » ; le bouton reste gris tant que la case CGU n'est pas cochée ; puis l'accueil avec « Donner ma liste » et « Inviter un collègue ». |
| 7 | Partager → « Sur l'écran d'accueil », rouvrir depuis l'icône | BatiClair s'ouvre en plein écran, sans la barre de Safari ; la barre du bas reste collée en bas. |
| 8 | « + Nouvelle liste », donner la photo d'une liste écrite à la main | « Je lis ta liste… », puis « Ton chantier » : une carte par ligne, telle qu'écrite ; quantités avec l'espace des milliers (« 1 250 pièces ») ; le suivi en haut coche « Liste prête » et dit « Ta liste est… » tout de suite. |
| 9 | Revenir à l'accueil | Aucune action « Ajouter le devis client » pour cette liste. |
| 10 | Toucher une ligne orange (« Tuile romane… ») | Elle passe au premier plan, sa question en boutons ; une réponse s'écrit dans la désignation et la pastille passe au vert. |
| 11 | « Aperçu » | L'e-mail et le PDF au négoce, sans aucun prix, avec tes coordonnées ; rien ne part. |
| 12 | Passer en mode avion, donner une autre photo | « Pas de connexion internet. Rien n'est perdu : réessaie dès que le réseau revient. » Aucun chantier en double après le retour du réseau. |
| 13 | Donner une photo floue ou coupée | « Je n'ai rien lu sur ce fichier. Reprends la photo bien à plat, bien éclairée, ou envoie un PDF. » |
| 14 | Donner un fichier de plus de 20 Mo | « C'est trop volumineux pour être envoyé. », avant tout envoi. |
| 15 | Sur « Ton chantier », le bouton retour du téléphone | Retour à l'écran d'avant (accueil ou chantiers), jamais sur l'écran de dépôt ; « en avant » rend la liste. |
| 16 | « Je n'ai qu'un devis », un devis PDF | « Je lis ton devis » en plein écran ; puis les questions, toutes d'un coup ; le suivi dit « Ta liste se prépare. Réponds aux questions, puis « Calculer ma liste ». », sans rien cocher. |
| 17 | Onglet « Commande commune » | Trois étapes : SIRET, « Donne ta liste », négoces ; le bloc « Inviter un collègue ». |
| 18 | Mon compte | La carte « Formule » dit « Gratuit pour l'artisan, aucune limite de chantiers » ; « Tes habitudes (« je façonne »…) » au tutoiement. |
| 19 | iPhone en mode sombre (Réglages → Luminosité) | L'app reste claire et lisible ; champs et cases ne passent pas en noir. |
| 20 | Un lien négoce coupé (retirer la fin de l'adresse reçue par e-mail) | « Ce lien n'est plus valable. », sans formulaire. |

## Comment s'en servir

- **Où** : la prévisualisation de #284, https://baticlair-git-claude-saas-achat-artisans-promp-67e67a-gr33-spec.vercel.app/. Elle contient tout ce qui est regroupé sur `claude/integration-groupe`.
- **Avec quoi** : ton iPhone d'abord, l'ordinateur ensuite. Utilise une fenêtre privée pour les étapes « visiteur » et un second navigateur pour l'artisan B.
- **Commande commune déjà remplie** : le jeu de démonstration (12 artisans du 22, 8 négoces, 3 lots) se charge avec la commande `curl` du §4 bis de `MISE-EN-PROD.md`.
- **Légende de la colonne État** :
  - ✅ auto : vérifié à chaque poussée par la CI (parcours e2e sur téléphone et ordinateur, ou test API). À regarder une fois, pour le ressenti.
  - 👀 à la main : aucun test ne peut juger (lisibilité, ton, rendu sur ton iPhone).
  - 💳 crédit : attend « crédit rechargé » (vendredi).
  - 🏭 prod : ne se voit qu'en production (vrais e-mails, INSEE, API Adresse, notifications du téléphone).
  - ⚖️ juridique : relecture par un juriste avant le premier vrai lot.
- **Rejouer les tests toi-même** : la commande de chaque suite est dans `CLAUDE.md`. Les parcours e2e sont dans `apps/web/e2e/parcours-artisan.spec.ts` ; les titres cités plus bas en sont tirés.

## 1. Le visiteur

| # | Tu fais | Tu dois voir | Test | État |
|---|---|---|---|---|
| 1.1 | Ouvrir l'adresse, sans compte | La démo guidée : trois écrans « Exemple » (ta liste, les couvreurs regroupés, ton prix livré), « Suivant », « Passer », « Je rejoins le mouvement » au dernier. Une fois passée, elle ne revient pas au rechargement ; « Revoir la démo » la rouvre. | « La page d'accueil publique… » | ✅ auto |
| 1.2 | Faire défiler la landing | Fond blanc, une seule couleur d'accent, aucun dessin. « Marre de te faire enfumer sur le prix de tes matériaux ? », le sous-titre, « Je rejoins le mouvement » (deux fois), « Gratuit pour l'artisan. Sans engagement. ». Puis « Plus on est nombreux, plus on pèse face aux négoces. », « Comment ça marche » en trois étapes avec les vraies captures, la liste d'exemple (ardoise 2 760 pièces, mêmes chiffres partout, 0,92 €), « Commande commune », le partage, la ligne « Négoces : … ». Rien sur l'abonnement ni sur les 2 %. Aucune tuile. | même test, plus « responsive » | ✅ auto, 👀 le rendu et le ton |
| 1.3 | Le compteur « X couvreurs déjà inscrits dans les Côtes-d'Armor » | Le vrai chiffre de la base (couvreurs avec une adresse en 22, démo exclue). Sous 10, il ne s'affiche pas. | API `compteur-landing` ; e2e « page d'accueil publique » | ✅ auto, 🏭 le vrai chiffre |
| 1.4 | Le bloc « L'union fait la force : fais venir tes collègues » | Le message prérempli avec le lien du site ; « Envoyer sur WhatsApp » ouvre WhatsApp, « Envoyer par SMS » ouvre les messages, « Copier le lien » dit « Lien copié ». | même test | ✅ auto, 👀 sur ton iPhone (WhatsApp, SMS) |
| 1.5 | Pied de page : Mentions légales, CGU, Conditions négoce, Confidentialité | Quatre pages lisibles sans compte, avec les coordonnées de BATI INVEST. Elles parlent de la « Commande commune », disent « gratuit pour l'artisan » et ne citent aucun « 2 % » (la rémunération renvoie au contrat de la page de dépôt) ; « Cookies » sans bandeau. Ce qu'un avocat doit relire : `docs/A-FAIRE-RELIRE.md`. | « Pages légales… » | ✅ auto, ⚖️ relecture juridique avant le premier vrai lot |
| 1.6 | Sur iPhone : Partager → « Sur l'écran d'accueil » | Une icône BatiClair. L'app s'ouvre sans la barre de Safari. L'explication s'affiche une seule fois. | « PWA… » | ✅ auto, 👀 sur ton iPhone |

## 2. Le compte et la navigation

| # | Tu fais | Tu dois voir | Test | État |
|---|---|---|---|---|
| 2.1 | « Je rejoins le mouvement » | L'inscription : 6 métiers, puis « Voir les 19 autres ». Le bouton reste gris tant que la case CGU n'est pas cochée. | « un artisan crée son compte… » | ✅ auto |
| 2.2 | Accueil, sans aucun chantier | « Paie tes matériaux moins cher. Donne ta liste, je fais jouer les négoces. », un bouton « Donner ma liste », et le bloc « Inviter un collègue ». | même test ; « La page d'accueil publique… » (fin) | ✅ auto |
| 2.3 | La barre du bas | Trois entrées : « Mes chantiers », « + Nouvelle liste » au centre, « Commande commune » (sur deux lignes au téléphone). Elle reste figée en bas sur chaque page. | « le menu ne propose que trois entrées… », « 2026-10-12 : sur téléphone, la barre… » | ✅ auto |
| 2.4 | Toucher ton initiale, en haut | Le menu : « Mes fournisseurs », « Mon compte », « Essayer avec un chantier fictif ». | même test | ✅ auto |
| 2.5 | Le « ? » sur chaque écran | Trois lignes au plus, au tutoiement. Un tap l'ouvre, un tap le ferme. | « Aide « ? »… » | ✅ auto, 👀 le ton |
| 2.6 | Mon compte : adresse, SIRET, logo | « Coordonnées enregistrées. » Le logo apparaît ensuite sur le PDF envoyé aux négoces (voir 3.7). L'adresse compte aussi pour le compteur de la landing. | « RGPD… », tests API `identity`, `tenancy-projects` | ✅ auto |

## 3. Ta liste (« Donne ta liste de matériaux »)

| # | Tu fais | Tu dois voir | Test | État |
|---|---|---|---|---|
| 3.1 | « + Nouvelle liste » | Un gros bloc « Donne ta liste de matériaux » (photo, PDF ou capture) et un petit bouton « Je n'ai qu'un devis » (« On t'avance la liste, sans garantie, tu la peaufines. »). | « « + Nouvelle liste » : « Donne ta liste de matériaux »… », « depuis le + » | ✅ auto |
| 3.2 | Donner la photo d'une liste écrite à la main | « Je lis ta liste… » quelques secondes, puis « Ton chantier » : une carte par ligne, telle qu'écrite, sans aucune question. Le chantier s'appelle « Ma liste du <jour> ». | même test | ✅ auto (faux lecteur) |
| 3.3 | Un bon de négoce en photo, un tableau en PDF, un fichier Word | Bon et tableau lus de la même façon, prix et totaux ignorés. Le Word : une phrase claire, aucun chantier créé. | « … un bon de négoce… », « … ni une photo ni un PDF… » | ✅ auto (faux lecteur) |
| 3.4 | La liste en cartes | On touche une carte pour la modifier, on glisse pour la retirer, « + Ajouter » en bas. Pastille verte sur une ligne précise. | « §49.8… », « §50… » | ✅ auto |
| 3.5 | Une ligne vague (« Ardoise naturelle 32×22 », « Tuile romane ») | Pastille orange « Précise pour l'ajouter à la commande commune ». La ligne s'ouvre sur ses questions en boutons (origine, choix, marque, teinte, « Autre ») ; la réponse s'écrit dans la désignation et la pastille passe au vert. Une ligne vague part quand même chez ton négoce, mais sa case reste grisée pour la commande commune. | même test ; domaine `ligne-precise-ou-vague` ; API `cap-22-octobre` (« ligne vague refusée ») | ✅ auto, 👀 les familles de questions |
| 3.6 | « Aperçu », puis « Envoyer aux négoces » | L'e-mail et le PDF, sans aucun prix, avec ton logo et tes coordonnées. Une partie peut aller à un négoce et le reste à un autre. | « §50.7 : en bas, deux boutons figés… », « §48.5… » ; API `envoi-fournisseur`, `pdf-bref-encadre` | ✅ auto, 👀 le PDF |
| 3.7 | Le suivi en haut du chantier | Façon colis : Liste prête → Prix demandés → Prix reçus → Commandé, avec une phrase et ce qu'il reste à faire. | « depuis le + », « … étape 8… » ; API `cap-22-octobre` | ✅ auto |
| 3.8 | Les réponses des négoces (envoi direct) | Comparées : le moins cher des offres complètes en tête, l'article manquant signalé, « Retenir cette offre ». | « un couvreur demande les prix… » ; API `offers` | ✅ auto |

## 4. « Je n'ai qu'un devis »

La vraie lecture du devis attend le crédit. D'ici là, la prévisualisation sert un devis rejoué, dont la lecture est enregistrée. Ce qu'on recette ici, c'est tout le reste du parcours.

| # | Tu fais | Tu dois voir | Test | État |
|---|---|---|---|---|
| 4.1 | « Je n'ai qu'un devis », puis un PDF | « Je lis ton devis » en plein écran, avec un retour. Passé 30 s, une seule phrase : « Gros devis, j'y suis encore… ». | « §50.1 : … » (deux tests) | ✅ auto |
| 4.2 | Les questions de comptoir | Toutes d'un coup, avant le calcul, en boutons avec « Autre ». Jamais une question sur ce qui est écrit. « Calculer ma liste » reste collé en bas. | « §48.4 et règle numéro un… », « Autre : … », « §50.2… » | ✅ auto |
| 4.3 | « Ton chantier » | La liste dans l'ordre du devis, aucun article absent du devis, heures et forfaits repliés sous « lignes sans fourniture ». Une ligne orange s'ouvre au premier plan, sa question en premier. | « §50 : trois écrans… », « §49.9… », « §51.6… » ; domaine `regle-numero-un-tous-tiroirs` | ✅ auto |
| 4.4 | Ton vrai devis D-2026-020, ou le joint debout D-2026-018 | La liste qu'un vendeur de comptoir accepterait sans rappeler. | domaine : bancs de devis réels (faux lecteur) | 💳 crédit |

## 5. La Commande commune

| # | Tu fais | Tu dois voir | Test | État |
|---|---|---|---|---|
| 5.1 | L'onglet « Commande commune », sans SIRET | Trois étapes qui se cochent une à une : SIRET, liste, négoces. Le bloc « Inviter un collègue ». Ensuite « Mes commandes communes ». | « BatiClair Groupé, l'onglet… » ; « La page d'accueil publique… » (fin) | ✅ auto |
| 5.2 | « Ajouter à la commande commune » sur « Ton chantier » | Seules les lignes précises se cochent. « Tu veux être livré entre quelles dates ? », « Chantier signé », la phrase d'engagement. Une ligne peut être retirée avant le départ. | « … étape 2… » ; API `cap-22-octobre` | ✅ auto |
| 5.3 | Mes fournisseurs (« Mes négoces ») | La suggestion Sirene dès trois lettres, les familles, le favori, le message type. Un même e-mail peut couvrir plusieurs agences, une par département. Le négoce ajouté reçoit un mail l'informant qu'une commande commune existe (une fois). | « … étape 3… » ; API `groupe-negoces`, `groupe-multi-agences`, `cap-22-octobre` | ✅ auto, 🏭 le vrai e-mail |
| 5.4 | Artisan A puis artisan B : même ligne précise, même secteur, « signé » | La commande commune se forme. Le compteur : « 2 couvreurs, 2 demandes envoyées, N devis reçus, meilleur prix … », sans aucun nom. Les négoces reçoivent l'e-mail « Commande commune : demande de prix… » avec la commission en gras et le PDF, sans nom d'artisan. | « … étape 8… » ; API `groupe-regroupement`, `groupe-demande` | ✅ auto, 🏭 le vrai e-mail |
| 5.5 | Le négoce dépose son devis | Un lien neuf, une page sans compte (« Commande commune, département … »). Trois champs de livraison obligatoires : l'adresse du dépôt, « Livraison gratuite jusqu'à … km », « Prix d'une livraison au-delà ». Dépôt gris tant que la case 2 % et la livraison ne sont pas remplies, puis « Devis reçu, merci. ». | même test, plus « … étape 5… » | ✅ auto, 🏭 le webhook Resend |
| 5.6 | Chaque nouveau devis | Une alerte à chaque artisan (« Nouveau meilleur prix », ou « Devis de X, légèrement plus haut »). | API `cap-22-octobre` | ✅ auto, 🏭 la notification sur ton iPhone |
| 5.7 | Le choix | Le moins cher livraison comprise est retenu. Chaque artisan voit son prix livré à son chantier (« livraison gratuite » ou « livraison Y €, N km du dépôt »), puis le bon de commande et la facture de commission n° 1. | même test ; API `groupe-choix`, `groupe-commande`, `cap-22-octobre` | ✅ auto, 👀 la distance sur une vraie adresse |
| 5.8 | « Livré » | Le suivi passe à « Commandé », le compteur « Économisé grâce à la commande commune » augmente. | même test | ✅ auto |
| 5.9 | Cas difficiles | Deux départements donnent deux commandes. SIRET invalide. Plafond à 3 × la médiane. Sans offre, la commande est close à 7 jours. « Pas concerné ». Deux commandes annulées → exclusion 6 mois. | « … scénarios 1 », « … scénarios 2 » | ✅ auto |
| 5.10 | L'admin (`/admin/groupe`, toi seul) | Les commandes communes, le journal de chacune, les factures, l'export CSV, « Forcer », « payée ». | « … étape 9… » ; API `groupe-admin` | ✅ auto, 👀 l'usage |
| 5.11 | Le 1er du mois | Un e-mail « ce mois : X chantiers lus, Y € économisés grâce à la commande commune, Z lots ». Rien n'est envoyé à qui n'a rien fait. | « Rapport mensuel… » | ✅ auto, 🏭 le vrai envoi |
| 5.12 | Ton SIRET réel, une vraie adresse de dépôt | SIRET vérifié auprès de l'INSEE ; la distance calculée par l'API Adresse (vol d'oiseau × 1,3). | API `groupe-sirene` (INSEE simulé), domaine `cap-22-octobre` (table de codes postaux) | 🏭 prod |

## 5 bis. La commande commune du mois (22 octobre 2026, au soir)

Le nouveau fonctionnement remplace le regroupement par lot au fil de l'eau (`COMMANDE_COMMUNE=mois`, la valeur par défaut). Une commande par mois : inscriptions jusqu'au 25 à 12 h, puis deux semaines pour les négoces, puis les résultats.

| # | Tu fais | Tu dois voir | Test | État |
|---|---|---|---|---|
| 5b.1 | « Ton chantier », en haut | « Commande commune de novembre », « Une commande par mois avec les couvreurs de ta région. », le chrono « Clôture dans 9 j 4 h », les quantités de toute la commande, le bouton « Ajouter à la commande de novembre ». | e2e « Commande du mois : un cycle complet… » | ✅ auto |
| 5b.2 | « Ajouter à la commande… », tu coches, « Un chantier signé » ou « Du stock », « Ajouter » | « Mets seulement ce que tu es sûr de commander. Sans engagement : tu commandes seulement si le prix te plaît. » Les lignes vagues ne se cochent pas. Ensuite « Dans la commande de … » avec « Retirer ». | même e2e ; API `commande-du-mois` | ✅ auto |
| 5b.3 | L'onglet « Commande commune » | « Toi seul : 3 palettes… », « Toute la commande de novembre : … », le chrono, « Pour l'instant, tu es le premier. Partage le lien pour faire grossir la commande. » au début, le partage dessous. Jamais un nombre d'entreprises. | même e2e | ✅ auto |
| 5b.4 | Un collègue ajoute des lignes | Une notification au plus par jour : « +6 palettes d'ardoises 32×22 viennent d'être ajoutées. L'union fait la force ! » | API `commande-du-mois` (« au plus une par jour ») | ✅ auto, 🏭 la notification sur ton iPhone |
| 5b.5 | Après la clôture | Tout est figé (plus de « Retirer »). Une liste déposée après : « Trop tard pour octobre, ta liste part avec la commande de novembre. » | même e2e | ✅ auto |
| 5b.6 | Le négoce ouvre son lien | Une seule grille, toutes les lignes additionnées, « Réponse avant le 08/11 à 18 h, il reste … », la règle du jeu (vouvoiement), « prix fermes pour tout le cycle ». Il dépose un ou deux PDF et sa livraison. Il voit seulement s'il est premier, jamais les prix des autres. Aucun frais. | même e2e | ✅ auto |
| 5b.7 | Les résultats | Pour chaque négoce : « Chez X : … € HT livré », le moins cher sur toute la commande coché d'office, « Le moins cher pour toi » s'il diffère, un négoce qui n'a pas tout chiffré ne se choisit pas. « Commander chez X » envoie le bon. | même e2e | ✅ auto |
| 5b.8 | Le suivi du chantier | Cinq étapes : Liste déposée → Commande close → Prix demandés → Prix reçus → Commandé. | même e2e | ✅ auto |
| 5b.9 | L'admin | « Dates de la commande du mois » : jour et heure de clôture, jours et heure de réponse. | API `commande-du-mois` (config admin) | ✅ auto, 🏭 à régler une fois |

### Commande du mois : les totaux à la main

Le cas joué par le domaine, l'API et l'e2e. Distance Lannion ↔ Paimpol : 40 km (table des communes de test) ; un chantier dans la ville du dépôt est à 0 km.

| | Ardoise 32×22 (pièce) | Liteau 27×38 (m) | Crochet 100 mm (boîte) | Livraison |
|---|---|---|---|---|
| N1 (dépôt Lannion) | 0,90 € | 0,80 € | 30,00 € | gratuite jusqu'à 20 km, 50 € au-delà |
| N2 (dépôt Paimpol) | 0,88 € | 0,85 € | 32,00 € | gratuite jusqu'à 30 km, 40 € au-delà |
| N3 (dépôt Lannion) | 0,80 € | 0,70 € | pas de prix | gratuite jusqu'à 10 km, 60 € au-delà |

**A, Lannion** : 2 000 ardoises, 400 m de liteaux (chantier signé).

- N1 : 2 000 × 0,90 = 1 800 ; 400 × 0,80 = 320 ; 0 km ≤ 20 : livraison 0. **2 120 €**.
- N2 : 2 000 × 0,88 = 1 760 ; 400 × 0,85 = 340 ; 40 km > 30 : + 40. **2 140 €**.
- N3 : 2 000 × 0,80 = 1 600 ; 400 × 0,70 = 280 ; 0 km ≤ 10 : 0. **1 880 €** (N3 a tout ce dont A a besoin).

**B, Paimpol** : 3 000 ardoises, 10 boîtes de crochets (stock).

- N1 : 3 000 × 0,90 = 2 700 ; 10 × 30 = 300 ; 40 km > 20 : + 50. **3 050 €**.
- N2 : 3 000 × 0,88 = 2 640 ; 10 × 32 = 320 ; 0 km : 0. **2 960 €**.
- N3 : 3 000 × 0,80 = 2 400 ; crochets non chiffrés ; 40 km > 10 : + 60. **2 460 €, incomplet**.

**Sur toute la commande** : N2 = 2 140 + 2 960 = **5 100 €** (premier) ; N1 = 2 120 + 3 050 = **5 170 €** ; N3 = 1 880 + 2 460 = 4 340 €, mais incomplet : il passe derrière les grilles complètes.

**Ce que voit chacun** : A, N2 coché d'office (le moins cher sur toute la commande), N3 « Le moins cher pour toi », il peut le choisir. B, N2 coché d'office ; N3 grisé, « Il n'a pas chiffré 1 article de ta liste ».

**C, Lannion**, 1 000 ardoises déposées après la clôture : « Trop tard pour octobre, ta liste part avec la commande de novembre. »

### Trois cycles à la main (octobre, novembre, décembre 2026)

Joué par `apps/api/test/trois-cycles.test.ts` ; chaque chiffre ci-dessous est d'abord calculé ici. Distances de test (vol d'oiseau × 1,3, arrondi au km) : Lannion–Ploubazlanec 42, Lannion–Saint-Brieuc 74, Lannion–Guingamp 38, Saint-Brieuc–Ploubazlanec 49, Saint-Brieuc–Guingamp 38, Saint-Brieuc–Paimpol 48, Paimpol–Ploubazlanec 3, Paimpol–Guingamp 33, Paimpol–Lannion 40. Une livraison par chantier.

**Octobre** : clôture le 25/10 à 12 h (jour du passage à l'heure d'hiver, 11 h UTC), réponses avant le 08/11 à 18 h.

- A (Lannion) : chantier Lannion 2 400 ardoises + 520 m de liteaux ; chantier Ploubazlanec 1 800 ardoises + 8 boîtes de crochets. B (Saint-Brieuc, stock) : 3 000 ardoises, 12 boîtes, 300 m. D (Guingamp) : 800 m.
- Grille : 7 200 ardoises, 1 620 m de liteaux, 20 boîtes. C dépose le 26/10 : « Trop tard pour octobre, ta liste part avec la commande de novembre. »
- N1 (Lannion, 25 km gratuits, 55 €) 0,92 / 0,78 / 29,50. N2 (Saint-Brieuc, 40 km, 45 €) 0,95 / 0,74 / 28,00. N3 (Paimpol, 10 km, 60 €) 0,89 / 0,81 / pas de crochets. N4 ne répond pas : une relance la veille, une seule.

| | N1 | N2 | N3 (incomplet) |
|---|---|---|---|
| A : 4 200 ard., 520 m, 8 boîtes | 3 864 + 405,60 + 236 = 4 505,60 ; livraisons 0 + 55 (42 km) → **4 560,60** | 3 990 + 384,80 + 224 = 4 598,80 ; 45 + 45 → **4 688,80** | 3 738 + 421,20 = 4 159,20 ; 60 + 0 → 4 219,20 |
| B : 3 000 ard., 300 m, 12 boîtes | 2 760 + 234 + 354 = 3 348 ; 55 → **3 403** | 2 850 + 222 + 336 = 3 408 ; 0 → **3 408** | 2 670 + 243 = 2 913 ; 60 → 2 973 |
| D : 800 m | 624 ; 55 → **679** | 592 ; 0 → **592** | 648 ; 60 → **708** (complet pour D) |
| Total | **8 642,60 (1er)** | 8 688,80 | 7 900,20 (derrière : incomplet) |

A et B : N1 par défaut, et le moins cher pour eux. D : N1 proposé (premier sur le total), N2 moins cher pour lui (592 €) : il commande chez N2. N1 reçoit deux bons, N2 un.

**Novembre** : clôture le 25/11 à 12 h (11 h UTC), réponses avant le 09/12 à 18 h. N5 (Paimpol, 20 km, 50 €) arrive.

- A (nouveau chantier Lannion) : 1 500 ardoises. C (Paimpol) : 2 000 ardoises, 400 m. E (Ploubazlanec, stock) : 5 boîtes. Grille : 3 500 ardoises, 400 m, 5 boîtes ; partie à N1…N5.
- N5 (déposé le 28/11) 0,92 / 0,75 / 33,00. N2 (déposé le 30/11) 0,90 / 0,75 / 30,00. N1, N3, N4 muets : trois relances.

| | N2 | N5 |
|---|---|---|
| A : 1 500 ard. (Lannion) | 1 350 ; 74 km → 45 → **1 395** | 1 380 ; 40 km → 50 → **1 430** |
| C : 2 000 ard., 400 m (Paimpol) | 1 800 + 300 = 2 100 ; 48 km → 45 → **2 145** | 1 840 + 300 = 2 140 ; 0 → **2 140** |
| E : 5 boîtes (Ploubazlanec) | 150 ; 49 km → 45 → **195** | 165 ; 3 km → 0 → **165** |
| Total | 3 735 | 3 735 → **égalité : N5, déposé le premier, passe devant** |

A : N5 proposé, N2 moins cher pour lui (1 395 €) : il commande chez N2. C commande chez N5.

**Décembre** : clôture le 25/12 à 12 h (11 h UTC, jour de Noël : voir « reste à risque »), réponses avant le 08/01/2027 à 18 h. F (Saint-Brieuc) : 200 m de liteaux, « Pour l'instant, tu es le premier ». Grille partie aux cinq négoces, aucun ne répond : pas de prix ; le suivi dit « Aucun négoce n'a chiffré la commande de décembre. Commande ta liste en direct chez ton négoce. »

## 6. Données, sécurité, tenue

| # | Tu fais | Tu dois voir | Test | État |
|---|---|---|---|---|
| 6.1 | Mon compte : télécharger mes données, puis supprimer (en tapant SUPPRIMER) | Un fichier de tes données, puis le compte effacé. | « RGPD… » ; API `rgpd` | ✅ auto |
| 6.2 | Ouvrir le chantier d'un autre compte (en changeant l'adresse) | Une page « introuvable ». Jamais les données de l'autre. | API `isolation-toutes-routes`, `securite` | ✅ auto |
| 6.3 | Une adresse qui n'existe pas | Une page en français, avec le chemin du retour. | « une adresse inconnue… » | ✅ auto |
| 6.4 | Charge : 200 artisans, 50 commandes communes, 1 000 besoins | Chaque route et chaque tâche planifiée répond en moins d'une seconde. | API `charge` ; `docs/PERFORMANCE.md` | ✅ auto |
| 6.5 | Lighthouse mobile | Au moins 90 sur chaque page ; landing 97, sans décalage. | `docs/PERFORMANCE.md` (mesure du 22 octobre au soir) | 👀 à remesurer avant la production |
| 6.6 | Cas limites : réseau coupé, photo floue, fichier lourd, retour arrière, session expirée, lien expiré | Une phrase claire pour chacun, jamais deux chantiers ; « Me reconnecter » quand la session a expiré. | « Cas limites (plan « finition », bloc 6)… » | ✅ auto |

## 7. Ce qui attend vendredi (crédit rechargé)

1. Les trois devis réels (D-2026-020, D-2026-018, D.2026.105), avec la nouvelle lecture en un appel. Les écarts sont expliqués ligne par ligne (tâches 133 et 134).
2. Tes trois vraies listes (manuscrite, bon, tableau) avec le lecteur de liste `lecture_liste` v1.
3. Le coût réel d'une lecture de devis et d'une lecture de liste, relevé dans le suivi du coût.

## 8. Procès-verbal

| Date | Qui | Sections jouées | Écarts trouvés | Verdict |
|---|---|---|---|---|
| | Greg | | | |

Un écart trouvé devient une capture envoyée, puis un test qui échoue, puis une correction. C'est la méthode « retour de test » de `.claude/skills/retour-test`.
