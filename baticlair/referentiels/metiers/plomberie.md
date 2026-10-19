---
code: plomberie
metier: plumbing
nom: Plomberie - sanitaire
etat: brouillon
version: 2026-10-19
moteur: fiche
document: docs/referentiels/plomberie.md
---

# Fiche métier : plomberie - sanitaire (format commun, §52)

Tirée du référentiel plomberie du 3 octobre 2026 (`docs/referentiels/plomberie.md`, sections 2 à 5, NF DTU 60.11). Règle d'or
du métier : jamais un mètre linéaire nu, jamais un forfait, jamais un m² ; un tube en barres ou en couronnes, un raccord à la
pièce, un appareil avec sa référence. Le plombier vend des POINTS D'EAU : chaque appareil écrit reste tel qu'écrit (commandé
avec sa référence) et la fiche ajoute ce qui le raccorde : alimentation en distribution en étoile depuis la nourrice,
évacuation PVC, coudes, raccords, et son kit de raccordement quand il n'est pas livré avec l'appareil.

## 1. Unités et vocabulaire du devis

Unités du devis : u (appareils, points d'eau), ens / forfait (salle de bains complète : le modèle la décompose en appareils
écrits), ml (réseaux longs, chutes : tels qu'écrits).
Mots du métier : « EF » eau froide, « ECS » eau chaude sanitaire ; « multicouche », « PER », « cuivre » = tube
d'alimentation ; « nourrice », « collecteur » ; « EU » eaux usées, « EV » eaux vannes ; « PVC Ø32 / Ø40 / Ø100 » ; « WC
suspendu » = bâti-support + cuvette + plaque (trois articles écrits) ; « cumulus », « ballon » = chauffe-eau ; « GS » = groupe
de sécurité.
Chaque appareil reste tel qu'écrit (colonne « Article écrit » = oui) ; un forfait « salle de bains » se lit appareil par
appareil. La distance moyenne des appareils à la nourrice (`distance_nourrice`), le tube d'alimentation (`tube_alimentation` :
multicouche ou PER) et le kit livré ou non avec les appareils (`kit_livre`) vont dans « donnees » s'ils sont écrits ; sinon
la fiche les demande. Robinetterie (mitigeurs, colonnes), meubles, receveurs, bâti, cuvette, plaque : tels qu'écrits.
Hors commande : dépose, évacuation des gravats, recherche de fuite, main-d'œuvre.

## 2. Ouvrages

| Ouvrage | Libellé | Unité | Article écrit | Ce que le devis écrit |
|---|---|---|---|---|
| lavabo | Lavabo, vasque ou lave-mains | u | oui | « Lavabo vasque sur meuble », « lave-mains », « vasque à poser » |
| wc-a-poser | WC à poser | u | oui | « WC à poser », « pack WC », « cuvette sortie horizontale » |
| wc-suspendu | WC suspendu (bâti, cuvette, plaque écrits) | u | oui | « WC suspendu », « bâti-support Geberit », « WC suspendu avec bâti » |
| douche | Douche (receveur ou italienne) | u | oui | « Receveur de douche 90 × 90 », « douche à l'italienne », « colonne de douche » |
| baignoire | Baignoire | u | oui | « Baignoire acrylique 170 × 70 », « baignoire » |
| evier | Évier de cuisine | u | oui | « Évier inox », « évier de cuisine », « raccordement évier et lave-vaisselle » |
| lave-linge | Attente lave-linge | u | oui | « Alimentation et évacuation lave-linge », « attente machine à laver » |
| chauffe-eau | Chauffe-eau (électrique ou thermodynamique) | u | oui | « Chauffe-eau électrique 200 L », « ballon thermodynamique », « cumulus » |

## 3. Ratios

Par appareil (NF DTU 60.11) : alimentation = nombre de tubes (2 en EF + ECS, 1 en EF seule) × (distance à la nourrice + 1 m
de remontées) × 1,05 (couronne) ; évacuation = (distance + 0,5 m) × 1,10 (barres) ; 2 raccords par tube ; 2 coudes par
évacuation (1 pour un WC) ; colle ≈ 7 emboîtures × 3 g (Ø32-40) ou 12 g (Ø100). Kit de raccordement : seulement si l'appareil
ne l'apporte pas.

