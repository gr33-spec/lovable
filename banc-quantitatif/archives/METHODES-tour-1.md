# Les méthodes du banc

Trois leviers : **la lecture du devis**, **les questions**, **les suggestions**. Dans toutes les méthodes, le calcul
(ratios, conditionnements, arrondis) est fait par le moteur de l'appli d'après la fiche métier : l'IA lit, le code calcule.

## Méthode 0 — l'actuelle (la référence à battre)

Telle qu'elle tourne sur le site de test (branche `claude/saas-achat-artisans-prompt-1lyihx`, fiche `roofing-2026.11.20-62`) :

1. **Un seul appel** au modèle le plus fort (Opus 5.5, effort « high »). Il reçoit le devis (PDF + son texte, ou photo) et
   un très long texte de consignes : les règles du référentiel mot pour mot + toute la fiche couverture exportée
   (≈ 75 000 caractères au total).
2. Il rend d'un coup : la fiche de chantier (chaque donnée « lue / déduite / manquante »), le bref, des questions, et pour
   chaque ligne du devis les fournitures nommées et rangées sur un ouvrage de la fiche.
3. Depuis le 20 novembre, **le code repasse derrière** : pour une ligne « fourniture et pose », il range lui-même l'ouvrage
   et les données d'après les mots de la fiche ; **les questions sont décidées par le code** (une question du modèle n'est
   gardée que pour une donnée inconnue de la fiche ou un doute écrit au devis).
4. Suggestions : par les règles de la fiche seulement (articles « d'usage » des ouvrages écrits).

Donc aujourd'hui l'IA produit beaucoup de choses (fiche, bref, questions) qui ne servent plus au calcul.

## Les dix méthodes

| N° | Nom | Lecture | Modèle(s) | Ce que fait le code |
|---|---|---|---|---|
| 1 | Deux passes | La méthode 0, puis un relecteur cherche oublis et erreurs et rend seulement les corrections | Opus + Opus | applique les corrections |
| 2 | Mesures par le code | Le code relève d'abord toutes les mesures du texte et les étiquette ; l'IA ne fait que relier lignes, articles et étiquettes : elle ne recopie jamais un chiffre | Sonnet (+ Haiku pour recopier une photo) | relève les mesures, reconstruit la lecture |
| 3 | Par ouvrage | Un tri rapide range les lignes par partie (toiture, évacuation, raccords) ; puis un appel par partie, avec seulement sa part de fiche | Haiku + Sonnet × 1 à 3 | recolle les parties |
| 4 | L'IA ne fait que lire | Un appel, mêmes règles que la 0, mais il ne rend que les lignes : ni fiche, ni bref, ni questions | Opus | toutes les questions |
| 5 | Petit modèle vérifié | Lecture seule par le petit modèle ; le code contrôle (chiffres absents du devis, ouvrages inexistants, lignes oubliées) ; relecture ciblée seulement s'il y a une alerte | Haiku (+ Sonnet si alerte) | contrôle et déclenche la relecture |
| 6 | Deux lectures comparées | Deux lectures seules indépendantes ; ce qui concorde est gardé ; ce qui diverge est retiré et devient une question | Sonnet × 2 | compare, retire les divergences |
| 7 | Formulaire | À l'envers : l'IA ne suit pas les lignes, elle remplit ouvrage par ouvrage le formulaire de la fiche, chaque case avec les mots du devis recopiés | Sonnet | vérifie chaque citation dans le texte, jette ce qui n'y est pas |
| 8 | Le code comprend | L'IA ne fait que recopier les lignes (désignation, quantité, unité, rôle) ; tout le reste est compris par le code avec les mots de la fiche | Haiku | tout : ouvrages, données, questions |
| 9 | Le code lit, l'IA vérifie | La méthode 8, puis un relecteur corrige ce que le code a mal rangé | Haiku + Sonnet | lit, puis applique les corrections |
| 10 | Lecture avec preuves | Lecture seule, chaque article et chaque donnée porte les mots du devis qui le prouvent | Sonnet | vérifie les preuves, jette ce qui n'est pas prouvé |

## Les questions et les suggestions (testées par le code sur chaque lecture, sans appel en plus)

- Questions : **tout d'un coup** (comme l'appli), **une à la fois** (on recalcule après chaque réponse), **bloquantes
  seulement** (une donnée qui a une valeur courante dans la fiche part avec cette valeur, affichée comme hypothèse).
- Suggestions : **règles de la fiche** seulement, ou **règles + contrôle de cohérence** (les « oublis probables » du relecteur
  des méthodes 1 et 9).
