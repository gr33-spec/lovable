-- Contenus de départ (modifiables depuis l'administration).
-- Les textes juridiques sont des TRAMES : chaque passage entre crochets
-- [À COMPLÉTER …] doit être rempli ou validé par la créatrice (ou un
-- professionnel) avant l'ouverture de la boutique. Rien n'y est inventé.

INSERT INTO category (slug, name, description, position) VALUES
  ('boucles-d-oreilles', 'Boucles d''oreilles', 'Des boucles d''oreilles en résine, pailletées et colorées, faites main.', 1),
  ('pendentifs', 'Pendentifs', 'Des pendentifs uniques en résine, à porter tous les jours.', 2)
ON CONFLICT (slug) DO NOTHING;

-- Modes de livraison proposés à titre d'exemple, DÉSACTIVÉS : à vérifier
-- (prix, pays) puis activer dans Admin → Livraison.
INSERT INTO shipping_method (name, description, price_cents, free_over_cents, countries, requires_address, delivery_estimate, position, is_active) VALUES
  ('Envoi suivi', 'Colis ou lettre suivie, emballage soigné.', 490, NULL, ARRAY['FR', 'MC'], true, '2 à 4 jours ouvrés', 1, false),
  ('Remise en main propre', 'Sur un marché ou à l''atelier, sur rendez-vous.', 0, NULL, ARRAY['FR'], false, 'Nous vous contactons pour convenir d''un rendez-vous', 2, false);

UPDATE shop_settings SET
  tagline = 'Bijoux en résine pailletée, faits main',
  intro_text = 'Des créations uniques, colorées et pétillantes, imaginées et fabriquées à la main en petite série.',
  about_title = 'Bienvenue chez La Bohème en Paillettes',
  about_text = 'Je suis créatrice de bijoux uniques, pailletés et colorés. Chaque paire de boucles d''oreilles, chaque pendentif est coulé, poncé et assemblé à la main dans mon atelier.

[À COMPLÉTER : quelques phrases sur vous, votre atelier, votre histoire, les marchés où l''on peut vous rencontrer.]',
  closed_message = 'La boutique fait une petite pause : les commandes reprennent très vite !',
  socials = '[{"network":"instagram","url":"https://www.instagram.com/la_boheme_en_paillettes/"}]'
WHERE id = 1;

INSERT INTO legal_page (slug, title, body) VALUES
('mentions-legales', 'Mentions légales',
'Les informations sur l''éditrice du site (nom, statut, SIRET, adresse, directeur·rice de la publication) et sur l''hébergeur sont affichées automatiquement ci-dessus, à partir de Admin → Paramètres → Informations légales.

## Propriété intellectuelle
Les photographies, textes, logos et créations présentés sur ce site sont la propriété de [À COMPLÉTER : nom de l''éditrice]. Toute reproduction sans autorisation est interdite.

## Contact
Pour toute question, utilisez l''adresse e-mail indiquée ci-dessus.'),

('cgv', 'Conditions générales de vente',
'[À COMPLÉTER / FAIRE VALIDER : ces conditions générales sont une trame. Elles doivent être relues et complétées avant l''ouverture de la boutique.]

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
Voir la politique de confidentialité.'),

('confidentialite', 'Politique de confidentialité',
'Cette boutique collecte uniquement les données nécessaires au traitement de votre commande.

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
Vous pouvez demander l''accès, la rectification, l''effacement ou la portabilité de vos données en écrivant à l''adresse de contact. Vous pouvez aussi saisir la CNIL (www.cnil.fr).'),

('livraison-retours', 'Livraison et retours',
'## Préparation
Chaque commande est préparée à la main avec soin. [À COMPLÉTER : délai habituel de préparation.]

## Livraison
Les modes de livraison, leurs prix et les pays desservis sont indiqués au moment de la commande. [À COMPLÉTER : transporteur, délais, suivi.]

## Retours
[À COMPLÉTER / FAIRE VALIDER : conditions et adresse de retour, délai, remboursement.]

## Un souci ?
Écrivez-nous : nous trouverons une solution ensemble.')
ON CONFLICT (slug) DO NOTHING;
