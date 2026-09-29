# ADR-0006 — Stockage objet S3-compatible privé

- **Date** : 2026-09-28 · **Statut** : Accepté

## Décision
Port `StorageProvider` (`put` en flux, `getSignedDownloadUrl`, `delete`,
`head`) avec un adapter S3 générique. MinIO en développement ; en
production, un stockage S3-compatible hébergé dans l'UE (Scaleway, OVH,
AWS eu-west-3… choisi avec l'hébergement, ADR-0013).

## Règles
- Bucket privé, jamais d'URL publique ; URLs signées de 5 minutes émises
  après contrôle d'autorisation.
- Clés `companyId/documentId` (jamais le nom d'origine du fichier).
- Upload en flux (pas de fichier entier en mémoire).
- Suppression effective lors d'une suppression de compte / d'entreprise.

## Alternative écartée
Supabase Storage (utilisé par BatiClair) : fonctionnel, mais lie le
stockage à un fournisseur de plateforme ; l'adapter S3 générique couvre le
même besoin et reste portable.
