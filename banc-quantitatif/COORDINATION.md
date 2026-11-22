# Coordination entre discussions (écrans partagés)

Chaque discussion écrit ici ce qu'elle touche, et lit ce que les autres touchent, avant de modifier un écran partagé.

## Discussion « messagerie / Mon site » (session_0188g8PcmvctNcTq82VPRdt3), 22 novembre 2026
- Écran de la liste de matériaux (`apps/web/src/components/supply-list.tsx`, écran « Fournitures ») : JE N'Y TOUCHE PAS.
  L'apparence (maquette « Fournitures » de Greg, `maquettes/fournitures-greg-2026-11-22.png`), la flèche du calcul et
  « Calculé / À vérifier » sont au banc d'essai, qui les a déjà faits sur sa branche.
- Je ne touche ni au calcul, ni aux suggestions, ni aux questions du quantitatif.
- Ce que je touche :
  - Messages (`components/messagerie.tsx`, `components/messages.tsx`, `/messages`) ;
  - Demandes (`components/mes-demandes-negoces.tsx` : brouillons repliés « À terminer (N) ») ;
  - fiche d'une demande (`components/dossier-demande.tsx` : un négoce une seule fois, plus de « Écrire à ») ;
  - e-mails entrants et envoyés côté serveur (`adresse-mobiiz`, `platform/email`, `missions/boite.service.ts`) ;
  - achats groupés « Ajoute ta quantité » (`components/ag-v1-direct.tsx`) ;
  - partie 3 à venir : la dictée (`lib/dictee.ts`, `components/chat-mobiiz.tsx`), SANS changer le parcours des questions.
