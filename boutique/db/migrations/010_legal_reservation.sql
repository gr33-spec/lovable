-- Pages légales : les trames d'origine décrivaient un paiement en ligne (Stripe),
-- un panier et un prestataire non utilisé (Supabase). Elles sont remplacées par des
-- trames conformes au fonctionnement réel (réservation sans paiement en ligne),
-- UNIQUEMENT si la créatrice ne les a pas encore modifiées. Les choix juridiques
-- restent des blocs « À COMPLÉTER » : rien n'est inventé.

UPDATE legal_page SET body = '[À COMPLÉTER / FAIRE VALIDER : ces conditions générales sont une trame adaptée à la réservation sans paiement en ligne. Elles doivent être relues et complétées avant l''ouverture de la boutique.]

## 1. Vendeur
Les ventes sont conclues avec [À COMPLÉTER : nom, statut juridique, SIRET, adresse — voir les mentions légales].

## 2. Produits
Les bijoux sont des créations artisanales faites main : de légères variations de couleur, de paillettes ou de forme peuvent exister d''une pièce à l''autre et font leur singularité. Les photographies sont aussi fidèles que possible.

## 3. Prix
Les prix sont indiqués en euros. [À COMPLÉTER : « TVA non applicable, art. 293 B du CGI » si vous êtes en franchise de TVA, ou « prix TTC » sinon.] En cas d''envoi postal, les frais de port dépendent du poids du colis et vous sont communiqués avant la confirmation de la vente.

## 4. Réservation et conclusion de la vente
Le site permet de réserver un bijou en indiquant un prénom, un numéro de téléphone et, si vous le souhaitez, une adresse e-mail. Aucun paiement n''est demandé sur le site. La réservation bloque la pièce le temps que nous vous contactions pour confirmer la vente et convenir ensemble de la remise en main propre ou de l''envoi, ainsi que du règlement.
[À COMPLÉTER / FAIRE VALIDER : moment où la vente est conclue, moyens de paiement acceptés, durée pendant laquelle une réservation non confirmée est conservée (le site peut la libérer automatiquement après 24 heures).]

## 5. Remise et livraison
Remise en main propre : lieu et moment convenus ensemble. Envoi postal : voir la page « Livraison et retours ». [À COMPLÉTER : zones d''envoi, délais, que faire en cas de colis perdu ou abîmé.]

## 6. Droit de rétractation
[À COMPLÉTER / FAIRE VALIDER : durée et conditions d''exercice du droit de rétractation (notamment pour une vente conclue à distance avec envoi postal), frais de retour, modalités et délai de remboursement, exceptions éventuelles (par exemple bijoux personnalisés ou boucles d''oreilles portées).]

## 7. Garanties
[À COMPLÉTER / FAIRE VALIDER : garantie légale de conformité et garantie des vices cachés.]

## 8. Médiation
[À COMPLÉTER : coordonnées du médiateur de la consommation auquel vous adhérez.]

## 9. Données personnelles
Voir la politique de confidentialité.', updated_at = now()
WHERE slug = 'cgv' AND body = '[À COMPLÉTER / FAIRE VALIDER : ces conditions générales sont une trame. Elles doivent être relues et complétées avant l''ouverture de la boutique.]

## 1. Vendeur
Les ventes sont conclues avec [À COMPLÉTER : nom, statut juridique, SIRET, adresse — voir les mentions légales].

## 2. Produits
Les bijoux sont des créations artisanales faites main : de légères variations de couleur, de paillettes ou de forme peuvent exister d''une pièce à l''autre et font leur singularité. Les photographies sont aussi fidèles que possible.

## 3. Prix
Les prix sont indiqués en euros. [À COMPLÉTER : « TVA non applicable, art. 293 B du CGI » si vous êtes en franchise de TVA, ou « prix TTC » sinon.] Les frais de livraison sont indiqués avant la validation de la commande.

## 4. Commande et paiement
La commande est ferme après le paiement, réalisé de façon sécurisée par l''intermédiaire de Stripe. La boutique n''a jamais connaissance de vos coordonnées bancaires. Un e-mail de confirmation récapitule la commande.

## 5. Livraison
Voir la page « Livraison et retours ». [À COMPLÉTER : zones de livraison, délais, que faire en cas de colis perdu ou abîmé.]

## 6. Droit de rétractation
[À COMPLÉTER / FAIRE VALIDER : durée et conditions d''exercice du droit de rétractation, frais de retour, modalités et délai de remboursement, exceptions éventuelles (par exemple bijoux personnalisés ou articles d''hygiène comme les boucles d''oreilles portées).]

## 7. Garanties
[À COMPLÉTER / FAIRE VALIDER : garantie légale de conformité et garantie des vices cachés.]

## 8. Médiation
[À COMPLÉTER : coordonnées du médiateur de la consommation auquel vous adhérez.]

## 9. Données personnelles
Voir la politique de confidentialité.';

