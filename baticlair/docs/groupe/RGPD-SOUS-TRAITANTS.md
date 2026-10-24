# Sous-traitants (RGPD, article 28)

Version du 24 octobre 2026. Les liens de DPA sont ceux publiés par chaque société à cette date : **à vérifier et à accepter dans chaque compte par Greg** (personne ne peut le faire à sa place).

| Sous-traitant | Rôle | Données reçues | Pays (serveurs / société) | Garantie du transfert | DPA | À faire par Greg |
|---|---|---|---|---|---|---|
| Vercel Inc. | Hébergement du site et de l'API (région `fra1`) | Tout ce qui transite | Francfort (UE) / États-Unis | Clauses contractuelles types (CCT) ; Data Privacy Framework (DPF) | https://vercel.com/legal/dpa | Accepter le DPA dans le compte Vercel (Settings → Legal) |
| Neon Inc. | Base de données PostgreSQL | Toute la base | Francfort (UE) / États-Unis | CCT | https://neon.tech/dpa | Accepter le DPA ; recopier l'adresse légale de Neon dans `apps/web/src/lib/legal.ts` (`HEBERGEUR_BASE.adresse`, repère `[A COMPLETER]`) |
| Anthropic PBC | Lecture des listes et des devis par l'IA | Texte numéroté **anonymisé** ; images des seules pages scannées | États-Unis | CCT (intégrées aux conditions commerciales) | https://www.anthropic.com/legal/commercial-terms (DPA inclus) | Vérifier que le compte est sous les conditions commerciales de l'API : **aucune donnée utilisée pour entraîner les modèles** ; rétention par défaut de l'API |
| Resend | Envoi des e-mails | Adresse, objet, contenu des e-mails, pièces jointes (bons) | États-Unis | CCT ; DPF | https://resend.com/legal/dpa | Accepter le DPA ; régler la rétention des journaux |
| INSEE (API Sirene) | Vérification du SIRET | Le numéro seul | France | Aucun transfert | Service public | — |
| API Adresse (data.gouv.fr) | Distance de livraison | Adresses du chantier et du dépôt | France | Aucun transfert | Service public | — |
| Apple, Google (Web Push) | Transport des notifications | Titre et texte court, adresse technique | UE / États-Unis | Transport seulement, rien gardé | — | — |

## Liste des DPA à accepter (Greg)

- [ ] Vercel
- [ ] Neon
- [ ] Resend
- [ ] Anthropic (conditions commerciales de l'API, sans entraînement)

## Règle

Un nouveau sous-traitant s'ajoute ici, dans la page `/confidentialite` (`SOUS_TRAITANTS`) et dans le registre, avant d'être branché. Le site ne charge rien d'un autre domaine (CSP `default-src 'self'`, test `apps/web/scripts/sans-tiers.test.mjs`).
