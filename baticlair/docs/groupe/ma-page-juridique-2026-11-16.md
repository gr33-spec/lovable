# « Ma page Mobiiz » : textes juridiques CANDIDATS du 16 novembre 2026 (non publiés)

Préparé par l'agent juriste. **Rien n'est publié et aucune version officielle n'est modifiée** : ni `/confidentialite`
(version du 15/11/2026), ni `RGPD-REGISTRE.md`, ni `RGPD-SOUS-TRAITANTS.md`, ni la CGU candidate du 16 novembre. Ce
fichier donne les paragraphes à AJOUTER, à relire par un avocat avant toute ouverture de la fonction.

**Je ne suis pas avocat.** Les références de loi sont citées de mémoire : à confirmer par un professionnel.

Repères dans le code (lus le 16 novembre 2026) :
- contact : `ContactPage` garde l'entreprise, la date et une empreinte de l'IP (SHA-256 salée) ; le message part par
  Resend ; aucune purge n'existe encore pour `contact_page` et `signalement_page` (`purges.ts`) ;
- photos : Vercel Blob (CDN public) ; à la suppression du compte, les lignes `photo_page` partent en cascade mais **les
  fichiers sur Vercel Blob ne sont pas effacés** ;
- masquage par l'admin : noté au journal admin, **l'artisan n'est pas prévenu** ;
- « Mobiiz m'aide à l'écrire » : nom, métiers, zone, année, certifications déclarées et brouillon partent chez Anthropic.

---

## 1. Politique de confidentialité : paragraphes à ajouter (version candidate du 16/11/2026)

### Ma page Mobiiz (page publique d'une entreprise)

Chaque entreprise inscrite peut publier une page sur mobiiz.fr/e/… . Elle reste privée tant que l'entreprise ne la
rend pas visible.

- **Ce qui s'affiche** : le nom de l'entreprise, son logo, ses textes, ses métiers, sa zone, ses horaires, son
  téléphone, ses photos de chantiers, ses certifications et assurances déclarées, les mentions légales de l'entreprise.
  Le nom d'une personne, une adresse e-mail ou l'adresse exacte ne s'affichent que si l'entreprise le choisit (pour une
  entreprise individuelle, le nom de l'entreprise peut être celui de l'artisan).
- **Qui en est responsable** : l'entreprise est responsable du contenu de sa page et des photos qu'elle publie. BATI
  INVEST héberge la page et en est responsable pour la sécurité, le stockage et la modération.
- **Photos** : avant leur mise en ligne, nous retirons les informations cachées du fichier (lieu GPS, appareil, date).
  Elles sont stockées chez Vercel (Vercel Blob) et diffusées par son réseau de serveurs. Elles restent tant que
  l'entreprise les garde ; elles sont effacées quand elle les supprime, quand elle supprime sa page ou son compte.
  Une copie peut rester quelques jours dans les caches du réseau de diffusion.
- **Aide à l'écriture** : si l'entreprise le demande, son nom, ses métiers, sa zone, son année de création, ses
  certifications déclarées et ses textes en cours sont envoyés à Anthropic (États-Unis) pour proposer une accroche et
  une présentation. Rien n'est utilisé pour entraîner le modèle. L'entreprise relit et choisit : rien n'est publié sans
  elle.

### Le formulaire « Demander un devis »

- **Ce qui se passe** : votre nom, vos coordonnées, la commune et votre message sont envoyés par e-mail à l'entreprise,
  qui vous répond directement. L'adresse e-mail de l'entreprise ne vous est pas montrée.
- **Qui est responsable** : l'entreprise destinataire, pour l'usage qu'elle fait de votre message (vous répondre, faire
  un devis). Mobiiz transmet le message pour elle, comme prestataire.
- **Ce que Mobiiz garde** : ni votre message ni vos coordonnées dans sa base. Notre prestataire d'e-mails (Resend,
  Irlande) en garde une copie technique pendant [DURÉE À RELEVER DANS LE COMPTE RESEND]. Pour bloquer les abus, nous
  gardons l'heure de l'envoi et une empreinte chiffrée de votre adresse IP (on ne peut pas la relire) pendant 30 jours.
- **Base légale** : pour l'entreprise, votre demande de devis (mesures avant un contrat) ; pour Mobiiz, l'intérêt
  légitime de protéger les entreprises contre les envois en masse.
- **Anti-robots** : quand il est activé, le défi Cloudflare Turnstile lit votre adresse IP et des signaux du navigateur,
  sans cookie publicitaire.

### « Signaler cette page »

- **Ce que nous gardons** : le motif, la précision écrite, la date, l'adresse de la page et une empreinte chiffrée de
  l'adresse IP (pour éviter les signalements en série). Si vous laissez un e-mail, il sert seulement à vous dire ce qui a
  été décidé.
- **Pourquoi** : traiter les contenus illicites, comme la loi le demande à un hébergeur (règlement européen sur les
  services numériques). Base légale : obligation légale et intérêt légitime.
