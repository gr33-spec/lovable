# Politique de confidentialité : version CANDIDATE du 28 novembre 2026 (non publiée)

Rédigée pour le lancement du MVP, sans avocat, à relire par Greg. **Rien n'est publié** : la page `/confidentialite`
affiche toujours la version du 17/11/2026. Aucun fichier du code n'est touché.

**Point de départ** : la page en ligne du 17/11/2026, le registre (`docs/groupe/RGPD-REGISTRE.md`), la liste des
sous-traitants (`docs/groupe/RGPD-SOUS-TRAITANTS.md`), les durées appliquées chaque nuit par le code
(`apps/api/src/modules/privacy/application/purges.ts`) et les notes « Mon site » du 16 novembre.

**Ce qui change par rapport à la page en ligne** :
1. **Vouvoiement**, comme les CGU (la page en ligne tutoie).
2. **Discrétion.** Plus d'adresse ni de SIREN : « Mobiiz » et contact@mobiiz.fr. Renvoi aux mentions légales.
3. **Sections ajoutées** : missions, « Mon site » et ses visiteurs, achats groupés (noms visibles, « rester anonyme »),
   observatoire des prix (12 mois et 3 ans), prix d'un devis client, fin d'abonnement, connexion par lien, dictée,
   outil d'intelligence artificielle.
4. **Sous-traitants vérifiés dans le code le 28 novembre 2026** : Vercel (hébergement, et stockage des photos par
   Vercel Blob), Neon, Resend, Anthropic, Stripe, Cloudflare. Aucun autre prestataire n'est appelé, avec deux
   précisions :
   - des services publics français sont consultés : INSEE, annuaire des entreprises, API Adresse, découpage
     administratif ;
   - un connecteur OpenAI existe dans le code mais il est éteint (`AI_PROVIDER` vaut anthropic). Il n'est donc pas
     cité. S'il était un jour allumé, il faudrait d'abord l'ajouter ici.
5. **Correction** : la ligne « statistiques publiées au-delà de 5 entreprises » est remplacée par la règle actuelle
   (rien n'est montré aux artisans pour l'instant).

Repères : **[À CONFIRMER]** = une décision ou une vérification de Greg.

---

# Politique de confidentialité de Mobiiz

Version du [date de publication].

Mobiiz aide les entreprises du bâtiment à préparer leurs listes de matériaux, à demander des prix à leurs négoces, à
acheter ensemble, à publier leur site et à trouver du renfort. Cette page dit quelles données nous gardons, pourquoi,
combien de temps, qui les reçoit, et comment les récupérer ou les effacer.

En bref :
- pas de publicité, pas de revente de données, pas de pistage d'un site à l'autre ;
- les coordonnées de vos clients sont retirées des devis avant leur lecture.

## 1. Qui est responsable

Mobiiz, nom commercial de la société BATI INVEST (identification complète dans les mentions légales).

Contact pour toute question sur vos données : **contact@mobiiz.fr**.

Mobiiz n'a pas de délégué à la protection des données (il n'est pas obligatoire pour cette activité) : le fondateur
répond lui-même.

## 2. À qui s'adresse cette page

- aux **artisans** et aux personnes rattachées à leur compte ;
- aux **négoces** (inscrits, ou invités par un artisan) ;
- aux **visiteurs du site d'un artisan** qui envoient une demande de devis ;
- à toute personne qui **écrit à Mobiiz** ou **signale** un contenu.

Mobiiz est un service entre professionnels. Les données traitées sont surtout celles d'entreprises et des personnes qui
y travaillent.

## 3. Ce que nous gardons, pourquoi et combien de temps

