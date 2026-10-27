# Registre des traitements (RGPD, article 30)

Tenu par BATI INVEST (BatiClair), version du 26 octobre 2026. Responsable du traitement : BATI INVEST, SARL, 6 impasse du Ouipoure, 22620 Ploubazlanec, SIREN 910 796 325. Référent : Greg, fondateur (pas de DPO, voir plus bas). Contact : contact@mobiiz.fr (même adresse que les mentions légales ; renvoyée à l'admin, 26 octobre 2026).

Chaque durée ci-dessous est appliquée chaque nuit par le code (`apps/api/src/modules/privacy/application/purges.ts`, `DUREES`, tâche `GET /v1/internal/purge-inactive`) et vérifiée par `apps/api/test/rgpd-droits.test.ts`. La page publique est `/confidentialite`.

## Les traitements

| # | Traitement | Personnes | Données | Finalité | Base légale | Durée | Destinataires |
|---|---|---|---|---|---|---|---|
| 1 | Comptes artisans | Artisans (professionnels, SIRET actif) | Nom, e-mail, mot de passe haché, entreprise, SIRET, adresse, téléphone, logo, métier | Rendre le service | Contrat (CGU) | Durée du compte, puis 3 ans après la dernière connexion (`AccountData.purgeInactive`) | BatiClair ; sous-traitants (RGPD-SOUS-TRAITANTS.md) |
| 2 | Chantiers, listes, devis déposés | Artisans ; leurs clients (seulement la commune, voir « Anonymisation ») | Lignes, quantités, texte anonymisé des devis, réponses, corrections | Sortir et envoyer la liste de fournitures | Contrat | Durée du compte (Greg, 26 octobre 2026 : « devis et e-mails, durée du compte » ; avant : 3 ans) ; le fichier d'origine d'un devis client : 30 jours | BatiClair ; Anthropic (lecture) ; le fournisseur choisi par l'artisan |
| 3 | Commande commune : lignes, grilles, résultats | Artisans, négoces | Lignes, quantités, commune de livraison, prix des négoces | Regrouper et comparer | Contrat | Durée du compte (26 octobre 2026) | Les négoces consultés (sans nom d'artisan avant commande) ; un négoce ne voit jamais les prix d'un autre |
| 4 | Comptes négoces | Négoces inscrits | Enseigne, e-mail, téléphone, SIRET, dépôts, paliers, acceptation des conditions | Envoyer les grilles, calculer les prix livrés | Contrat (conditions négoces) | Durée du compte, puis 3 ans après la dernière connexion | BatiClair ; Resend |
| 5 | Négoces invités, pas inscrits | Négoces ajoutés par un artisan | Nom, e-mail donné par l'artisan, département | Faire chiffrer la commande de l'artisan | Intérêt légitime (B2B, information à la première prise de contact, opposition en un clic) | 3 rappels puis effacement un mois après, et 12 mois au plus | BatiClair ; Resend |
| 6 | Bons de commande | Artisans, négoces | Négoce, montant, date ; empreinte de l'entreprise après suppression | Garder la preuve d'une commande passée | Obligation légale (à valider, voir « À trancher ») | 10 ans, sans le nom une fois le compte supprimé (`ArchiveCommande`) | BatiClair |
| 7 | Preuves d'acceptation (CGU, conditions négoces) | Artisans, négoces | Version, date, empreinte SHA-256 de l'e-mail | Prouver l'accord | Intérêt légitime | 5 ans après la fin du compte (`PreuveAcceptation`) | BatiClair |
| 8 | E-mails et journaux techniques | Tous | Destinataire, objet, date, erreurs, journal du groupé, clés d'idempotence | Sécurité, preuve d'envoi | Intérêt légitime | 1 an en base ; chez Resend et Vercel selon leur rétention (à vérifier dans les comptes) | BatiClair ; Resend ; Vercel |
| 9 | Liste d'exclusion | Négoces opposés ou supprimés | Empreinte SHA-256 de l'e-mail et du SIRET | Ne plus jamais les contacter | Obligation légale (respect de l'opposition) | Tant que l'opposition vaut | BatiClair |
| 11 | Abonnement artisan et factures | Artisans | Raison sociale, SIRET, adresse, n° de TVA, montants, dates, état du paiement, journal des événements de paiement ; jamais la carte | Facturer l'abonnement (49 € HT par mois ou 348 € HT par an) | Contrat (CGU, art. 3) ; obligation légale pour les factures (art. L123-22 du code de commerce) | Factures (`facture_abonnement`) : **10 ans**, gardées après la suppression du compte (le lien à l'entreprise est retiré) ; abonnement et journal : durée du compte | BatiClair ; Stripe (paiement) |
| 12 | Apprentissage des corrections | Artisans | Ce que l'IA proposait pour une ligne (son nom normalisé), le champ corrigé (nom, précision, quantité) et la nouvelle valeur, le métier ; l'entreprise et le chantier de chaque occurrence ; **jamais un client, une adresse ni un prix** | Appliquer les habitudes de l'artisan (2 chantiers) ; proposer à l'admin une règle commune (3 artisans), jamais appliquée sans validation | Intérêt légitime (améliorer la liste ; annulation d'un clic, aucune décision automatique sur la personne) | Règles de l'artisan : durée du compte (effacées avec lui) ; règles globales : sans nom d'entreprise une fois validées ou refusées | BatiClair |
| 13 | Pilotage admin : journal des accès et double authentification | Admins (Greg) | E-mail de l'admin, action, date ; code d'accès haché | Sécurité du tableau de bord (qui a vu quoi) | Intérêt légitime (sécurité) | Journal : 12 mois ; code : remplacé à chaque envoi | BatiClair |
| 14 | Comptages anonymes | Visiteurs, artisans | Un nombre par jour (visites de la page publique, installations) ; aucune donnée personnelle | Mesurer la croissance | Intérêt légitime ; aucune donnée personnelle | Illimitée (agrégat) | BatiClair |
| 10 | Notifications sur téléphone | Artisans qui les activent | Adresse technique du navigateur | Prévenir qu'une liste est prête | Consentement (bouton « Activer ») | Jusqu'au retrait ou à l'expiration de l'abonnement | Apple, Google (transport) |
| 15 | Demande perso et chiffrage en ligne | Artisans, négoces destinataires | Liste, nom de l'entreprise de l'artisan (avec son accord), e-mail du négoce, prix par ligne, livraison, délai, validité, statuts de commande | Obtenir et comparer des prix, commander | Contrat (CGU) ; accord de l'artisan pour son identité | Comme les chantiers (3 ans) ; le lien de chiffrage meurt à la clôture | L'artisan et le négoce destinataire, seulement |
| 16 | Regroupements | Artisans participants, négoces consultés | Lignes groupables, quantités, statut (intention, quantité confirmée, commande), département | Réunir les volumes | Contrat | Comme la commande commune (n° 3) | Négoces : volume et zone seulement ; artisans : « Regroupement en cours » sous 5 entreprises |
| 17 | « Mes prix » | Artisans | Prix reçus et payés par article, négoce, date | Historique personnel | Contrat | Durée du compte | L'artisan seul |
| 18 | E-mails reçus sur mobiiz.fr (contact@, et depuis le 27 octobre 2026 l'adresse Mobiiz de chaque entreprise, R7) | Expéditeurs (négoces, prospects), artisans | Expéditeur, destinataires, objet, texte, pièces jointes (10 Mo au plus par e-mail, en base : `email_recu_artisan`, `email_recu_fichier`) | Répondre aux messages ; ranger les réponses des négoces dans le chantier (« Mes reçus ») | Intérêt légitime (contact@) ; contrat (adresse Mobiiz, CGU art. 2) | contact@ : renvoyé à l'admin, gardé chez Resend selon sa rétention (30 jours sur le plan gratuit) ; adresse Mobiiz : durée du compte (effacé avec l'entreprise, cascade) | Resend (réception, Irlande), l'admin ou l'artisan destinataire |
| 19 | Observatoire des prix (statistiques anonymes) | Négoces, artisans (aucun identifiant) | Moyennes arrondies par article et département, sur 3 mois | Informer le secteur (« prix observés ») | Intérêt légitime ; données anonymes | Illimitée (agrégat) | Publié sous `SEUIL_ANONYMAT` jamais : au moins 5 entreprises ou 2 regroupements, jamais un prix isolé ni un nom |

## Anonymisation des devis

Avant d'être stocké et avant toute lecture par l'IA, le texte d'un devis client est nettoyé ligne par ligne (`packages/domain/src/rgpd/anonymisation.ts`, appelé par `DocumentsService`) : nom du client (« M. », « Mme », « Client : »), téléphone, e-mail, numéro et nom de rue retirés ; la commune et le code postal restent (zone de livraison). Le nom d'un chantier est la commune, jamais le client (`takeoff.module.ts`). L'IA ne reçoit plus le PDF entier : seulement le texte numéroté anonymisé, et l'image des seules pages scannées (limite : une page scannée ne peut pas être anonymisée par le code ; voir DECISIONS). Le fichier d'origine est effacé après 30 jours. Les CGU font garantir par l'artisan qu'il a le droit de transmettre le document. Tests : `packages/domain/test/anonymisation-devis.test.ts`, `apps/api/test/rgpd-droits.test.ts`.

## Droits en libre-service

| Droit | Artisan | Négoce |
|---|---|---|
| Accès, portabilité | Compte → Mes données : JSON (`/v1/me/export`) et PDF (`/v1/me/export.pdf`) | Mon compte → Mes données : JSON et PDF (`/v1/negoce/export[.pdf]`) |
| Rectification | Compte (profil, entreprise) | Mon compte (enseigne, dépôts, paliers) |
| Effacement | « Supprimer mon compte » (`DELETE /v1/me`) : tout effacé ; bons archivés 10 ans sans nom, preuve 5 ans | « Supprimer mon compte » (`DELETE /v1/negoce/compte`) : compte effacé, mis sur la liste d'exclusion, preuve 5 ans |
| Opposition | « Ne plus recevoir ces e-mails » en bas de chaque e-mail (`/emails/stop/<jeton>`), réglage dans Compte | « Ne plus jamais être contacté » dans chaque invitation (`/negoce/opposition/<jeton>`) ; désabonnement par département |
| Autres demandes | E-mail de contact ; réponse sous un mois | idem |

La liste d'exclusion est vérifiée à chaque ajout de négoce par un artisan et à chaque envoi : un négoce exclu rajouté par un autre artisan n'est jamais invité (sa ligne naît arrêtée).

## DPO et analyse d'impact : pas obligatoires

- **DPO** (article 37) : obligatoire pour une autorité publique, un suivi régulier et systématique à grande échelle, ou des données sensibles à grande échelle. BatiClair traite des données de professionnels (artisans, négoces) pour une mise en relation B2B, sans profilage ni données sensibles, à l'échelle d'un département au départ. **Non obligatoire.** Référent : Greg.
- **AIPD** (article 35) : aucun critère de la liste de la CNIL n'est rempli à deux (pas d'évaluation ou de notation, pas de décision automatique à effet juridique — le classement des prix n'oblige personne —, pas de données sensibles, pas de personnes vulnérables, pas de croisement à grande échelle). **Non requise.** À revoir si BatiClair s'étend à toute la France ou traite des données de particuliers.

## À trancher

1. **Bons de commande 10 ans** : BATI INVEST n'est ni vendeur ni acheteur ; l'obligation de conservation (Code de commerce, art. L123-22) vaut pour les parties. Garder 10 ans une archive sans nom est prudent ; à valider par l'avocat (sinon : 5 ans, prescription commerciale).
2. **Rétention chez Resend et Vercel** : à régler dans leurs comptes (journaux ≤ 12 mois).
