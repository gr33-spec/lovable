# CGU artisan : version CANDIDATE du 11 novembre 2026 (non publiée)

Statut : PROJET, à faire valider juridiquement avant toute publication. La version en vigueur reste celle du
27 octobre 2026 (`VERSION_CGU = "2026-10-27"`, page `apps/web/src/app/(auth)/cgu/page.tsx`), qui n'a PAS été modifiée.
Numéro proposé pour la publication : `2026-11-11`. Version majeure (nouvelle acceptation demandée à chaque compte) : oui,
puisque les prix et les formules changent.

## Pourquoi une nouvelle version

L'article 3 en vigueur annonce deux formules, « Mensuelle : 49 € HT par mois » et « Annuelle : 348 € HT par an ». Ces
prix datent du 24 octobre 2026 et sont obsolètes depuis le 30 octobre : les formules sont Découverte (gratuite),
Essentiel (19,90 € HT par mois) et Pro (39,90 € HT par mois). Aucune formule annuelle n'est proposée.

## Ce qui a été vérifié dans le fonctionnement réel (11 novembre 2026)

| Point | Constat | Source |
|---|---|---|
| Prix | Essentiel 19,90 € HT, Pro 39,90 € HT, par mois | `packages/domain/src/groupe/tarifs.ts` (`OFFRES`), réglages par défaut `1990` et `3990` centimes |
| Stripe (mode test) | deux prix actifs, 19,90 € et 39,90 €, mensuels, taxe en sus ; un taux « TVA FR » de 20 % en sus | lecture seule de l'API Stripe |
| Formule annuelle | plus proposée à l'écran ; le code garde seulement le suivi d'anciens abonnements annuels | `abonnement.service.ts` |
| Résiliation | depuis « Mon abonnement » ; chez Stripe l'abonnement est résilié « en fin de période » ; l'accès reste jusqu'à la fin de la période payée ; un e-mail confirme | `resilier`, `resilierEnFinDePeriode` |
| Passage d'Essentiel à Pro | à tout moment ; le mois de Pro commence le jour même, la part non utilisée d'Essentiel est déduite | `passerPro`, `prorataVersPro` |
| Échec de paiement | 7 jours de délai (réglage `joursGrace`) | réglages de l'abonnement |
| Négoces par demande | jusqu'à 5, pour toutes les formules | décision du 11 novembre 2026 |

Contradictions relevées, NON corrigées (hors des CGU) :
- Stripe test garde deux anciens prix encore actifs : 49,00 € par mois et 348,00 € par an. Le code ne les lit plus, mais
  ils existent. Aucune configuration Stripe n'a été modifiée.
- Les réglages par défaut gardent `prixAnnuelHtCentimes: 34800` et l'écran d'administration montre encore un champ
  « Prix à l'année ».
- Les variables `STRIPE_PRICE_ID_MENSUEL` et `STRIPE_PRICE_ID_ANNUEL` sont encore posées sur l'hébergeur (test), marquées
  « plus lu » dans `config.ts`.

## Relevé des passages modifiés

| N° | Endroit | Texte en vigueur (27 octobre) | Texte proposé |
|---|---|---|---|
| 1 | En-tête | « Version du 27/10/2026 » | « Version du 11/11/2026 » |
| 2 | Art. 2, « La demande perso » | « vous envoyez votre liste aux négoces de votre choix » | ajout : « , jusqu'à cinq négoces par demande, quelle que soit votre formule » |
| 3 | Art. 3, premier point | « Deux formules […] Mensuelle : 49 € HT par mois […] Annuelle : 348 € HT par an, payés en une fois pour douze mois. » | trois formules : Découverte gratuite, Essentiel 19,90 € HT par mois, Pro 39,90 € HT par mois ; aucune formule annuelle (texte ci-dessous) |
| 4 | Art. 3, « Sans abonnement » | « Il n'y a plus d'essai : votre premier achat groupé est offert. » | remplacé par la description de Découverte ; les achats groupés sont gratuits pour toutes les formules (décision du 30 octobre) : À CONFIRMER par Greg |
| 5 | Art. 3, « Renouvellement » | mentionne le renouvellement annuel et son rappel à 30 jours | seul le renouvellement mensuel reste |
| 6 | Art. 3, « Passer du mois à l'année » | tout le point | supprimé ; remplacé par « Changer de formule » (Essentiel vers Pro) |
| 7 | Art. 3, « Résiliation » | « (le mois en cours, ou l'échéance de l'année pour la formule annuelle) » | « (le mois en cours) » |
| 8 | Art. 3, « Échec de paiement » | « l'accès est limité comme après l'essai » | « votre compte repasse en formule Découverte » : À CONFIRMER, voir la question 2 |

