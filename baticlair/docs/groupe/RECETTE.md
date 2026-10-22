# BatiClair : cahier de recette

Demande de Greg du 22 octobre 2026. C'est la liste de ce qu'il faut voir de ses yeux avant de dire « on fusionne dans `main` ». Chaque ligne indique ce que tu fais, ce que tu dois voir, et le test automatique qui le vérifie déjà à chaque poussée.

À ne pas confondre avec deux autres documents :
- `TEST-COMPLET.md` est le parcours que j'ai joué moi-même le 21 octobre, avec le détail des défauts trouvés.
- `MISE-EN-PROD.md` est la checklist du jour J : variables, migrations, ordre de fusion.

## Comment s'en servir

- **Où** : la prévisualisation de #284, https://baticlair-git-claude-saas-achat-artisans-promp-67e67a-gr33-spec.vercel.app/. Elle contient tout ce qui est regroupé sur `claude/integration-groupe`.
- **Avec quoi** : ton iPhone d'abord, l'ordinateur ensuite. Utilise une fenêtre privée pour les étapes « visiteur » et un second navigateur pour l'artisan B.
- **Groupé déjà rempli** : le jeu de démonstration (12 artisans du 22, 8 négoces, 3 lots) se charge avec la commande `curl` du §4 bis de `MISE-EN-PROD.md`.
- **Légende de la colonne État** :
  - ✅ auto : vérifié à chaque poussée par la CI (parcours e2e sur téléphone et ordinateur, ou test API). À regarder une fois, pour le ressenti.
  - 👀 à la main : aucun test ne peut juger (lisibilité, ton, rendu sur ton iPhone).
  - 💳 crédit : attend « crédit rechargé » (vendredi).
  - 🏭 prod : ne se voit qu'en production (vrais e-mails, INSEE, notifications du téléphone).
- **Rejouer les tests toi-même** : la commande de chaque suite est dans `CLAUDE.md`. Les parcours e2e sont dans `apps/web/e2e/parcours-artisan.spec.ts` ; les titres cités plus bas en sont tirés.

## 1. Le visiteur

| # | Tu fais | Tu dois voir | Test | État |
|---|---|---|---|---|
| 1.1 | Ouvrir l'adresse, sans compte | La démo guidée : trois écrans « Exemple », « Suivant », « Passer ». Une fois passée, elle ne revient pas au rechargement. | « La page d'accueil publique… » | ✅ auto |
| 1.2 | Faire défiler la landing | Le couvreur sur son toit et le téléphone, puis les 3 étapes, les 8 fournitures dessinées, les réponses comparées, le groupé (avec le camion), le prix (2 %), les 24 métiers et « Ton premier devis, maintenant ». Exactement 2 « Créer un compte ». | même test, plus « responsive » | ✅ auto, 👀 le rendu |
| 1.3 | Pied de page : Mentions légales, CGU, Conditions négoce, Confidentialité | Quatre pages lisibles sans compte, avec les coordonnées de BATI INVEST. | « Pages légales… » | ✅ auto, 👀 le texte |
| 1.4 | Sur iPhone : Partager → « Sur l'écran d'accueil » | Une icône BatiClair. L'app s'ouvre sans la barre de Safari. L'explication s'affiche une seule fois. | « PWA… » | ✅ auto, 👀 sur ton iPhone |

## 2. Le compte et la navigation

| # | Tu fais | Tu dois voir | Test | État |
|---|---|---|---|---|
| 2.1 | « Créer un compte » | 6 métiers, puis « Voir les 19 autres ». Le bouton reste gris tant que la case CGU n'est pas cochée. | « un artisan crée son compte… » | ✅ auto |
| 2.2 | Accueil, sans aucun chantier | Une phrase « Dépose ton premier devis… » et un bouton « Déposer mon devis ». Rien d'autre. | « le menu ne propose que trois entrées… » | ✅ auto |
| 2.3 | La barre du bas | Trois entrées : « Mes chantiers », « + Nouveau devis » au centre, « Groupé ». Elle reste figée en bas sur chaque page. | même test, plus « 2026-10-12 : sur téléphone, la barre… » | ✅ auto |
| 2.4 | Toucher ton initiale, en haut | Le menu : « Mes fournisseurs », « Mon compte », « Essayer avec un chantier fictif ». | « le menu ne propose que trois entrées… » | ✅ auto |
| 2.5 | Le « ? » sur chaque écran | Trois lignes au plus, au tutoiement. Un tap l'ouvre, un tap le ferme. | « Aide « ? »… » | ✅ auto, 👀 le ton |
| 2.6 | Mon compte : adresse, SIRET, logo | « Coordonnées enregistrées. » Le logo apparaît ensuite sur le PDF envoyé aux négoces (voir 3.7). | « RGPD… », tests API `identity`, `tenancy-projects` | ✅ auto |

