# Pipeline documentaire

Toutes les entrées (upload, glisser-déposer, photo, pièce jointe d'e-mail,
API, connecteur, future share sheet) convergent vers **un seul pipeline**.
Seul l'étage d'entrée diffère.

## Étapes

| # | Étape | Où | Échec → |
|---|---|---|---|
| 1 | **Réception** : flux streamé (jamais tout le fichier en mémoire côté API) | API | Message clair, rien de conservé |
| 2 | **Validation** : type réel par **octets magiques** (pas l'extension ni le MIME déclaré), taille ≤ 25 Mo, ≤ 60 pages, PDF non chiffré, image décodable | API | « Ce fichier n'est pas un PDF ou une photo lisible. » |
| 3 | **Empreinte SHA-256** + recherche de doublon dans l'entreprise | API | Doublon : « Déjà importé le 12/09 dans *Toiture Dupont*. Ouvrir / Importer quand même » |
| 4 | **Stockage privé** (clé : `companyId/documentId`), métadonnées en base, statut `stored` | API | « Le stockage est momentanément indisponible, rien n'a été perdu : réessayez. » |
| 5 | **Mise en file** du job d'analyse (même transaction que l'insertion) → réponse immédiate à l'utilisateur | API | — |
| 6 | **Préparation** : rotation EXIF, conversion HEIC → JPEG, redimensionnement raisonnable, rendu des pages de PDF scanné | Worker | `failed` + relance |
| 7 | **Choix de stratégie** : texte natif si exploitable, sinon vision | Worker | — |
| 8 | **Classification** (si l'utilisateur n'a pas précisé le type) | Worker | Demande à l'utilisateur |
| 9 | **Extraction structurée** selon le schéma du type | Worker | `partial` ou `failed` |
| 10 | **Normalisation** : unités (`parseUnit`), montants (format français), dimensions | Worker (déterministe) | Champ laissé « inconnu » + ambiguïté |
| 11 | **Validation métier** : arithmétique (offres/factures), lignes sans preuve, quantités nulles, doublons de lignes | Worker (déterministe) | Avertissements |
| 12 | **Clarifications** : uniquement les ambiguïtés qui peuvent changer le résultat | Worker | — |
| 13 | **Persistance** + événement (`TakeoffExtracted`, `SupplierOfferParsed`…) | Worker | Transaction annulée, job rejoué |

États visibles : `queued → processing → completed | partial | failed`.
`partial` = résultat exploitable avec des zones illisibles signalées.

## État (2026-09-30)

Réalisé, sans IA : étapes 1 à 5 et 7, en ligne dans la requête de dépôt
(lecture de quelques centaines de millisecondes) — PDF uniquement,
**4 Mo maximum** (`DOCUMENT_MAX_BYTES`, limite d'une requête vers une
fonction Vercel), 60 pages maximum, stockage en base (`document_blob`)
derrière un port. Un PDF illisible est conservé et marqué `failed` avec
son motif (`encrypted`, `corrupted`, `too_many_pages`). Photos, file de
jobs et stockage objet : plus tard. Voir `couts-ia.md`.

## Texte natif ou vision ?

Heuristique déterministe par page (pas d'appel IA) :

- texte extrait ≥ ~200 caractères utiles ;
- proportion de caractères lisibles élevée (pas de texte « cassé ») ;
- présence de chiffres et d'unités cohérents avec un document commercial.

Page « bonne » → le texte est envoyé avec des marqueurs `=== PAGE n ===`
(bien moins coûteux). Page « mauvaise » (scan, photo, texte vide) → image
de la page envoyée au modèle vision. Un document peut mélanger les deux.
Un OCR dédié (`OCRProvider`) n'est ajouté que si les évaluations montrent
un gain de qualité ou de coût.

## Documents longs

Découpage par lots de pages avec recouvrement d'une page (les tableaux
coupés entre deux pages), fusion déterministe et dédoublonnage des lignes
présentes dans le recouvrement. **Pas de plafond de lignes.**

## Provenance

Chaque ligne extraite garde `sourcePage` et `sourceEvidence` (extrait
textuel exact). L'interface permet « Voir dans le document » (niveau 4 de
la divulgation progressive). Une ligne sans preuve est marquée « à vérifier ».

## Retraitement

Un document peut être réanalysé (nouvelle version de prompt, de modèle ou
du pipeline) : nouvelle ligne `DocumentProcessing`, nouvelles valeurs
`extracted`, **sans écraser** les champs corrigés à la main (voir
[domain-model.md](domain-model.md)). Les divergences deviennent des
clarifications.

## Idempotence

Clé de job `process-document:<documentId>:<pipelineVersion>`. Un retry
après un appel IA réussi réutilise le résultat enregistré au lieu de
repayer l'appel.

## Sécurité

Voir [security.md](security.md) : fichiers non fiables, pas d'exécution de
contenu actif, stockage privé, URLs signées de courte durée, antivirus en
phase 5.
