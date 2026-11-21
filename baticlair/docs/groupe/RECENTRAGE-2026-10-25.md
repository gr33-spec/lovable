# Recentrage du 25 octobre 2026 : demande perso, regroupements, gratuit et payant

Rapport avant code (demande de Greg : « ce qui existe, ce que tu changes, et tout désaccord argumenté »).

## Ce qui existe et qu'on garde

| Brique | Où | Devient |
|---|---|---|
| Lecture IA du devis, questions, « Ton chantier », apprentissage des corrections | `takeoff`, `learning` | inchangé |
| Envoi au fournisseur (mail + PDF, carnet, « Envoyer une partie », retour fournisseur, lecture IA du devis reçu, comparaison) | `price-requests`, `offers`, `suppliers` | socle de la **demande perso** : on ajoute le but, l'accord d'identité, le lien de chiffrage en ligne sans compte, la relance 48 h ouvrées, la clôture à la date de besoin et « Commander » |
| Commande du mois (cycles par zone, grilles négoce par lien, relance, résultats, choix, bon de commande, suivi) | `CycleCommande`, `GrilleNegoce`, `ChoixArtisan` | socle des **regroupements** : un cycle par famille, échéances du 1er et du 15 à midi |
| Généralistes / spécialistes, combinaisons livrées, parts par négoce (hier) | `multimetier.ts` | sert à la consultation (spécialistes de la famille + généralistes) et à la comparaison de la demande perso |
| Paliers de livraison, dépôts, confidentialité des prix, alertes négoce, « Mes commandes » négoce | `espace-negoce` | inchangé, plus le bloc « Vos résultats » |
| Clé de référence normalisée (`cleDeReference`) | `groupe.ts` | durcie : format, épaisseur, origine, qualité, marque ; un doute, et la ligne ne se groupe pas |
| Abonnement 49 € HT / 348 € HT (29 €/mois), essai, Stripe test, factures, grâce | `abonnement` | gratuit / payant par **droits** (lectures, nombre de négoces, regroupements, historique) plutôt qu'un blocage complet |
| Admin : 2FA, tableau de bord, coût IA, démo | `pilotage` | plus « Hypothèses de lancement », coût IA par compte gratuit, interrupteur des inscriptions gratuites |
| Ancien « lot groupé » (`LotGroupe`, seuils, lundi sur deux) | `regroupement.service.ts` | retiré de l'écran, gardé en base (rien n'est supprimé) |

## Ce que je change

1. Le vocabulaire : « Commande commune » devient « Regroupement » (une seule constante, `NOM_COMMANDE_COMMUNE`).
2. Les zones : `ZONES_ACTIVES` (22 au départ). Hors zone active, tout fonctionne sauf les regroupements.
3. La demande perso : immédiate, sans cycle. L'artisan coche ses négoces, choisit le but (« Chiffrer un chantier » ou « Commander ») et accepte de transmettre son identité. Le négoce reçoit un e-mail et un lien pour chiffrer en ligne sans compte, puis on lui propose son compte.
4. « Mes prix » : un nouvel onglet ; et sur une nouvelle demande, « Ton dernier prix pour cet article : X € ».
5. Les regroupements : gros articles identiques seulement, une famille par regroupement, cycles du 1er et du 15. Volume minimum, sinon bascule.
6. La garantie de 30 jours est remplacée par une validité que fixe le négoce (7 jours au moins). L'alignement automatique sur le meilleur prix n'existait pas : rien à retirer, et j'ajoute un test qui le garantit.
7. Gratuit et payant, comme demandé ; la zone sous 10 artisans actifs a le payant offert, avec un préavis de 30 jours.
8. La barre d'onglets : Accueil, Chantiers, Regroupements, Mes prix, Profil.

## Désaccords et choix que je fais seul (dans DECISIONS.md)

1. **Le seuil de 1 000 € HT par ligne suppose un prix estimé, et on n'a aucune base de prix.** Ma proposition :
   - l'estimation vient du dernier prix payé par l'artisan (« Mes prix ») ;
   - sinon, d'un **prix repère par famille et par unité** que tu fixes dans la config (`PRIX_REPERES`) ;
   - sans l'un ni l'autre, la ligne n'est pas proposée au regroupement (ta règle : « en cas de doute, pas de regroupement »).

   Sur la prévisualisation, je mets des repères de test marqués « à valider ». En production, ils restent vides tant que tu ne les as pas donnés.
2. **L'e-mail « au nom de l'artisan » part de notre domaine**, jamais de l'adresse de l'artisan : les protections anti-usurpation (SPF/DMARC) le feraient tomber en indésirable. Il porte le nom de l'artisan dans l'expéditeur affiché, et « Répondre » va à l'artisan.
3. **Le payant offert sous 10 artisans actifs vaut partout au lancement**, y compris hors zone active. Concrètement, personne ne paie tant que le 22 n'a pas 10 artisans actifs. C'est voulu, mais à savoir : la limite « un seul négoce » ne se verra pas tout de suite.
4. **« Dès 29 € par mois »** s'écrit avec « HT, facturé 348 € HT à l'année » juste à côté. Sans cela, le prix affiché serait trompeur (le mensuel est à 49 €).
5. **Relance à 48 h ouvrées, échéance à midi** : sur le plan Vercel gratuit, la tâche planifiée tourne une fois par jour (11 h UTC, soit midi l'hiver). La relance peut donc partir jusqu'à un jour plus tard. Ce sera exact avec Vercel Pro, déjà sur la liste « go prod ».
6. **Les combinaisons multi-négoces d'hier** ne servent plus au regroupement (une famille par regroupement). Elles servent à la demande perso : comparer 5 négoces livraison comprise, « Tout chez X » ou un mélange.
7. **La lecture IA reste bloquée** tant que le crédit Anthropic n'est pas rechargé. Les 2 lectures gratuites par mois ne se testeront en ligne qu'après.

## Ordre de travail

1. Domaine (calculs purs et tests) : zones, droits gratuit / payant, référence stricte et lignes groupables, échéances 1er / 15, anonymat, volume minimum, validité, relance 48 h ouvrées, « Mes prix », indicateurs.
2. API : demande perso, chiffrage en ligne, relance, commande ; « Mes prix » ; regroupements (rejoindre, lancer, bascule, consultation par famille) ; droits et préavis ; admin ; « Vos résultats » ; démo.
3. Web : onglets, accueil, regroupements, « Mes prix », envoi et comparaison, page de chiffrage du négoce ; landing, tarifs, guide, CGU, conditions négoces.
4. Documentation, e2e, déploiement sur test.mobiiz.fr, captures iPhone, rapport.
