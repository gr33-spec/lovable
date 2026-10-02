# Confiance et apprentissage contrôlé (PD-045)

## Les trois états

| État | Sens précis | Exemple |
|---|---|---|
| ✓ Vérifié | Chaque critère REQUIS est établi (ou laissé au fournisseur pour le conditionnement). | Prise 2P+T 16 A × 6 lue au devis. |
| ⚠ À confirmer | Un doute qui change la commande, tranché en un geste. | « Écran habituel de votre entreprise : X. On le garde ? » |
| ? Information manquante | Une donnée indispensable manque ; BatiClair n'invente pas. | Pureau inconnu : 1 191 à 1 445 tuiles. |

Code : `packages/domain/src/trust/assessment.ts`. Critères : lecture, ouvrage,
produit, caractéristique fabricant, règle, données chantier, cohérence,
conditionnement. Chacun : établi, à confirmer, manquant, sans effet, ou
« fournisseur » (conditionnement demandé dans l'e-mail).

Une mesure d'ouvrage (« 776 m² de doublage ») n'est jamais ✓ : la quantité à
commander n'est pas établie. Elle part au fournisseur comme mesure.

## Les quatre origines (« Voir le calcul »)

- **Lu dans le devis** (`devis`)
- **BatiClair sait** (`referential`) : sourcé et vérifié
- **Votre entreprise utilise habituellement** (`company`)
- **Choisi pour ce chantier** (`project`)

## La mémoire de l'entreprise

Code : `packages/domain/src/trust/preferences.ts` (règles),
`apps/api/src/modules/learning` (stockage). Table `company_preference`.

- En essai → proposée ; établie → utilisée sans question ; ancienne ou
  contredite → reproposée ; « Désormais » → établie ; « Ne plus utiliser » →
  désactivée. Rien n'est effacé.
- Politiques par type dans `DEFAULT_PREFERENCE_POLICIES` (paramètres de bêta).
- Le moteur écarte une préférence incompatible (autre famille, produit retiré)
  et reprend la vérification normale ; les contrôles fabricant (plage de
  pureau…) s'appliquent toujours.

## Le journal des corrections

Code : `packages/domain/src/trust/corrections.ts`, table `correction_event`.
Chaque geste (corriger, supprimer, ajouter, « C'est bon », préférence) garde
l'avant (avec l'état ✓/⚠/? montré), l'après, les lignes du devis citées, le
métier, la section, la version de la lecture IA, l'auteur et la date. La cause
est déduite de ce qui a changé : lecture, synonyme inconnu, ouvrage, produit,
donnée chantier, préférence, règle, ligne à ne pas commander, ligne manquée.

L'empreinte (`patternKey`) ne contient ni texte, ni quantité, ni entreprise :
elle permettra de compter des ENTREPRISES DISTINCTES par situation. Un signal
collectif n'est jamais appliqué automatiquement : cause → source →
validation → règle → test permanent.
