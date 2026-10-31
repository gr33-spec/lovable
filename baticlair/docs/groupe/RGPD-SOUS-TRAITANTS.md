# Sous-traitants (RGPD, article 28)

Version du 26 octobre 2026. Les liens de DPA sont ceux publiés par chaque société à cette date : **à vérifier et à accepter dans chaque compte par Greg** (personne ne peut le faire à sa place).

| Sous-traitant | Rôle | Données reçues | Pays (serveurs / société) | Garantie du transfert | DPA | À faire par Greg |
|---|---|---|---|---|---|---|
| Vercel Inc. | Hébergement du site et de l'API (région `fra1`) | Tout ce qui transite | Francfort (UE) / États-Unis | Clauses contractuelles types (CCT) ; Data Privacy Framework (DPF) | https://vercel.com/legal/dpa | Accepter le DPA dans le compte Vercel (Settings → Legal) |
| Neon, LLC (groupe Databricks, Inc., 160 Spear Street, Suite 1300, San Francisco, CA 94105, États-Unis) | Base de données PostgreSQL | Toute la base | Francfort (UE) / États-Unis | CCT | DPA de Databricks (neon.com/platform-terms renvoie au contrat Databricks) | Accepter le DPA dans la console Neon |
| Anthropic PBC | Lecture des listes et des devis par l'IA | Texte numéroté **anonymisé** ; images des seules pages scannées | États-Unis | CCT (intégrées aux conditions commerciales) | https://www.anthropic.com/legal/commercial-terms (DPA inclus) | Vérifier que le compte est sous les conditions commerciales de l'API : **aucune donnée utilisée pour entraîner les modèles** ; rétention par défaut de l'API |
| Stripe Payments Europe Ltd | Paiement de l'abonnement artisan (`PAIEMENT=stripe`) : Checkout, prélèvements, portail client | Raison sociale, e-mail, adresse de facturation, n° de TVA, carte bancaire (saisie chez Stripe, jamais chez nous) | Irlande (UE) / États-Unis (société mère) | CCT ; DPF | https://stripe.com/legal/dpa | Accepter le DPA à l'ouverture du compte Stripe ; rien tant que le paiement est simulé |
| Resend | Envoi des e-mails ; réception des e-mails adressés à mobiiz.fr (contact@, depuis le 26 octobre 2026), renvoyés à l'admin | Adresse, objet, contenu des e-mails, pièces jointes (bons, pièces reçues) | Irlande (UE, région eu-west-1) / États-Unis | CCT ; DPF | https://resend.com/legal/dpa | Accepter le DPA ; régler la rétention des journaux et des e-mails reçus |
| Forward Email (**retiré le 26 octobre 2026** : les MX sont chez Resend ; ligne gardée pour l'historique) | Renvoi des e-mails reçus à bonjour@mobiiz.fr vers la boîte de Greg (25 octobre 2026) | E-mails reçus (expéditeur, objet, contenu), transmis sans être stockés | États-Unis | CCT | https://forwardemail.net/en/privacy | Vérifier le DPA ; ou passer à une vraie boîte au lancement |
| Cloudflare, Inc. (Turnstile) | Défi anti-robots : inscription, mot de passe oublié, pages négoce (26 octobre 2026), seulement quand `TURNSTILE_SECRET_KEY` et `NEXT_PUBLIC_TURNSTILE_SITE_KEY` sont posées | Adresse IP, signaux du navigateur pendant le défi | UE / États-Unis | CCT ; DPF | https://www.cloudflare.com/cloudflare-customer-dpa/ | Créer le site Turnstile (gratuit) et poser les deux clés dans Vercel ; accepter le DPA |
| INSEE (API Sirene) | Vérification du SIRET | Le numéro seul | France | Aucun transfert | Service public | — |
| API Adresse (data.gouv.fr) | Distance de livraison | Adresses du chantier et du dépôt | France | Aucun transfert | Service public | — |
| Apple, Google (Web Push) | Transport des notifications | Titre et texte court, adresse technique | UE / États-Unis | Transport seulement, rien gardé | — | — |

## Liste des DPA à accepter (Greg)

- [ ] Vercel
- [ ] Neon
- [ ] Resend
- [x] Forward Email (plus utilisé depuis le 26 octobre 2026)
- [ ] Anthropic (conditions commerciales de l'API, sans entraînement)
- [ ] Cloudflare (dès que Turnstile est activé)

## Règle

Un nouveau sous-traitant s'ajoute ici, dans la page `/confidentialite` (`SOUS_TRAITANTS`) et dans le registre, avant d'être branché. Le site ne charge rien d'un autre domaine (CSP `default-src 'self'`, test `apps/web/scripts/sans-tiers.test.mjs`).