## 3. Un devis devient la liste (« J'ai un devis »)

La vraie lecture du devis attend le crédit. D'ici là, la prévisualisation sert un devis rejoué, dont la lecture est enregistrée. Ce qu'on recette ici, c'est tout le reste du parcours.

| # | Tu fais | Tu dois voir | Test | État |
|---|---|---|---|---|
| 3.1 | « + Nouveau devis » | Deux gros boutons : « J'ai un devis » et « J'ai déjà ma liste ». | « « + Nouveau devis » : deux gros boutons… » | ✅ auto |
| 3.2 | « J'ai un devis », puis un PDF | « Je lis ton devis » en plein écran, avec un retour. Passé 30 s, une seule phrase : « Gros devis, j'y suis encore… ». | « §50.1 : … » (deux tests) | ✅ auto |
| 3.3 | Les questions de comptoir | Toutes posées d'un coup, avant le calcul, avec des boutons et « Autre » (où l'on écrit). Jamais une question sur ce qui est déjà écrit dans le devis. « Calculer ma liste » reste collé en bas. | « §48.4 et règle numéro un… », « Autre : … », « §50.2… » | ✅ auto |
| 3.4 | L'écran « Ton chantier » | La liste dans l'ordre du devis. Aucun article absent du devis. Les heures et les forfaits sont repliés sous « lignes sans fourniture ». | « §50 : trois écrans… », « §49.9… » ; domaine `regle-numero-un-tous-tiroirs` | ✅ auto |
| 3.5 | Une ligne orange | Elle s'ouvre au premier plan, avec sa question en premier. Elle passe au vert d'un geste, dans sa carte. | « §49.8 : … » (quatre tests), « §51.6… » | ✅ auto |
| 3.6 | Le crayon d'une ligne, ou le ✓ | Modifier la désignation ou la quantité ; valider sans ouvrir. | « §49.8 : sur chaque ligne, un ✓… » | ✅ auto |
| 3.7 | « Aperçu », puis « Envoyer aux négoces » | L'e-mail et le PDF, sans aucun prix, avec ton logo et tes coordonnées. Une partie peut aller à un négoce et le reste à un autre. | « §50.7 : en bas, deux boutons figés… », « §48.5… » ; API `envoi-fournisseur`, `pdf-bref-encadre` | ✅ auto, 👀 le PDF |
| 3.8 | Les réponses des négoces | Comparées : le moins cher des offres complètes en tête, l'article manquant signalé, « Retenir cette offre ». | « un couvreur demande les prix… » ; API `offers` | ✅ auto |
| 3.9 | Ton vrai devis D-2026-020, ou le joint debout D-2026-018 | La liste qu'un vendeur de comptoir accepterait sans rappeler. | domaine : bancs de devis réels (faux lecteur) | 💳 crédit |

## 4. « J'ai déjà ma liste »

| # | Tu fais | Tu dois voir | Test | État |
|---|---|---|---|---|
| 4.1 | « J'ai déjà ma liste », puis la photo d'une liste écrite à la main | « Je lis ta liste… » pendant quelques secondes, puis « Ton chantier » avec les lignes telles qu'écrites, sans aucune question. Le chantier s'appelle « Ma liste du <jour> ». | « « + Nouveau devis » : deux gros boutons… » | ✅ auto (faux lecteur) |
| 4.2 | Un bon de négoce en photo, un tableau en PDF | Lus de la même façon. Les prix et les totaux sont ignorés. | « « J'ai déjà ma liste » : un bon de négoce… » | ✅ auto (faux lecteur) |
| 4.3 | Un fichier Word | Une phrase claire. Aucun chantier n'est créé. | « … un fichier qui n'est ni une photo ni un PDF… » | ✅ auto |
| 4.4 | Corriger, supprimer ou ajouter une ligne, puis envoyer | Même écran et même suite qu'un devis. Deux listes du 22 avec le même article donnent une seule commande groupée. | API `liste-existante` (11 tests) | ✅ auto |
| 4.5 | Tes trois vraies listes : manuscrite, bon, tableau | Chaque ligne bien lue. Les quantités ne sont jamais recalculées. | — | 💳 crédit |

## 5. Le groupé

