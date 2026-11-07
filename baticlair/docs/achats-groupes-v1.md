# Achats groupés V1 (V5.2 validée, 7 novembre 2026)

Greg, 7 novembre 2026 : « La V5.2 est validée. Nous arrêtons maintenant le cycle des maquettes… Tu as mon feu vert pour
reprendre le développement local de la V1 des achats groupés, dans le périmètre strictement défini par la V5.2. »

Développement **local seulement** : branche `achats-groupes-v1`, non poussée ; aucune base Neon touchée ; rien déployé.
Le réglage `ACHATS_GROUPES_V1` est **coupé par défaut** : coupé, les routes `/v1/ag/*` répondent 404 et l'application
reste exactement celle de test.mobiiz.fr.

## Décisions validées pour la V1

| Sujet | Décision |
|---|---|
| Un achat groupé | UN produit précis (clé stricte de ses caractéristiques indispensables), une zone, un mode de réception, une période (date de besoin ± 14 jours). |
| Zone | Le département de l'entreprise (code postal de son adresse). Pas de département voisin ni de rayon, non modifiable. « Ma zone est différente » n'est plus une raison proposée. |
| Produits autorisés | Liste blanche : ardoise naturelle (format, origine, choix, épaisseur), tuile (marque, modèle, teinte), fenêtre de toit (gamme, taille), écran sous-toiture (surface du rouleau), gouttière (matière, développé), isolant (matière, épaisseur), liteaux (section, essence), OSB (épaisseur, format), câble R2V (section). Les autres familles restent dans le quantitatif : « Pas encore ouvert aux achats groupés ». |
| Conditionnement | La quantité de référence reste dans l'unité du produit (pièces, m, rouleaux…). La conversion (« 1 palette = 480 pièces », « longueurs de 4 m ») est toujours confirmée ou corrigée par l'artisan ; jamais supposée. Ceux qui rejoignent un achat confirment le conditionnement de l'achat. |
| Fragmentation | Un nouvel achat ne s'ouvre que si aucun achat compatible n'existe (le serveur refuse : « Ce besoin est identique : rejoins cet achat groupé pour ne pas diviser les volumes. »), même sous deux ouvertures simultanées (verrou par produit, zone, réception). |
| Une ligne, un seul circuit | Une ligne de quantitatif engagée dans une demande individuelle envoyée n'entre jamais dans un achat groupé ; une ligne d'achat groupé ne part jamais en demande individuelle (création ou envoi refusés, avec les lignes nommées) ; une ligne commandée n'a plus de circuit ; une ligne surveillée peut rejoindre (la veille s'arrête, gardée dans l'historique). Index unique partiel : une ligne, un besoin actif. |
| Vérification de l'entreprise | Avant la première confirmation : SIRET vérifié auprès de l'INSEE (date), e-mail vérifié (lien de 24 heures), « Je déclare être : Dirigeant / Autorisé à agir pour l'entreprise ». Redemandée si le SIRET est revérifié après la déclaration. |
| Volumes | Indicatif (non confirmé ou non reconfirmé, jamais présenté aux négoces) ; besoins confirmés ; confirmés pour la consultation (reconfirmés) — le seul volume transmis. Sous 5 entreprises : « D'autres entreprises se positionnent. Les volumes seront visibles à partir de 5 entreprises. » Jamais un nom, une adresse exacte ni une quantité individuelle. |
| Préparation de la consultation | 72 heures par défaut (24 heures à 5 jours), rappel e-mail 24 heures avant ; non reconfirmé à la clôture = indicatif ; la consultation ne part qu'après l'heure. |
| Modifier, retirer | « Quantité modifiée » / « Chantier reporté » ne retirent jamais le besoin (la date reste dans la période de l'achat). « Besoin annulé », « Achat réalisé autrement », « Autre » : « Garder mon besoin » reste l'action principale. Après l'envoi de la consultation : avertissements de la V5.2, volumes transmis mis à jour, historique marqué « transmis aux négoces concernés », retrait tardif compté (bêta : 3 → rappel, au-delà → vérification manuelle, jamais de suspension). |
| Notifications | « À faire » est la source de référence (reconfirmer, examiner une offre). L'e-mail complète ; un e-mail qui échoue ne change rien (l'action reste, le rappel repartira). |
| Offre | Saisie par Mobiiz (aucun envoi réel aux négoces en V1 locale). Incomplète : « Offre reçue — vérification en cours ». Complète : « Offre à examiner », calcul détaillé pour la quantité de l'entreprise, fournisseur, délai, lieu, paiement, validité, annulation. |
| Acceptation finale | Désactivée : « [bouton final : texte à fixer] », jamais actif. « Offre acceptée » et le second tour sont des états futurs, absents des tables de transition. Aucune commande ne peut partir. |
| Ancien brouillon | Non fusionné. Rien n'en est repris dans cette V1 (le cycle d'états, les tables et les écrans sont neufs) ; l'ancien achat groupé par métier reste en place, intact. |

