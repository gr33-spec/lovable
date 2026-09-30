# @baticlair/domain

Noyau métier **pur** : aucune dépendance à un framework, une base de
données ou un prestataire. Tout ce qui touche à l'argent et aux règles de
comparaison vit ici, testé unitairement.

| Dossier | Contenu |
|---|---|
| `src/money` | `Money` — montant décimal exact + devise |
| `src/quantity` | `Quantity`, unités du bâtiment, conversions sûres uniquement |
| `src/confidence` | Score interne → niveau affiché (certain / probable / à vérifier) |
| `src/offer` | Lignes d'offre typées (principale, variante, option, frais, consigne…), totaux, contrôle arithmétique |
| `src/comparison` | Moteur de comparaison déterministe et constats typés |

```bash
pnpm install                                  # depuis la racine du monorepo
pnpm --filter @baticlair/domain test         # Vitest
pnpm --filter @baticlair/domain typecheck    # tsc --noEmit
pnpm --filter @baticlair/domain build        # compile vers dist/
```

Jeu de données de démonstration : `test/fixtures/dupont.ts` (chantier
fictif, 3 fournisseurs, pièges documentés).

Documentation : `docs/comparison-engine.md`, `docs/domain-model.md`,
ADR-0009 et ADR-0012.