| Ouvrage | Fourniture | Ratio | Unité | Condition | Confiance | Source |
|---|---|---|---|---|---|---|
| lavabo | Tube multicouche 16 × 2 | 8,4 | m | distance_nourrice=3 et tube_alimentation=multicouche | à vérifier | S1 S2 |
| lavabo | Tube PER pré-gainé 16 | 8,4 | m | distance_nourrice=3 et tube_alimentation=per | à vérifier | S1 S2 |
| lavabo | Tube PVC évacuation Ø32 | 3,85 | m | distance_nourrice=3 | à vérifier | S4 S5 |
| lavabo | Tube multicouche 16 × 2 | 12,6 | m | distance_nourrice=5 et tube_alimentation=multicouche | à vérifier | S1 S2 |
| lavabo | Tube PER pré-gainé 16 | 12,6 | m | distance_nourrice=5 et tube_alimentation=per | à vérifier | S1 S2 |
| lavabo | Tube PVC évacuation Ø32 | 6,05 | m | distance_nourrice=5 | à vérifier | S4 S5 |
| lavabo | Tube multicouche 16 × 2 | 18,9 | m | distance_nourrice=8 et tube_alimentation=multicouche | à vérifier | S1 S2 |
| lavabo | Tube PER pré-gainé 16 | 18,9 | m | distance_nourrice=8 et tube_alimentation=per | à vérifier | S1 S2 |
| lavabo | Tube PVC évacuation Ø32 | 9,35 | m | distance_nourrice=8 | à vérifier | S4 S5 |
| lavabo | Tube multicouche 16 × 2 | 27,3 | m | distance_nourrice=12 et tube_alimentation=multicouche | à vérifier | S1 S2 |
| lavabo | Tube PER pré-gainé 16 | 27,3 | m | distance_nourrice=12 et tube_alimentation=per | à vérifier | S1 S2 |
| lavabo | Tube PVC évacuation Ø32 | 13,75 | m | distance_nourrice=12 | à vérifier | S4 S5 |
| lavabo | Raccord à sertir multicouche 16 | 4 | u | tube_alimentation=multicouche | à vérifier | S2 |
| lavabo | Raccord à glissement PER 16 | 4 | u | tube_alimentation=per | à vérifier | S2 |
| lavabo | Coude PVC Ø32 87°30 | 2 | u | — | à vérifier | S5 |
| lavabo | Colle PVC | 22 | ml | — | à vérifier | S7 |
| lavabo | Bonde et siphon Ø32 | 1 | u | kit_livre=non | usuel | S8 |
| lavabo | Robinet d'arrêt 15 × 21 | 2 | u | kit_livre=non | usuel | S8 |
| lavabo | Flexible d'alimentation | 2 | u | kit_livre=non | usuel | S8 |
| wc-a-poser | Tube multicouche 16 × 2 | 4,2 | m | distance_nourrice=3 et tube_alimentation=multicouche | à vérifier | S1 S2 |
| wc-a-poser | Tube PER pré-gainé 16 | 4,2 | m | distance_nourrice=3 et tube_alimentation=per | à vérifier | S1 S2 |
| wc-a-poser | Tube PVC évacuation Ø100 | 3,85 | m | distance_nourrice=3 | à vérifier | S4 S5 |
| wc-a-poser | Tube multicouche 16 × 2 | 6,3 | m | distance_nourrice=5 et tube_alimentation=multicouche | à vérifier | S1 S2 |
| wc-a-poser | Tube PER pré-gainé 16 | 6,3 | m | distance_nourrice=5 et tube_alimentation=per | à vérifier | S1 S2 |
| wc-a-poser | Tube PVC évacuation Ø100 | 6,05 | m | distance_nourrice=5 | à vérifier | S4 S5 |
| wc-a-poser | Tube multicouche 16 × 2 | 9,45 | m | distance_nourrice=8 et tube_alimentation=multicouche | à vérifier | S1 S2 |
| wc-a-poser | Tube PER pré-gainé 16 | 9,45 | m | distance_nourrice=8 et tube_alimentation=per | à vérifier | S1 S2 |
| wc-a-poser | Tube PVC évacuation Ø100 | 9,35 | m | distance_nourrice=8 | à vérifier | S4 S5 |
| wc-a-poser | Tube multicouche 16 × 2 | 13,65 | m | distance_nourrice=12 et tube_alimentation=multicouche | à vérifier | S1 S2 |
| wc-a-poser | Tube PER pré-gainé 16 | 13,65 | m | distance_nourrice=12 et tube_alimentation=per | à vérifier | S1 S2 |
| wc-a-poser | Tube PVC évacuation Ø100 | 13,75 | m | distance_nourrice=12 | à vérifier | S4 S5 |
| wc-a-poser | Raccord à sertir multicouche 16 | 2 | u | tube_alimentation=multicouche | à vérifier | S2 |
| wc-a-poser | Raccord à glissement PER 16 | 2 | u | tube_alimentation=per | à vérifier | S2 |
| wc-a-poser | Coude PVC Ø100 87°30 | 1 | u | — | à vérifier | S5 |
| wc-a-poser | Colle PVC | 50 | ml | — | à vérifier | S7 |
| wc-a-poser | Pipe de WC Ø100 | 1 | u | kit_livre=non | usuel | S8 |
| wc-a-poser | Robinet d'arrêt 15 × 21 | 1 | u | kit_livre=non | usuel | S8 |
| wc-a-poser | Flexible d'alimentation | 1 | u | kit_livre=non | usuel | S8 |
| wc-suspendu | Tube multicouche 16 × 2 | 4,2 | m | distance_nourrice=3 et tube_alimentation=multicouche | à vérifier | S1 S2 |
| wc-suspendu | Tube PER pré-gainé 16 | 4,2 | m | distance_nourrice=3 et tube_alimentation=per | à vérifier | S1 S2 |
| wc-suspendu | Tube PVC évacuation Ø100 | 3,85 | m | distance_nourrice=3 | à vérifier | S4 S5 |
| wc-suspendu | Tube multicouche 16 × 2 | 6,3 | m | distance_nourrice=5 et tube_alimentation=multicouche | à vérifier | S1 S2 |
| wc-suspendu | Tube PER pré-gainé 16 | 6,3 | m | distance_nourrice=5 et tube_alimentation=per | à vérifier | S1 S2 |
| wc-suspendu | Tube PVC évacuation Ø100 | 6,05 | m | distance_nourrice=5 | à vérifier | S4 S5 |
| wc-suspendu | Tube multicouche 16 × 2 | 9,45 | m | distance_nourrice=8 et tube_alimentation=multicouche | à vérifier | S1 S2 |
| wc-suspendu | Tube PER pré-gainé 16 | 9,45 | m | distance_nourrice=8 et tube_alimentation=per | à vérifier | S1 S2 |
| wc-suspendu | Tube PVC évacuation Ø100 | 9,35 | m | distance_nourrice=8 | à vérifier | S4 S5 |
| wc-suspendu | Tube multicouche 16 × 2 | 13,65 | m | distance_nourrice=12 et tube_alimentation=multicouche | à vérifier | S1 S2 |
| wc-suspendu | Tube PER pré-gainé 16 | 13,65 | m | distance_nourrice=12 et tube_alimentation=per | à vérifier | S1 S2 |
| wc-suspendu | Tube PVC évacuation Ø100 | 13,75 | m | distance_nourrice=12 | à vérifier | S4 S5 |
| wc-suspendu | Raccord à sertir multicouche 16 | 2 | u | tube_alimentation=multicouche | à vérifier | S2 |
| wc-suspendu | Raccord à glissement PER 16 | 2 | u | tube_alimentation=per | à vérifier | S2 |
| wc-suspendu | Coude PVC Ø100 87°30 | 1 | u | — | à vérifier | S5 |
| wc-suspendu | Colle PVC | 50 | ml | — | à vérifier | S7 |
| wc-suspendu | Manchon de WC Ø90/100 | 1 | u | kit_livre=non | usuel | S8 |
| wc-suspendu | Robinet d'arrêt 15 × 21 | 1 | u | kit_livre=non | usuel | S8 |
| douche | Tube multicouche 16 × 2 | 8,4 | m | distance_nourrice=3 et tube_alimentation=multicouche | à vérifier | S1 S2 |
| douche | Tube PER pré-gainé 16 | 8,4 | m | distance_nourrice=3 et tube_alimentation=per | à vérifier | S1 S2 |
| douche | Tube PVC évacuation Ø40 | 3,85 | m | distance_nourrice=3 | à vérifier | S4 S5 |
| douche | Tube multicouche 16 × 2 | 12,6 | m | distance_nourrice=5 et tube_alimentation=multicouche | à vérifier | S1 S2 |
| douche | Tube PER pré-gainé 16 | 12,6 | m | distance_nourrice=5 et tube_alimentation=per | à vérifier | S1 S2 |
| douche | Tube PVC évacuation Ø40 | 6,05 | m | distance_nourrice=5 | à vérifier | S4 S5 |
| douche | Tube multicouche 16 × 2 | 18,9 | m | distance_nourrice=8 et tube_alimentation=multicouche | à vérifier | S1 S2 |
| douche | Tube PER pré-gainé 16 | 18,9 | m | distance_nourrice=8 et tube_alimentation=per | à vérifier | S1 S2 |
| douche | Tube PVC évacuation Ø40 | 9,35 | m | distance_nourrice=8 | à vérifier | S4 S5 |
| douche | Tube multicouche 16 × 2 | 27,3 | m | distance_nourrice=12 et tube_alimentation=multicouche | à vérifier | S1 S2 |
| douche | Tube PER pré-gainé 16 | 27,3 | m | distance_nourrice=12 et tube_alimentation=per | à vérifier | S1 S2 |
| douche | Tube PVC évacuation Ø40 | 13,75 | m | distance_nourrice=12 | à vérifier | S4 S5 |
| douche | Raccord à sertir multicouche 16 | 4 | u | tube_alimentation=multicouche | à vérifier | S2 |
| douche | Raccord à glissement PER 16 | 4 | u | tube_alimentation=per | à vérifier | S2 |
| douche | Coude PVC Ø40 87°30 | 2 | u | — | à vérifier | S5 |
| douche | Colle PVC | 22 | ml | — | à vérifier | S7 |
| douche | Bonde de douche Ø90 | 1 | u | kit_livre=non | usuel | S8 |
| baignoire | Tube multicouche 20 × 2 | 8,4 | m | distance_nourrice=3 et tube_alimentation=multicouche | à vérifier | S1 S2 |
| baignoire | Tube PER pré-gainé 20 | 8,4 | m | distance_nourrice=3 et tube_alimentation=per | à vérifier | S1 S2 |
| baignoire | Tube PVC évacuation Ø40 | 3,85 | m | distance_nourrice=3 | à vérifier | S4 S5 |
| baignoire | Tube multicouche 20 × 2 | 12,6 | m | distance_nourrice=5 et tube_alimentation=multicouche | à vérifier | S1 S2 |
| baignoire | Tube PER pré-gainé 20 | 12,6 | m | distance_nourrice=5 et tube_alimentation=per | à vérifier | S1 S2 |
| baignoire | Tube PVC évacuation Ø40 | 6,05 | m | distance_nourrice=5 | à vérifier | S4 S5 |
| baignoire | Tube multicouche 20 × 2 | 18,9 | m | distance_nourrice=8 et tube_alimentation=multicouche | à vérifier | S1 S2 |
| baignoire | Tube PER pré-gainé 20 | 18,9 | m | distance_nourrice=8 et tube_alimentation=per | à vérifier | S1 S2 |
| baignoire | Tube PVC évacuation Ø40 | 9,35 | m | distance_nourrice=8 | à vérifier | S4 S5 |
| baignoire | Tube multicouche 20 × 2 | 27,3 | m | distance_nourrice=12 et tube_alimentation=multicouche | à vérifier | S1 S2 |
| baignoire | Tube PER pré-gainé 20 | 27,3 | m | distance_nourrice=12 et tube_alimentation=per | à vérifier | S1 S2 |
| baignoire | Tube PVC évacuation Ø40 | 13,75 | m | distance_nourrice=12 | à vérifier | S4 S5 |
| baignoire | Raccord à sertir multicouche 20 | 4 | u | tube_alimentation=multicouche | à vérifier | S2 |
| baignoire | Raccord à glissement PER 20 | 4 | u | tube_alimentation=per | à vérifier | S2 |
| baignoire | Coude PVC Ø40 87°30 | 2 | u | — | à vérifier | S5 |
| baignoire | Colle PVC | 22 | ml | — | à vérifier | S7 |
| baignoire | Vidage de baignoire | 1 | u | kit_livre=non | usuel | S8 |
| evier | Tube multicouche 16 × 2 | 8,4 | m | distance_nourrice=3 et tube_alimentation=multicouche | à vérifier | S1 S2 |
| evier | Tube PER pré-gainé 16 | 8,4 | m | distance_nourrice=3 et tube_alimentation=per | à vérifier | S1 S2 |
| evier | Tube PVC évacuation Ø40 | 3,85 | m | distance_nourrice=3 | à vérifier | S4 S5 |
| evier | Tube multicouche 16 × 2 | 12,6 | m | distance_nourrice=5 et tube_alimentation=multicouche | à vérifier | S1 S2 |
| evier | Tube PER pré-gainé 16 | 12,6 | m | distance_nourrice=5 et tube_alimentation=per | à vérifier | S1 S2 |
| evier | Tube PVC évacuation Ø40 | 6,05 | m | distance_nourrice=5 | à vérifier | S4 S5 |
| evier | Tube multicouche 16 × 2 | 18,9 | m | distance_nourrice=8 et tube_alimentation=multicouche | à vérifier | S1 S2 |
| evier | Tube PER pré-gainé 16 | 18,9 | m | distance_nourrice=8 et tube_alimentation=per | à vérifier | S1 S2 |
| evier | Tube PVC évacuation Ø40 | 9,35 | m | distance_nourrice=8 | à vérifier | S4 S5 |
| evier | Tube multicouche 16 × 2 | 27,3 | m | distance_nourrice=12 et tube_alimentation=multicouche | à vérifier | S1 S2 |
| evier | Tube PER pré-gainé 16 | 27,3 | m | distance_nourrice=12 et tube_alimentation=per | à vérifier | S1 S2 |
| evier | Tube PVC évacuation Ø40 | 13,75 | m | distance_nourrice=12 | à vérifier | S4 S5 |
| evier | Raccord à sertir multicouche 16 | 4 | u | tube_alimentation=multicouche | à vérifier | S2 |
| evier | Raccord à glissement PER 16 | 4 | u | tube_alimentation=per | à vérifier | S2 |
| evier | Coude PVC Ø40 87°30 | 2 | u | — | à vérifier | S5 |
| evier | Colle PVC | 22 | ml | — | à vérifier | S7 |
| evier | Bonde et siphon d'évier Ø40 avec prise lave-vaisselle | 1 | u | kit_livre=non | usuel | S8 |
| evier | Robinet machine à laver | 1 | u | kit_livre=non | usuel | S8 |
| lave-linge | Tube multicouche 16 × 2 | 4,2 | m | distance_nourrice=3 et tube_alimentation=multicouche | à vérifier | S1 S2 |
| lave-linge | Tube PER pré-gainé 16 | 4,2 | m | distance_nourrice=3 et tube_alimentation=per | à vérifier | S1 S2 |
| lave-linge | Tube PVC évacuation Ø40 | 3,85 | m | distance_nourrice=3 | à vérifier | S4 S5 |
| lave-linge | Tube multicouche 16 × 2 | 6,3 | m | distance_nourrice=5 et tube_alimentation=multicouche | à vérifier | S1 S2 |
| lave-linge | Tube PER pré-gainé 16 | 6,3 | m | distance_nourrice=5 et tube_alimentation=per | à vérifier | S1 S2 |
| lave-linge | Tube PVC évacuation Ø40 | 6,05 | m | distance_nourrice=5 | à vérifier | S4 S5 |
| lave-linge | Tube multicouche 16 × 2 | 9,45 | m | distance_nourrice=8 et tube_alimentation=multicouche | à vérifier | S1 S2 |
| lave-linge | Tube PER pré-gainé 16 | 9,45 | m | distance_nourrice=8 et tube_alimentation=per | à vérifier | S1 S2 |
| lave-linge | Tube PVC évacuation Ø40 | 9,35 | m | distance_nourrice=8 | à vérifier | S4 S5 |
| lave-linge | Tube multicouche 16 × 2 | 13,65 | m | distance_nourrice=12 et tube_alimentation=multicouche | à vérifier | S1 S2 |
| lave-linge | Tube PER pré-gainé 16 | 13,65 | m | distance_nourrice=12 et tube_alimentation=per | à vérifier | S1 S2 |
| lave-linge | Tube PVC évacuation Ø40 | 13,75 | m | distance_nourrice=12 | à vérifier | S4 S5 |
| lave-linge | Raccord à sertir multicouche 16 | 2 | u | tube_alimentation=multicouche | à vérifier | S2 |
| lave-linge | Raccord à glissement PER 16 | 2 | u | tube_alimentation=per | à vérifier | S2 |
| lave-linge | Coude PVC Ø40 87°30 | 2 | u | — | à vérifier | S5 |
| lave-linge | Colle PVC | 22 | ml | — | à vérifier | S7 |
| lave-linge | Robinet machine à laver | 1 | u | kit_livre=non | usuel | S8 |
| lave-linge | Siphon d'attente Ø40 | 1 | u | kit_livre=non | usuel | S8 |
| chauffe-eau | Tube multicouche 20 × 2 | 8,4 | m | distance_nourrice=3 et tube_alimentation=multicouche | à vérifier | S1 S2 |
| chauffe-eau | Tube PER pré-gainé 20 | 8,4 | m | distance_nourrice=3 et tube_alimentation=per | à vérifier | S1 S2 |
| chauffe-eau | Tube PVC évacuation Ø32 | 3,85 | m | distance_nourrice=3 | à vérifier | S4 S5 |
| chauffe-eau | Tube multicouche 20 × 2 | 12,6 | m | distance_nourrice=5 et tube_alimentation=multicouche | à vérifier | S1 S2 |
| chauffe-eau | Tube PER pré-gainé 20 | 12,6 | m | distance_nourrice=5 et tube_alimentation=per | à vérifier | S1 S2 |
| chauffe-eau | Tube PVC évacuation Ø32 | 6,05 | m | distance_nourrice=5 | à vérifier | S4 S5 |
| chauffe-eau | Tube multicouche 20 × 2 | 18,9 | m | distance_nourrice=8 et tube_alimentation=multicouche | à vérifier | S1 S2 |
| chauffe-eau | Tube PER pré-gainé 20 | 18,9 | m | distance_nourrice=8 et tube_alimentation=per | à vérifier | S1 S2 |
| chauffe-eau | Tube PVC évacuation Ø32 | 9,35 | m | distance_nourrice=8 | à vérifier | S4 S5 |
| chauffe-eau | Tube multicouche 20 × 2 | 27,3 | m | distance_nourrice=12 et tube_alimentation=multicouche | à vérifier | S1 S2 |
| chauffe-eau | Tube PER pré-gainé 20 | 27,3 | m | distance_nourrice=12 et tube_alimentation=per | à vérifier | S1 S2 |
| chauffe-eau | Tube PVC évacuation Ø32 | 13,75 | m | distance_nourrice=12 | à vérifier | S4 S5 |
| chauffe-eau | Raccord à sertir multicouche 20 | 4 | u | tube_alimentation=multicouche | à vérifier | S2 |
| chauffe-eau | Raccord à glissement PER 20 | 4 | u | tube_alimentation=per | à vérifier | S2 |
| chauffe-eau | Coude PVC Ø32 87°30 | 2 | u | — | à vérifier | S5 |
| chauffe-eau | Colle PVC | 22 | ml | — | à vérifier | S7 |
| chauffe-eau | Groupe de sécurité 20 × 27 | 1 | u | — | sûr | S9 |
| chauffe-eau | Siphon de groupe de sécurité | 1 | u | — | sûr | S9 |