Rien d'autre n'est modifié (articles 1, 4 et suivants inchangés).

## Texte proposé de l'article 3

**3. Les formules et l'abonnement**

- **Trois formules.**
  - **Découverte** : gratuite, sans limite de temps et sans carte bancaire. Elle comprend vos listes saisies à la main,
    l'envoi de vos demandes à vos négoces (jusqu'à cinq négoces par demande), les achats groupés de votre secteur, ainsi
    qu'une analyse de devis et trois scans de liste offerts une seule fois.
  - **Essentiel** : 19,90 € HT par mois. Elle ajoute chaque mois trois analyses de devis et dix scans de liste.
  - **Pro** : 39,90 € HT par mois. Elle ajoute chaque mois huit analyses de devis et trente scans de liste.

  Les prix s'entendent hors taxes ; la TVA s'ajoute au taux en vigueur (20 % aujourd'hui). Les formules Essentiel et Pro
  sont mensuelles, sans engagement de durée, payées d'avance par carte bancaire. **Aucune formule annuelle n'est proposée
  actuellement.** Une facture émise par BATI INVEST est disponible à chaque paiement dans « Mes factures ».
- **Ce qui dépend de la formule** : seulement le nombre d'analyses de devis et de scans de liste. Le nombre de négoces
  par demande (cinq) et l'accès aux achats groupés sont les mêmes pour toutes les formules. Un devis de plus de 150 lignes
  compte pour deux analyses ; vous en êtes prévenu avant l'analyse. Quand le quota du mois est atteint, la saisie à la
  main reste possible et rien n'est facturé en plus.
- **Renouvellement** : les formules Essentiel et Pro se renouvellent chaque mois à la date anniversaire, au prix alors en
  vigueur, sans engagement de durée.
- **Changer de formule** : vous pouvez passer d'Essentiel à Pro à tout moment depuis « Mon abonnement ». Le mois de Pro
  commence le jour du passage ; la part non utilisée du mois d'Essentiel déjà payé est déduite de la première facture de
  Pro.
- **Résiliation** : à tout moment, depuis « Mon abonnement ». Elle prend effet à la fin de la période déjà payée (le mois
  en cours), sans remboursement au prorata de la période commencée ; vous gardez l'accès à votre formule jusqu'à cette
  date, puis votre compte repasse en formule Découverte. Une confirmation vous est envoyée par e-mail.
- **Échec de paiement** : si un paiement est refusé, vous êtes prévenu par e-mail et gardez l'accès à votre formule
  pendant 7 jours pour mettre votre carte à jour ; passé ce délai, votre compte repasse en formule Découverte jusqu'au
  paiement. Vos listes, vos demandes, vos bons de commande, vos factures et vos données restent accessibles.
- **Pas de droit de rétractation** : le service est conclu entre professionnels, pour les besoins de votre activité ; le
  droit de rétractation du code de la consommation ne s'applique pas.
- **Changement de prix** : tout changement vous est annoncé par e-mail au moins 30 jours avant de s'appliquer ; vous
  pouvez résilier avant cette date.

## Questions pour la relecture juridique et pour Greg

1. Passage 4 : la phrase « votre premier achat groupé est offert » est-elle bien à retirer, les achats groupés étant
   gratuits pour tous depuis le 30 octobre ?
2. Passage 8 et résiliation : « votre compte repasse en formule Découverte » décrit ce que fait l'application ; l'ancienne
   formulation (« limité comme après l'essai ») renvoyait à un essai qui n'existe plus. À valider.
3. Les abonnés d'avant le 30 octobre en formule annuelle (s'il en existe en production) : faut-il une clause transitoire ?
   En base de test, il n'y en a pas d'intérêt juridique ; à vérifier en production par Greg.
4. Publier cette version impose une nouvelle acceptation à chaque compte : à confirmer.

## Pour publier (plus tard, sur accord)

Remplacer l'article 3 et les passages 1 à 8 dans `apps/web/src/app/(auth)/cgu/page.tsx`, retirer `PRIX_MENSUEL` et
`PRIX_ANNUEL`, passer `VERSION_CGU` et `VERSION_CGU_MAJEURE` à `2026-11-11` dans `apps/web/src/lib/legal.ts`, mettre à
jour `docs/groupe/CONFORMITE.md`. Rien de cela n'est fait.
