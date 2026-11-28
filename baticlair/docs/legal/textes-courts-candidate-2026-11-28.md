# Cases à cocher, bandeaux et phrases courtes : version CANDIDATE du 28 novembre 2026 (non publiée)

Les textes courts qui accompagnent les CGU / CGV et la politique de confidentialité candidates du 28 novembre. **Rien
n'est branché** : aucun écran n'est touché (une autre discussion travaille sur les écrans). Ils tutoient, comme
l'application ; les documents juridiques vouvoient.

Pour chaque texte : où il va, le texte, et ce qu'il remplace quand il existe déjà.

Règles suivies :
- une case à cocher n'est jamais cochée d'avance ;
- la politique de confidentialité se « lit », elle ne s'« accepte » pas : on n'accepte que les CGU ;
- aucun montant ni promesse d'économie sur une page publique.

## 1. Inscription

**Où** : `/commencer` (parcours d'essai) et `/inscription`, juste au-dessus du bouton.

**Case obligatoire** (le bouton reste gris tant qu'elle n'est pas cochée) :

> ☐ J'agis pour mon entreprise et j'accepte les [conditions générales (CGU / CGV)](/cgu). J'ai lu la [politique de
> confidentialité](/confidentialite).

**Remplace** : « J'accepte les conditions générales d'utilisation et la politique de confidentialité. »

**Pourquoi** :
- « J'agis pour mon entreprise » fixe le cadre entre professionnels (CGU, article 2) ;
- on ne fait plus « accepter » la politique de confidentialité, qui n'est pas un contrat.

**Sous le champ portable** (déjà en place, gardé) :

> Pour que tes négoces puissent t'appeler. Jamais donné à un autre artisan.

## 2. Nouvelle version des conditions

**Où** : le bandeau qui bloque l'accès après une version majeure (`components/cgu-a-jour.tsx`).

> **Nos conditions changent le [date].** En bref : [deux ou trois lignes sur ce qui change]. [Lire les nouvelles
> conditions](/cgu)
>
> ☐ J'accepte les nouvelles conditions générales (CGU / CGV).
>
> [Continuer]
>
> Tu ne veux pas ? Tu peux résilier ton abonnement sans frais avant le [date].

**L'e-mail envoyé 30 jours avant** (CGU, article 21.2) :

> Objet : Nos conditions changent le [date]
>
> Bonjour,
>
> Les conditions de Mobiiz changent le [date]. Ce qui change : [résumé]. Le texte complet : [lien].
>
> Si tu ne veux pas de ces changements, tu peux résilier ton abonnement sans frais avant cette date, depuis « Mon
> abonnement ».
>
> L'équipe Mobiiz · contact@mobiiz.fr

## 3. Avant le paiement

**Où** : l'écran du choix de formule, juste au-dessus du bouton de paiement.

> Paiement par carte, géré par Stripe. Ton abonnement se renouvelle tout seul chaque [mois / année], au prix en
> vigueur. Tu résilies quand tu veux dans « Mon abonnement » : il s'arrête à la fin de la période payée, sans
> remboursement de la période commencée. Prix hors taxes, TVA en plus.

**À l'année**, en plus :

> On te rappelle la date et le montant par e-mail 30 jours avant le renouvellement.

**Avec le code FONDATEUR** (case du code, Pro au mois seulement) :

> 6 mois de Pro offerts, puis 30 % de remise tant que ton abonnement Pro au mois continue. Passer à Pro Max ou résilier
> arrête la remise.

## 4. Résiliation

**Où** : la confirmation de « Résilier » dans « Mon abonnement ».

> **Résilier ton abonnement ?**
>
> - Il reste actif jusqu'au [date de fin de période].
> - Ensuite, ton compte repasse en Gratuit : tes listes, tes demandes et tes factures restent là.
> - Ton site reste en ligne jusqu'au [date + 30 jours], puis il est retiré. On te prévient 7 jours avant.
> - Tes textes et tes photos sont gardés : si tu te réabonnes, tu le remets en ligne d'un toucher.
>
> [Résilier] [Garder mon abonnement]

**L'e-mail 7 jours avant le retrait du site** (déjà en place, à garder ou à aligner) :

> Objet : Ton site Mobiiz sera retiré le [date]
>
> Ton abonnement Mobiiz est terminé. Ton site reste en ligne jusqu'au [date], puis il sera retiré. Tes textes et tes
> photos sont gardés : réabonne-toi pour le garder en ligne.

**Remarque** : l'e-mail actuel vouvoie (« Votre site Mobiiz sera retiré ») alors que l'application tutoie. Choisir l'un
des deux pour tous les e-mails de compte.

