# Messages et Demandes : état des lieux et proposition (22 novembre 2026)

Demande de Greg (21 novembre 2026, point 7) : rien à coder dans l'appli avant la validation des maquettes.

## 1. Ce que montre chaque écran aujourd'hui

Captures faites sur le site de test, avec le compte de recette, sur petit iPhone et sur ordinateur. Elles sont jointes au compte rendu, hors du dépôt.

| Écran | Ce qu'il montre | Ce qui gêne |
|---|---|---|
| **Demandes › Négoces** (`/demandes`) | Toutes mes listes, brouillons compris (30 sur le compte de recette), une recherche et cinq filtres d'état : Toutes, À préparer, Envoyées, Réponses reçues, Terminées. Chaque carte affiche son nom, son état, le nombre de lignes et la date. | Les brouillons noient les demandes envoyées. Les réponses ne se voient qu'en ouvrant la carte. |
| **Demandes › Groupées** | Mes besoins publiés ou rejoints. | Rien à redire. |
| **Messages** (`/messages`) | Une boîte unique : les réponses des négoces (« Classée » / « À classer »), Missions, Mon site et Mobiiz. Six filtres et une recherche. Les messages sont rangés en « Aujourd'hui » et « Plus tôt ». | Une réponse de négoce n'ouvre pas son message : elle ouvre la fiche du chantier. Le message n'est rattaché à aucun chantier visible, les réponses d'un même chantier sont éparpillées, et rien ne dit combien de négoces n'ont pas encore répondu. |
| **Fiche d'une demande** (`/chantiers/<id>`, Suivi) | Les négoces (« Envoyé le », « A répondu », « Écrire à… »), les étapes, « Commandé chez… », « Prévenir les autres négoces ? », puis encore une fois chaque négoce avec « Devis reçu », la liste et les achats groupés. | Les négoces apparaissent deux fois. Le titre est coupé en plein mot sur petit iPhone (« Liste du 15 noveml »). |
| **Fiche › Offres** | Une carte par négoce : total HT livré, nombre de lignes chiffrées, « Le moins cher », puis « Comparer et choisir ». | C'est clair, à garder. |
| **Mission › réception des réponses** (« Réponses reçues », `ReponsesRecues`) | Sous chaque annonce, la liste des réponses : l'entreprise, la date, le début du message ; une réponse s'ouvre en entier avec ses pièces jointes. | C'est le modèle que tu aimes : une annonce, puis ses réponses dessous. |

**Doublons entre Demandes et Messages.** Une réponse de négoce apparaît à trois endroits : la carte « Classée » de Messages, la fiche Suivi (« A répondu », puis « Devis reçu ») et l'onglet Offres. Les trois mènent au même chantier, et aucun ne montre le texte du message.

## 2. Comment font les autres

- **Gmail et Outlook** : une liste à gauche, le message ouvert à droite sur ordinateur, en plein écran sur téléphone. Les messages d'un même sujet sont regroupés en une conversation, avec un point ou du gras pour ce qui n'est pas lu. Trois dossiers de base : Reçus, Envoyés, Indésirables (récupérables pendant 30 jours). Retour ramène exactement à la place quittée.
- **AlloVoisins** : la demande est envoyée aux pros du quartier, et chaque réponse arrive dans une messagerie privée rattachée à la demande. Des alertes en direct préviennent du nouveau. La demande est la pièce centrale, et les réponses se lisent sous elle.
- **Ce qu'on en retient** : on regroupe par chantier, comme une conversation Gmail rangée sous une demande AlloVoisins ; on ouvre le message en entier ; Retour ramène à la même place ; les trois dossiers classiques.

## 3. Proposition : Messages pour lire, Demandes pour décider

- **Messages › Reçus** : les chantiers, du plus récent au plus ancien, avec une barre discrète « 3 réponses sur 5 » et un point jaune pour le nouveau.
  - Un toucher déplie le chantier sur place : une ligne par négoce (nom, date, début du message, « PDF » s'il y a une pièce jointe). Ceux qui n'ont pas répondu sont en gris, « En attente ».
  - Sous les lignes : « Comparer les N offres » (s'il y en a au moins deux) et « Voir la demande ».
- **Un message ouvert** : le texte entier, sa pièce jointe, « Comparer les N offres » et « Voir la demande et commander ». Retour ramène au même endroit, avec le chantier toujours déplié.
- **Autres messages** : sous les chantiers, ce qui n'est lié à aucun chantier (demandes reçues sur Mon site, achats groupés, Mobiiz).
- **Trois dossiers** :
  - **Reçus** ;
  - **Envoyés** : ce que Mobiiz a envoyé en mon nom (demandes de prix, bons de commande, « Merci pour votre offre »), en lecture seule, sans discussion libre avec les négoces ;
  - **Indésirables** : les messages mis de côté (pub, adresse inconnue), jamais supprimés, avec « Remettre dans Reçus ».
- **Demandes** : l'endroit où l'on décide. Une demande dit « 3 offres sur 5 » et montre les offres (prix, « Le moins cher »), puis « Comparer et commander ». Elle n'affiche plus le texte des messages, juste un lien « Lire les 3 messages des négoces » vers Messages. Chaque message mène à sa demande, et chaque demande à ses messages.
- **Ordinateur** : la colonne de menu, la liste au milieu et le message ouvert à droite, comme une messagerie.
- **Inchangés** : la barre du bas, l'en-tête, la taille des textes (16 à 18 px), des boutons de 48 px, à portée du pouce.

## 4. Ce qu'on garde, ce qui change, ce qu'on retire

| On garde | On change | On retire |
|---|---|---|
| L'onglet Offres et « Comparer et choisir » | Messages : regroupés par chantier au lieu d'une liste plate | La deuxième liste des négoces en bas de la fiche (« Devis reçu ») |
| Demandes › Groupées | Un message de négoce s'ouvre en entier (texte et pièce jointe), au lieu d'ouvrir la fiche | Les étiquettes « Classée » / « À classer » dans la liste (« À classer » passe dans Indésirables ou dans un chantier proposé) |
| La recherche | Retour ramène au chantier déplié | Les six filtres de Messages, remplacés par les trois dossiers |
| Mon site, Mission et Mobiiz dans Messages | La fiche : « 3 offres sur 5 » en haut, puis les offres | « Écrire à… » sur la fiche (on appelle le négoce) : à confirmer |
| La barre du bas, l'en-tête | Demandes : les brouillons à part (« À préparer »), plus mêlés aux envois | |

## 5. Questions pour toi

1. Les brouillons dans Demandes : un filtre « À préparer » qu'on ne montre pas par défaut, ou une section repliée en bas ?
2. « Écrire à ce négoce » sur la fiche : on le retire (vous vous appelez), ou on le garde comme simple lien vers son e-mail ?
3. Mission dans Messages : ses conversations passent-elles sous « Autres messages », ou gardent-elles leur propre rangée tant que Mission est « Bientôt » ?
4. Indésirables : mis de côté par Mobiiz seul, ou aussi par l'artisan, avec un geste « C'est de la pub » ?
5. Envoyés : on y montre aussi les relances automatiques envoyées aux négoces ?