UPDATE legal_page SET body = 'Cette boutique collecte uniquement les données nécessaires pour traiter votre réservation.

## Responsable du traitement
[À COMPLÉTER : nom et coordonnées de la créatrice — voir les mentions légales.]

## Données collectées et finalités
- **Pour traiter votre réservation et vous recontacter** : prénom, numéro de téléphone, adresse e-mail si vous la donnez, et le mode de remise choisi (main propre ou envoi). Nous pouvons vous contacter par téléphone, SMS, WhatsApp ou e-mail.
- **Pour un envoi postal** : l''adresse de livraison que vous nous communiquez directement.
- Aucun paiement n''est effectué sur le site : aucune donnée bancaire n''y est collectée.
- Aucune donnée n''est utilisée à des fins publicitaires et aucune newsletter ne vous est envoyée sans votre accord explicite.

## Durées de conservation
- Réservations annulées ou non confirmées : coordonnées effacées automatiquement après 30 jours.
- Réservations confirmées : [À COMPLÉTER : durée choisie dans Admin → Paramètres, après laquelle les coordonnées sont effacées automatiquement].
- Pièces comptables : [À COMPLÉTER / FAIRE VALIDER avec votre comptable, durée légale de conservation].

## Sous-traitants
- Vercel (hébergement du site et des photos) ;
- Neon (base de données) ;
- Resend (envoi des e-mails), lorsqu''il est utilisé.
[À COMPLÉTER / VÉRIFIER : localisation des données et garanties de chaque prestataire.]

## Cookies
Ce site n''utilise aucun cookie publicitaire ni outil de mesure d''audience et ne dépose aucun cookie chez les visiteuses. Un cookie technique sert uniquement à l''espace d''administration.

## Vos droits
Vous pouvez demander l''accès, la rectification, l''effacement ou la portabilité de vos données en écrivant à l''adresse de contact. Vous pouvez aussi saisir la CNIL (www.cnil.fr).', updated_at = now()
WHERE slug = 'confidentialite' AND body = 'Cette boutique collecte uniquement les données nécessaires au traitement de votre commande.

## Responsable du traitement
[À COMPLÉTER : nom et coordonnées de la créatrice — voir les mentions légales.]

## Données collectées et finalités
- **Pour préparer et livrer votre commande** : nom, prénom, adresse e-mail, adresse de livraison et, si vous le souhaitez, téléphone.
- **Pour le paiement** : le paiement est traité par Stripe ; la boutique ne reçoit et ne conserve aucune donnée bancaire.
- Aucune donnée n''est utilisée à des fins publicitaires et aucune newsletter ne vous est envoyée sans votre accord explicite.

## Durées de conservation
- Données de commande nécessaires à la comptabilité : [À COMPLÉTER / FAIRE VALIDER avec votre comptable, durée légale de conservation des pièces comptables].
- Adresses de livraison : [À COMPLÉTER : durée choisie dans Admin → Paramètres].
- Paiements non aboutis : effacés automatiquement après 30 jours.

## Sous-traitants
- Stripe (paiement) ;
- Vercel (hébergement du site) ;
- Supabase (base de données et photos) ;
- Resend (envoi des e-mails de commande).
[À COMPLÉTER / VÉRIFIER : localisation des données et garanties de chaque prestataire.]

## Cookies
Ce site n''utilise aucun cookie publicitaire ni outil de mesure d''audience. Votre panier est enregistré uniquement dans votre navigateur. Un cookie technique sert uniquement à l''espace d''administration.

## Vos droits
Vous pouvez demander l''accès, la rectification, l''effacement ou la portabilité de vos données en écrivant à l''adresse de contact. Vous pouvez aussi saisir la CNIL (www.cnil.fr).';

UPDATE legal_page SET body = '## Remise en main propre ou envoi
Vous choisissez au moment de la réservation : remise en main propre (lieu et moment convenus ensemble) ou envoi postal. Chaque bijou est préparé à la main avec soin. [À COMPLÉTER : délai habituel de préparation.]

## Envoi postal
Les frais de port dépendent du poids du colis ; ils vous sont communiqués avant la confirmation de la vente. [À COMPLÉTER : transporteur, zones desservies, délais, suivi.]

## Retours
[À COMPLÉTER / FAIRE VALIDER : conditions et adresse de retour, délai, remboursement.]

## Un souci ?
Écrivez-nous : nous trouverons une solution ensemble.', updated_at = now()
WHERE slug = 'livraison-retours' AND body = '## Préparation
Chaque commande est préparée à la main avec soin. [À COMPLÉTER : délai habituel de préparation.]

## Livraison
Les modes de livraison, leurs prix et les pays desservis sont indiqués au moment de la commande. [À COMPLÉTER : transporteur, délais, suivi.]

## Retours
[À COMPLÉTER / FAIRE VALIDER : conditions et adresse de retour, délai, remboursement.]

## Un souci ?
Écrivez-nous : nous trouverons une solution ensemble.';