| Pourquoi | Quelles données | Sur quelle base | Combien de temps |
|---|---|---|---|
| Votre compte et le service | Nom, prénom, e-mail, portable, mot de passe chiffré (si vous en avez choisi un), entreprise, SIRET, adresse, métier, département, logo | Le contrat (les CGU) | Tant que le compte existe, puis effacé 3 ans après la dernière connexion |
| Vos quantitatifs | Listes, quantités, réponses aux questions, corrections, texte des devis déposés **sans les coordonnées du client** (nom, téléphone, e-mail et rue retirés ; la commune reste) | Le contrat | Tant que le compte existe |
| Le fichier d'origine d'un devis | Le PDF ou la photo déposés | Le contrat | 30 jours ; seul le texte nettoyé reste ensuite |
| Vos demandes de prix et vos commandes | Liste envoyée, négoces choisis, réponses et prix reçus, bons de commande, date de livraison souhaitée | Le contrat | Tant que le compte existe ; bons de commande : 10 ans, sans votre nom une fois le compte supprimé |
| Votre adresse Mobiiz et vos messages | E-mails reçus des négoces (expéditeur, objet, texte, pièces jointes), vos réponses, les messages envoyés en votre nom | Le contrat | Tant que le compte existe |
| « Mes prix » | Prix reçus de vos négoces, par article | Le contrat | Tant que le compte existe |
| Les achats groupés | Vos besoins, quantités, date, département, participation, choix « rester anonyme », offres reçues, commandes | Le contrat | Tant que le compte existe ; bons de commande : 10 ans, sans votre nom après suppression |
| Les coordonnées transmises à un négoce pour ouvrir un compte | Nom, entreprise, téléphone, e-mail, SIRET, date de l'envoi | Votre accord, donné par une case à chaque fois | La date de l'envoi : 3 ans après le dernier achat groupé |
| Votre site (« Mon site ») | Textes, photos (sans leurs informations cachées : lieu, appareil, date), choix de mise en page, adresse du site, lien de votre fiche Google | Le contrat | Tant que le compte existe, même après la fin de l'abonnement (le site est alors retiré de la ligne, mais gardé pour une réactivation) |
| Les missions (quand elles sont ouvertes) | Annonces, disponibilités, compétences et diplômes **déclarés**, messages, documents que vous choisissez d'envoyer dans une discussion | Le contrat | Tant que le compte existe **[À CONFIRMER par Greg]** |
| L'abonnement et ses factures | Raison sociale, SIRET, adresse de facturation, n° de TVA, formule, montants, dates, état du paiement ; **jamais le numéro de carte** (gardé par Stripe seul) | Le contrat ; la loi pour les factures | Factures : 10 ans, même après la suppression du compte ; le reste : tant que le compte existe |
| La preuve de votre accord aux conditions | Version, date, empreinte chiffrée de l'e-mail | Notre intérêt légitime (prouver l'accord) | 5 ans après la fin du compte |
| La sécurité et le bon fonctionnement | Connexions, e-mails envoyés (destinataire, objet, date), erreurs, journaux techniques | Notre intérêt légitime (sécurité, preuve d'envoi) | 1 an |
| Le suivi du service par l'équipe | Ce que l'équipe voit d'un compte : entreprise, coordonnées, personnes du compte, formule, paiement, connexions, nombre de listes et de demandes ; **jamais le contenu de vos chantiers**. Chaque consultation est notée (qui, quoi, quand, adresse IP) | Notre intérêt légitime (faire fonctionner et sécuriser le service) | Tant que le compte existe ; le journal des consultations : 1 an |
| Les problèmes que vous signalez | Message, page, e-mail, navigateur, capture d'écran | Notre intérêt légitime (corriger le service) | 12 mois, puis supprimés |
| Les statistiques de prix (observatoire) | Article, prix unitaire HT, quantité, unité, département, région, date, prix proposé ou commandé, et une empreinte de l'origine ; **ni nom, ni e-mail, ni enseigne, ni identifiant de compte**. Le prix de votre devis client n'y entre jamais | Notre intérêt légitime (repères de prix entre professionnels) | L'empreinte de l'origine : 12 mois après la clôture ; la ligne : 3 ans |
| Les notifications sur votre téléphone | Adresse technique du navigateur | Votre accord (bouton « Activer ») | Jusqu'à ce que vous les coupiez |

**Avant d'être lu**, le texte d'un devis est nettoyé : le nom, le téléphone, l'e-mail et la rue de votre client sont
retirés, seule la commune reste. Ce nettoyage ne peut pas effacer ce qui figure sur l'image d'une page scannée ou d'une
photo.

**Ces durées sont appliquées toutes seules, chaque nuit.**

## 4. Les données des négoces

| Pourquoi | Quelles données | Sur quelle base | Combien de temps |
|---|---|---|---|
| Le compte d'un négoce inscrit | Enseigne, e-mail, téléphone, SIRET, dépôts, métiers vendus, conditions de livraison, acceptation des conditions | Le contrat (conditions négoces) | Tant que le compte existe, puis 3 ans après la dernière connexion |
| Un négoce invité par un artisan, pas inscrit | Nom, e-mail donné par l'artisan, département | Notre intérêt légitime (faire chiffrer la demande de l'artisan) | Trois relances au plus, puis effacé ; 12 mois au plus |
| Les prix et offres d'un négoce | Prix par ligne, délai, validité, documents joints | Le contrat | Comme la demande de l'artisan ; pour l'observatoire, voir la section 3 |
| La liste d'exclusion | Empreinte chiffrée de l'e-mail et du SIRET, jamais en clair | La loi (respecter votre opposition) | Tant que l'opposition vaut |

Un négoce ne voit jamais les prix d'un autre négoce. Son taux de réponse aux demandes n'est visible que de l'équipe de
Mobiiz.

## 5. Les visiteurs du site d'un artisan