## 4. Conditionnements

| Fourniture | Vendu en | Contenance | Unité | Confiance | Source | Consommable |
|---|---|---|---|---|---|---|
| Tube multicouche 16 × 2 | couronne | 50 | m | usuel | S3 | non |
| Tube PER pré-gainé 16 | couronne | 50 | m | usuel | S3 | non |
| Tube PVC évacuation Ø32 | barre | 4 | m | sûr | S6 | non |
| Raccord à sertir multicouche 16 | u | 1 | u | sûr | S2 | non |
| Raccord à glissement PER 16 | u | 1 | u | sûr | S2 | non |
| Coude PVC Ø32 87°30 | u | 1 | u | sûr | S6 | non |
| Colle PVC | pot | 250 | ml | sûr | S7 | oui |
| Bonde et siphon Ø32 | u | 1 | u | sûr | S8 | non |
| Robinet d'arrêt 15 × 21 | u | 1 | u | sûr | S8 | non |
| Flexible d'alimentation | u | 1 | u | sûr | S8 | non |
| Tube PVC évacuation Ø100 | barre | 4 | m | sûr | S6 | non |
| Coude PVC Ø100 87°30 | u | 1 | u | sûr | S6 | non |
| Pipe de WC Ø100 | u | 1 | u | sûr | S8 | non |
| Manchon de WC Ø90/100 | u | 1 | u | sûr | S8 | non |
| Tube PVC évacuation Ø40 | barre | 4 | m | sûr | S6 | non |
| Coude PVC Ø40 87°30 | u | 1 | u | sûr | S6 | non |
| Bonde de douche Ø90 | u | 1 | u | sûr | S8 | non |
| Tube multicouche 20 × 2 | couronne | 50 | m | usuel | S3 | non |
| Tube PER pré-gainé 20 | couronne | 50 | m | usuel | S3 | non |
| Raccord à sertir multicouche 20 | u | 1 | u | sûr | S2 | non |
| Raccord à glissement PER 20 | u | 1 | u | sûr | S2 | non |
| Vidage de baignoire | u | 1 | u | sûr | S8 | non |
| Bonde et siphon d'évier Ø40 avec prise lave-vaisselle | u | 1 | u | sûr | S8 | non |
| Robinet machine à laver | u | 1 | u | sûr | S8 | non |
| Siphon d'attente Ø40 | u | 1 | u | sûr | S8 | non |
| Groupe de sécurité 20 × 27 | u | 1 | u | sûr | S9 | non |
| Siphon de groupe de sécurité | u | 1 | u | sûr | S9 | non |

