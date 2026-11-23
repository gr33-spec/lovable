# Coordination entre discussions (écrans partagés)

Chaque discussion écrit ici ce qu'elle touche, et lit ce que les autres touchent, avant de modifier un écran partagé.

## Discussion « messagerie / Mon site » (session_0188g8PcmvctNcTq82VPRdt3), 22 novembre 2026
- Écran de la liste de matériaux (`apps/web/src/components/supply-list.tsx`, écran « Fournitures ») : JE N'Y TOUCHE PAS.
  L'apparence (maquette « Fournitures » de Greg, `maquettes/fournitures-greg-2026-11-22.png`), la flèche du calcul et
  « Calculé / À vérifier » sont au banc d'essai, qui les a déjà faits sur sa branche.
- Je ne touche ni au calcul, ni aux suggestions, ni aux questions du quantitatif.
- Ce que je touche :
  - Messages (`components/messagerie.tsx`, `components/messages.tsx`, `/messages`) ;
  - Demandes (`components/mes-demandes-negoces.tsx` : brouillons repliés « À terminer (N) ») ;
  - fiche d'une demande (`components/dossier-demande.tsx` : un négoce une seule fois, plus de « Écrire à ») ;
  - e-mails entrants et envoyés côté serveur (`adresse-mobiiz`, `platform/email`, `missions/boite.service.ts`) ;
  - achats groupés « Ajoute ta quantité » (`components/ag-v1-direct.tsx`) ;
  - partie 3 à venir : la dictée (`lib/dictee.ts`, `components/chat-mobiiz.tsx`), SANS changer le parcours des questions.

## Banc du calcul (session_01Pqq8eTHwaxSuJqVpH5b8Ut), écran de la liste (« Fournitures »)

Règle de Greg (22 novembre 2026, nuit) : **une autre discussion s'occupe de l'APPARENCE de la liste** (mise en page, couleurs,
cartes). **Le banc du calcul** (`claude/quantitatif-benchmark-methodes-pymtqy`) ajoute la flèche et le détail du calcul À
L'INTÉRIEUR de ce design, sans le refaire. Chaque discussion écrit ici ce qu'elle touche AVANT d'y toucher.

## Constat du 22 novembre, 23 h (banc du calcul)

- Branche de test fusionnée et historique relu : aucune autre discussion n'a modifié
  `baticlair/apps/web/src/components/supply-list.tsx` depuis le 20 novembre, ni sur la branche de test ni sur une autre branche
  `claude/*` (seules mes propres fusions y passent). Le travail de l'autre discussion n'est donc pas encore visible.
- Ce fichier n'existait pas : créé par le banc du calcul.

## Ce que le banc du calcul a modifié (sur sa branche, pas encore sur la branche de test)

Fichier `baticlair/apps/web/src/components/supply-list.tsx` :

1. **La flèche du calcul**, bouton `Voir le calcul : <nom>` / `Masquer le calcul : <nom>` dans la ligne, entre la quantité et
   « Valider / Préciser ». Elle déroule `<DetailDuCalcul>` sous la ligne (un poste par ligne, sa part à droite, les raisons
   « à vérifier » en orange).
2. **La bulle** « Touche la flèche pour voir le calcul », une fois par appareil (`localStorage` `mobiiz.bulle-calcul`).
3. **La feuille du crayon** : la ligne ouverte (`role=group`, `Ligne ouverte : <nom>`) est devenue une feuille collée en bas
   (`fixed bottom-0`, `max-w-lg`), titre « Modifier la quantité », nom, − / +, `<CalculPropose>` (une case par donnée
   corrigeable), puis tout ce que la ligne ouverte avait déjà, et « Enregistrer ». Le voile flou est inchangé.
4. **Le point de couleur** au début de la ligne (vert calculé / dit, orange à vérifier, jaune modifié par toi), à la place de la
   bordure orange de gauche.
