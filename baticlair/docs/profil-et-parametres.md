# Profil et paramètres (Greg, 1er novembre 2026)

Les deux maquettes de Greg font foi : le sommaire « Profil et paramètres » et l'écran Apparence, onglet « Demande de prix ».

## 1. Audit de l'ancien Profil (`/compte`, une seule longue page)

| Réglage | Composant | Données / route | État |
|---|---|---|---|
| Nom, e-mail, confirmation (renvoi du lien) | page | session, `POST /v1/auth/send-verification-email` | fonctionnel |
| Bandeau de l'essai | `BandeauAbonnement` | `/v1/abonnement` | fonctionnel |
| Abonnement en une ligne, lien « Mon abonnement et mes factures » | `ResumeAbonnement` | `/v1/abonnement` | fonctionnel |
| Identité auprès des négoces (prénom, portable, SIRET) | `CarteIdentite` | `/v1/company/identite` | fonctionnel |
| Modèle et couleur du PDF (« Ma demande de prix ») | `CarteReglagesPdf` | `GET/PATCH /v1/price-requests/settings` | fonctionnel, enregistré à chaque appui, **sans aperçu** |
| Clair / Sombre | `CarteApparence` | stockage de l'appareil (`mobiiz-theme`) | fonctionnel |
| Ancienne formule par chantiers | `PlanSummary` | `/v1/billing` | fonctionnel (seulement si l'ancien paywall est allumé) |
| Entreprise active (plusieurs entreprises), « Modifier » | page | session | fonctionnel ; « Modifier » ne faisait que descendre dans la page (**doublon** de la carte des coordonnées) |
| Mes prix | `LienMesPrix` | `/mes-prix` | fonctionnel |
| SIRET pour l'achat groupé | `CarteSiretAchatGroupe` | `/v1/groupe`, `/v1/groupe/siret` | fonctionnel |
| Alertes des achats groupés (choix existants, résumé) | `CarteAlertesAchats` | `/v1/me/alertes-achats-groupes` | fonctionnel |
| Logo, nom, adresse, SIRET, téléphone, e-mail, signature | `CompanyProfileCard` | `/v1/company/profile`, `/v1/company/logo` | fonctionnel ; le SIRET y est aussi (**doublon partiel** avec la carte SIRET du groupé, gardé : l'une saisit, l'autre vérifie) |
| Adresse Mobiiz (copier, modifier une fois, Mes reçus) | `AdresseMobiizCard` | `/v1/company/adresse-mobiiz` | fonctionnel |
| Métiers de l'entreprise | `TradesCard` | `/v1/company/trades` | fonctionnel |
| Métiers couverts (état de chaque tiroir) | `MetiersCard` | `/v1/metiers` | visuel (information) |
| Notifications (une bascule : réponses, questions, fin de lecture) | `NotificationsCard` | Web Push | fonctionnel |
| Connexions (clés pour un logiciel de devis) | `PartnerKeysCard` | `/v1/partner-keys` | fonctionnel |
| Ce que Mobiiz a appris (effacer) | `MemoryCard` | `/v1/memoire` | fonctionnel |
| « Économisé grâce au regroupement » | `EconomiesGroupeCard` | `/v1/groupe/economies` | fonctionnel, **hors sujet ici** (demandé : à déplacer) |
| Se déconnecter | page | `POST /v1/auth/sign-out` | fonctionnel |
| Mes données (JSON, PDF), recevoir les e-mails, supprimer le compte (taper SUPPRIMER) | `MyData`, `EmailsActifs` | `/v1/me/export`, `/v1/me/emails`, `DELETE /v1/me` | fonctionnel |

Incomplet : aucune sécurité dans l'app (le mot de passe se change par « Mot de passe oublié ? ») ; pas de réglage
séparé par type de notification (une seule bascule Web Push) ; pas de « résumé quotidien » hors achats groupés.

## 2. Nouvelle architecture

- `/compte` : le sommaire. Titre « Profil et paramètres », carte compacte (initiales, nom, e-mail, « E-mail confirmé » /
  « E-mail à confirmer ») qui ouvre « Informations personnelles », puis quatre groupes (`lib/rubriques-profil.ts`) :
  - **Mon compte** : Informations personnelles, Mon entreprise ;
  - **Personnalisation** : Apparence (fond jaune pâle), Notifications ;
  - **Services** : Abonnement et factures, Adresse Mobiiz et réponses, Connexions ;
  - **Données et aide** : Préférences apprises, Données et confidentialité, Aide et contact.

  Aucun formulaire. « Profil » reste allumé dans le menu sur tout `/compte`.
- `/compte/[rubrique]` (`app/(app)/compte/[rubrique]/page.tsx`) : flèche « Retour à Profil et paramètres » (toujours
  vers le sommaire), le titre, les cartes d'avant (`components/profil-cartes.tsx`, déplacées telles quelles).

| Rubrique | Contenu |
|---|---|
| Informations personnelles | nom, e-mail, confirmation (renvoi), Sécurité (phrase : mot de passe par « Mot de passe oublié ? »), Se déconnecter |
| Mon entreprise | entreprise active, identité auprès des négoces, coordonnées et signature (sans le logo, passé dans Apparence), SIRET pour l'achat groupé (vérification), métiers, métiers couverts |
| Apparence | écran dédié, voir §3 |
| Notifications | notifications du téléphone (réponses, questions, fin d'analyse), alertes des achats groupés (les choix existants : deux par jour au plus, les autres dans le résumé), « Recevoir les e-mails du … » (le nom de la commande commune) |
| Abonnement et factures | offre, analyses restantes (les mêmes compteurs que « Ma liste de matériaux »), ancienne formule si allumée, « Mon abonnement et mes factures » (`/abonnement`, inchangé) |
| Adresse Mobiiz et réponses | adresse, Copier l'adresse, la modifier une fois, Mes reçus, Mes prix |
| Connexions | clés de connexion d'un logiciel de devis |
| Préférences apprises | ce que Mobiiz a appris, l'effacer (confirmation) |
| Données et confidentialité | télécharger (JSON, PDF), ce que Mobiiz garde, supprimer le compte (taper SUPPRIMER) |
| Aide et contact | les réponses de l'aide (les mêmes que le « ? »), « Nous écrire » (contact@mobiiz.fr), pages légales |

« Économisé grâce au regroupement » est maintenant sur l'écran du regroupement (`/groupe`) et sur « Achats groupés »
(colonne de droite), avec l'historique ; il reste absent tant que rien n'a été commandé en groupe.

## 3. Apparence

- En-tête compact (flèche, « Apparence »), onglets **Application** / **Demande de prix** (ouvert par défaut).
- **Application** : Clair / Sombre (il n'y a pas de mode « Système » dans l'app, il n'est pas inventé), « Gardé sur cet
  appareil. », et la précision que l'apparence de l'app ne change pas le PDF.
- **Demande de prix** : « Ta demande de prix », « Personnalise l'apparence du PDF que reçoivent tes négoces. »
  - A. Aperçu d'abord sur téléphone, à droite et plus grand sur ordinateur. C'est le vrai document :
    `GET /v1/price-requests/settings/apercu.pdf?modele=&couleur=` appelle le seul générateur (`packetPdf`) avec
    `optionsPdf` (logo, adresse de réponse), sur la dernière demande de l'entreprise ; sans demande, un exemple marqué
    « Exemple » (chantier « Exemple · Rénovation toiture », vraies coordonnées). L'écran le dit : « Exemple : aucune
    demande envoyée » ou « Ta dernière demande ». « Voir le PDF en plein écran » ouvre ce même document dans la
    visionneuse (Partager, Télécharger).
  - B. Modèle : Essentiel / Classique / Détaillé, trois boutons compacts, la phrase du modèle choisi dessous ; Classique
    par défaut.
  - C. Couleur principale : les six pastilles existantes (`COULEURS_PDF`), palette inchangée.
  - D. Logo : le logo actuel, « Remplacer » (ou « Ajouter un logo »), « Retirer » (confirmation : « Retirer le logo ? »).
  - E. « Enregistrer » et « Les changements s'appliquent aux prochaines demandes. Les documents déjà envoyés ne changent
    pas. »
- **Un seul mécanisme** : modèle et couleur s'essaient dans l'aperçu sans rien enregistrer, puis « Enregistrer »
  (l'ancien enregistrement à chaque appui est remplacé ; le bouton dit « Enregistré » quand il n'y a rien à faire). Le
  logo est un fichier, enregistré dès qu'il est choisi, et l'écran le dit.
- **Rien ne se perd** : changer d'onglet ou ouvrir le plein écran garde le brouillon ; il est aussi gardé sur
  l'appareil (rechargement, retour arrière du navigateur) et l'écran dit « Tes changements non enregistrés sont
  repris. » ; la flèche retour demande « Quitter sans enregistrer ? » (Enregistrer et quitter / Quitter sans enregistrer /
  Rester) ; fermer l'onglet du navigateur demande confirmation.
- **Téléphone** : l'écran d'édition masque le menu du bas ; « Enregistrer » est collé en bas de l'écran. **Ordinateur** :
  réglages à gauche (24 rem), aperçu à droite (toute la hauteur utile), « Enregistrer » collé en bas de la colonne.

## 4. Fiabilité

- Aucun second générateur : l'aperçu, le PDF téléchargé (`/v1/price-requests/:id/demande-de-devis.pdf`), l'aperçu de
  l'assistant et la pièce jointe envoyée passent tous par `packetPdf` ; test API : le texte de l'aperçu est
  identique, mot pour mot, au PDF téléchargé, et ses lignes sont dans la pièce jointe envoyée.
- Séparation des entreprises : la route d'aperçu lit l'entreprise de la session (`TenantContext`), comme les autres ;
  test API et e2e : une autre entreprise ne voit que son exemple.
- Droits : aucune route de modification ajoutée ; `PATCH /v1/price-requests/settings` et `/v1/company/logo` gardent les
  leurs (lecteur refusé). L'aperçu est en lecture seule et n'enregistre rien.
- Les documents envoyés ne sont jamais régénérés : le réglage ne vaut que pour les prochaines demandes.
- Aucune migration, aucun changement de droits, aucun changement du moteur PDF.

## 5. Limites

- La sécurité se limite à la phrase sur « Mot de passe oublié ? » : pas de changement de mot de passe dans l'app.
- Les notifications du téléphone restent une seule bascule (le service ne distingue pas réponses, questions et fin
  d'analyse) ; les e-mails sont une seule bascule (« Recevoir les e-mails du … » (le nom de la commande commune)).
- « Aide et contact » reprend les textes de l'aide existante ; pas de FAQ nouvelle.
- Captures Android : Pixel 7 émulé (projet « telephone »), iPhone SE à 375 × 667.
