# Le modèle des pages locales, et comment l'adapter aux métiers

## Ce qui existe

Une page = une fiche (`apps/web/src/lib/regions/fiche.ts`, exemple : `couvreurs-bretagne.ts`), inscrite dans
`PAGES_LOCALES` (`pages.ts`). L'adresse est le `slug` (`/couvreurs-bretagne`). Le code de la page
(`components/page-locale/`) ne change pas d'une page à l'autre. Une autre région de couvreurs = une nouvelle fiche :
départements (la carte se cadre seule), lots d'achats groupés, textes, toiture typique, histoire et ses sources, photos.

La structure est la même pour tous : 1. accroche locale · 2. carte et regroupements du département · 3. trois étapes et
collectif · 4. **visuel emblématique** · 5. **petite histoire** · 6. ambiance, mot local, questions, inscription.

## Proposition : la rubrique « histoire » pour un métier sans matériau emblématique (non codée)

Pour la couverture, l'histoire raconte un matériau (l'ardoise : la géologie, la pose). Pour un électricien, un plaquiste
ou un plombier, il n'y a pas « une pierre du pays ». Je propose de garder exactement la même rubrique (deux chapitres
courts, chaque phrase sourcée deux fois), mais de changer **ce qu'on raconte**, selon trois angles au choix de la fiche :

1. **La règle qui fait le métier** (« Pourquoi on fait comme ça ») : ce qu'impose la norme et pourquoi, en mots simples.
   Électricien : la NF C 15-100, les révisions récentes, ce qu'elles ont changé sur un chantier (sans recopier la norme,
   comme pour le DTU). Plaquiste : les DTU 25.41 / 25.42, l'acoustique, la RE2020. Plombier : l'eau potable, le passage
   du cuivre au multicouche.
2. **L'évolution du métier** (« Comment le métier a changé ») : un avant / après utile à l'artisan. Électricien : la
   domotique, les bornes de recharge, le photovoltaïque. Plaquiste : du carreau de plâtre à la plaque, l'isolation par
   l'intérieur. Toujours des faits datés et sourcés, jamais un chiffre de marché non vérifié.
3. **L'habitude locale** (« Ici, on fait comme ça ») : ce que le climat, le bâti ou l'histoire du coin changent pour ce
   métier. Électricien en Bretagne : l'humidité et le bord de mer (matériel et indices de protection), les longères à
   rénover. Plombier : la dureté de l'eau selon la région (donnée publique des agences de l'eau ou de l'ARS).

Le visuel emblématique suit le même principe : pour un électricien, un tableau neuf bien câblé ou une rénovation dans
une maison typique du coin ; pour un plaquiste, un comble aménagé sous une charpente locale. Et la rubrique « les
chiffres du coin » reste toujours des chiffres réels lus par Mobiiz (regroupements ouverts du département), jamais des
estimations.

Dans la fiche, cela tient sans nouveau code : `emblematique` et `histoire` gardent leur forme (titre, paragraphes,
sources). Il suffirait d'ajouter un champ `angle` (« materiau », « norme », « evolution », « habitude ») pour choisir
le surtitre affiché et la consigne de recherche.

## Ouvrir une page

1. Écrire la fiche (copier `couvreurs-bretagne.ts`), chercher et croiser les sources, mettre les photos dans
   `public/regions/<region>/` avec leur crédit.
2. L'ajouter à `PAGES_LOCALES`.
3. Le test « chaque fiche » vérifie les sources, les photos et les tracés.
4. Rien n'apparaît sur la landing générale tant que Greg n'a pas validé.
