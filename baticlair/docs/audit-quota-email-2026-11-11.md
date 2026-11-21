# Audit du plafond d'e-mails (Resend), 11 novembre 2026

Aucune configuration n'a été modifiée : ni domaine, ni fournisseur, ni secret, ni règle Resend, ni boîte. Aucun e-mail n'a
été envoyé pour cet audit.

## Ce qui s'est passé

Le 11 novembre, 99 e-mails étaient partis (recettes en ligne). À 12 h 09 UTC, une publicité reçue sur contact@mobiiz.fr
a été renvoyée à l'adresse de l'administrateur : centième envoi du jour.

## Pourquoi un e-mail REÇU consomme un ENVOI

Le courrier de `mobiiz.fr` arrive chez Resend, qui n'est pas une boîte aux lettres : il prévient l'API par un webhook.
Pour que Greg lise ce qui arrive sur contact@mobiiz.fr, l'API relit le message et en ENVOIE une copie à son adresse
(`renvoyerContact`, `apps/api/src/platform/email/contact-entrant.ts`). Chaque e-mail reçu sur contact@ produit donc un
e-mail envoyé, compté comme les autres.

## Ce qui partage le même compteur

Un seul compte Resend, une seule clé, un seul domaine d'envoi : tout passe par `ResendEmailSender`.

| Circuit | Envois | Marqué « doit partir » |
|---|---|---|
| Confirmation de compte, mot de passe oublié | 1 par geste | non |
| Code d'accès de l'administration, avis de connexion admin | 1 à 2 par connexion | le code : oui |
| Demande de prix à un négoce | 1 par négoce (jusqu'à 5 par demande) | oui |
| Bons de commande, demandes des achats groupés et de la commande commune | 1 par destinataire | oui |
| Avis à l'artisan (« ton négoce a répondu », missions, achats groupés) | 1 par fait, selon ses réglages | non |
| Relances automatiques (artisan, négoce), rapport mensuel | par tâche planifiée | non |
| Renvoi de contact@mobiiz.fr vers l'administrateur | 1 par e-mail REÇU | oui |

À cela s'ajoute la réception : chaque e-mail entrant (réponse de négoce, contact@) est compté par Resend dans le volume
du compte, d'après le relevé fait le 27 octobre ; ce point n'a pas été revérifié aujourd'hui.

## Le plafond est-il vraiment de 100 par jour ?

Je ne peux pas le lire par l'API. Ce que montre l'historique du compte : 210 e-mails délivrés le 8 novembre, 167 le
27 octobre, 99 puis 100 le 11 novembre, tous « délivrés », aucun refusé. Soit le compte n'est pas (ou plus) sur la formule
gratuite, soit le plafond journalier n'a pas été appliqué ces jours-là. À vérifier par Greg dans Resend, page
« Settings », onglet « Usage » ou « Billing » : la formule en cours et le compteur du jour y sont affichés.

## Ce qui se passe si Resend refuse un envoi

Lu dans le code (`resend-email.sender.ts`) ; non provoqué en réel.

| Circuit | Comportement |
|---|---|
| Code d'administration | l'envoi est « doit partir » : la demande de code échoue avec une erreur ; l'administrateur ne peut pas entrer tant que le quota n'est pas revenu |
| Confirmation de compte | l'inscription réussit ; l'e-mail va dans la file de reprise, rejouée une fois par jour (tâche de 04 h 23 UTC) ; l'artisan peut redemander l'e-mail ; d'ici là il ne peut pas rejoindre un achat groupé (e-mail confirmé exigé) |
| Demande de prix à un négoce | « doit partir » : l'envoi échoue devant l'artisan, la demande n'est jamais marquée « envoyée » ; rien n'est perdu, mais rien ne part |
| Réponse d'un négoce par e-mail | la RÉCEPTION ne dépend pas de l'envoi : l'e-mail est rangé, le PDF devient le devis, la cloche porte l'alerte ; seul l'avis par e-mail à l'artisan ne part pas (repris le lendemain) |
| Avis et relances | non envoyés, mis dans la file de reprise |
| Renvoi de contact@ | « doit partir » : le traitement échoue, Resend représentera le webhook plus tard ; le message reste lisible dans Resend, onglet « Receiving » |

## Un inconnu peut-il épuiser le quota ?

Oui. Il suffit d'écrire à contact@mobiiz.fr : chaque message déclenche un envoi. Les protections qui existent :
la signature du webhook (personne ne peut appeler l'API à la place de Resend), le refus des boucles (un message venant de
l'adresse de l'administrateur n'est pas renvoyé), un seul traitement par événement, et une limite de 600 appels par heure
sur le webhook. Il n'existe ni filtre anti-publicité, ni plafond de renvois par jour, ni priorité entre les circuits : un
flot de publicités passe avant un code d'administration.
Les adresses Mobiiz des artisans sont moins exposées : un message à une adresse inconnue est mis de côté sans envoi ; un
message à l'adresse d'un artisan produit un avis, seulement si l'artisan n'a pas coupé ce réglage.

## Solutions et coûts

Les prix de Resend sont cités de mémoire (formule gratuite : 100 e-mails par jour, 3 000 par mois ; formule « Pro » :
environ 20 $ par mois pour 50 000 e-mails, sans plafond journalier) : à confirmer sur leur page de tarifs.

| Solution | Ce que ça change | Coût | Effort |
|---|---|---|---|
| A. Passer le compte Resend en formule payante | plus de plafond journalier ; tout continue comme aujourd'hui | environ 20 $ par mois | un réglage de Greg dans Resend, aucun code |
| B. Plafonner les renvois de contact@ dans le code (par exemple 20 par jour, puis un seul résumé quotidien) | un flot de publicités ne peut plus vider le quota | 0 € | une demi-journée, avec tests |
| C. Budget par priorité dans le code : compter les envois du jour, réserver une part aux e-mails critiques (codes, confirmations, demandes aux négoces), différer le reste | le critique passe toujours en premier | 0 € | un à deux jours, avec tests |
| D. Ne plus renvoyer contact@ par e-mail : lire ces messages dans l'administration de Mobiiz | contact@ ne consomme plus aucun envoi | 0 € | un à deux jours (écran d'administration) |
| E. Une vraie boîte aux lettres pour contact@ | contact@ sort du circuit | 1 à 7 € par mois selon l'hébergeur | change le courrier entrant du domaine (les adresses des artisans et contact@ partagent `mobiiz.fr`) : demande une adresse de contact sur un autre nom, donc une décision |
| F. Alerte à 80 % du plafond | on est prévenu avant la panne | 0 € | une demi-journée |

## Recommandation pour le pilote

1. Vérifier d'abord, dans Resend, la formule réelle du compte et le compteur du jour (deux minutes, par Greg).
2. Si le compte est gratuit : prendre la formule payante de Resend le jour où de vrais artisans arrivent (environ 20 $ par
   mois). C'est la solution la plus simple : une seule inscription d'artisan suivie d'une demande à cinq négoces fait
   déjà une dizaine d'e-mails.
3. En attendant, et quoi qu'il arrive : faire la solution B (plafond des renvois de contact@, 0 €). C'est la seule faille
   qu'un inconnu peut exploiter aujourd'hui.
4. Garder C et D pour plus tard, si le volume le justifie.
Aucune de ces actions n'est faite : elles attendent l'accord de Greg.