## 5. Dépôt d'un devis ou d'une photo

**Où** : la fenêtre « Analyser ce document ? », sous le compteur des analyses.

> Les coordonnées de ton client (nom, téléphone, e-mail, rue) sont retirées avant la lecture. Le fichier est effacé
> après 30 jours. Vérifie toujours ta liste avant de l'envoyer : la lecture peut se tromper.

## 6. L'assistant

**Où** : sous la barre de saisie de l'assistant, la première fois qu'il s'ouvre (puis dans l'aide).

> Tu parles à un assistant d'intelligence artificielle. N'écris pas le nom, l'adresse ni le téléphone de ton client.
> Rien n'est ajouté à ta liste sans ton accord.

**Pourquoi** : le règlement européen sur l'IA demande de dire à l'utilisateur qu'il parle à une IA. C'est une exception à
la règle « jamais IA » : elle vaut pour les pages publiques, pas pour l'assistant dans l'application. **À trancher par
Greg.**

## 7. Avant d'envoyer aux négoces ou de commander

**Où** : la feuille d'envoi et l'écran « Confirmer la commande » (une phrase, pas une case).

> Envoi : Ta liste part à ton nom chez les négoces cochés. Relis-la : c'est elle qu'ils vont chiffrer.

> Commande : Ce bon de commande part chez [négoce] avec tes coordonnées et ton adresse de livraison. La vente se fait
> entre toi et lui : Mobiiz ne vend rien et n'encaisse rien.

## 8. Achats groupés

**Où** : l'écran de publication et l'écran « Rejoindre », près de la quantité.

> Ton nom d'entreprise est visible des autres participants, jamais ta quantité.
>
> ☐ Rester anonyme

> Publier ou rejoindre ne t'engage à rien. Tu décides quand l'offre arrive.

**Transmission des coordonnées à un négoce** (déjà en place, case à chaque fois, gardée) :

> ☐ J'accepte que Mobiiz transmette mes coordonnées (nom, entreprise, téléphone, e-mail, SIRET) à [négoce] pour ouvrir
> un compte.

## 9. « Mon site »

**Où** : le bouton « Publier » de l'éditeur, la première fois.

> ☐ Je confirme que les textes et les photos de mon site sont exacts et que j'ai le droit de les publier.

**Sous le formulaire « Demander un devis » du site public** (pour le visiteur) :

> Ta demande est envoyée à [nom de l'entreprise] pour qu'elle te réponde. Elle est gardée 12 mois.
> [Confidentialité](/confidentialite)

**Bas de chaque site** (déjà en place) : « Créé avec MOBIIZ », avec le lien vers la politique de confidentialité et le
crédit des photos libres quand il y en a.

## 10. Missions (quand elles ouvrent)

**Où** : à la première annonce et à la première réponse.

> ☐ Je publie pour mon entreprise, pour une prestation entre entreprises (sous-traitance ou cotraitance), pas un emploi
> salarié. Le contrat, les assurances et l'attestation de vigilance URSSAF se règlent entre les deux entreprises.

**Avant de partager ses coordonnées** (déjà en place, gardé) :

> ☐ J'accepte de partager mes coordonnées avec cette entreprise uniquement.

## 11. Cookies

**Pas de bandeau.** Mobiiz n'utilise que des cookies et des réglages nécessaires au fonctionnement :
- connexion ;
- thème ;
- département ;
- vibrations ;
- aide déjà vue.

Il n'y a ni publicité, ni mesure d'audience, ni script d'un autre site. La loi ne demande alors aucun consentement.
Ajouter un bandeau ferait croire le contraire.

**Ligne d'information** (pied des pages publiques, à côté de « Confidentialité ») :

> Pas de cookie de publicité ni de mesure d'audience. [En savoir plus](/confidentialite#cookies)

**Si un jour** un outil de mesure d'audience ou de publicité est ajouté, il faudra un vrai bandeau. Sa forme :
- « Accepter » et « Refuser » aussi visibles l'un que l'autre ;
- rien de déposé avant le choix ;
- le choix modifiable à tout moment.

## 12. Pied des e-mails

**Où** : tous les e-mails envoyés par Mobiiz.

> Mobiiz · contact@mobiiz.fr · [Ne plus recevoir ces e-mails]

**Remarque** : aujourd'hui, le pied peut reprendre le bloc légal complet, adresse comprise (`BLOC_LEGAL`). À réduire à
cette ligne (règle de discrétion du 28 novembre). La discussion « discrétion des infos société » s'en charge.
