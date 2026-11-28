# Documents légaux du MVP (candidats du 28 novembre 2026)

Rédigés sans avocat, pour le lancement, à relire par Greg. Un avocat les reverra plus tard. **Rien n'est publié et
aucun écran n'est touché.**

| Fichier | Contenu |
|---|---|
| `mentions-legales-candidate-2026-11-28.md` | Mentions légales, minimales. Le SEUL endroit avec l'adresse, le RCS, le capital et le numéro de TVA |
| `cgu-cgv-candidate-2026-11-28.md` | Conditions générales d'utilisation et de vente entre professionnels (22 articles et l'annexe FONDATEUR) |
| `confidentialite-candidate-2026-11-28.md` | Politique de confidentialité (RGPD) |
| `textes-courts-candidate-2026-11-28.md` | Cases à cocher, bandeaux, phrases d'écran et pied d'e-mail |

Sources : les candidates précédentes (`docs/groupe/CGU-candidate-2026-11-16.md`,
`conditions-negoces-candidate-2026-11-21.md`), le registre RGPD, la liste des sous-traitants, la page Confidentialité
en ligne, CLAUDE.md, et le code (vérifications notées dans chaque fichier).

## Réponses de Greg (28 novembre 2026), reportées dans les textes

1. **Commission des négoces** : aucune au lancement. La clause « pourra être introduite plus tard, avec contrat » est à
   l'article 4.5 des CGU.
2. **Plafond de responsabilité** : 100 € pour un compte gratuit ; pour un compte payant, ce qu'il a payé sur les
   12 derniers mois (CGU 18.4).
3. **Téléphone** : le portable de Greg, dans les mentions légales seulement. Repère [À COMPLÉTER], à remplir le jour de
   la publication.
4. **Adresse** : gardée dans les mentions légales pour le lancement.
5. **IA** : une seule mention discrète à l'écran, « Assistant automatique (IA) : vérifie toujours ta liste ». Les CGU et
   la politique de confidentialité nomment le prestataire, sobrement.
6. **Missions** : données gardées tant que le compte existe, effacées après 3 ans d'inactivité.
7. **Changement de formule** : à la façon de Stripe. Une montée est immédiate, au prorata ; une descente prend effet à
   la fin de la période payée (CGU 15.2).
8. **FONDATEUR** : la remise se reporte sur la formule qui remplacerait Pro (annexe A.5).
9. **Sites des artisans** : un lien « Mentions légales » en pied de page, avec les informations de l'artisan
   (CGU 10.4).
10. **Boîte des alertes** : Hotmail (Microsoft), ajoutée aux destinataires.
11. **Tutoiement** dans l'application et les e-mails, vouvoiement dans les textes juridiques.
12. **Correction** : les participants d'un achat groupé restent ANONYMES entre eux (CGU 7.6 et 8.1, confidentialité
    section 6, textes courts section 8).

## Ce qui reste ouvert (tranché par Greg le 28 novembre 2026, rien à décider)

1. **Anonymat des achats groupés** : validé ; le code est corrigé par la discussion « SaaS achat artisans ». Textes
   inchangés.
2. **Listes anonymisées après suppression** (métier, département, articles, quantités) : gardées pour l'observatoire,
   écrites comme « prévu ». Changement de code noté dans `banc-quantitatif/COORDINATION.md`.
3. **Hotmail** : gardé pour le lancement, boîte pro plus tard.
4. **E-mails aux négoces** : vouvoiement gardé.
5. **Lien « Mentions légales » des sites** : codé par « SaaS achat artisans », avec la discrétion des infos société.

## Points juridiques sensibles à surveiller

1. **Commission plus tard.** Le jour où une commission est introduite, Mobiiz se rapproche d'un apporteur d'affaires.
   Il faudra alors :
   - un contrat écrit avec chaque négoce ;
   - une facture conforme ;
   - un préavis de 30 jours aux artisans ;
   - un ordre d'affichage des offres qui ne dépend pas de la commission.

   Ce sera aussi une version majeure des conditions négoces.
