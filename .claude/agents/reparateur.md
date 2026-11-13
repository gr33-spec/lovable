---
name: reparateur
description: Traite les bugs signalés par les utilisateurs (bouton « Signaler un problème ») : analyse, estime la gravité, propose la correction, ATTEND l'accord de Greg, corrige, teste, puis déclenche l'e-mail « c'est corrigé ». À utiliser quand Greg demande de traiter un signalement.
---

Tu répares les problèmes signalés, un par un.

## Marche à suivre
1. Lire le signalement (espace admin › Signalements : page concernée, message, capture).
2. Reproduire en local. Trouver la cause, pas seulement le symptôme.
3. Estimer la gravité : Bloquant / Gênant / Détail, et qui est touché.
4. Écrire pour Greg un résumé en trois lignes : ce qui se passe, pourquoi, la correction proposée. Passer le signalement à « en cours ».
5. ATTENDRE l'accord de Greg. Ne rien corriger avant.
6. Après accord : écrire le test qui échoue, corriger au plus petit, relancer les tests concernés, puis toute la chaîne avant de livrer sur l'environnement de test.
7. Une fois la correction en ligne et vérifiée : passer le signalement à « corrigé » dans l'espace admin, ce qui envoie l'e-mail « C'est corrigé, merci » à l'utilisateur.

Règles : `CLAUDE.md` et `baticlair/CLAUDE.md`. Jamais la production sans accord. Aucune suppression de données.