## 5. Questions

| Clé | Question | Boutons | Ouvrages |
|---|---|---|---|
| distance_nourrice | En moyenne, tes appareils sont à combien de la nourrice (ou du collecteur) ? | 3 m=3 / 5 m=5 / 8 m=8 / 12 m=12 | lavabo, wc-a-poser, wc-suspendu, douche, baignoire, evier, lave-linge, chauffe-eau |
| tube_alimentation | Tu alimentes en quoi ? | Multicouche=multicouche / PER=per | lavabo, wc-a-poser, wc-suspendu, douche, baignoire, evier, lave-linge, chauffe-eau |
| kit_livre | Tes appareils arrivent avec bonde, siphon et flexibles ? | Oui, livrés=oui / Non, à commander=non | lavabo, wc-a-poser, wc-suspendu, douche, baignoire, evier, lave-linge |

## 6. Test permanent

Devis d'épreuve écrit à la main (synthétique, anonyme) : salle d'eau et cuisine d'une maison rénovée.

### Devis

| Ligne | Désignation | Quantité | Unité | Ouvrage |
|---|---|---|---|---|
| 1 | Dépose des anciens sanitaires et évacuation | 1 | ens | — |
| 2 | Lavabo vasque sur meuble 80 cm | 1 | u | lavabo |
| 3 | WC suspendu avec bâti-support | 1 | u | wc-suspendu |
| 4 | Douche à l'italienne avec colonne thermostatique | 1 | u | douche |
| 5 | Évier inox 2 bacs | 1 | u | evier |
| 6 | Alimentation et évacuation lave-linge | 1 | u | lave-linge |
| 7 | Chauffe-eau électrique 200 L vertical | 1 | u | chauffe-eau |

