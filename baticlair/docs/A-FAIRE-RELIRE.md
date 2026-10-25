# À faire relire par un avocat

Plan « finition », bloc 3 (22 octobre 2026). Les quatre pages légales (mentions légales, CGU artisan, conditions négoce, confidentialité) ont été relues ligne par ligne et collent à ce que fait l'app aujourd'hui. Ce premier jet ne remplace pas un avocat : **relecture indispensable avant le premier vrai lot**. Rien de cette liste n'est marqué sur les pages.

Pages : `apps/web/src/app/(auth)/{mentions-legales,cgu,conditions-negoce,confidentialite}/page.tsx`. Éditeur et hébergeur : `apps/web/src/lib/legal.ts`. Contrat négoce (PDF) : `texteContrat` dans `packages/domain`.

## Mentions légales

1. **Contact (LCEN, art. 6-III)** : la loi demande une adresse e-mail ou un téléphone. La page donne seulement l'adresse postale et « répondre à un e-mail reçu de BatiClair ». Il faut une adresse e-mail de contact (et dire si on ajoute un téléphone). À Greg : quelle adresse ?
2. **Directeur de la publication** : non nommé. À Greg : son nom.
3. **Capital social et RCS** (SARL) : absents. À Greg : capital et ville du RCS (Saint-Brieuc ?).
4. **Hébergeur** : Vercel Inc. (États-Unis) est nommé, Neon aussi. Vérifier si Neon doit figurer comme hébergeur à part entière.

## CGU artisan