- **Durée** : 12 mois, puis effacement automatique ; l'empreinte IP est effacée après 30 jours.
- **Qui voit** : l'équipe Mobiiz. L'entreprise concernée est informée de la décision et de son motif, jamais de
  l'identité de la personne qui a signalé.

### Lignes à ajouter au tableau « Ce que nous gardons »

| Finalité | Données | Base légale | Durée |
|---|---|---|---|
| Ma page Mobiiz | Réglages, textes, photos (sans GPS), certifications déclarées, choix d'afficher l'adresse | Contrat (CGU) | Tant que la page ou le compte existe |
| Aide à l'écriture de la page | Profil de l'entreprise et brouillon (envoyés à Anthropic) | Contrat (à la demande) | Chez Mobiiz : le temps de la réponse, coût de l'appel comme pour l'assistant |
| Messages du formulaire « Demander un devis » | Heure, page, empreinte de l'IP | Intérêt légitime (anti-abus) | 30 jours |
| Signalements d'une page publique | Motif, précision, date, empreinte de l'IP, e-mail facultatif | Obligation légale (DSA) ; intérêt légitime | 12 mois (empreinte IP : 30 jours) |
| Masquage d'une page par l'équipe | Page, date, motif, admin | Obligation légale (DSA) | 12 mois après la décision |

### Ligne à ajouter au tableau « Qui reçoit les données »

