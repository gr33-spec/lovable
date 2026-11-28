# Chantier 05 : liste d'attente par métier et département, et invitations (28 novembre 2026)

Cahier : `docs/cahiers-chatgpt/05_Admin_Stripe_parrainage.pdf`, partie 2 seulement (la partie 1, Stripe et tableau de
bord, n'est pas demandée). Le message de Greg du 28 novembre l'emporte. Rien n'a été fait sur « À la voix » ni sur
l'Assistant (retravaillés par la discussion du quantitatif).

## 1. Audit : ce qui existait

| Sujet | Existant (avant ce chantier) | Manquait |
|---|---|---|
| Inscription | `/commencer` : carte, département, métier, e-mail, portable ; tout métier entre (« en rodage ») ; `company.departement` | Rien pour dire « tu es sur la liste » ni pour choisir d'être prévenu |
| Liste d'attente | Table `liste_attente_metier` (e-mail, métier, département, source, une ligne par e-mail et métier), `POST /v1/public/liste-attente` sans compte ; plus montrée depuis le 19 novembre | Le département n'était pas une notion d'ouverture ; ni consentement noté, ni désinscription, ni lien avec le compte |
| Décompte | `/admin/liste-attente` : entreprises par métier, par département ; ancienne liste par métier, par département | Le nombre par métier ET département pour préparer une annonce |
| E-mails | Mise en page commune (logo, pied légal, « Ne plus recevoir ces e-mails », en-tête `List-Unsubscribe`), garde du site de test (tout détourné vers Greg sauf les e-mails de compte), liste d'exclusion | Un envoi groupé par petits lots, une fois par personne, avec un journal |
| Invitations | Rien | Tout |

## 2. Ce qui est fait

- **Ouvert ou pas** (`packages/domain/src/inscription/liste-attente.ts`) : au lancement, seuls les couvreurs des
  Côtes-d'Armor (`OUVERTURES_DE_DEPART`). Un couple métier et département s'ouvre quand l'admin « prévient les inscrits ».
  Ouvrir ne change aucune règle d'achat groupé et ne bloque personne (les autres métiers entrent déjà).
- **Liste d'attente** : à l'inscription (`/commencer`), si le couple n'est pas ouvert, une case « Préviens-moi quand Mobiiz
  ouvre pour les plaquistes du 22 », jamais cochée d'office ; sur l'accueil, « Tu es sur la liste » et la phrase de Greg
  (« On t'écrit dès que Mobiiz ouvre pour les plaquistes du 22. »), « Me désinscrire » ; sinon la question, la
  disponibilité réelle sans date et la case. Une ligne par e-mail et métier (pas de doublon) ; le choix est noté avec la
  version du texte (`consentement_le`, `consentement_version`).
- **Désinscription en un clic** : le lien de chaque e-mail (`/liste-attente/desinscription?jeton=…`, jeton aléatoire par
  inscription) ; la page désinscrit à l'ouverture (un robot qui lit les liens sans ouvrir la page ne désinscrit personne).
  Aussi depuis l'accueil.
- **« Prévenir les inscrits »** (`/admin/prevenir`) : un métier, un ou plusieurs départements (avec leur nombre
  d'inscrits) ; l'aperçu dit combien seront prévenus (déjà prévenus, désinscrits, sans département à part) et montre
  l'e-mail tel qu'il partira ; la confirmation porte sur CE nombre (s'il a changé : nouvel aperçu). L'envoi part par lots de
  20, chacun pris sous condition (deux lots en même temps n'envoient jamais deux fois) ; un inscrit n'est prévenu qu'une fois
  (`annonce_envoi.liste_attente_id` unique) ; un désinscrit ou un contact exclu entre-temps est annulé ; un échec se
  réessaie. Journal : chaque annonce, ce qui est parti, adresses masquées ; la confirmation est au journal de l'admin.
- **« Invite d'autres artisans »** (accueil, encart fermable) : « Tu connais d'autres artisans ? Invite-les à découvrir
  Mobiiz. Plus on est, moins on paie. », le lien personnel (`/invitation/<code>`), partagé par l'artisan : SMS, WhatsApp,
  e-mail, copier (et « Partager » du téléphone). La page d'invitation ne dit rien de celui qui invite et n'est pas indexée.
  Le code suit l'inscription ; l'admin voit qui a invité qui (`/admin/invitations`). Aucune récompense, aucun point, aucun
  envoi aux contacts. Pour Flouzeo plus tard : la table `invitation_suivi` (qui invite, qui est invité, date, code) suffit à
  un branchement ; rien n'est envoyé à un tiers.
- **RGPD** : registre, lignes 24 et 25 (`docs/groupe/RGPD-REGISTRE.md`).

## 3. Tests

- Domaine : `packages/domain/test/liste-attente-invitations.test.ts` (phrases, ouvertures, aucune date ni montant).
- Serveur : `apps/api/test/liste-attente-invitations.test.ts` (inscription sur choix explicite, doublon, désinscription par
  l'appli et par le lien, aperçu, nombre confirmé, une seule fois, lots de 20 lancés en même temps, échec réessayé,
  désinscrit entre-temps, invitation suivie de bout en bout, aucune adresse d'un artisan chez un autre, artisan sans accès
  à l'admin). L'isolation entre entreprises couvre les nouvelles routes.
- Parcours (téléphone et ordinateur) : `apps/web/e2e/liste-attente-invitations.spec.ts`, de bout en bout.

## 4. Limites et décisions à prendre

- **Durées de conservation proposées, pas appliquées** (registre, ligne 24) : à valider par Greg, puis à ajouter à la purge
  de nuit.
- L'e-mail d'ouverture dit « Mobiiz ouvre maintenant pour … » : il ne part que sur confirmation de Greg, c'est elle qui
  vaut décision d'ouverture.
- Un inscrit sans département (ancienne liste publique) n'est jamais prévenu ; il est compté à part.
- Les invitations ne comptent qu'une entreprise créée depuis moins d'un jour (jamais un compte ancien rattaché après coup).

## 5. Coûts d'envoi

Aucun service nouveau. Les e-mails passent par Resend, déjà en place. Prix cités de mémoire dans
`docs/audit-quota-email-2026-11-11.md` (à confirmer sur la page de Resend) : gratuit jusqu'à 100 e-mails par jour et
3 000 par mois ; au-delà, environ 20 $ par mois pour 50 000. Une annonce de 100 inscrits = 100 e-mails, donc 0 € sur la
formule gratuite (une journée de quota) ; 1 000 inscrits = à étaler sur 10 jours en gratuit, ou ≈ 0,40 $ en Pro. Sur le site
de test, les e-mails d'annonce sont tous détournés vers Greg (garde existante).

## 6. Retour arrière

Migration additive `20261128120000_liste_attente_invitations` (le retour arrière est écrit dans le fichier). Le code se
retire en supprimant le module `communaute` et les deux encarts ; aucune donnée existante n'est réécrite.
