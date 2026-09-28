# ADR-0010 — Architecture e-mail : adresse de réponse dédiée d'abord

- **Date** : 2026-09-28 · **Statut** : Accepté (identité d'envoi : Q4)

## Contexte
Il faut envoyer les demandes de prix et récupérer les réponses avec leurs
pièces jointes. Connecter la boîte de l'artisan en **lecture** (Gmail
`gmail.readonly`) implique un scope classé « restreint » par Google, qui
impose un audit de sécurité annuel CASA (plusieurs semaines, coût réel).
Le scope d'envoi seul (`gmail.send`) est « sensible » : vérification de
l'application, sans audit CASA. *Source : documentation Google relayée par
des sources secondaires ; la page officielle n'était pas accessible depuis
cet environnement — à reconfirmer avant la phase 4.*

## Décision
1. **Réception** : chaque consultation a une adresse de réponse dédiée,
   reçue par un prestataire d'e-mail entrant qui appelle notre webhook.
   Aucune lecture de la boîte de l'artisan, jamais de scan global (§37).
2. **Envoi, phase 3** : depuis notre domaine, au nom de l'artisan,
   `Reply-To` dédiée, artisan en copie.
3. **Envoi, phase 4 (option)** : depuis la boîte de l'artisan via
   `gmail.send` ou Microsoft Graph `Mail.Send`, `Reply-To` dédiée
   conservée.
4. Ports : `TransactionalEmailProvider`, `InboundEmailReceiver`,
   `MailboxConnector` (phase 4).
5. Rattachement multi-indices et file « à vérifier » (voir
   `docs/integrations.md`).

## Conséquences
- Réception automatique dès la phase 3, sans OAuth.
- Limite : un fournisseur qui écrit à l'adresse personnelle de l'artisan
  hors du fil → transfert ou import manuel.
- Configuration DNS (SPF, DKIM, DMARC, MX du sous-domaine de réponses) à
  prévoir.
