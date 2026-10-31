# Assistant Mobiiz, PDF interactif, thème clair / sombre — audit et plan

Demande de Greg du 31 octobre 2026 (« Refonte de l'expérience de création des quantitatifs, assistant IA et PDF
interactif », deux maquettes, et « deux options : Clair / Sombre »). Audit fait avant tout code, comme demandé.

## 1. Ce qui existe (et sera réutilisé)

| Sujet | Où | Constat |
|---|---|---|
| Quatre départs d'une liste | `journey.tsx` (dépôt du devis, lecture IA §51.5), scan de liste (photo), `ecrire-ma-liste.tsx` (saisie, catalogue, références libres) | Le devis et la photo passent par l'IA et comptent dans les quotas (« analyses de devis », « scans de liste ») ; la saisie est 100 % code. Il n'y a pas de départ « je décris mon chantier ». |
| Questions après lecture | `QuestionsScreen` (`journey.tsx`), règles §49.4, §50 (2), temps deux | Une question par donnée manquante, aucune sur une donnée écrite, « Autre », poubelle. Si le devis dit tout, l'écran n'apparaît pas. C'est déjà la bonne logique : l'assistant la reprend en conversation, il ne la remplace pas. |
| Le document du négoce | `supplier-packet.ts` (`packetDocument`, `packetPdf`, pdf-lib) | UN seul générateur pour l'aperçu, l'export et la pièce jointe. Logo du compte automatique, coordonnées, date, référence, bref encadré, tableau désignation · quantité · précision, croquis, pied paginé. Titre actuel « Demande de devis ». |
| Aperçu PDF à l'écran | `pdf-pages.tsx` (`PdfPages`) | Rend le vrai PDF en canvas, zoom pincé et double tap. Réutilisé pour le panneau de droite et le plein écran mobile. |
| Envoi et réponses | `price-requests.service.ts` `send()` ; module `adresse-mobiiz` | Chaque demande part DE l'adresse Mobiiz de l'artisan (`toitures-martin@mobiiz.fr`, « X via Mobiiz ») avec une adresse de réponse ÉTIQUETÉE par négoce (`toitures-martin+r<étiquette>@mobiiz.fr`, `adresseReponseArtisan`). Une réponse à cette adresse est rattachée à SA demande (`ReponsesRecuesService.demandeVisee`) ; une réponse à l'adresse nue arrive dans « Reçus ». Sans domaine configuré, `Reply-To` = l'e-mail de l'entreprise. |
| Thème | `app-shell.tsx` (`app-nuit`), `globals.css` | L'app est en « nuit chaude » depuis le 29 octobre ; avant, elle était claire (jetons de base). Une quinzaine de couleurs sombres écrites en dur (menu ordinateur, accueil ordinateur, boutons ronds `bouton-nuit`). |
| Coût IA et quotas | `ai-usage`, `abonnement.ts` | Facturé : analyses de devis et scans. Lecture = 1 appel (2 au plus par devis). Crédit IA de test épuisé à ce jour (routine qui surveille). |

## 2. Règles en tension, et ce que je retiens

- CLAUDE.md §50.7 « PLUS DE VOIX (elle reviendra seulement si des artisans la demandent) » et « AUCUNE RELECTURE IA tant que
  le fondateur ne la demande pas » : Greg demande maintenant la voix et un assistant. Je le note dans DECISIONS. La voix
  passe par la dictée du navigateur (Web Speech API, zéro coût, zéro dépendance), le texte n'est jamais envoyé seul.
- Règle numéro un (§49) : rien d'absent de ce qu'a écrit ou dit l'artisan. L'assistant interprète des consignes
  (« ajoute 10 sacs de colle », « retire les vis », « mets 12 au lieu de 10 ») et ne fabrique aucune quantité :
  « décris ton chantier » ne garde que les quantités dites, le reste devient une ligne orange « Quantité à préciser ».
- « Jamais une quantité demandée » : l'assistant ne demande pas « combien ? ». Il demande ce que le négoce demanderait
  (adresse, livraison, date), toujours avec « Passer ».

## 3. Coût IA (§14 du brief)

| Fonction | Traitement retenu | Coût | Quota |
|---|---|---|---|
| Conversation d'affinage (ajouter, corriger, retirer, « je ne sais pas », adresse, livraison) | Interprète déterministe en code (`packages/domain`, testé) | 0 | Aucun |
| Dictée | Reconnaissance vocale du navigateur, texte modifiable avant envoi ; repli clavier | 0 | Aucun |
| Aperçu PDF mis à jour | Régénéré par le code depuis les données (aucune relecture IA) | 0 | Aucun |
| « Décris ton chantier » | Lecture en code des quantités explicites (« 40 m² de placo BA13 ») | 0 | Aucun |
| Phrase de description du chantier | Assemblée en code (`briefTexte` existant + adresse / livraison) | 0 | Aucun |

Aucun nouvel appel IA, aucune nouvelle facturation, aucun quota touché. Un repli IA (phrase que le code ne comprend pas)
est possible plus tard par le fournisseur IA existant, mais il n'est PAS branché : il compterait des crédits.

## 4. Risques signalés (et non pris)

- E-mails : je ne change ni l'expéditeur, ni le `Reply-To`, ni le routage des réponses. Le bloc du PDF imprime l'adresse
  qui sert DÉJÀ de `Reply-To` : celle étiquetée du négoce dans le PDF envoyé, l'adresse nue (qui arrive dans « Reçus »)
  dans l'aperçu et l'export ; sans domaine, l'e-mail de l'entreprise. Aucune adresse inventée.
- Données : les réglages du PDF (modèle, couleur) se gardent par une migration ADDITIVE (deux colonnes nullables sur
  `company`), rien de supprimé.
- Le titre du PDF passe de « Demande de devis » à « Demande de prix — Matériaux » (wording du brief). Les tests §45
  qui lisent l'ancien titre sont mis à jour ; l'objet et le corps du mail ne bougent pas.

## 5. Plan, par ordre de risque croissant

1. **I2 Thème clair / sombre** : réglage dans Profil, gardé sur l'appareil ; sombre = l'existant, par défaut.
2. **I3 PDF** : trois modèles (Essentiel, Classique par défaut, Détaillé) dans LE générateur, couleur principale (défaut
   + 5 teintes), bloc « Merci d'envoyer votre proposition commerciale à l'adresse suivante : » avec l'adresse réelle,
   texte facultatif prix / disponibilités / livraison, adresse du chantier et livraison si connues, réglages dans Profil.
3. **I4 Assistant** : sur l'écran de la liste, ordinateur en deux panneaux (conversation à gauche, vrai PDF à droite,
   étapes « Liste des matériaux · Détails chantier · Négoces · Validation ») ; téléphone, la conversation et « Voir PDF »
   plein écran ; une ligne du PDF se touche pour l'éditer (zones posées depuis les coordonnées rendues par le
   générateur) ; annuler ; micro ; « Passer » ; aide d'une fois.
4. **I5 Décrire son chantier** : quatrième départ, texte ou voix, quantités explicites seulement.

Chaque étape : suites vertes (domaine, API, web, e2e) avant de pousser, captures iPhone SE et ordinateur.