- **Ce qui est envoyé** : quand vous utilisez « Demander un devis » sur le site d'un artisan, votre nom, votre
  téléphone ou votre e-mail, la commune du chantier et votre message sont transmis à cet artisan, par e-mail et dans
  son espace Mobiiz.
- **Qui est responsable** : l'artisan, pour l'usage qu'il fait de votre demande (vous répondre). Mobiiz, pour
  l'acheminement et la protection contre les abus.
- **Combien de temps** : votre demande est gardée 12 mois dans l'espace de l'artisan, puis supprimée. L'heure de
  l'envoi et une empreinte chiffrée de votre adresse IP (contre les abus) sont gardées 30 jours.
- **Sur quelle base** : votre demande de devis (des démarches avant un contrat, à votre demande).
- **Signaler une page** : si vous utilisez « Signaler cette page », nous gardons le motif, votre précision, la date et
  une empreinte chiffrée de votre adresse IP. Le signalement est gardé 12 mois, l'empreinte 30 jours. L'artisan est
  informé de la décision, jamais de votre identité.

## 6. Qui reçoit vos données

- **Vous**, et les personnes de votre compte.
- **Les négoces que vous choisissez** : ce qu'il faut pour chiffrer et livrer (lignes, quantités, commune). Votre nom
  et vos coordonnées partent quand vous envoyez une demande à votre nom ou une commande.
- **Dans un achat groupé, les autres participants** voient :
  - le nom de votre entreprise, sauf si vous avez coché « rester anonyme » ;
  - jamais votre quantité, seulement le total.
- **Dans les missions**, l'autre entreprise voit vos coordonnées seulement après votre accord à tous les deux. Avant,
  elles sont masquées.
- **Les visiteurs de votre site** voient ce que vous y publiez.
- **Nos sous-traitants** (section 7), chacun pour sa seule tâche.
- **Les autorités**, seulement si la loi l'impose.

Nous ne vendons ni ne louons aucune donnée.

## 7. Nos sous-traitants

| Prestataire | Pour quoi faire | Où sont les données | Garantie |
|---|---|---|---|
| Vercel Inc. | Héberger le site, l'application et les photos des sites | Serveurs à Francfort (Union européenne) ; société aux États-Unis | Clauses contractuelles types de la Commission européenne ; Data Privacy Framework |
| Neon, LLC (groupe Databricks) | Base de données | Serveurs à Francfort (Union européenne) ; société aux États-Unis | Clauses contractuelles types |
| Resend | Envoyer les e-mails, recevoir ceux écrits à contact@mobiiz.fr et aux adresses Mobiiz | Serveurs en Irlande (Union européenne) ; société aux États-Unis | Clauses contractuelles types ; Data Privacy Framework |
| Anthropic | Outil d'intelligence artificielle : lire les devis et les listes (texte nettoyé, et l'image des seules pages scannées), répondre dans l'assistant (vos messages et photos, envoyés tels quels) | États-Unis | Clauses contractuelles types ; offre professionnelle : vos données ne servent pas à entraîner ses modèles |
| Stripe | Paiement de l'abonnement par carte | Irlande (Union européenne) ; société mère aux États-Unis | Clauses contractuelles types ; Data Privacy Framework |
| Cloudflare (Turnstile) | Vérification anti-robots à l'inscription et sur certaines pages, quand elle est activée (adresse IP, signaux du navigateur, aucun cookie publicitaire) | Union européenne et États-Unis | Clauses contractuelles types ; Data Privacy Framework |

**Services publics consultés**, sans transfert hors de France :
- l'INSEE (registre Sirene) et l'annuaire des entreprises de l'État, pour vérifier un SIRET (le numéro seul) ;
- l'API Adresse et le découpage administratif de l'État, pour une commune ou une distance de livraison.

**Notifications** : si vous les activez, Apple ou Google les acheminent jusqu'à votre téléphone, sans les garder.

**Transferts hors de l'Union européenne** : seulement vers ces sociétés, encadrés par les clauses contractuelles types de
la Commission européenne, et par le Data Privacy Framework quand la société y adhère.

## 8. L'intelligence artificielle

- **À quoi elle sert** : Mobiiz utilise un outil d'intelligence artificielle (Anthropic) pour lire vos documents et
  pour l'assistant. Quand vous écrivez à l'assistant, c'est cet outil qui prépare la réponse.
- **Ce qu'elle ne fait pas** : elle ne décide de rien à votre place. Les quantités sont calculées par des règles de
  métier écrites, et rien ne part chez un négoce sans votre validation.
- **Ce que nous lui envoyons** : le texte des devis, nettoyé des coordonnées du client. Les messages et les photos de
  l'assistant partent tels quels : n'y mettez pas les coordonnées d'un client.
