# Search Console et Bing : la marche à suivre (28 novembre 2026)

Feu vert de Greg le 28 novembre 2026. C'est Greg qui fait les étapes : elles demandent ses comptes Google et Vercel.
Gratuit, une quinzaine de minutes.

## Où se règle le domaine mobiiz.fr

Vérifié le 28 novembre 2026 (registre de l'AFNIC et DNS publics) :

- registraire : Key-Systems GmbH, le partenaire qu'utilise Vercel pour vendre des domaines ;
- serveurs DNS : `ns1.vercel-dns.com` et `ns2.vercel-dns.com`.

**La ligne s'ajoute donc dans Vercel, pas chez un autre registraire.** Le domaine a déjà une ligne TXT
`forward-email=…` (le renvoi des e-mails) : **il ne faut pas y toucher**. On en ajoute une seconde à côté.

## 1. Google Search Console : propriété « Domaine »

1. Ouvrir `search.google.com/search-console` avec le compte Google de Mobiiz.
2. « Ajouter une propriété » → choisir **Domaine** (la case de gauche, pas « Préfixe de l'URL ») → taper `mobiiz.fr` →
   « Continuer ».
3. Google affiche une ligne qui commence par `google-site-verification=` suivie d'un long code. « Copier ».
4. Dans un autre onglet : `vercel.com` → l'équipe **gr33-spec** → **Domains** → `mobiiz.fr` → **DNS Records** →
   « Add Record » :

   | Champ Vercel | Ce qu'on y met |
   |---|---|
   | Name | laisser vide (c'est la racine, `mobiiz.fr`) |
   | Type | `TXT` |
   | Value | la ligne copiée chez Google, en entier, commençant par `google-site-verification=` |
   | TTL | laisser la valeur proposée |

   « Save ».
5. Revenir sur Search Console → « Valider ». Si Google dit que ce n'est pas encore visible, réessayer dans 10 minutes
   (parfois jusqu'à une heure).

La propriété « Domaine » couvre d'un coup `mobiiz.fr`, `www.mobiiz.fr`, `test.mobiiz.fr` et `api-test.mobiiz.fr`.

### Juste après (preuve que le test n'est pas indexé)

Search Console → « Pages » : la liste des pages indexées doit être vide pour `test.mobiiz.fr` et `api-test.mobiiz.fr`.
Les premières données arrivent en général en quelques jours. Une adresse de test qui apparaîtrait se retire avec
« Suppressions » (Search Console), et l'en-tête `noindex` déjà en place la fait sortir pour de bon.

### Le jour de la production (pas avant)

Search Console → « Sitemaps » → ajouter `https://mobiiz.fr/sitemap.xml`. Le site ne l'annonce et ne le remplit que
sur mobiiz.fr en production (`INDEXATION_SITE=on`).

## 2. Bing Webmaster Tools (Bing et Copilot)

Une fois Search Console validée :

1. Ouvrir `bing.com/webmasters`, se connecter avec le même compte Google.
2. « Importer depuis Google Search Console » → autoriser → choisir `mobiiz.fr`.

Rien à ajouter dans Vercel : Bing reprend la vérification de Google.

## 3. Le jour de la production, dans Vercel (à faire avec Claude, pas avant)

- Projet du site, **Settings → Environment Variables**, environnement **Production** seulement :
  `INDEXATION_SITE` = `on`. Jamais en Preview (le site de test).
- Projet du site, **Settings → Domains** : `mobiiz.fr` en adresse principale, `www.mobiiz.fr` en redirection vers
  `mobiiz.fr` (308).
- Laisser `PAGES_ENTREPRISES_INDEXEES` éteint tant que Greg n'a pas décidé d'ouvrir les sites des artisans aux moteurs.
