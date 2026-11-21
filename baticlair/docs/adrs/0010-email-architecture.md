# ADR-0010 — Architecture e-mail : envoi depuis la boîte de l'artisan, réception sans lecture de sa boîte

- **Date** : 2026-09-28 · **Statut** : Accepté (révisé le même jour après la réponse du fondateur à Q4)

## Contexte
Il faut envoyer les demandes de prix et récupérer les réponses avec leurs
pièces jointes. Exigence du fondateur (Q4) : « simple et pratique pour
l'artisan, connecté d'une manière ou d'une autre à sa boîte mail ».

Contrainte Google : lire la boîte (`gmail.readonly`, `gmail.modify`) est un
scope « restreint » qui impose un audit de sécurité annuel CASA (plusieurs
semaines, coût réel). Envoyer seulement (`gmail.send`) est un scope
« sensible » : vérification de l'application par Google, sans audit CASA.
*Source : documentation Google relayée par des sources secondaires ; la page
officielle n'était pas accessible depuis l'environnement de travail — à
reconfirmer avant la phase 3.*

## Décision
1. **Envoi depuis la vraie boîte de l'artisan** : connexion OAuth Google
   (`gmail.send` uniquement) ou Microsoft (Graph `Mail.Send`). La demande
   part de son adresse, avec sa signature habituelle, et apparaît dans ses
   « Envoyés ». Le fournisseur reconnaît son client.
2. **Double adresse de réponse** : l'en-tête `Reply-To` contient l'adresse
   de l'artisan **et** l'adresse de suivi de la consultation
   (`k7q2m@reponses.<domaine>`). Quand le fournisseur clique « Répondre »,
   la réponse arrive dans la boîte de l'artisan comme d'habitude **et** dans
   le logiciel, qui l'analyse. Aucune lecture de la boîte de l'artisan.
3. **Sujet codé** : `[K7Q2M] Demande de prix — Réfection toiture Dupont`
   pour rattacher les réponses qui arriveraient autrement (transfert).
4. **Filets de sécurité**, dans l'ordre :
   - l'artisan transfère une réponse à l'adresse de suivi (affichée sur la
     fiche, copiable en un geste) ;
   - il importe le PDF (glisser-déposer, photo) ;
   - pour Outlook, Graph `Mail.Read` (non soumis à CASA) pourra détecter les
     réponses si les données terrain montrent que c'est utile.
5. **Autres messageries** (OVH, Orange, IONOS…) : envoi « au nom de
   l'artisan » depuis notre domaine, artisan en copie, même double
   `Reply-To`. Pas de stockage de mot de passe de messagerie.
6. Ports : `MailboxConnector` (envoi via la boîte, par fournisseur),
   `TransactionalEmailProvider` (e-mails système), `InboundEmailReceiver`
   (adresse de suivi).

## Points à valider en phase 3 (tests réels)
- Le respect d'un `Reply-To` à deux adresses par les principaux clients
  (Gmail, Outlook, Apple Mail, clients des négoces). Si un client ne garde
  qu'une adresse, le filet « transfert / import » prend le relais.
- La délivrabilité des e-mails envoyés « au nom de » (SPF, DKIM, DMARC).

## Conséquences
- **Vérification de l'application OAuth par Google** nécessaire avant
  l'ouverture au public (politique de confidentialité, domaine vérifié,
  vidéo de démonstration) : à lancer dès le début de la phase 3, car les
  délais ne dépendent pas de nous.
- La connexion de la boîte passe en **phase 3** (et non plus 4).