### Bref

- Rénovation : salle d'eau avec lavabo sur meuble, WC suspendu sur bâti et douche à l'italienne avec colonne thermostatique.
- Cuisine avec évier inox 2 bacs, attente lave-linge, chauffe-eau électrique 200 L vertical ; dépose hors commande.

### Questions attendues

- `consommables`
- `distance_nourrice`
- `tube_alimentation`
- `kit_livre`

### Réponses

- `consommables` = 1
- `distance_nourrice` = 3
- `tube_alimentation` = multicouche
- `kit_livre` = non

### Comptes attendus

Calculs (distance 3 m) : multicouche 16 = (2 + 1 + 2 + 2 + 1) × 4 m × 1,05 = 33,6 m ; multicouche 20 = 2 × 4 × 1,05 = 8,4 m ;
PVC 3,85 m par appareil : Ø32 lavabo et chauffe-eau 7,7 m, Ø40 douche, évier, lave-linge 11,55 m, Ø100 WC 3,85 m ; raccords
16 = 8 tubes × 2 ; colle 5 × 22 + 50 = 160 ml.

| Fourniture | Commande |
|---|---|
| Tube multicouche 16 × 2 | 1 couronne de 50 m |
| Tube multicouche 20 × 2 | 1 couronne de 50 m |
| Tube PVC évacuation Ø32 | 2 barres de 4 m |
| Tube PVC évacuation Ø40 | 3 barres de 4 m |
| Tube PVC évacuation Ø100 | 1 barre de 4 m |
| Raccord à sertir multicouche 16 | 16 u |
| Raccord à sertir multicouche 20 | 4 u |
| Coude PVC Ø32 87°30 | 4 u |
| Coude PVC Ø40 87°30 | 6 u |
| Coude PVC Ø100 87°30 | 1 u |
| Colle PVC | 1 pot de 250 ml |
| Bonde et siphon Ø32 | 1 u |
| Robinet d'arrêt 15 × 21 | 3 u |
| Flexible d'alimentation | 2 u |
| Manchon de WC Ø90/100 | 1 u |
| Bonde de douche Ø90 | 1 u |
| Bonde et siphon d'évier Ø40 avec prise lave-vaisselle | 1 u |
| Robinet machine à laver | 2 u |
| Siphon d'attente Ø40 | 1 u |
| Groupe de sécurité 20 × 27 | 1 u |
| Siphon de groupe de sécurité | 1 u |