| # | Tu fais | Tu dois voir | Test | État |
|---|---|---|---|---|
| 5.1 | L'onglet Groupé, sans SIRET | Trois étapes qui se cochent une à une : SIRET, devis, négoces. Ensuite « Mes commandes groupées ». | « BatiClair Groupé, l'onglet… » | ✅ auto |
| 5.2 | Proposer une ligne au groupé | « Tu veux être livré entre quelles dates ? », « Chantier signé », la phrase d'engagement. Une ligne peut être retirée avant le départ. | « … étape 2… » | ✅ auto |
| 5.3 | Mes fournisseurs (« Mes négoces ») | La suggestion Sirene dès trois lettres, les familles, le favori, le message type. Un même e-mail peut couvrir plusieurs agences, une par département. | « … étape 3… » ; API `groupe-negoces`, `groupe-multi-agences` | ✅ auto |
| 5.4 | Artisan A puis artisan B : même article, même département, tous les deux « signé » | La commande groupée se forme. Les négoces reçoivent l'e-mail « Regroupement artisans » avec la commission en gras et le PDF, sans aucun nom d'artisan. | « … étape 8… » ; API `groupe-regroupement`, `groupe-demande` | ✅ auto, 🏭 le vrai e-mail |
| 5.5 | Le négoce répond par e-mail, puis dépose son devis | Un lien neuf, une page sans compte, un dépôt gris tant que la case 2 % n'est pas cochée, puis « Devis reçu, merci. ». | même test, plus « … étape 5… » | ✅ auto, 🏭 le webhook Resend |
| 5.6 | Le choix | « 1,02 € HT l'unité chez … », le bon de commande au négoce et aux artisans, la facture de commission n° 1. | même test ; API `groupe-choix`, `groupe-commande` | ✅ auto |
| 5.7 | « Livré » | Le compteur « Économisé grâce au groupé » augmente. | même test | ✅ auto |
| 5.8 | Cas difficiles | Deux départements donnent deux commandes. SIRET invalide. Plafond à 3 × la médiane. Sans offre, la commande est close à 7 jours. « Pas concerné ». Deux commandes annulées → exclusion 6 mois. | « … scénarios 1 », « … scénarios 2 » | ✅ auto |
| 5.9 | L'admin (`/admin/groupe`, toi seul) | Les commandes groupées, le journal de chacune, les factures, l'export CSV, « Forcer », « payée ». | « … étape 9… » ; API `groupe-admin` | ✅ auto, 👀 l'usage |
| 5.10 | Le 1er du mois | Un e-mail « ce mois : X chantiers lus, Y € économisés, Z commandes groupées ». Rien n'est envoyé à qui n'a rien fait. | « Rapport mensuel… » | ✅ auto, 🏭 le vrai envoi |
| 5.11 | Ton SIRET réel | Vérifié auprès de l'INSEE avant tout accès. | API `groupe-sirene` (INSEE simulé) | 🏭 prod |

## 6. Données, sécurité, tenue

| # | Tu fais | Tu dois voir | Test | État |
|---|---|---|---|---|
| 6.1 | Mon compte : télécharger mes données, puis supprimer (en tapant SUPPRIMER) | Un fichier de tes données, puis le compte effacé. | « RGPD… » ; API `rgpd` | ✅ auto |
| 6.2 | Ouvrir le chantier d'un autre compte (en changeant l'adresse) | Une page « introuvable ». Jamais les données de l'autre. | API `isolation-toutes-routes`, `securite` | ✅ auto |
| 6.3 | Une adresse qui n'existe pas | Une page en français, avec le chemin du retour. | « une adresse inconnue… » | ✅ auto |
| 6.4 | Charge : 200 artisans, 50 commandes groupées, 1 000 besoins | Chaque route et chaque tâche planifiée répond en moins d'une seconde. | API `charge` ; `docs/PERFORMANCE.md` | ✅ auto |
| 6.5 | Lighthouse mobile | Au moins 90 sur chaque page. | `docs/PERFORMANCE.md` (mesure du 21 octobre) | 👀 à remesurer avant la production |

## 7. Ce qui attend vendredi (crédit rechargé)

1. Les trois devis réels (D-2026-020, D-2026-018, D.2026.105), avec la nouvelle lecture en un appel. Les écarts sont expliqués ligne par ligne (tâches 133 et 134).
2. Tes trois vraies listes (manuscrite, bon, tableau) avec le lecteur de liste `lecture_liste` v1.
3. Le coût réel d'une lecture de devis et d'une lecture de liste, relevé dans le suivi du coût.

## 8. Procès-verbal

| Date | Qui | Sections jouées | Écarts trouvés | Verdict |
|---|---|---|---|---|
| | Greg | | | |

Un écart trouvé devient une capture envoyée, puis un test qui échoue, puis une correction. C'est la méthode « retour de test » de `.claude/skills/retour-test`.