- **Ce que nous gardons** : la liste que vous validez, et le coût de chaque appel. Le coût est gardé tant que le compte
  existe, sans le nom de la personne après un an.

## 9. La dictée

Quand vous dictez au lieu d'écrire, c'est la reconnaissance vocale de votre navigateur ou de votre téléphone qui
transforme votre voix en texte. Mobiiz ne reçoit que le texte et n'enregistre jamais le son. Selon votre appareil, le
son peut être traité par son fabricant (Google, Apple), selon ses propres règles.

## 10. Cookies et stockage dans le navigateur

- **Seulement ce qui est nécessaire** au fonctionnement :
  - le cookie qui vous garde connecté ;
  - quelques réglages gardés dans votre navigateur (thème clair ou sombre, entreprise choisie, département, vibrations,
    aide déjà vue).
- **Rien d'autre** : aucun cookie de publicité ni de mesure d'audience, aucun script d'un autre site. Il n'y a donc rien
  à accepter.
- **Anti-robots** : quand il est activé, le contrôle de Cloudflare sert seulement à la sécurité.
- Vous pouvez tout effacer depuis les réglages de votre navigateur ; il faudra alors vous reconnecter.

## 11. Connexion et sécurité

- **Mot de passe** : il est chiffré, personne ne peut le lire. Vous pouvez aussi vous connecter par un lien reçu par
  e-mail, valable 15 minutes et une seule fois.
- **Accès de l'équipe** : il est protégé par une double vérification et noté dans un journal.
- **Sauvegardes** : la base est sauvegardée chaque nuit, chiffrée.
- **Incident** : en cas de fuite de données qui vous touche, nous prévenons la CNIL dans les 72 heures et, si le risque
  est élevé, nous vous prévenons.

## 12. Fin d'abonnement et suppression du compte

- **Si vous résiliez votre abonnement**, votre compte reste ouvert en formule gratuite et vos données sont gardées. Votre
  site reste en ligne 30 jours, puis il est retiré, avec ses textes et ses photos gardés pour une réactivation.
- **Si vous supprimez votre compte** (« Compte », « Mes données », « Supprimer mon compte »), tout est effacé
  immédiatement, sauf ce que la loi ou la preuve obligent à garder, sans votre nom :
  - les bons de commande, 10 ans ;
  - les factures, 10 ans ;
  - la preuve de votre accord, 5 ans.
- **Votre adresse de site** reste réservée, sans aucune autre donnée, pour qu'elle ne soit jamais redonnée à une autre
  entreprise.

## 13. Vos droits

| Droit | Comment faire |
|---|---|
| Voir et récupérer vos données | « Compte », « Mes données », « Télécharger mes données » (fichier ou PDF). Négoce : « Mon compte », « Mes données » |
| Corriger | Dans l'application (Compte, profil, entreprise) |
| Effacer | « Supprimer mon compte », immédiat |
| Ne plus recevoir d'e-mails | Le lien « Ne plus recevoir ces e-mails » en bas de chaque e-mail. Un négoce peut demander à ne plus jamais être contacté : c'est respecté même si un autre artisan l'ajoute |
| Vous opposer à un usage fondé sur notre intérêt légitime, limiter un usage, retirer votre accord | Écrire à contact@mobiiz.fr |

Nous répondons dans un délai d'un mois.

Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir la CNIL (cnil.fr, 3 place de Fontenoy, TSA
80715, 75334 Paris Cedex 07).

## 14. Mise à jour de cette page

Cette page peut changer quand le service évolue. Un changement important vous est annoncé par e-mail ou dans
l'application avant de s'appliquer. La date de version est en haut de la page.

---

## Notes pour Greg (à ne pas publier)

1. **À cocher dans chaque compte** (`docs/groupe/RGPD-SOUS-TRAITANTS.md`) : les contrats de sous-traitance (DPA) de
   Vercel, Neon, Resend, Anthropic (offre professionnelle, sans entraînement) et Cloudflare. Stripe : à l'ouverture du
   compte réel.
2. **À vérifier** :
   - la durée des sessions de connexion, à inscrire au registre ;
   - la durée de conservation chez Anthropic (contrat de l'API) ;
   - la durée de conservation des journaux chez Resend et Vercel.
3. **Adresse d'alerte de l'équipe** : elle est sur une boîte du domaine investisseurdugoelo.fr. Son hébergeur est un
   destinataire à ajouter au tableau de la section 7 (nom, pays, garantie).
4. **Registre** : ajouter les lignes « Mon site » (textes, photos, visiteurs, signalement), « Missions » et la connexion
   par lien, avec les durées de cette page.
5. **Adresse de la CNIL** : celle de son courrier (TSA 80715). L'adresse « 3 place de Fontenoy, 75007 Paris » de la page
   en ligne est celle de l'accueil.