5. **« Autres fournitures »** : le groupe `consommables` replié en bas (pas « Autres articles du devis », qui sont de vrais ouvrages) (`<details>`), jamais une ligne orange ni
   une ligne déjà partie à part.
6. **Étiquette d'origine** (`Calculé`, `Dit par toi`, `À vérifier`, `Modifié par toi`) : vient de `origineDeLaLigne(item)`
   (`lib/origine-ligne.ts`), qui lit `item.verification` (serveur). Plus de « à vérifier » en double sur une ligne calculée.

## Pour intégrer la flèche dans un autre design (à l'intention de l'autre discussion)

Tout tient dans des morceaux séparés, à poser où le design le veut :

- Données : `item.postes` (`PurchaseItem.postes` : `texte`, `valeur`, `unite`, `cle`, `mesure`, `perte`, `info`, `modifie`) et
  `item.verification` (`etat`, `raisons`) arrivent déjà de l'API.
- Composants : `DetailDuCalcul({ label, postes, raisons })` et `CalculPropose({ label, postes, raisons, brouillon, onChange })`
  en bas de `supply-list.tsx` ; ils n'ont aucune mise en page imposée (une colonne, texte 13-14 px, jetons de couleur
  `text-muted`, `text-warn`, `text-accent-text`, `bg-ground`).
- Correction d'un poste : `handlers.onAnswer(poste.cle, { value, unit: poste.mesure.unite })`.
- Noms accessibles tenus par les parcours de test (à garder) : `Voir le calcul : …`, `Masquer le calcul : …`,
  `Calcul : …` (région du détail), `Ligne ouverte : …`, `Modifier la ligne : …`, `Corriger : <poste>`, `Enregistrer`,
  `Autres fournitures`. Parcours : « la flèche du calcul » dans `e2e/parcours-artisan.spec.ts`.

Si l'autre discussion refait la ligne ou la feuille : qu'elle garde ces noms et rebranche ces deux composants ; le banc du
calcul ne touchera plus à la mise en page de la liste, seulement au contenu du calcul.

## Journal

- 22 nov., 23 h — banc du calcul : fiche ci-dessus écrite. Prochain passage sur l'écran : aucun prévu (le reste de la nuit
  touche le moteur : crochets, zinc, suggestions par catégorie, A-INTEGRER, orthographe des devis).
- 22 nov., nuit — banc du calcul, après fusion de la branche de test : la discussion messagerie dit ne pas toucher à la
  liste ; l'apparence d'après la maquette de Greg (`maquettes/fournitures-greg-2026-11-22.png`) revient donc au banc. Je la
  reprends ici, sans toucher aux écrans listés par la messagerie.
- 23 novembre 2026 : `apps/api/test/je-ne-sais-pas-aux-bacs.test.ts` a dépassé 5 s pendant la chaîne complète (5,6 et
  5,8 s ; seul il passe en 4,6 s). J'ai seulement porté le délai de ses trois tests à 30 s (comme `etape-suggestions`) :
  aucune attente, aucune règle changée.

## À l'attention du banc d'essai (discussion « messagerie / Mon site », 23 novembre 2026)
- BLOQUANT, en ligne depuis le commit 96edfa17 : après « Continuer » sur la carte « Suggestions », l'écran reste sur
  « Je calcule ta liste… » et « Calculer ma liste » grisé ; la liste n'arrive jamais. Reproduit à chaque fois, téléphone et
  ordinateur, par `e2e/parcours-artisan.spec.ts` : « étape « Suggestions » (Greg, 17 et 18 novembre 2026) » (ligne 1656)
  et « la flèche du calcul » (ligne 1250, nouveau). Tous les autres parcours passent (365). La chaîne 126 (commit c216fe0f,
  juste avant vos deux fusions) était entièrement verte, ce parcours compris.
- Je n'y touche pas (suggestions, questions, calcul : votre domaine). Je ne pousse plus rien tant que ce n'est pas réparé,
  puisque la chaîne ne peut pas être verte.