## Où est le code

- Domaine : `packages/domain/src/groupe/achats-groupes-v1.ts` (produits, lots, circuits, cycle d'états, volumes, offre),
  `lireReference` dans `reference-stricte.ts` (lecture seule, comportement de `referenceStricte` inchangé), le refus de
  la demande individuelle pour une ligne V1 dans `cycle/cycle-de-vie.ts`.
- Migration : `apps/api/prisma/migrations/20261108090000_achats_groupes_v1` (additive).
- API : `apps/api/src/modules/achats-groupes-v1/` (routes `/v1/ag/*`, admin `/v1/admin/ag/*`, tâche
  `/v1/internal/achats-groupes-v1/rappels`) ; garde `gardeDemandeIndividuelle` dans `platform/cycle/lignes.ts`.
- Web : `src/components/ag-v1-*.tsx`, `src/lib/ag-v1.ts`, pages `/achats-groupes` (accueil V1 quand le réglage est
  allumé), `/achats-groupes/nouveau`, `/achats-groupes/quantitatif[/id]`, `/achats-groupes/mes-besoins`,
  `/achats-groupes/besoins/[id]`, `/admin/achats-groupes-v1`.
- Tests : `packages/domain/test/achats-groupes-v1.test.ts`, `apps/api/test/achats-groupes-v1.test.ts`,
  `apps/web/e2e-ag-v1/achats-groupes-v1.spec.ts` (config `playwright.ag-v1.config.ts`, iPhone SE, Android, ordinateur).

## Scénario de test manuel (local)

1. Lancer l'API avec `ACHATS_GROUPES_V1=on` (base locale), puis le site. Créer un compte couvreur ; dans Profil, une
   adresse avec code postal des Côtes-d'Armor et le SIRET ; vérifier l'e-mail par le lien reçu.
2. Onglet « Achat en gros » : l'accueil V1 (phrase, recherche, filtres, « Mon département Côtes-d'Armor (22) »).
3. Chercher « ardoise » → Ardoise naturelle. Choisir 32 × 22, Espagne, 1er choix ; voir « Précise l'épaisseur… » et
   « Continuer » grisé ; choisir 5 mm ; « Confirmer 480 pièces par palette » ; Continuer.
4. 10 palettes (voir « 10 palettes = 4 800 pièces »), Livraison sur chantier, une adresse, une date à plus de 3 semaines.
5. « Aucun achat groupé compatible pour le moment » → « Ouvrir cet achat groupé » → « Ton entreprise » : Dirigeant,
   Enregistrer, Continuer → cocher la case → « Confirmer mon besoin » → « Besoin confirmé ».
6. Second compte (autre e-mail, même département) : la carte de l'achat sur l'accueil → même produit prérempli →
   « Un achat groupé correspond » → « Cet achat groupé ne me convient pas » (trois raisons, pas la zone) → « Ma date… »
   → même date → la phrase « Ce besoin est identique… » → « Rejoindre cet achat groupé » → confirmer.
7. Premier compte, le besoin : « Retirer ou modifier » → « Quantité modifiée » 12 → mis à jour, toujours « Besoin confirmé ».
8. Admin (`/admin/achats-groupes-v1`, compte admin avec double authentification) : « Préparer la consultation (72 h) ».
   Premier compte : l'accueil « À faire » montre « Reconfirme ta quantité… » → « Reconfirmer ma quantité ».
9. Admin : « Clôturer maintenant (test local) » ; le second compte (non reconfirmé) voit « Besoin indicatif ».
10. Admin : saisir une offre sans « annulation » → premier compte : « Offre reçue — vérification en cours » ; compléter
    → « Offre à examiner », le calcul, le bouton final grisé.
11. Une liste tapée (« Écris ta liste » : ardoise, crochets, gouttière, câble, parpaing) → « Depuis un quantitatif » →
    lots, mentions, « Pourquoi ? », corriger le lot des crochets → « Sélectionner les recommandations » →
    « Continuer avec 2 lignes » → réception, lieu, date, conditionnements → case → « Confirmer mes 2 besoins ».
12. Sur cette liste, tenter « Demander les prix à mes négoces » : refus qui nomme les lignes dans un achat groupé.
