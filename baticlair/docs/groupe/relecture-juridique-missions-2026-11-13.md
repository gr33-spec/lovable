# Relecture juridique de la mention « Missions » (13 novembre 2026)

Relecture faite par l'agent `juriste` (`.claude/agents/juriste.md`) à la demande de Greg. Ce n'est pas l'avis d'un avocat :
les articles et seuils cités l'ont été de mémoire et sont à faire confirmer. Rien n'a été modifié à la suite de cette
relecture : les propositions ci-dessous attendent la décision de Greg.

Textes relus : la section 11 des CGU (`apps/web/src/app/(auth)/cgu/page.tsx`) et la phrase de l'écran de mise en relation
(`PHRASE_RESPONSABILITES_MISSION`, `packages/domain/src/missions/missions.ts`).

## Verdict

Acceptable sur l'environnement de test. PAS en production en l'état.

## Bloquant avant la production

1. Personne n'a accepté la section 11 : la version des CGU n'a pas changé. Il faut une nouvelle acceptation (changer la
   version, ou une case à la première annonce et à la première réponse, ou les deux).
2. Le titre dit « en cours de validation » : à retirer en production.
3. La section 6 des CGU dit « Les artisans ne se voient pas » : vrai pour les achats, faux pour les missions. À limiter aux
   demandes de prix et aux achats groupés.
4. Le risque de salariat déguisé ou de prêt de main-d'œuvre n'est pas traité : le texte dit ce que Mobiiz n'est pas, mais
   n'interdit pas d'utiliser les missions pour faire travailler une personne seule, à la journée, sous les ordres de
   l'entreprise. Les libellés « Renfort ponctuel », « Tarif journalier / personne », « Débutant accompagné » et « CV »
   poussent dans ce sens. Premier point à voir avec un avocat.

## Gênant

5. « Professionnel indépendant » puis « les deux entreprises » : parler d'« entreprise » partout.
6. Le badge « Entreprise vérifiée » ne prouve que le SIRET actif : le dire.
7. Attestation de vigilance URSSAF : dire qui la demande et quand (de mémoire : contrat d'au moins 5 000 € HT, à la
   signature puis tous les six mois ; à confirmer).
8. La sous-traitance (accord du client final, conditions de paiement) n'est pas citée.
9. Les sections 2, 4, 8 et 9 des CGU ne parlent pas des missions.
10. Obligations d'une plateforme d'annonces (classement, signalement, retrait motivé) : à vérifier.
11. La page Confidentialité ne dit rien des missions (CV, attestations, messages).

## Détail

12. Deux phrases presque identiques se suivent sur l'écran de mise en relation : n'en garder qu'une.
13. Les CGU citent encore 49 € et 348 € (déjà suivi dans la version candidate du 11 novembre).

## Réécritures proposées

Phrase de l'écran :

> Mobiiz met seulement en relation deux entreprises indépendantes : ni intérim, ni recrutement, ni garantie. Contrat,
> assurances et obligations légales (dont l'attestation de vigilance URSSAF) se règlent entre vous.

Section 11 (plan) : ce que fait Mobiiz ; une prestation entre entreprises indépendantes (interdit d'embaucher, de chercher
un emploi, de prêter du personnel) ; ce que Mobiiz ne vérifie pas ; ce que les entreprises gèrent elles-mêmes (contrat,
assurances, vigilance URSSAF, sous-traitance, salariés, sécurité) ; aucune garantie ; annonces, signalement, suspension.

## À valider par un avocat avant la production

Le risque pour Mobiiz lui-même et les libellés ; le seuil et la périodicité de la vigilance ; les obligations de plateforme ;
la décennale et la sous-traitance ; la limitation de responsabilité et la façon de recueillir l'acceptation ; la
confidentialité et le registre RGPD pour les missions.
