# Recette complète n° 2 — 14 novembre 2026

Version testée : commit `51196cf9` (celle du site de test), en local : e-mails capturés, paiement simulé, lecture et assistant simulés. Aucun e-mail réel, aucun paiement, aucun appel IA payant. Rien n'a été corrigé pendant la recette.

Neuf testeurs : artisan, négoce, mission, saboteur, heure de pointe, comptable, relecteur, mauvais payeur, terrain. Leurs rapports détaillés (gestes, textes mot pour mot, captures) sont gardés hors du dépôt, le temps de la session.

« Vu » = constaté à l'écran. « Lu » = lu dans le code, pas essayé.

## En bref

- 7 bloquants, dont 1 que les corrections du 14 novembre ont créé (N1), 2 corrections restées à moitié (B9, B10) et 1 rare (N4, lien mort, voir « Heure de pointe »).
- Les bloquants de la première recette sur l'abonnement et les anciennes formules sont corrigés (B2, B3, B5, B6, B8 ; B4 pour le cas courant).
- Le cloisonnement tient : aucune entreprise ne lit les données d'une autre, aucun négoce ne voit le prix d'un autre.
- Tous les prix, la TVA et les factures sont justes et identiques partout.

## Bloquants

| N° | Constat | Preuve | Proposition |
|---|---|---|---|
| N1 | Après un envoi trié par métier, l'artisan ne peut plus ouvrir ni comparer les offres : « 3 devis reçus sur 5 demandes », aucun bouton, onglet Offres « Aucune offre reçue ». Sans tri, « Comparer » marche. Créé par la correction B7. Les offres sont bien enregistrées. | Vu par trois testeurs. Cause lue : `project-price-requests.tsx`, l'écran ne cherche que « la » demande de toute la liste. | Lire les offres de toutes les demandes de la liste et les comparer ensemble. Ajouter un parcours de test qui va jusqu'à « Comparer » après un envoi trié. |
| N2 | « Je retiens ce négoce » affiche « C'est commandé… Commandé chez… 4 lignes » en un appui, sans confirmation ; le négoce ne reçoit rien ; l'offre ne chiffrait que 3 lignes sur 4. | Vu par trois testeurs, boîte de test vide. | À trancher : soit « Négoce retenu » (sans dire « commandé »), soit une vraie confirmation suivie d'un e-mail au négoce. |
| N3 | Achat groupé, offre reçue : bouton grisé « [bouton final : texte à fixer] », aucune commande ni refus possible, aucun e-mail d'offre. | Vu (artisan, comptable). | Écrire le bouton final et le refus ; envoyer l'e-mail d'offre. Demande ta règle pour le texte. |
| B10 (reste) | Mission : un numéro ou un e-mail reste visible avant tout accord s'il est écrit dans un autre champ que ceux protégés : commune, « autre métier », métiers, « conditions complémentaires », jours disponibles, déplacement, budget, nom d'une pièce jointe. | Vu (mission, saboteur, relecteur). | Masquer tous les champs libres d'une annonce, d'un profil et d'une réponse, et le nom des pièces jointes. |
| B9 (reste) | Une ligne sans quantité n'est pas orange et part avec « 0 » chez le négoce. « Ta liste est prête » s'affiche avec elle. | Vu (artisan, relecteur). | La ligne sans quantité devient orange et bloque l'envoi tant qu'elle n'a pas de quantité. |
| B1 / G32 / G34 | `/cgu` affiche toujours la version du 27/10 (49 €, 348 €, commission). L'engagement de commander reste écrit sur `/achats-groupes/lancer` (pas 4 : « Si tu t'engages, tu commandes », exclusion 3 mois), dans Aide et contact, les conditions négoces art. 14 (« s'y engage à commander », « livraison comprise »), le message à copier pour le négoce (« besoins fermes ») et TON.md. | Vu (relecteur, comptable). | CGU : attend l'avocat (voulu). Le reste : aligner sur « tu décides à la réception de l'offre ». L'article 14 des conditions négoces est un texte juridique : ton accord avant d'y toucher. |

## Gênants

### Demande de prix et négoces

- Tri par métier : un article pris au catalogue Étanchéité part chez le négoce Couverture. Le métier est deviné par les mots : 118 articles d'étanchéité sur 172 ne sont pas reconnus. Proposition : prendre le métier du catalogue quand l'article en vient. (Vu et lu.)
- Tri par métier : le zingueur et l'étancheur reçoivent encore l'objet « demande de prix couverture », la phrase « couverture en ardoises… » et, au § 2 du PDF, les lignes des autres métiers. (Vu.)
- Renvoyer par l'écran refait partir la demande chez trois négoces déjà servis, sans avertissement. Trois renvois au même instant ne donnent bien qu'un e-mail. (Vu.)
- Prix saisi par le négoce : « abc », « -5 », « 0 » sont refusés clairement. 620 € la pièce part sans alerte, s'affiche chez l'artisan et entre dans « Mes prix ». Un délai « 2,5 » donne un message technique. (Vu.)
- Le négoce ne reçoit aucun e-mail de confirmation de son offre. (Vu.)
- Le PDF porte l'e-mail personnel de l'artisan alors que l'écran dit « Ton e-mail, lui, n'est jamais donné ». (Vu.)
- Une date de réponse passée est acceptée ; le retardataire répond sans que personne soit averti. (Vu.)
- « Livraison offerte » et « Le moins cher » s'affichent quand le négoce n'a rien saisi en livraison et qu'il est seul. (Vu.)
- G13 (conditions avant une offre sans compte) et G14 (dépôt de PDF sur la page du négoce) : pas faits. La réponse par e-mail avec un PDF marche.

### Abonnement et paiement

- Deux « Payer » au même instant passent tous les deux : 2 factures, 2 e-mails (vu une fois). Avec Stripe, deux pages de paiement ouvertes avant de payer ne sont pas bloquées (lu).
- Résilier pendant un paiement refusé : l'e-mail part, mais l'écran ne change pas ; après rechargement le bouton est revenu et le bandeau rouge reste. (Vu.)
- J'ai choisi Pro, carte refusée : « Mettre à jour ma carte » vend Essentiel à 19,90 €. (Vu.)
- « Paiement refusé » en rouge alors que rien n'a été refusé, entre la fin du mois et le renouvellement. (Vu ; avec Stripe : lu, à vérifier.)
- Un abonnement payé jusqu'au 14/12 passé en « échec » redevient gratuit au bout de 7 jours, alors que l'e-mail de résiliation promet l'accès jusqu'au 14/12. (Vu.)
- Une résiliation ne s'annule pas ; un abonné à l'année ne peut pas passer à Pro avant un an. L'écran l'explique. (Vu.)
- G9 : un premier paiement refusé donne 7 jours de droits Essentiel sans avoir payé (simulé seulement). Règle de facturation, pas touchée.
- G6 : messages Stripe en retard ou dans le désordre non gérés ; carte refusée au passage à Pro : message technique. (Lu.)
- Bons de commande de l'ancien parcours : « 7 pièces · 1,28 € · 8,92 € » et un total qui n'est pas la somme des lignes. Pas atteignables à l'écran tant que les achats groupés V1 sont allumés. Offres classiques : total identique chez le négoce et l'artisan, mais un centime d'écart ligne à ligne. (Recalculé.)

### Liste, assistant, achats groupés

- G19 : « Règle 2 lignes orange » et « 2 lignes à vérifier », alors que 3 lignes ont un bord orange et 10 portent « à vérifier ». Après deux « Valider » : « Ta liste est prête. », les « à vérifier » restent. Mots mélangés partout (fournisseur / négoce ; regroupement / achats groupés / collectif ; quantitatif / liste / chantier / demande ; offre / devis / réponse). (Vu.)
- G16 : épaisseur « 3,5 mm » perdue en quittant l'écran ; titre « Ardoise naturelle 32 × 22 · Espagne · 1er choix · … » ; « Gouttière havraise zinc dév. 33 · naturel » devient « Gouttière zinc dév. 33 » ; « Voir » sur son propre achat ouvre « Ajoute ta quantité ». (Vu.)
- G15 : pas de lot Étanchéité ; le peintre ne peut rien grouper et n'a pas de spécialité « Peinture ». (Vu.)
- G20 : plus d'hypothèses dans l'assistant écrit ; « Naissances » et « + 5 % de marge » restent sur la liste tirée d'un devis. À rapprocher de « ne jamais inventer ».
- G22 : un devis collé dans l'assistant donne « Saint-Brieuc, 22 000 pièces » (lecture simulée en local : à refaire avec la vraie lecture).
- G23 : le mot en trop est corrigé ; le même article ajouté deux fois ne prévient toujours pas.
- « Ce SIRET ne va pas : 14 chiffres. » pour 14 chiffres tapés. (Vu.)
- G35 : « Couverture, charpente, zinguerie » reste un seul bouton ; quatre listes de métiers différentes dans l'application.

### Mission

- Masquage, autres écritures qui passent : « +33 (0)6… », « 06/12/34/56/78 », tiret long, virgule, site sans www, numéro coupé sur deux messages. (Vu.)
- G26 : plusieurs comptes « vérifiés » avec le même SIRET. Attend ta décision.
- G27 : le refus « Vérifie d'abord ton entreprise (SIRET) » arrive après « Publier », sans lien, et la saisie est perdue.
- G28 : la phrase « qui gère quoi » n'est que sur la fiche d'une annonce et dans les CGU.
- G29 : on ne signale qu'une conversation ; conversation archivée introuvable ; blocage non annoncé définitif ; aucune alerte à Greg (lu).
- G30 : « couvreur », « ardoise », « renfort », « Qualibat » donnent 0 résultat ; pas de filtre diplômes ni URSSAF.
- G31 : « CV », « Débutant accompagné », « € HT / jour / personne », « Entreprise vérifiée » restent. Avocat.
- À trancher : une entreprise vérifiée peut écrire à un indépendant « disponible » sans réponse de sa part. C'est la règle écrite, mais elle frotte avec « jamais de contact libre ».
- Après l'accord des deux, seul le téléphone s'affiche alors que l'écran promet « Téléphone et e-mail ».

### Terrain (téléphone, réseau, soleil, doigts)

- G38, pas corrigé : en thème sombre, si le serveur ne répond pas, la phrase est noire sur noir (1,00:1). La correction du 14 novembre est allée dans `error.tsx` ; l'écran en cause est dans `session.tsx`. (Vu.)
- G21, à moitié : corrigé dans l'assistant de la liste ; pas sur `/chantiers/nouveau` › « Mobiiz m'aide ». Réseau faible : la phrase d'erreur sort déformée et la case est vidée. (Vu.)
- G39 : sans réseau, « Envoyer » ne semble rien faire : le message rouge est sous l'écran (691 px sur un écran de 667). Même défaut sur « Créer le quantitatif ». Aucun envoi en double. (Vu.)
- G40 : consigne « Ajoute un matériau pour créer le quantitatif » à 1,69:1 ; boutons désactivés à 3,38:1 ; contours des champs de 1,16 à 1,36:1. (Mesuré.)
- G41, en partie : corrigés pour la recherche Missions, le retour du catalogue, les pieds de l'application. Restent « Moins » / « Plus » à 36 px, les interrupteurs de notifications à 32 px, 8 liens de pied à 32 px sur quatre pages, « Où en est chaque ligne » à 23 px. (Mesuré.)
- Sans réseau, la liste déjà ouverte n'affiche aucune ligne, alors que la page de secours promet le contraire. Après une déconnexion, page blanche « Pas de réseau. » sans bouton. La sélection du catalogue est perdue si la page se recharge avant « Créer ». (Vu.)

### Textes

- La FAQ cite une « simulation de 6 € à 3 € » qui n'est pas sur la page. `/couvreurs` et `/peintres` gardent « au prix des gros » et « deux fois moins cher ».
- Page Confidentialité : une note interne visible (« Greg, 26 octobre 2026… »), « de le regroupement », et la promesse d'un lien de désinscription absent des 6 e-mails lus.
- « Code support » reste dans les messages d'erreur ; le message de débit vouvoie.
- Champ « Commission Mobiiz (%) » encore dans l'admin.

## Heure de pointe

50 artisans et 10 négoces en même temps, deux vagues aux résultats identiques, sur une seule machine, limites de débit coupées. Près de 3 900 appels, aucune erreur 500.

- B6 corrigé : 225 envois au même instant (150 e-mails), 0 erreur, tout parti en 3 à 4,5 s, le serveur répond pendant ce temps.
- G10 corrigé pour le double appui : 150 e-mails attendus, 150 reçus, 0 doublon. Pas corrigé pour deux onglets : même liste, même négoce, 2 demandes et 2 e-mails. (Vu.)
- NOUVEAU, BLOQUANT QUAND ÇA ARRIVE (N4, rare et silencieux) : deux appuis qui se chevauchent sur « Envoyer » font partir un seul e-mail, mais son lien « Répondre en ligne » est mort (« Introuvable »). Vu 75 fois sur 75 sous charge avec 150 ms d'écart ; au repos, seulement sous 20 ms. Sur un même écran le bouton est grisé : le cas vient de deux onglets, deux appareils ou d'un nouvel appui après une coupure. Cause lue : `demande-perso.service.ts` (`complement`), le lien est refabriqué avant la file et le second appel écrase le premier. Proposition : fabriquer le lien dans le verrou, juste avant l'e-mail.
- G18, mieux mais pas réglé (médiane à 50) : création de liste 2,2 s ; recherche au catalogue 2,9 à 4,6 s ; ouverture du catalogue 1,4 à 1,6 s. Seul, chaque geste prend 0,07 s.
- Gênant : en tapant lettre par lettre, 50 artisans attendent 12 s et le serveur est figé jusqu'à 13 s pour tout le monde ; 2 s à 10 artisans. Ce qui coûte (lu) : une recherche à chaque lettre ; chaque recherche relit les 2 142 articles ; l'ouverture renvoie 914 Ko à chaque fois. Propositions : attendre 300 ms après la dernière lettre ; garder le catalogue en mémoire du serveur.
- File des envois (trois à la fois) : marche en local. Réserve lue : le compteur est en mémoire, donc une file par copie du serveur en ligne ; non vérifiable en local.
- Détail : un négoce qui envoie son offre deux fois au même instant fait partir deux e-mails « a chiffré ta demande ».
- Autres mesures à 50 (médiane) : inscription 1,2 s ; création de la demande 0,6 à 0,9 s ; offre du négoce 0,8 à 1,2 s ; lectures sous 0,2 s ; pages du site sous 0,7 s.

## Corrigé depuis la première recette (vérifié)

B2, B3, B5, B6, B8 ; B4 pour le cas courant ; B7 pour l'essentiel ; G1, G2 (conditions négoces), G5 (clics à la suite), G7 (à l'écran), G8, G10 (envois simultanés), G11 (saisies fausses), G12 (récapitulatif), G17, G25 (les cinq cas cités), G36, G37.

## À savoir

- Pendant la recette, une commande du comptable a affiché les réglages du serveur local, clés comprises, dans son journal de travail. Rien dans le dépôt, rien de poussé. À Greg de décider d'un renouvellement.
- Non vérifiable en local : Stripe réel (cartes de test, 3D Secure), la vraie lecture des devis, le site en ligne.