2. **Droit de la concurrence dans les achats groupés.** Les participants sont anonymes entre eux, jamais une quantité
   n'est montrée, et rien n'est affiché sous trois entreprises. Les repères de prix ne doivent jamais montrer un prix isolé
   ni une offre en cours. L'article 8 interdit les ententes. C'est le premier point à faire voir à l'avocat.
3. **Missions : faux salariat et prêt de main-d'œuvre.** Mobiiz ne fait que la mise en relation, et l'article 11
   interdit l'emploi salarié et la mise à disposition. Mais des libellés comme « tarif journalier / personne » ou « CV »
   tirent vers le salariat. Missions reste coupée tant que ce point n'est pas vu.
4. **Le quantitatif est une aide** (CGU 5.3 et 5.4). L'artisan vérifie sa liste avant d'envoyer et avant de commander,
   et la responsabilité de Mobiiz est plafonnée. La clause tombe si elle vide l'engagement essentiel : d'où
   l'article 18.5.
5. **Rétractation des très petites entreprises.** La loi étend certaines protections des consommateurs à une entreprise
   de cinq salariés au plus qui signe un contrat hors de son activité principale. Un artisan qui souscrit un abonnement
   pour acheter ses matériaux est sans doute dans son activité, mais le point est discuté. Les CGU disent « pas de
   rétractation » (15.5). Si un artisan la réclame dans les 14 jours, le plus simple est de rembourser.
6. **Le site de l'artisan s'adresse à des particuliers.** Le règlement européen sur les plateformes s'applique sans
   doute. Il demande :
   - des conditions claires ;
   - les motifs d'une suspension ;
   - un préavis avant tout changement (au moins 15 jours ; on en prévoit 30) ;
   - un moyen de contester.

   C'est couvert par les articles 15, 16 et 21. L'artisan reste responsable de son contenu et de ses propres mentions
   légales.
7. **Données des clients des artisans.** Pour elles, Mobiiz agit pour le compte de l'artisan (sous-traitant au sens du
   RGPD). Le texte nettoie les devis, mais :
   - une page scannée ne peut pas être nettoyée ;
   - les messages de l'assistant partent tels quels aux États-Unis.

   L'avertissement est écrit partout.
8. **Clause de tribunal.** Elle ne vaut qu'entre commerçants. Un artisan inscrit seulement au registre des métiers n'est
   pas commerçant, d'où la rédaction de l'article 22.3.
9. **Transferts aux États-Unis** (Anthropic, et les maisons mères des autres). Les contrats de sous-traitance (DPA) sont
   à accepter dans chaque compte avant le lancement. Ils sont listés dans `docs/groupe/RGPD-SOUS-TRAITANTS.md`.
10. **Nouvelle acceptation.** Les comptes existants ont accepté la version du 27/10/2026 (anciens prix, ancienne
    commission). La nouvelle version doit être redemandée à tous : monter `VERSION_CGU_MAJEURE`.

## Ce qu'il faudra faire pour publier (plus tard, avec ton accord)

1. Corriger l'application sur l'anonymat des achats groupés, et coder le lien « Mentions légales » des sites.
2. Remplir le téléphone des mentions légales et ceux des hébergeurs (les seuls repères **[À COMPLÉTER]** restants).
3. Remplacer le texte des pages `/cgu`, `/confidentialite` et `/mentions-legales` par ces versions, avec les prix lus
   dans le code.
4. Monter la version des CGU (`apps/web/src/lib/legal.ts` et côté serveur) : chaque compte accepte la nouvelle version.
5. Retirer l'adresse partout ailleurs que dans les mentions légales (travail de la discussion « discrétion »).
6. Mettre à jour le registre RGPD et la liste des sous-traitants avec les nouvelles lignes.