5. **Prix « gratuit pour l'artisan »** : la clause dit « aujourd'hui gratuit ; une formule payante plus tard sera annoncée, rien ne sera facturé sans votre accord ». Or l'app garde la carte « Formule » dans Compte et la page `/formules` (paywall éteint, `PAYWALL=off`). À décider : masquer ces écrans tant que tout est gratuit, ou garder la clause telle quelle.
6. **Responsabilité** : quantités lues par une IA, « liste reprise telle qu'écrite », prix livré estimé (la facture du négoce fait foi). La limitation de responsabilité est-elle suffisante et opposable à un professionnel ?
7. **Désistement et exclusion** (avertissement, puis six mois d'exclusion de la commande commune) : sanction contractuelle à valider (proportionnalité, information préalable).
8. **Compteur public** : il publie un nombre d'artisans (jamais un nom). Vérifier qu'aucune information n'est à ajouter.
9. **Changement de version sans réacceptation** : les CGU sont passées de 2026-10-20 à 2026-10-22 (changement de nom, retrait des 2 %) sans demander une nouvelle acceptation. Valider la règle à suivre pour les prochaines versions (information, délai, réacceptation).

## Conditions négoce et contrat

10. **Rémunération de BatiClair** : les conditions négoce disent seulement « celles du contrat présenté sur la page de dépôt, et seulement pour un devis retenu » (décision de Greg : rien sur les 2 % tant que ce n'est pas décidé). Mais **la page de dépôt et le contrat PDF disent toujours 2 %** (case « J'accepte la commission » obligatoire). Paiement non touché sur ordre de Greg : à trancher avec lui, puis aligner contrat, page de dépôt et conditions.
11. **Statut d'apporteur d'affaires** : qualification du contrat, facturation de la commission, absence de mandat d'achat, risque de requalification en intermédiaire de commerce.
12. **Choix automatique du négoce** (moins cher livraison comprise, distance calculée × 1,3) : vérifier la transparence due au négoce (critères de classement, plateforme en ligne, règlement P2B 2019/1150).
13. **Acceptation par case cochée** avec date, e-mail et IP : valeur probante suffisante ?
13 bis. **Conditions de la Commande commune pour les négoces** (`/negoce/conditions`, dix points, version 2026-10-23, texte dans `packages/domain/src/groupe/espace-negoce.ts`, acceptées par case cochée à l'inscription, version enregistrée sur le compte) : prix fermes quel que soit le volume, un prix pour tous, garantie 30 jours si retenu, livraison selon paliers déclarés, confidentialité des artisans, aucun classement public, « aucun coût pour l'instant, BATI INVEST se réserve d'introduire une commission ultérieurement avec un préavis écrit », désabonnement libre, liberté de ne pas répondre, données. À relire : la portée de l'engagement « prix fermes » et de la garantie 30 jours (offre ferme au sens du Code civil ?), la clause de commission future (préavis, forme de l'accord), et l'articulation avec les anciennes conditions négoce du lot (page `/conditions-negoce`, contrat 2 %).

## Confidentialité (RGPD)

14. **Base légale de chaque traitement** : non écrite (exécution du contrat, intérêt légitime pour le mail aux négoces, obligation légale pour la comptabilité). À écrire avec l'avocat.
15. **Transferts hors UE** : Anthropic (États-Unis) lit les listes et les devis ; Vercel est une société américaine (serveurs à Francfort) ; Resend aussi. Garanties à citer (Data Privacy Framework, clauses contractuelles types) et accords de sous-traitance (DPA) à signer ou vérifier pour Vercel, Neon, Resend, Anthropic.
16. **Mail d'information aux négoces** (prospection B2B, e-mail professionnel trouvé ou ajouté par un artisan) : conformité au droit d'opposition (lien « stop » présent) et information à la première prise de contact.
17. **Durées de conservation** : compte et documents 3 ans après la dernière connexion (purge quotidienne en place) ; pièces comptables 10 ans. Non fixées : données des négoces (aucune purge aujourd'hui), journaux techniques (Vercel, Resend), adresses de notification. À fixer.
18. **Délégué à la protection des données** : pas obligatoire à cette taille, à confirmer ; registre des traitements à tenir.
19. **Cookies** : un cookie de session et quelques réglages dans le navigateur, tous indispensables, donc pas de bandeau. À confirmer.


## Mise en conformité du 24 octobre 2026 (à relire en priorité)

Les pages ont été réécrites (versions du 24/10/2026) ; les points 1 à 4, 9, 10, 13 bis, 14 à 19 ci-dessus sont traités dans le code, mais restent à valider :

20. **CGU artisan** (`apps/web/src/app/(auth)/cgu/page.tsx`) : professionnels à SIRET actif seulement ; « ni vendeur ni acheteur » ; aucune garantie de prix ni de livraison ; responsabilité limitée (quantités lues par une IA, la facture du négoce fait foi) — opposable à un professionnel ? ; suspension d'un compte ; droit français, tribunal de commerce de Saint-Brieuc ; versions datées, réacceptation à chaque version majeure.
21. **Conditions négoces** (13 points, `CONDITIONS_NEGOCE`, version 2026-10-24) : « prix fermes quel que soit le volume » et « garantie 30 jours » (offre ferme ?) ; formule « Aucun frais pour l'instant. BATI INVEST pourra introduire une commission ultérieurement, avec un préavis de 60 jours et l'accord du négoce. » ; règlement P2B 2019/1150 (critères de classement : moins cher livré, distance × 1,3).
22. **Clause concurrence** : un négoce ne voit jamais les prix d'un autre ; il sait combien de négoces sont consultés et **s'il est premier sur le total** pendant le délai. Ce dernier signal peut-il être vu comme un échange d'information entre concurrents (droit de la concurrence, art. L420-1) ? À trancher : le garder ou le retirer.
23. **Confidentialité** (`/confidentialite`, en tableau) : bases légales retenues (contrat ; intérêt légitime pour les invités, les preuves, les journaux ; obligation légale pour les bons et l'exclusion), transferts (CCT, DPF).
24. **Bons de commande 10 ans** : BATI INVEST n'est pas partie à la vente ; garder une archive sans nom 10 ans est-il justifié, ou 5 ans suffisent-ils ?
25. **Invités non inscrits** (intérêt légitime B2B) : 3 relances puis effacement, 12 mois au plus ; mention de l'artisan qui l'a ajouté (jamais son nom) et lien d'opposition dans chaque e-mail : suffisant ?
26. **Anonymisation des devis** : l'artisan garantit dans les CGU qu'il a le droit de transmettre le document ; les pages scannées partent encore en image à l'IA (non anonymisables) : à dire dans la confidentialité ?

## Abonnement artisan (24 octobre 2026, Mobiiz)

27. **Argument « Dès 29 € par mois, économise des centaines, voire des milliers d'euros chaque année. »** (changé le 24 octobre 2026 avec les deux formules ; avant : « Pour 29 € par mois… ») (landing, /tarifs) : formulé comme une possibilité, pas une moyenne garantie ; remplacé automatiquement par la vraie économie moyenne par commande dès 3 cycles publiés (`argumentTarif`). Risque de **publicité trompeuse** (art. L121-1 et suivants du code de la consommation, applicables aussi entre professionnels via L121-4 ?) : la phrase est-elle acceptable avant d'avoir des chiffres ? Faut-il une mention « exemple, sans garantie » ?
28. **CGU, article 3 « L'abonnement »** : prix HT, essai (30 jours après les premiers résultats, 60 jours sans dépôt), renouvellement mensuel, résiliation en fin de période sans remboursement, échec de paiement (7 jours de grâce), **pas de droit de rétractation entre professionnels** (un artisan seul, sans salarié, peut-il invoquer L221-3 du code de la consommation ?), changement de prix avec 30 jours de préavis.
29. **Factures** : émises par BATI INVEST, numérotation continue « F-000001 », mentions (raison sociale, SIRET, adresse, TVA, HT/TVA/TTC, « facture acquittée ») ; manque-t-il une mention obligatoire (pénalités de retard, indemnité forfaitaire de 40 €, sans objet pour une facture déjà payée) ?
30. **Version des CGU** : l'article 3 est ajouté sous la même version du 24/10/2026 (aucun compte réel ne l'avait encore acceptée). À la mise en production, toute modification suivante passe par une nouvelle version majeure.

## Deux formules : mensuel 49 €, annuel 348 € (24 octobre 2026)

31. **« 29 € par mois » pour l'annuel** : réglé par Greg le 24 octobre 2026, l'annuel passe à **348 € HT**, soit exactement 29 € par mois (avant : 349 €, 29,08 €).
32. **« -40 % »** : la vraie remise est de 40,8 % (240 € sur 588 €). Le badge l'arrondit au-dessous (jamais plus que la vraie, choix confirmé par Greg). « 240 € économisés par an » compare à douze mois de mensuel au prix du jour.
33. **CGU, article 3** (version du 24/10/2026, toujours aucun compte réel) : deux formules ; l'annuel se renouvelle **par tacite reconduction** pour un an, au prix alors en vigueur, avec un e-mail **30 jours avant**. Entre professionnels, la loi Chatel (L215-1 du code de la consommation) ne s'applique pas en principe, sauf à un artisan qui serait traité comme un consommateur (L215-3, non-professionnel) : le rappel à 30 jours couvre-t-il le risque ?
34. **Résiliation de l'annuel** : effet à l'échéance, **aucun remboursement au prorata** de l'année commencée. Clause acceptable entre professionnels ? Faut-il un délai de résiliation avant l'échéance (aujourd'hui : jusqu'à la veille) ?
35. **Passage du mois à l'année** : la part non utilisée du mois est déduite, au jour près (comme Stripe). Le passage de l'année au mois n'est pas proposé en cours d'année (résilier, puis reprendre au mois à l'échéance). À dire autrement ?
36. **Factures** : une facture « Passage à l'abonnement annuel, du … au …, moins la part non utilisée du mois en cours », au montant réellement payé ; faut-il y écrire le détail (349 € − 25,29 €) ? Mention de bas de facture propre à chaque formule.

## Recentrage du 25 octobre 2026 (demande perso, regroupements, gratuit et payant)

37. **CGU, article 2 (demande perso, Mes prix, regroupements, gratuit et payant)** : version du 25 octobre marquée mineure (pas de réacceptation). Est-ce suffisant, vu que le gratuit ajoute des plafonds ?
38. **E-mail « au nom de l'artisan »** : il part de notre domaine avec le nom de l'artisan, après son accord explicite (case « J'accepte que mon nom et mon entreprise soient transmis… »). L'accord est daté (`accordIdentiteLe`). Suffit-il ?
39. **Conditions négoces, points « Demandes perso » et « Pas d'alignement automatique »** : la validité est fixée par le négoce (7 jours au moins) ; l'ancienne garantie de 30 jours ne vaut plus que par défaut.
40. **Payant offert dans une zone qui démarre, puis préavis de 30 jours** : la formulation dans les CGU est-elle assez claire pour un abonné qui passe en gratuit ?
41. **Aucune promesse d'économie** : la phrase « des centaines, voire des milliers d'euros » est retirée. Garder la vraie moyenne mesurée dès 3 cycles ?
