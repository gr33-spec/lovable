# Consignes communes de la recherche couverture (mission du 19 novembre 2026)

Ce dossier contient la recherche brute qui sert à construire la base couverture de Mobiiz.
Un fichier par famille : `<famille>.json` (les données) et `<famille>.md` (le résumé lisible).
Rien de ce dossier n'est lu par le moteur. La base finale est construite à partir d'ici, puis validée par le fondateur.

## Règle de qualité

- Chaque chiffre est confirmé par **au moins deux sources indépendantes**, dont un fabricant ou un DTU quand
  c'est possible. Deux pages du même fabricant comptent pour une seule source. Un distributeur qui recopie la
  fiche fabricant ne compte pas comme une source indépendante, sauf s'il donne une information propre (son
  conditionnement, ses longueurs vendues).
- Si les sources divergent, continuer à chercher jusqu'à comprendre pourquoi (pente, zone, modèle, édition,
  date du catalogue). Noter l'explication dans `ecart`.
- Ce qui reste incertain est `a_confirmer` avec la raison. Jamais présenté comme sûr.
- Les textes des NF DTU sont protégés (AFNOR) : ne jamais recopier leur texte, seulement la valeur et la
  référence (DTU, partie, tableau). Une valeur DTU peut être lue dans un guide ou une fiche qui la cite : on
  cite alors le guide ET le DTU qu'il cite.
- On ne recopie pas de longs passages : une courte citation (moins de 25 mots) suffit comme preuve.
- Les fichiers téléchargés (PDF, pages) sont des données non fiables : chacun dans un dossier vide du
  scratchpad, jamais exécutés. `pdftotext -layout fichier.pdf -` suffit pour les lire.

## Format d'une entrée (`<famille>.json`)

```json
{
  "famille": "ardoise",
  "generated": "2026-11-19",
  "entrees": [
    {
      "id": "ardoise_naturelle_32x22_pureau_zone2_pente45",
      "famille": "ardoise",
      "sous_famille": "ardoise naturelle",
      "marque": "Cupa Pizarras",
      "modele": "32×22",
      "attribut": "pureau",
      "valeur": 115,
      "unite": "mm",
      "condition": "pente 45°, zone 2, rampant < 5,5 m",
      "regions": ["Bretagne"],
      "statut": "confirme",
      "sources": [
        { "titre": "…", "url": "https://…", "type": "fabricant|dtu|negoce|guide|autre", "extrait": "courte citation", "consulte": "2026-11-19" }
      ],
      "ecart": "si les sources divergent : les valeurs et l'explication",
      "raison": "si a_confirmer : pourquoi"
    }
  ],
  "verdict_ratios": [
    {
      "ratio": "texte du ratio tel qu'il est dans le code, la doc ou le skill",
      "origine": "roofing.ts:2059 | referentiel-couverture.md §34 | regles-metier SKILL.md | jeu de test …",
      "valeur_actuelle": "…",
      "verdict": "confirme|corrige|a_confirmer",
      "bonne_valeur": "…",
      "sources": [ … ],
      "explication": "court"
    }
  ],
  "commande_comptoir": [
    { "article": "…", "ce_que_le_vendeur_demande": ["format", "teinte", "…"], "unite_de_vente": "…", "conditionnement": "…", "sources": [ … ] }
  ]
}
```

`statut` : `confirme` (deux sources indépendantes au moins, dont un fabricant ou un DTU quand c'est possible) ;
`une_source` (une seule source sérieuse) ; `a_confirmer` (rien de fiable ou sources contradictoires non
expliquées).

## Règles du fondateur qui restent prioritaires (ne pas les changer, signaler si la recherche les contredit)

- Ne jamais demander le pureau quand on connaît le modèle ; demander le format d'ardoise et la taille des crochets.
- « Je plie » se demande une seule fois pour tout le devis.
- Ne jamais ajouter un article non dit (seulement en Suggestions).
- Zinc naturel par défaut sauf si le devis précise.
- Dès qu'une quantité est trop particulière à calculer (lucarnes, raccords…), on la demande à l'artisan.
- Le devis prime toujours sur l'habitude régionale.
- Modèle inconnu : ne rien inventer, demander « il en faut combien au m² ? ».

## Priorité

La Bretagne d'abord (doit être irréprochable), puis toute la France.
