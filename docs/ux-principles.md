# Principes UX

> Règle n°1 : **la complexité appartient au logiciel, pas à l'artisan.**

## Les deux questions de validation

- *Dev* : est-ce propre, robuste et évolutif ?
- *UX* : l'artisan comprend-il immédiatement ce qui se passe et ce qu'il
  doit faire ensuite ?

## Principes

1. **Une action principale par écran**, visible sans défiler sur mobile.
2. **Déduire avant de demander** : nom du chantier, fournisseur, type de
   document, unité probable… L'utilisateur confirme au lieu de saisir.
3. **Ne demander que ce qui compte** (matérialité) : une ambiguïté n'est
   posée que si sa réponse peut changer le résultat de façon notable. Les
   autres restent visibles comme « probable », sans interrompre.
4. **Grouper les questions** : « J'ai trouvé 34 lignes. 31 sont claires.
   J'ai besoin de vous pour 3 éléments. » Jamais 25 confirmations d'affilée.
5. **Faits ≠ estimations** : une estimation est toujours signalée comme
   telle (libellé « estimé », style distinct, explication au toucher).
6. **Divulgation progressive** :
   1. Synthèse (3 à 5 phrases) ;
   2. Points de vigilance ;
   3. Comparaison détaillée ;
   4. Provenance, confiance, document source.
   Un seul niveau ouvert à la fois par défaut.
7. **Toujours une prochaine étape évidente** (« Votre demande est prête —
   Valider »).
8. **Rien ne se perd** : sauvegarde automatique, brouillons, reprise après
   rafraîchissement ; les traitements longs continuent si l'on quitte l'écran.
9. **Erreurs utiles** : ce qui s'est passé, si les données sont conservées,
   quoi faire, et un identifiant de support discret.
10. **Pas de jargon technique** : jamais « extraction », « modèle »,
    « pipeline », « score ».

## Confiance affichée

| Interne | Affichage | Forme |
|---|---|---|
| ≥ 0,90 ou confirmé | **✓ Compris** / **✓ Correspondance** | icône + texte |
| 0,70 – 0,90 | **~ Probable** | icône + texte |
| < 0,70 | **? À vérifier** | icône + texte + action |

Jamais de pourcentage à l'écran. Jamais la couleur seule.

## Navigation proposée

| Mobile (barre basse) | Contenu |
|---|---|
| **Accueil** | « Que voulez-vous faire ? » + file « À traiter » (réponses reçues, questions en attente, relances suggérées) |
| **Chantiers** | Liste → fiche chantier : documents, liste de matériaux, demandes de prix, offres, comparaison, factures liées |
| **Factures** | Import, historique, écarts de prix (phase 6) |
| **Fournisseurs** | Carnet, historique des échanges |

Paramètres et compte : menu de l'avatar. Pas d'onglet « Consultations » :
une consultation n'existe que dans un chantier ; celles en cours remontent
dans « À traiter ». *Proposition à valider avec de vrais utilisateurs.*

Actions de l'accueil : **Importer un document** (devis, métré, liste —
le type est détecté), **Créer une liste de matériaux**, **Importer une
offre fournisseur**, **Analyser mes factures**.

## Parcours type : importer → valider

1. Dépôt / photo → « Je lis votre document… » (animation discrète,
   estimation de durée, possibilité de quitter : « Je vous préviens quand
   c'est prêt »).
2. Chantier proposé : « Toiture Dupont ? » [Oui] [Autre chantier].
3. Fil de l'assistant : résumé + seulement les questions utiles, chacune
   avec des réponses en un geste (« 85 m² » / « 85 unités »).
4. Liste mise à jour en direct sous le fil, éditable (quantité, unité,
   désignation), ajout / suppression de ligne.
5. « Votre liste est prête » → **Valider**.

## Comparateur

- **Synthèse d'abord** : phrases issues des constats du moteur, triés par
  priorité ; chaque phrase ouvre son détail.
- **Desktop** : tableau besoins × fournisseurs, colonne statut ; badges
  « manquant », « quantité différente », « variante », « remplacement »,
  « frais », « à vérifier » (texte + icône).
- **Mobile** : pas de grand tableau. Cartes par fournisseur (total
  fournisseur, total comparable, couverture « 6/6 »), puis cartes par
  besoin avec les offres empilées, meilleur prix en premier.
- **Négocier cette ligne** : brouillon d'e-mail modifiable, jamais envoyé
  sans validation.

## Design system (phase 1)

Jetons (couleurs, typographie, espacements, rayons, ombres, durées
d'animation) dans `packages/ui` ; composants : boutons, champs,
formulaires, cartes, dialogues, tableaux, badges, indicateurs de statut,
notifications, info-bulles, états vides, états de chargement (squelettes),
navigation. Thèmes clair et sombre. Animations respectant
`prefers-reduced-motion`.

Direction : sobre, beaucoup d'espace, hiérarchie typographique forte, une
seule couleur d'accent, l'or réservé aux montants économisés (idée reprise
de BatiClair). Une forme abstraite animée légère pendant les analyses.
**Prototype visuel présenté avant l'implémentation complète** (§124).

## États à concevoir pour chaque fonctionnalité

vide · chargement · traitement en cours · succès · succès partiel ·
avertissement · erreur récupérable · erreur fatale · hors ligne · service
externe indisponible · incertitude IA · aucun résultat · données
contradictoires.

## Accessibilité

Navigation clavier complète, focus visible, contrastes AA, libellés et
ARIA, zones tactiles ≥ 44 px, textes redimensionnables, jamais
d'information portée par la couleur seule.

## Langues

Français d'abord ; aucun texte d'interface en dur dans les composants :
catalogue de messages (`packages/i18n`) avec clés par domaine. Les constats
du moteur sont des codes + paramètres, traduits par gabarits.
