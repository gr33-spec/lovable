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