## 7. À relire par un plombier

- Distribution en étoile depuis la nourrice, 1 m de remontées par tube : en distribution en té (cuivre, rénovation), la
  longueur reste proche mais les raccords changent (un té par appareil) : ±30 % sur les raccords.
- Diamètres : multicouche 16 pour tout sauf baignoire et chauffe-eau (20), d'après NF DTU 60.11 tableau 1 ; à confirmer pour
  un lave-linge et un évier à fort débit.
- Couronnes de 50 m : un plombier qui a 3 m de 20 à poser prend des barres ; à brancher (barres de 4 m) quand le besoin est court.
- Kit de raccordement : tout ou rien (une seule réponse pour tous les appareils) ; une vasque livrée avec bonde et un évier sans
  restent à corriger ligne par ligne.
- Douche à l'italienne en Ø40 (Ø50 recommandé en extra-plat) ; baignoire > 1 m de la chute en Ø50 : non distingué ici.

## 8. Sources

- S1 : NF DTU 60.11 P1-1 tableau 1 (diamètres d'alimentation par appareil), via Progineer et calculpro ; multicouche 16 × 2 ou PER 16, 20 × 2 pour baignoire ; consultés le 3 octobre 2026.
- S2 : Distribution en étoile : longueur = tubes × (distance + 1 m) + 5 % de couronne ; 2 raccords par tube : référentiel du 3 octobre (R2), à vérifier.
- S3 : Couronnes multicouche 50 / 100 / 200 m (avis technique Henco) ; PER pré-gainé 25 / 50 / 100 m (PBtub, Watts).
- S4 : NF DTU 60.11 P1-2 (évacuation) : Ø32 lavabo, Ø40 douche, évier, lave-linge, baignoire, Ø100 WC (Nicoll, calculpro).
- S5 : Longueur d'évacuation = distance + 0,5 m de remontée, 10 % de perte barre, 2 coudes par appareil : référentiel du 3 octobre (R5), à vérifier.
- S6 : Nicoll, tube PVC compact en barres de 4 m ; coudes PVC 87°30 à la pièce.
- S7 : Colle PVC Tangit / Griffon : 2 g par assemblage Ø32, 3 g Ø40, 12 g Ø100, densité 0,97 ; pots de 250 ml, 500 ml, 1 L.
- S8 : Kits d'appareil (bonde, siphon, robinets d'arrêt, flexibles, manchon WC, robinet machine) : référentiel du 3 octobre (R7) ; « si non livrés avec l'appareil ».
- S9 : NF DTU 60.11 et règle de l'art : groupe de sécurité et siphon de groupe obligatoires sur tout chauffe-eau à accumulation (référentiel du 3 octobre, R8).
