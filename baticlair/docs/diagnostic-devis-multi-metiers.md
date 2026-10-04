# Diagnostic : un devis, plusieurs métiers (avant code)

4 octobre 2026. Demande : rattacher chaque ligne du devis au métier qu'elle décrit, grouper le quantitatif par métier et envoyer un seul PDF au fournisseur, avec un bloc par métier. Le métier de l'entreprise ne sert plus que de défaut pour une ligne ambiguë. Une ligne qui tombe dans un tiroir non validé part « à préciser avec le fournisseur ». Rien n'est codé à ce stade.

## Aujourd'hui

- Un quantitatif porte **un** métier (`Takeoff.trade`) et **une** version de référentiel (`referentialVersion`). Le métier vient du champ `metier`, ou à défaut du métier de l'entreprise (`quantitatifs.service.ts`). Un métier sans tiroir reçoit 422 `no_referential`.
- Le calcul (`takeoff.service.ts`) appelle `planQuote(lignes, ref, …)` avec **un seul** référentiel, celui du métier, avec la version figée.
- Seuls deux tiroirs savent calculer : couverture (`roofing.ts`, validé par le fondateur) et plâtrerie (règles en brouillon). Les 20 tiroirs de recherche (`referentiels/<métier>/tiroir.json` + `vocabulaire.json`) sont des données, sans règles de calcul.
- L'envoi fournisseur (`supplier-packet.ts`, `packetDocument`) produit un document en trois blocs pour un seul métier. Le mail et le PDF ont le même contenu (§43).

## Ce que ça change dans le code

1. **Domaine : attribuer chaque ligne à un métier** (nouvelle fonction pure, sans IA).
   - Elle prend la ligne, les vocabulaires et le métier de l'entreprise, et rend un métier pour la ligne.
   - Règle proposée : la ligne reste au métier de l'entreprise dès qu'elle y trouve un mot. Elle part ailleurs seulement si elle ne trouve rien chez le métier de l'entreprise et trouve un métier précis ailleurs. Égalité ou rien trouvé : métier de l'entreprise.
   - Banc de phrases en test permanent, comme le §44.2.
   - Les vocabulaires de recherche doivent d'abord être nettoyés : les mots courts (« pc », « ce », « inter », « i1 ») doivent être cherchés en mot entier, et les doublons entre métiers résolus.
2. **Domaine : calcul par métier.**
   - Les lignes sont groupées par métier. `planQuote` tourne une fois par métier qui a un référentiel actif, avec la même logique qu'aujourd'hui.
   - Les faits (`SiteFact`) d'un métier ne doivent pas nourrir un autre métier : un « 120 m² » de placo ne doit jamais devenir une surface de toiture.
   - Les clés des questions, des habitudes et de la règle des 3 % sont préfixées par le métier.
   - Les lignes d'un métier sans référentiel actif forment une rubrique « À préciser avec le fournisseur ». La désignation est recopiée, et la mesure du devis est donnée comme une mesure, jamais comme une quantité d'article (règle d'or).
3. **Base et API.**
   - Nouvelle colonne `trade` par ligne de quantitatif, modifiable d'un tap par l'artisan, et inscrite au journal des corrections (§45.6).
   - Une version figée **par métier**, par exemple `referentialVersions: { roofing: "x", platrerie: "y" }`. `referential_snapshot` est déjà indexé par métier et version.
   - Migration : les quantitatifs existants passent toutes leurs lignes au métier du quantitatif, donc le recalcul reste identique.
   - `/v1/quantitatifs` : `metier` devient le métier par défaut. Le 422 `no_referential` est à redéfinir, car un devis sans aucune ligne calculable deviendrait une liste « à préciser ». **Décision à prendre par toi.** Le test `referentiel-par-metier.test.ts` change en conséquence.
4. **Envoi fournisseur.**
   - Un seul `packetDocument` pour le mail, le PDF, l'export et l'aperçu.
   - Dans « À commander », un sous-titre par métier, puis la rubrique « À préciser avec le fournisseur ».
   - Avec un seul métier, aucun sous-titre, pour que le document reste identique à aujourd'hui.
   - Les 11 tests du §45 et le test « aucun prix » restent verts.
5. **Écran.** Le quantitatif est groupé par métier, et chaque ligne affiche son métier, modifiable d'un tap.
6. **Lecture IA (prompt A).** Elle n'a pas besoin de changer : elle extrait les lignes, puis le code les range. Il reste à vérifier que le prompt n'écarte pas comme « hors métier » des lignes d'un autre corps d'état.

## Risque pour la couverture

1. **Lignes de couverture envoyées ailleurs.** C'est le risque principal. Une ligne mal rangée n'est plus calculée et part « à préciser » : c'est une régression silencieuse. Les mots frontières sont :
   - fenêtre de toit / Velux (menuiserie) ;
   - chatière, sortie de toit (ventilation) ;
   - isolation sous rampants, sarking (isolation) ;
   - bac acier (bardage) ;
   - zinc en façade ;
   - écran sous toiture ;
   - gouttière (plomberie).

   **Parade** : la règle « le métier de l'entreprise garde la ligne dès qu'il la reconnaît ». En plus, un **test d'or** : les vrais devis du fondateur et tous les tests couverture existants doivent donner, au caractère près, la même liste et le même PDF avant et après.
2. **Faits qui fuient d'un métier à l'autre.** Une surface de placo pourrait remplir une surface de toiture qui n'a rien lu, car aujourd'hui « un autre ouvrage reprend la quantité s'il n'a rien lu lui-même ». **Parade** : un cloisonnement par métier, testé.
3. **Questions et habitudes.** Une collision de clés est possible, par exemple « épaisseur » en couverture et en plâtrerie. **Parade** : préfixer les clés par le métier. Les habitudes couvreur déjà mémorisées sont migrées sous le préfixe couverture.
4. **Version figée.** Un chantier ancien doit se recalculer à l'identique : c'est le test `version-figee.test.ts`, étendu au cas « une version par métier ».
5. **PDF et mail.** Un devis 100 % couverture ne doit pas bouger d'un octet : pas de sous-titre quand il n'y a qu'un métier.

Tant que ces cinq points sont tenus par des tests, le risque pour la couverture est **faible**. Sans le test d'or sur les vrais devis, il est **réel** : c'est lui qui doit bloquer la fusion.

## Ordre proposé

1. Test d'or couverture (photo de la sortie actuelle).
2. Attribution des lignes, avec le banc de phrases et le nettoyage des vocabulaires.
3. Calcul par métier, avec le cloisonnement des faits et des clés.
4. Base et migration.
5. Envoi fournisseur.
6. Écran.

Rien n'active un nouveau tiroir pour un utilisateur : toute ligne hors couverture et plâtrerie part « à préciser ».
