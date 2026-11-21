# Conditions négoces : projet du 21 novembre 2026 (NON PUBLIÉ)

Demande de Greg (21 novembre 2026, prix, point 4) : prévoir dans les conditions des négoces que leurs prix servent, sans leur nom, à des repères de prix, dont « les derniers prix négociés » après la clôture. Relu par l'agent juriste le même jour. **Rien n'est publié** : l'application garde la version 2026-11-14 (`CONDITIONS_NEGOCE_VERSION`).

## Le point « Usage statistique anonymisé »

Version actuelle (2026-11-14) :

> Les prix que vous donnez peuvent servir, anonymisés et agrégés (moyennes arrondies d'au moins deux regroupements ou cinq réponses, sur trois mois, par département), à des statistiques de prix du secteur. Jamais votre nom, ni celui d'un artisan, ni un prix isolé.

Version proposée (corrigée par le juriste) :

> Les prix que vous donnez peuvent servir, anonymisés, à des repères de prix du secteur, montrés aux seules entreprises artisanes au SIRET vérifié, jamais à un négoce : des moyennes arrondies (au moins deux regroupements ou cinq réponses, sur trois mois, par département ou par région) ; et, après la clôture d'un achat groupé seulement, si au moins trois négoces y ont fait une offre, le prix négocié de chaque article, arrondi, sans votre nom, votre enseigne ni votre dépôt. Nous distinguons un prix proposé d'un prix commandé. Jamais une offre en cours, jamais le nom d'un artisan.

## Ce que dit le juriste

- Changement **MAJEUR** : c'est un nouvel usage de leurs prix. Chaque négoce devra réaccepter les conditions avant son prochain dépôt (`CONDITIONS_NEGOCE_MAJEURE` à avancer le jour de la publication).
- Garde-fous retenus :
  - jamais un prix isolé quand on pourrait reconnaître le négoce : seuil de trois négoces ayant fait une offre ;
  - des prix passés seulement, jamais une offre en cours ;
  - des prix arrondis ;
  - visibles par les artisans seuls, jamais par un négoce.
- Les données de l'observatoire sont **pseudonymisées**, pas anonymes : l'empreinte de la source permet à Mobiiz de retrouver le dossier d'origine. Ligne 23 du registre (`RGPD-REGISTRE.md`).

## À faire valider par l'avocat avant toute publication

1. Le seuil de trois négoces, l'arrondi et le délai, au regard du droit de la concurrence (échange d'informations sur les prix).
2. L'analyse d'intérêt légitime et le statut de l'empreinte de la source.
3. Les textes à ajouter aux CGU artisans et à la politique de confidentialité : les prix commandés viennent aussi des artisans.
4. La réacceptation par les négoces avant que le premier prix soit montré.

## Ce qui est déjà fait dans le code (sans rien montrer à personne)

- La table `observations_prix` a deux colonnes de plus : `statut` (proposé ou commandé) et `region`. La migration est additive : aucune donnée réécrite.
- Les offres des achats groupés y sont versées, et passent à « commandé » à la commande.
- La commande d'une demande de prix fait passer ses prix à « commandé ».
- L'export de l'admin dit le statut et la région, sans nom ni empreinte.
