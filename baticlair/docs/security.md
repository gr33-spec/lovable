# Sécurité et confidentialité

## Données manipulées

Prix négociés, conditions commerciales, noms et adresses de clients
finaux, coordonnées de fournisseurs, e-mails. Toutes sont traitées comme
**confidentielles** ; certaines sont des données personnelles (RGPD).

## Isolation multi-tenant

- `companyId` obligatoire sur toute donnée métier ; repositories qui
  exigent un `TenantContext`.
- Ressource d'une autre entreprise → 404.
- Tests d'intégration systématiques « entreprise B ne voit rien de A » pour
  chaque route et chaque job.
- Stockage : clés préfixées par entreprise, accès uniquement par URL signée
  générée après contrôle d'autorisation.
- Jobs : le `companyId` voyage dans le job et est revérifié par le worker.
- Phase 5 : Row-Level Security PostgreSQL en défense en profondeur.

## Authentification et sessions

- E-mail + mot de passe (hachage lent, standard de la bibliothèque),
  vérification de l'e-mail, réinitialisation par lien à usage unique et
  durée courte ; Google et Microsoft en OAuth.
- Sessions en base, cookie `HttpOnly`, `Secure`, `SameSite=Lax`, durée
  longue glissante (l'artisan ne doit pas ressaisir son mot de passe sans
  cesse) + révocation (déconnexion de tous les appareils).
- Limitation de débit sur connexion, inscription, reset.
- Suppression de compte en libre-service (voir RGPD).

## Fichiers importés : non fiables par principe

- Type vérifié par octets magiques ; liste blanche : PDF, JPEG, PNG, WEBP,
  HEIC (+ CSV/XLSX pour les imports tabulaires plus tard).
- Taille et nombre de pages bornés ; PDF chiffrés refusés avec explication.
- Aucun contenu actif exécuté (JavaScript PDF, formulaires) : les PDF sont
  seulement lus ou rendus en images côté worker.
- Téléchargement servi avec `Content-Disposition: attachment` et le type
  vérifié, jamais depuis notre domaine applicatif.
- Antivirus (ClamAV en job) avant mise à disposition au téléchargement :
  phase 5.
- **Injection d'instructions** : voir [ai-architecture.md](ai-architecture.md).

## Stockage

- Bucket **privé**, chiffrement au repos du fournisseur, URLs signées de
  5 minutes, jamais d'URL publique.
- Aucune donnée de document dans les logs.

## Secrets

- Aucun secret dans Git ; `.env.example` sans valeur réelle.
- Variables d'environnement validées au démarrage ; gestionnaire de secrets
  de l'hébergeur en staging/production.
- Jetons OAuth des intégrations **chiffrés** en base (clé hors base,
  rotation possible).

## E-mail

- Scopes minimaux : l'envoi depuis la boîte de l'artisan n'exige que le
  scope d'envoi, classé « sensible » chez Google ; la **lecture** de la
  boîte (`gmail.readonly`) est un scope « restreint » qui impose un audit
  de sécurité annuel (CASA). Nous l'évitons grâce à l'adresse de réponse
  dédiée (ADR-0010). *Source : documentation Google relayée par des sources
  secondaires ; à reconfirmer sur la documentation officielle avant la
  phase 4.*
- Webhook d'e-mail entrant authentifié (signature du prestataire ou secret).
- SPF, DKIM, DMARC configurés sur le domaine d'envoi.

## RGPD

| Exigence | Mise en œuvre |
|---|---|
| Minimisation | Pas de lecture de boîte mail, pas de contenu dans les logs ni dans `AIExecution` |
| Droit d'accès / portabilité | Export des données de l'entreprise (JSON + fichiers), phase 5 |
| Droit à l'effacement | Suppression de compte / entreprise : données + fichiers + jetons, job asynchrone traçé |
| Conservation | Politique à définir (Q7) ; purge automatique par job |
| Sous-traitants | Registre (hébergeur, stockage, IA, e-mail, paiement) avec DPA ; hébergement UE privilégié |
| Traçabilité | `AuditEvent` sur les actions sensibles (connexion, export, suppression, intégrations) |
| Mémoire privée | Aucune donnée d'une entreprise n'améliore l'expérience d'une autre (PD-012) |

## Fournisseurs IA

Un fournisseur n'est retenu pour la production qu'après vérification
documentée de : conservation, non-entraînement, région, DPA, sécurité
(Q6). Tant que ce n'est pas fait : **données fictives uniquement**.

## Sécurité applicative

- Validation Zod de toute entrée API ; sortie sérialisée par schéma.
- En-têtes de sécurité (CSP stricte côté web, HSTS), protection CSRF
  (cookies `SameSite` + vérification d'origine).
- Dépendances : audit automatique en CI, mises à jour régulières.
- Revue de sécurité avant chaque phase de lancement.

## Sauvegardes

Dès les premières données réelles : sauvegardes PostgreSQL managées avec
restauration à un instant donné, versionnement du bucket, **test de
restauration** trimestriel documenté (une sauvegarde jamais restaurée
n'est pas une stratégie).