| Nom | Rôle | Pays | Garantie |
|---|---|---|---|
| Vercel (Blob) | Stockage et diffusion des photos des pages publiques | [RÉGION DU STORE À VÉRIFIER : choisir l'UE] ; société aux États-Unis ; caches dans le monde | Clauses contractuelles types, Data Privacy Framework |

---

## 2. Registre des traitements : entrées à ajouter (n° 23 à 26, candidates)

| # | Traitement | Personnes | Données | Finalité | Base légale | Durée | Destinataires |
|---|---|---|---|---|---|---|---|
| 23 | Ma page Mobiiz | Artisans (et, pour une entreprise individuelle, l'artisan lui-même) ; personnes visibles sur les photos | Textes, logo, photos (métadonnées retirées), téléphone, zone, horaires, site, certifications déclarées, adresse si choisie, date de l'accord photos | Publier la page de l'entreprise | Contrat (CGU) ; pour les personnes visibles : accord recueilli par l'artisan (responsable) | Durée de la page ou du compte ; fichiers Vercel Blob effacés avec (À CODER) | Public ; Vercel (Blob, CDN) ; Anthropic (aide à l'écriture) |
| 24 | Formulaire de contact d'une page | Visiteurs (prospects, souvent des particuliers) | Nom, téléphone, e-mail, commune, message (transmis, non gardés en base) ; heure et empreinte IP (gardées) | Transmettre la demande à l'entreprise ; anti-abus | Transmission : Mobiiz sous-traitant de l'entreprise (art. 28) ; anti-abus : Mobiiz responsable, intérêt légitime | Message : non gardé en base, copie chez Resend [durée à relever] ; trace : 30 jours (À CODER) | L'entreprise destinataire ; Resend ; Cloudflare (Turnstile) |
| 25 | Signalements de pages publiques | Visiteurs qui signalent ; entreprise signalée | Motif, précision, date, empreinte IP, e-mail facultatif | Traiter les contenus illicites (DSA, art. 16) | Obligation légale ; intérêt légitime | 12 mois ; empreinte IP 30 jours (À CODER) | Équipe Mobiiz |
| 26 | Modération (masquage) | Entreprises | Page, date, motif, admin | Retirer un contenu illicite ; prouver la décision et la motiver (DSA, art. 17) | Obligation légale | 12 mois après la décision | Équipe Mobiiz ; l'entreprise concernée (motif) |

Sous-traitants (`RGPD-SOUS-TRAITANTS.md`) : ajouter « Vercel Blob » à la ligne Vercel (stockage public des photos,
région du store à vérifier, CDN mondial). Analyse d'impact : toujours non requise à mon avis (pas de données sensibles,
pas d'évaluation), mais à revoir si des photos de personnes se multiplient.

---

## 3. CGU : article à ajouter (candidat, après l'article 15)

### Article 15 bis. Ma page Mobiiz

15 bis.1. **Votre page.** Vous pouvez publier une page publique de votre entreprise. Elle est privée tant que vous ne la
rendez pas visible. Vous en êtes l'éditeur : vous êtes seul responsable de ses textes, de ses photos, de vos
coordonnées et de tout ce que vous y déclarez. BATI INVEST l'héberge et ne contrôle pas son contenu avant sa mise en
ligne.

15 bis.2. **Mentions légales.** La loi vous demande d'afficher sur votre page l'identité de votre entreprise (nom,
forme, numéro d'immatriculation, adresse d'établissement, contact). Mobiiz les affiche à partir de votre profil ; vous
les gardez justes et à jour.

15 bis.3. **Déclarations.** Les certifications, labels, qualifications et assurances que vous affichez sont déclarés
par vous et ne sont pas vérifiés par BATI INVEST. Vous ne déclarez que ce que vous avez réellement et qui est en cours
de validité, et vous fournissez le justificatif à tout client qui le demande. N'affichez pas comme un avantage propre
une garantie que la loi impose à tous. Le badge « Entreprise vérifiée » signifie seulement que votre SIRET est actif à
l'INSEE : il ne garantit ni la qualité de vos travaux, ni vos assurances, ni vos qualifications.

15 bis.4. **Photos.** Vous ne publiez que des photos que vous avez prises ou que vous avez le droit d'utiliser. Vous
obtenez l'accord du client avant de publier une photo prise chez lui, et l'accord de toute personne reconnaissable
(salariés compris). Vous évitez ce qui permet de situer un domicile (numéro de rue, plaque d'immatriculation). Vous
retirez une photo dès qu'une personne concernée le demande.

15 bis.5. **Textes proposés.** « Mobiiz m'aide à l'écrire » propose des textes à partir de votre profil. Vous les
relisez et les corrigez : une fois publiés, ce sont vos textes.

15 bis.6. **Messages reçus.** Les messages de vos visiteurs vous sont transmis par e-mail. Vous êtes responsable de
l'usage des données de ces personnes : vous ne les utilisez que pour leur répondre et faire leur devis, et non pour
d'autres démarchages sans leur accord. Pour cette transmission, BATI INVEST agit comme votre sous-traitant (article
19.2).

15 bis.7. **Signalement, masquage et retrait.** BATI INVEST peut masquer une page, ou retirer un contenu, signalé ou
repéré comme illicite ou contraire aux CGU. Vous recevez un e-mail avec la décision et son motif, et vous pouvez la
contester à contact@mobiiz.fr ; la page est rétablie si la contestation est fondée. En cas de manquements répétés,
l'article 18 s'applique.

15 bis.8. **Licence.** Vous autorisez BATI INVEST à héberger, reproduire, redimensionner et afficher vos textes, logo et
photos sur votre page et dans les aperçus de partage, pour la durée de la page. Cette autorisation cesse à la
suppression du contenu (hors copies techniques temporaires).

Article 14 : ajouter « ne pas publier sur votre page de photo ou d'information sans en avoir le droit ».
Article 19.2 : ajouter « les messages reçus par le formulaire de votre page » aux données pour lesquelles BATI INVEST
est sous-traitant.

---

## 4. Mentions à afficher sur la page publique (texte candidat)

> **Mentions légales**
> Page éditée par {raison sociale}, {forme juridique}{, au capital de X €}, {RCS ou RNE de …} — SIRET {siret}.
> Adresse : {adresse d'établissement ou de domiciliation}. N° de TVA : {si assujetti}. Contact : formulaire
> ci-dessus{ et téléphone}. Responsable de la publication : {représentant légal}.
> {Si « Assurance décennale » est déclarée : Assurance décennale déclarée : {assureur}, couverture : {zone}.}
> Hébergement : BATI INVEST (Mobiiz), SARL, 6 impasse du Ouipoure, 22620 Ploubazlanec, contact@mobiiz.fr,
> {téléphone à compléter} ; serveurs Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.
> Certifications et assurances : déclarées par l'entreprise, non vérifiées par Mobiiz.
> « Entreprise vérifiée » : SIRET actif contrôlé à l'INSEE ; ce n'est pas un label de qualité.
> Données personnelles : voir la politique de confidentialité.

## 5. Points à faire valider par l'avocat

1. Qualification éditeur (l'entreprise) / hébergeur (BATI INVEST) alors que Mobiiz fournit modèles, mise en page, sous
   l'adresse mobiiz.fr, et propose des textes (risque de « rôle actif »).
2. Mentions LCEN (art. 6 et 19) : l'adresse d'établissement et le nom du responsable de la publication peuvent-ils être
   omis ou remplacés (domiciliation, commune seule) pour un artisan qui travaille chez lui ? Le formulaire suffit-il à la
   place d'une adresse e-mail ?
3. Assurance décennale : affichage de l'assureur et de la zone sur la page (code de la consommation, R111-2 ; loi du
   5 juillet 1996, art. 22-2 ; code des assurances, L243-2) : obligatoire ou seulement conseillé ?
4. Badge « Entreprise vérifiée » et pastilles proposées par Mobiiz (dont « Garantie de parfait achèvement », « Artisan
   certifié CMA ») : risque de pratique commerciale trompeuse partagé par Mobiiz.
5. Statut de « plateforme en ligne » (code de la consommation, L111-7) et obligations DSA (art. 16 et 17 ; exemptions
   des micro et petites entreprises seulement pour la section des plateformes).
6. Rôle de Mobiiz pour le formulaire : sous-traitant (art. 28) ou responsable conjoint (art. 26).
7. Droit à l'image des personnes et des biens ; preuve de l'accord des clients ; photos d'intérieur.
8. Transferts : Vercel Blob (région, CDN mondial), Anthropic (nom d'un entrepreneur individuel).
