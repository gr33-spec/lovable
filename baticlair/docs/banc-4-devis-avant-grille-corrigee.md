# Banc d'essai — 4 nouveaux devis : AVANT corrections, grille d'évaluation corrigée

Résultat GELÉ le 2026-10-01. Même code que le passage à l'aveugle (commit 7f34a29 :
moteur et référentiel d'avant ces devis), mais évalué avec la grille corrigée, celle qui
sert aussi au score « après » :
- une PRISE se compte à la pièce (article principal + accessoires) ; un point lumineux
  ou une alimentation reste un ouvrage composé ;
- une longueur de produit défini (bande armée en ml, gouttière en m) se commande telle quelle ;
- les questions communes à tout le document (doublons, unités) sont comptées.
Ce fichier n'est jamais régénéré. Passage à l'aveugle, grille initiale : banc-4-devis-avant.md.

Lecture des devis : lignes relevées telles qu'écrites (lecture IA non disponible dans
l'environnement de test ; le devis Morellec est scanné, la piscine garde les défauts du
lecteur PDF). Métier choisi par l'artisan : Morellec = électricité + plomberie ;
Lézardrieux = plâtrerie ; piscine = « autre métier » ; D-2026-011 = plomberie, carrelage,
électricité, peinture.

## Score avant corrections (grille corrigée)

| Devis | Lignes matériaux | Correctement comprises | Besoins identifiés | Quantités certaines | Questions | Inconnus | Erreurs |
|---|---|---|---|---|---|---|---|
| Morellec — électricité + plomberie (scanné) | 152 | 84 (55 %) | 66 (43 %) | 13 (9 %) | 39 | 86 | 29 |
| Lézardrieux — plâtrerie, isolation | 21 | 2 (10 %) | 2 (10 %) | 1 (5 %) | 0 | 19 | 10 |
| Piscine | 34 | 0 (0 %) | 0 (0 %) | 0 (0 %) | 31 | 34 | 5 |
| D-2026-011 — salle de bain | 15 | 8 (53 %) | 8 (53 %) | 8 (53 %) | 0 | 7 | 6 |
| **Total** | **222** | **94 (42 %)** | **76 (34 %)** | **22 (10 %)** | **70** | **146** | **50** |

Pour comparaison, le devis de référence (couverture) :

| Devis | Lignes matériaux | Correctement comprises | Besoins identifiés | Quantités certaines | Questions | Inconnus | Erreurs |
|---|---|---|---|---|---|---|---|
| D-2026-015 — couverture (référence) | 10 | 9 (90 %) | 3 (30 %) | 2 (20 %) | 1 | 7 | 1 |
| **Total** | **10** | **9 (90 %)** | **3 (30 %)** | **2 (20 %)** | **1** | **7** | **1** |

## Erreurs par nature

- mesure d'ouvrage envoyée comme quantité d'achat : 33 (ex. Morellec — électricité + plomberie (scanné) : « VA ET VIENT 1 POINT LUMINEUX »)
- main-d'œuvre prise pour un matériau : 7 (ex. Morellec — électricité + plomberie (scanné) : « PERCEMENT / CREATION DE PASSAGE / RACCORDS CIMENT / TRAVAUX ELECTRICIT »)
- matériau pris pour de la main-d'œuvre : 7 (ex. Morellec — électricité + plomberie (scanné) : « Alimentation Eau froide, Eau chaude pour évier en attente pour cuisini »)
- vocabulaire couverture appliqué à tort : 4 (ex. Morellec — électricité + plomberie (scanné) : « COUDE PVC 45° FF 100 »)

## Détail

<details><summary>Morellec — électricité + plomberie (scanné) — détail ligne à ligne</summary>

| Réf. | Désignation | Qté | Vérité | BatiClair a lu | Niveau atteint | Erreur |
|---|---|---|---|---|---|---|
| l001 | POSE D'UNE PRISE DE CHANTIER | 1,000  | main-d'œuvre | main-d'œuvre | ok |  |
| l002 | PLAN ELECTRIQUE | 1,000  | main-d'œuvre | non reconnu | ok |  |
| l003 | PERCEMENT / CREATION DE PASSAGE / RACCORDS CIMENT / TRAVAUX ELECTRICITE | 1,000  | main-d'œuvre + matériaux implicites | matériau (plumb_fitting), achat | — | main-d'œuvre prise pour un matériau |
| l004 | LAMPLE SIMPLE 1 POINT LUMINEUX | 2,000 U | ouvrage à convertir | non reconnu | — |  |
| l005 | ALIMENTATION HOTTE | 1,000 U | ouvrage à convertir | non reconnu | — |  |
| l006 | PRISE DE COURANT 16A+T | 8,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l007 | PRISE FOUR | 1,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l008 | PRISE PLAQUE | 1,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l009 | PRISE LAVE-VAISSELLE | 1,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l010 | PRISE REFRIGERATEUR | 1,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l011 | PRISE RJ45 | 1,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l012 | PRISE TV | 1,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l013 | VA ET VIENT 1 POINT LUMINEUX | 1,000 U | ouvrage à convertir | matériau (elec_device), achat | — | mesure d'ouvrage envoyée comme quantité d'achat |
| l014 | PRISE DE COURANT 16A+T | 1,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l015 | LAMPLE SIMPLE 1 POINT LUMINEUX | 1,000 U | ouvrage à convertir | non reconnu | — |  |
| l016 | PRISE DE COURANT 16A+T | 3,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l017 | PRISE RJ45 | 1,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l018 | LAMPLE SIMPLE 1 POINT LUMINEUX | 1,000 U | ouvrage à convertir | non reconnu | — |  |
| l019 | PRISE DE COURANT 16A+T | 3,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l020 | PRISE RJ45 | 1,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l021 | LAMPLE SIMPLE 1 POINT LUMINEUX | 1,000 U | ouvrage à convertir | non reconnu | — |  |
| l022 | LAMPLE SIMPLE 1 POINT LUMINEUX | 2,000 U | ouvrage à convertir | non reconnu | — |  |
| l023 | PRISE DE COURANT 16A+T | 1,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l024 | TABLEAU GENERAL ELECTRIQUE HAGER INTERUPTEURS DIFFERENTIELS HAUTE SENSIBILITE 30 | 1,000 U | ouvrage à convertir | matériau (elec_panel), achat | — | mesure d'ouvrage envoyée comme quantité d'achat |
| l025 | PRISE DE TERRE | 1,000 U | achat direct | matériau (elec_device), achat | quantité certaine |  |
| l026 | BARETTE DE TERRE | 1,000 U | achat direct | non reconnu | — |  |
| l027 | LIAISON EQUIPOTENTIEL | 1,000 U | ouvrage à convertir | non reconnu | — |  |
| l028 | MESURE DE LA VALEUR DE LA PRISE DE TERRE | 1,000 U | main-d'œuvre | matériau (elec_device), achat | — | main-d'œuvre prise pour un matériau |
| l029 | LAMPLE SIMPLE 1 POINT LUMINEUX | 1,000 U | ouvrage à convertir | non reconnu | — |  |
| l030 | PRISE DE COURANT 16A+T | 3,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l031 | PRISE RJ45 | 1,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l032 | LAMPLE SIMPLE 1 POINT LUMINEUX | 1,000 U | ouvrage à convertir | non reconnu | — |  |
| l033 | PRISE DE COURANT 16A+T | 3,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l034 | PRISE RJ45 | 1,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l035 | VA ET VIENT 1 POINT LUMINEUX | 1,000 U | ouvrage à convertir | matériau (elec_device), achat | — | mesure d'ouvrage envoyée comme quantité d'achat |
| l036 | PRISE DE COURANT 16A+T | 1,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l037 | LAMPLE SIMPLE 1 POINT LUMINEUX | 2,000 U | ouvrage à convertir | non reconnu | — |  |
| l038 | PRISE DE COURANT 16A+T | 1,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l039 | PRISE MACHINE A LAVER | 1,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l040 | PRISE SECHE-LINGE | 1,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l041 | VA ET VIENT 1 POINT LUMINEUX | 1,000 U | ouvrage à convertir | matériau (elec_device), achat | — | mesure d'ouvrage envoyée comme quantité d'achat |
| l042 | LAMPE SIMPLE 1 POINT LUMINEUX | 1,000 U | ouvrage à convertir | non reconnu | — |  |
| l043 | PRISE DE COURANT 16A+T | 5,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l044 | PRISE RJ45 | 1,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l045 | PRISE TV | 1,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l046 | LAMPLE SIMPLE 1 POINT LUMINEUX | 1,000 U | ouvrage à convertir | non reconnu | — |  |
| l047 | LAMPLE SIMPLE 1 POINT LUMINEUX | 1,000 U | ouvrage à convertir | non reconnu | — |  |
| l048 | ALIMENTATION HOTTE | 1,000 U | ouvrage à convertir | non reconnu | — |  |
| l049 | PRISE DE COURANT 16A+T | 6,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l050 | PRISE FOUR | 1,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l051 | PRISE PLAQUE | 1,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l052 | PRISE LAVE-VAISSELLE | 1,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l053 | PRISE REFRIGERATEUR | 1,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l054 | TABLEAU GENERAL ELECTRIQUE HAGER INTERUPTEURS DIFFERENTIELS HAUTE SENSIBILITE 30 | 1,000 U | ouvrage à convertir | matériau (elec_panel), achat | — | mesure d'ouvrage envoyée comme quantité d'achat |
| l055 | PRISE DE TERRE | 1,000 U | achat direct | matériau (elec_device), achat | quantité certaine |  |
| l056 | BARETTE DE TERRE | 1,000 U | achat direct | non reconnu | — |  |
| l057 | LIAISON EQUIPOTENTIEL | 1,000 U | ouvrage à convertir | non reconnu | — |  |
| l058 | MESURE DE LA VALEUR DE LA PRISE DE TERRE | 1,000 U | main-d'œuvre | matériau (elec_device), achat | — | main-d'œuvre prise pour un matériau |
| l059 | LAMPLE SIMPLE 1 POINT LUMINEUX | 2,000 U | ouvrage à convertir | non reconnu | — |  |
| l060 | ALIMENTATION HOTTE | 1,000 U | ouvrage à convertir | non reconnu | — |  |
| l061 | PRISE DE COURANT 16A+T | 6,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l062 | PRISE FOUR | 1,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l063 | PRISE PLAQUE | 1,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l064 | PRISE REFRIGERATEUR | 1,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l065 | LAMPLE SIMPLE 1 POINT LUMINEUX | 1,000 U | ouvrage à convertir | non reconnu | — |  |
| l066 | PRISE DE COURANT 16A+T | 3,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l067 | PRISE TV | 1,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l068 | PRISE RJ45 | 1,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l069 | VA ET VIENT 1 POINT LUMINEUX | 1,000 U | ouvrage à convertir | matériau (elec_device), achat | — | mesure d'ouvrage envoyée comme quantité d'achat |
| l070 | PRISE DE COURANT 16A+T | 1,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l071 | LAMPLE SIMPLE 1 POINT LUMINEUX | 2,000 U | ouvrage à convertir | non reconnu | — |  |
| l072 | PRISE DE COURANT 16A+T | 1,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l073 | PRISE MACHINE A LAVER | 1,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l074 | ALIMENTATION CHAUFFE-EAU | 1,000 U | ouvrage à convertir | matériau (plumb_heater), achat | — | mesure d'ouvrage envoyée comme quantité d'achat |
| l075 | TABLEAU GENERAL ELECTRIQUE HAGER INTERUPTEURS DIFFERENTIELS HAUTE SENSIBILITE 30 | 1,000 U | ouvrage à convertir | matériau (elec_panel), achat | — | mesure d'ouvrage envoyée comme quantité d'achat |
| l076 | PRISE DE TERRE | 1,000 U | achat direct | matériau (elec_device), achat | quantité certaine |  |
| l077 | BARETTE DE TERRE | 1,000 U | achat direct | non reconnu | — |  |
| l078 | LIAISON EQUIPOTENTIEL | 1,000 U | ouvrage à convertir | non reconnu | — |  |
| l079 | MESURE DE LA VALEUR DE LA PRISE DE TERRE | 1,000 U | main-d'œuvre | matériau (elec_device), achat | — | main-d'œuvre prise pour un matériau |
| l080 | LAMPE SIMPLE 1 POINT LUMINEUX | 1,000 U | ouvrage à convertir | non reconnu | — |  |
| l081 | PRISE MACHINE A LAVER | 1,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l082 | PRISE SECHE-LINGE | 1,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l083 | ALIMENTATION CHAUFFE-EAU | 1,000 U | ouvrage à convertir | matériau (plumb_heater), achat | — | mesure d'ouvrage envoyée comme quantité d'achat |
| l084 | LAMPE SIMPLE 1 POINT LUMINEUX | 1,000 U | ouvrage à convertir | non reconnu | — |  |
| l085 | PRISE DE COURANT 16A+T | 3,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l086 | PRISE RJ45 | 1,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l087 | VA ET VIENT 1 POINT LUMINEUX | 1,000 U | ouvrage à convertir | matériau (elec_device), achat | — | mesure d'ouvrage envoyée comme quantité d'achat |
| l088 | LAMPE SIMPLE 1 POINT LUMINEUX | 1,000 U | ouvrage à convertir | non reconnu | — |  |
| l089 | ALIMENTATION HOTTE | 1,000 U | ouvrage à convertir | non reconnu | — |  |
| l090 | PRISE DE COURANT 16A+T | 6,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l091 | PRISE FOUR | 1,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l092 | PRISE PLAQUE | 1,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l093 | PRISE LAVE-VAISSELLE | 1,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l094 | PRISE REFRIGERATEUR | 1,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l095 | PRISE RJ45 | 1,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l096 | PRISE TV | 1,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l097 | LAMPE SIMPLE 1 POINT LUMINEUX | 1,000 U | ouvrage à convertir | non reconnu | — |  |
| l098 | PRISE DE COURANT 16A+T | 2,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l099 | PRISE RJ45 | 1,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l100 | TABLEAU GENERAL ELECTRIQUE HAGER INTERUPTEURS DIFFERENTIELS HAUTE SENSIBILITE 30 | 1,000 U | ouvrage à convertir | matériau (elec_panel), achat | — | mesure d'ouvrage envoyée comme quantité d'achat |
| l101 | PRISE DE TERRE | 1,000 U | achat direct | matériau (elec_device), achat | quantité certaine |  |
| l102 | BARETTE DE TERRE | 1,000 U | achat direct | non reconnu | — |  |
| l103 | LIAISON EQUIPOTENTIEL | 1,000 U | ouvrage à convertir | non reconnu | — |  |
| l104 | MESURE DE LA VALEUR DE LA PRISE DE TERRE | 1,000 U | main-d'œuvre | matériau (elec_device), achat | — | main-d'œuvre prise pour un matériau |
| l105 | TELERUPTEUR SUR MINUTERIE | 1,000 U | ouvrage à convertir | non reconnu | — |  |
| l106 | PRISE DE COURANT 16A+T | 2,000 U | article principal + accessoires | matériau (elec_device), achat | besoin identifié |  |
| l107 | TABLEAU GENERAL ELECTRIQUE HAGER INTERUPTEURS DIFFERENTIELS HAUTE SENSIBILITE 30 | 1,000 U | ouvrage à convertir | matériau (elec_panel), achat | — | mesure d'ouvrage envoyée comme quantité d'achat |
| l108 | PRISE DE TERRE | 1,000 U | achat direct | matériau (elec_device), achat | quantité certaine |  |
| l109 | BARETTE DE TERRE | 1,000 U | achat direct | non reconnu | — |  |
| l110 | LIAISON EQUIPOTENTIEL | 1,000 U | ouvrage à convertir | non reconnu | — |  |
| l111 | MESURE DE LA VALEUR DE LA PRISE DE TERRE | 1,000 U | main-d'œuvre | matériau (elec_device), achat | — | main-d'œuvre prise pour un matériau |
| l112 | DEMANDE DE CONSUEL | 5,000 U | main-d'œuvre | main-d'œuvre | ok |  |
| l113 | FORMATION UTILISATEUR | 1,000 U | main-d'œuvre | non reconnu | ok |  |
| l114 | COFFRET DE COM SEMI-ÉQU. 4XRJ45/TV GR2 TN405 | 4,000 U | achat direct | matériau (elec_panel), achat | quantité certaine |  |
| l115 | CONNECTEUR RJ45 | 12,000 U | achat direct | matériau (elec_connection), achat | quantité certaine |  |
| l116 | INSTALLATION ET MISE EN SERVICE DU COFFRET DE COMMUNICATION | 4,000 U | main-d'œuvre | main-d'œuvre | ok |  |
| l117 | ALIMENTATION RADIATEUR | 17,000  | ouvrage à convertir | matériau (elec_heating), achat | — | mesure d'ouvrage envoyée comme quantité d'achat |
| l118 | RADIATEUR ELECTRIQUE ATOLL 750W | 5,000  | achat direct | matériau (elec_heating), achat | compris |  |
| l119 | RADIATEUR ELECTRIQUE ATOLL 1000W | 8,000  | achat direct | matériau (elec_heating), achat | compris |  |
| l120 | SECHE SERVIETTE 750W SDB ANCINETI | 4,000  | achat direct | matériau (elec_heating), achat | compris |  |
| l121 | ALDES Kit BAHIA Optima MICROWATT HYGRO B | 4,000  | achat direct | non reconnu | — |  |
| l122 | BOUCHE EXTRACTION BAINS | 4,000 U | achat direct | non reconnu | — |  |
| l123 | BOUCHE EXTRACTION WC | 3,000 U | achat direct | matériau (plumb_sanitary), achat | quantité certaine |  |
| l124 | BOUCHE EXTRACTION CUISINE | 4,000 U | achat direct | non reconnu | — |  |
| l125 | BOUCHE ENTREE D'AIR ENTREE D'AIR HYGRO 6/45 CLAS 30 | 8,000 U | achat direct | non reconnu | — |  |
| l126 | MANCHON REGLABE LG 100MM HYGRO | 8,000 U | achat direct | matériau (plumb_fitting), achat | quantité certaine |  |
| l127 | RESEAU DE GAINE Y COMPRIS SUPPORT | 4,000 U | ouvrage à convertir | matériau (elec_conduit), achat | — | mesure d'ouvrage envoyée comme quantité d'achat |
| l128 | GAINE 0/80 SANITAIRE GAINE SOUPLE PVC DN80 ATLANTIC | 1,000  | ouvrage à convertir | matériau (elec_conduit), achat | — | mesure d'ouvrage envoyée comme quantité d'achat |
| l129 | GAINE 0/125 CUISINE GAINE SOUPLE PVC DN 125 ATLANTIC | 1,000  | ouvrage à convertir | matériau (elec_conduit), achat | — | mesure d'ouvrage envoyée comme quantité d'achat |
| l130 | CHAPEAU PREVU PAR LE COUVREUR |   | information | non reconnu | ok |  |
| l131 | POSE, MISE EN SERVICE ET PERCEMENT | 4,000 U | main-d'œuvre | main-d'œuvre | ok |  |
| l132 | ROBINET M.A.L SANS RACCORD 1/2-3/4 | 4,000  | achat direct | matériau (plumb_tap), achat | compris |  |
| l133 | SIPHON M.A.L | 4,000  | achat direct | matériau (plumb_drain), achat | compris |  |
| l134 | VANNE D'ARRET GENERAL | 4,000  | achat direct | matériau (plumb_tap), achat | compris |  |
| l135 | ROBINET DE PUISAGE NIVEAU 0 | 0,400  | achat direct | matériau (plumb_tap), achat | compris |  |
| l136 | ROBINET LAVE VAISSELLE SANS RACCORD 1/2-3/4 | 4,000  | achat direct | matériau (plumb_tap), achat | compris |  |
| l137 | SIPHON LAVE VAISSELLE SORTIE VERTICALE | 4,000  | achat direct | matériau (plumb_drain), achat | compris |  |
| l138 | Alimentation Eau froide, Eau chaude pour évier en attente pour cuisiniste (non p | 4,000  | ouvrage à convertir | main-d'œuvre | — | matériau pris pour de la main-d'œuvre |
| l139 | ENSEMBLE SUSPENDU ANCOFLASH | 4,000 U | achat direct | non reconnu | — |  |
| l140 | PLAQUE DOUBLE TOUCHE RONDO BLANC 100104506 PORCELANOSA | 4,000 U | achat direct | non reconnu | — |  |
| l141 | MEUBLE 60 AVEC MITIGEUR ET MIROIR | 4,000  | achat direct | matériau (plumb_tap), achat | compris |  |
| l142 | RECEVEUR DOUCHE120*80 CM PORCELANOSA BLANC 100286768 | 4,000 U | achat direct | matériau (plumb_sanitary), achat | quantité certaine |  |
| l143 | VALVULA HOR 80MM PLATO DUCHA STONE | 4,000 U | achat direct | non reconnu | — |  |
| l144 | THERMOSTATIQUE ET BARRE DE DOUCHE | 4,000 U | achat direct | non reconnu | — |  |
| l145 | PAROI A DEFINIR | 1,000 U | achat direct | non reconnu | — |  |
| l146 | MALICIO 80 LITRES | 2,000 U | achat direct | non reconnu | — |  |
| l147 | MALICIO 65 LITRES | 2,000 U | achat direct | non reconnu | — |  |
| l148 | GROUPE DE SECURITE AVEC SOUPAPE 10 BARS, VANNE D'ARRET, CLAPET ANTI-RETOUR ET MA | 4,000 U | achat direct | matériau (plumb_tap), achat | quantité certaine |  |
| l149 | SIPHON DE GROUPE | 4,000 U | achat direct | matériau (plumb_drain), achat | quantité certaine |  |
| l150 | RACCORDS DIELECTRIQUE MF 3/4F | 4,000 U | achat direct | matériau (plumb_fitting), achat | quantité certaine |  |
| l151 | REDUCTEUR DE PRESSION | 4,000 U | achat direct | non reconnu | — |  |
| l152 | RACCORDS CUIVRE Y COMPRIS SOUDURE | 4,000 U | fourniture en vrac | matériau (plumb_fitting), achat | compris |  |
| l153 | Distribution eau froide et eau chaude en Tuyaux PE, dans la dalle. | 340,000  | achat direct | matériau (plumb_pipe), achat | compris |  |
| l154 | TUBE PER PRE GAINE 10X12 BLEU | 1,000  | ouvrage à convertir | matériau (plumb_pipe), achat | — | mesure d'ouvrage envoyée comme quantité d'achat |
| l155 | TUBE PER PRE GAINE 13X16 BLEU | 1,000  | ouvrage à convertir | matériau (plumb_pipe), achat | — | mesure d'ouvrage envoyée comme quantité d'achat |
| l156 | plaque SERTIFIX DOUCHE | 1,000  | achat direct | non reconnu | — |  |
| l157 | RACCORDS PE, RACCORDS MULTICOUCHE CUIVRE, OXYGENE, ACETYLENE, SOUDURES | 4,000  | fourniture en vrac | matériau (plumb_fitting), achat | compris |  |
| l158 | TUBE PVC EVACUATION D 100 NF | 40,000 ML | achat direct | main-d'œuvre | — | matériau pris pour de la main-d'œuvre |
| l159 | CULOTTE PVC 87°30 MF SIMPLE 100 | 6,000  | achat direct | matériau (plumb_drain), achat | compris |  |
| l160 | COUDE PVC 45° FF 100 | 6,000  | achat direct | matériau (plumb_fitting), achat | compris | vocabulaire couverture appliqué à tort (« downpipe_elbow ») |
| l161 | COLLIER PVC 100 | 40,000  | achat direct | matériau (plumb_fixing), achat | compris | vocabulaire couverture appliqué à tort (« downpipe_clamp ») |
| l162 | TAMPON REDUCTION PVC MF 100.40 | 24,000  | achat direct | matériau (plumb_fitting), achat | compris |  |
| l163 | RACCORDS 0/40, COLLES | 4,000  | fourniture en vrac | matériau (plumb_fitting), achat | compris |  |
| l164 | FIXATION INOX WC BIDET 6X70 X2, et Manchon de raccordement | 4,000  | achat direct | main-d'œuvre | — | matériau pris pour de la main-d'œuvre |
| l165 | DIVERS PLATRE, CIMENT | 4,000  | fourniture en vrac | non reconnu | — |  |

</details>
<details><summary>Lézardrieux — plâtrerie, isolation — détail ligne à ligne</summary>

| Réf. | Désignation | Qté | Vérité | BatiClair a lu | Niveau atteint | Erreur |
|---|---|---|---|---|---|---|
| l001 | Doublage Placostil en BA13 sur ossature métallique 48mm double, y compris traite | 776,100 M2 | ouvrage à convertir | matériau (drywall_board), achat | — | mesure d'ouvrage envoyée comme quantité d'achat |
| l002 | Mise en place d'une isolation thermique en doublages Typologie du chantier : Iso | 776,100 M2 | ouvrage à convertir | non reconnu | — |  |
| l003 | Plus value PPM pour pièces humides. | 108,150 M2 | ouvrage à convertir | non reconnu | — |  |
| l004 | Doublage Placostil en BA13 sur ossature métallique 48mm double, y compris traite | 38,100 M2 | ouvrage à convertir | matériau (drywall_board), achat | — | mesure d'ouvrage envoyée comme quantité d'achat |
| l005 | BA13 collée sur murs avec colle MAP de chez PLACO, y compris traitement des join | 66,900 M2 | ouvrage à convertir | matériau (drywall_board), achat | — | mesure d'ouvrage envoyée comme quantité d'achat |
| l006 | Plus value PPM pour pièces humides. | 27,400 M2 | ouvrage à convertir | non reconnu | — |  |
| l007 | Cloison séparative d'appartements SAD120 duo'tech 25. Cloison EI60, 61dB, ossatu | 82,800 M2 | ouvrage à convertir | matériau (drywall_frame), achat | — | mesure d'ouvrage envoyée comme quantité d'achat |
| l008 | Plus value PPM pour pièces humides. | 40,800 M2 | ouvrage à convertir | non reconnu | — |  |
| l009 | Cloison de distribution 72/48. Ensemble des cloisons cotées 7 cm sur plans. Cloi | 390,200 M2 | ouvrage à convertir | matériau (drywall_board), achat | — | mesure d'ouvrage envoyée comme quantité d'achat |
| l010 | Plus value PPM pour pièces humides. | 116,500 M2 | ouvrage à convertir | non reconnu | — |  |
| l011 | Plafond Placostil en BA13 standard, sur fourrures F530 espacées tous les 50cm, y | 390,000 M2 | ouvrage à convertir | matériau (drywall_board), achat | — | mesure d'ouvrage envoyée comme quantité d'achat |
| l012 | Plafond Placostil en BA13 standard, sur fourrures F530 espacées tous les 50cm, y | 314,230 M2 | ouvrage à convertir | matériau (drywall_board), achat | — | mesure d'ouvrage envoyée comme quantité d'achat |
| l013 | Mise en place d'une isolation des combles aménagés sous rampant Typologie du cha | 314,230 M2 | ouvrage à convertir | non reconnu | — |  |
| l014 | Plus-value BA13 hydrofuge. | 22,400 M2 | ouvrage à convertir | matériau (drywall_board), achat | — | mesure d'ouvrage envoyée comme quantité d'achat |
| l015 | Jouées des lucarnes | 6,000 U | ouvrage à convertir | non reconnu | — |  |
| l016 | Jouées des chassis de toit en BA13 | 9,000 U | ouvrage à convertir | matériau (drywall_board), achat | — | mesure d'ouvrage envoyée comme quantité d'achat |
| l017 | Fourniture d'un bloc-porte EI30, pré-peint, dimension 83x204cm+joint isophonique | 6,000 U | achat direct | matériau (drywall_finish), achat | quantité certaine |  |
| l018 | Fourniture d'un bloc-porte alvéolaire, pré-peint, dimension 73x204cm, HUI88, y c | 33,000 U | achat direct | non reconnu | — |  |
| l019 | Pose des portes dans murs intérieurs maçonnés | 7,000 U | main-d'œuvre | main-d'œuvre | ok |  |
| l020 | Fourniture d'une trappe isolée | 3,000 U | achat direct | non reconnu | — |  |
| l021 | Bande armée pour angles saillants. | 530,000 ML | achat direct | matériau (drywall_finish), achat | besoin identifié |  |
| l022 | Pose des portes dans cloisons de distribution (fourniture par le lot menuiseries | 30,000 U | main-d'œuvre | non reconnu | ok |  |
| l023 | Renfort avec un parement en plaque de type HABITO hydrofuge de chez placo (ou éq | 20,000 U | ouvrage à convertir | matériau (drywall_board), achat | — | mesure d'ouvrage envoyée comme quantité d'achat |
| l024 | Prise en charge du chantier, approvisionnement EN CENTRE VILLE AVEC RETOURNEUR,  | 10,000 ENS | main-d'œuvre | main-d'œuvre | ok |  |
| l025 | CEE Prime versée sous forme de remise financée par Hellio Solutions (ex LEVEBVRE | 1,000 F | information | non reconnu | ok |  |

</details>
<details><summary>Piscine — détail ligne à ligne</summary>

| Réf. | Désignation | Qté | Vérité | BatiClair a lu | Niveau atteint | Erreur |
|---|---|---|---|---|---|---|
| l001 | COMMENTAIRES -DEVIS DE PISCINE INTERIEURE 6x 3 ( y compris volet immergé ) fond  | 1,00  | information | non reconnu | ok |  |
| l002 | 11086 DALLE BÉT ON. Fond de piscine Ep 15 cm. | 1,00  | ouvrage à convertir | non reconnu | — |  |
| l003 | POSE77 POSE BLOCS POLYST YRÈNE. Y compris ferraillage et béton. Le m². | 1,00  | main-d'œuvre + matériaux implicites | main-d'œuvre | ok |  |
| l004 | 12062 BLOC POLYST YRÈNE A COFFRER- 1M25. 1.25m x 0.25 m x 0.30 m. | 145,00  | achat direct | non reconnu | — |  |
| l005 | 10701 ESCALIER BET ON ANGLE 3 MARCHES. | 1,00  | achat direct | non reconnu | — |  |
| l006 | 12066 BOUCHON D'ANGLE. Ensemble haut et bas. | 28,00  | achat direct | non reconnu | — |  |
| l007 | 10681BLOC FRAIS DE PORT SPÉCIAL BLOCS . Pour une livraison au magasin.. | 1,00  | information | non reconnu | ok |  |
| l008 | 10008 SKIMMER POUR PISCINE LINER. | 1,00  | achat direct | non reconnu | — |  |
| l009 | 10003 BUSE DE REFOULEMENT PISCINE LINER | 2,00  | achat direct | non reconnu | — |  |
| l010 | 10014 PRISE BALAI POUR PISCINE LINER. | 1,00  | achat direct | non reconnu | — |  |
| l011 | 10395 T RAVERSEE PAROI PISCINE LINER 30 CM. | 3,00  | achat direct | non reconnu | — |  |
| l012 | 10005 PROJECT EUR PISCINE LINER 300 W 12 V. | 1,00  | achat direct | non reconnu | — |  |
| l013 | 12018 AMPOULE PAR56 315 LED COULEUR avec TELECOMMANDE Puissance : 31 w Couleur : | 1,00  | achat direct | non reconnu | — |  |
| l014 | 10001 BOIT E DE CONNEXION ABS SECURIT E. | 1,00  | achat direct | non reconnu | — |  |
| l015 | 10013 PASSE CABLE FLEXIBLE AST RAL. | 1,00  | achat direct | non reconnu | — |  |
| l016 | 10459 POOL T ERRE/ AQUAT ERRE. Pour la mise à la terre du circuit hydraulique.. | 1,00  | achat direct | non reconnu | — |  |
| l017 | 10243 T UYAU SOUPLE PVC D 50- EST IMAT IF. | 80,00  | achat direct | non reconnu | — |  |
| l018 | 10381 COFFRET ÉLECT RIQUE 100VA Mono. FILT RAT ION + 1 PROJECT EUR + 2 MACHINES  | 1,00  | achat direct | main-d'œuvre | — | matériau pris pour de la main-d'œuvre |
| l019 | 10146 POMPE FLOPRO 50M ZODIAC. 0.50 CV - 0,37 Kw. 10.3 M3/ H à 16.8M3/ H | 1,00  | achat direct | non reconnu | — |  |
| l020 | 10433 FILT RE A SABLE ZODIAC MS470. maxi 8m3/ h. 85 Kg de sable. | 1,00  | achat direct | non reconnu | — |  |
| l021 | 12001 GRAVIER granulométrie : 1 à 2.5 mic rons. pour filtre à sable, sac de 25 k | 1,00  | achat direct | non reconnu | — |  |
| l022 | 11988 SABLE SAC 25KG ECOBAT I. | 3,00  | achat direct | non reconnu | — |  |
| l023 | POSE00 POSE PLOMBERIE ET FILT RAT ION. | 1,00  | main-d'œuvre | main-d'œuvre | ok |  |
| l024 | POSE58 ACCESSOIRES DE RACCORDEMENT FILT RAT ION. COMPRENANT : - raccords - coude | 1,00  | fourniture en vrac | non reconnu | — | vocabulaire couverture appliqué à tort (« downpipe_elbow ») |
| l025 | 10452 RAIL POUR SOLIDBRIC. Barre de 3 ML. | 8,00  | achat direct | non reconnu | — |  |
| l026 | 10284 ALKOR BIOCIDE 1 Litre. T RAIT EMENT DU SUPPORT . Sanitized est un agent an | 1,00  | achat direct | non reconnu | — |  |
| l027 | 10101 COLLE SPÉCIALE POUR FEUT RE. Pot de 5 KG. | 1,00  | achat direct | non reconnu | — |  |
| l028 | 12224 COLLE EN SPRAY SUPERPRO 500ML. | 4,00  | achat direct | non reconnu | — |  |
| l029 | 10103 FEUT RE POUR PISCINE 350 G/ M2. Au m2. Feutre anti-bactérie. Largeur du ro | 43,00  | achat direct | non reconnu | — |  |
| l030 | POSE19 POSE FEUT RE PISCINE. AU M/ 2 | 43,00  | main-d'œuvre | main-d'œuvre | ok |  |
| l031 | POSE36 POSE FEUT RE ESCALIER. | 1,00  | main-d'œuvre | main-d'œuvre | ok |  |
| l032 | 10702 LINER ARME UNI 150/ 100è. Coloris : Bleu azur, Blanc, Gris, Sable. Pour ré | 43,00  | achat direct | main-d'œuvre | — | matériau pris pour de la main-d'œuvre |
| l033 | 10880 BIO UV PACKAGE PLUS OXY 30 COMBI Pour les bassins jusqu'a 80m3 Concept de  | 1,00  | achat direct | non reconnu | — |  |
| l034 | POSE57 POSE BIO-UV PACKAGE. | 1,00  | main-d'œuvre | main-d'œuvre | ok |  |
| l035 | 11604 VOLET IMMERGE ROLLINSIDE . motorisation en coffre sec pour une maintenance | 1,00  | achat direct | main-d'œuvre | — | matériau pris pour de la main-d'œuvre |
| l036 | POSE21 POSE VOLET IMMERGE. | 1,00  | main-d'œuvre | main-d'œuvre | ok |  |
| l037 | 10851 N AGE A CON TR E COU R AN T N AD OR SEF 3 0 0 M o n o . Pompe Nadorself Fa | 1,00  | achat direct | non reconnu | — |  |
| l038 | POSE15 POSE NAGE A CONT RE COURANT . | 1,00  | main-d'œuvre | main-d'œuvre | ok |  |
| l039 | 11854 CASCADE BALI MINI avec pompe raccordement coffret et telecommande Hauteur  | 1,00  | achat direct | non reconnu | — |  |
| l040 | 10524 DESHUMIDIFICATEUR 3 EN 1 PAC DH 30 DF HR Appareil permettant d'assurer san | 1,00  | achat direct | non reconnu | — |  |
| l041 | 10134 ECHANGEUR TITANE. . | 1,00  | achat direct | non reconnu | — |  |
| l042 | POSE58 ACCESSOIRES DE RACCORDEMENT FILT RAT ION. COMPRENANT : - raccords - coude | 1,00  | fourniture en vrac | non reconnu | — | vocabulaire couverture appliqué à tort (« downpipe_elbow ») |
| l043 | POSE48 POSE ET RACCORDEMENT DESHUMIDIFICATEUR. mise en route et essais. | 1,00  | main-d'œuvre | main-d'œuvre | ok |  |
| l044 | 10045 KIT D'ENT RET IEN NET T OYAGE. . 1 tête de balai triangulaire . 1 épuisett | 1,00  | achat direct | non reconnu | — |  |
| l045 | 10856 NET T OYAGE PISCINE ET MISE EN ROUT E. COMPRENANT :. Nettoyage de finition | 1,00  | main-d'œuvre | main-d'œuvre | ok |  |
| l046 | SECURIT E : INFORMAT IONS. LOI DU 03/ 01/ 2004. ARTICLE L 128/ 1. Toutes piscine | 1,00  | information | non reconnu | ok |  |

</details>
<details><summary>D-2026-011 — salle de bain — détail ligne à ligne</summary>

| Réf. | Désignation | Qté | Vérité | BatiClair a lu | Niveau atteint | Erreur |
|---|---|---|---|---|---|---|
| l001 | Dépose ancienne salle de bain - Dépose et évacuation des anciens équipements (ho | 1 unité | main-d'œuvre | main-d'œuvre | ok |  |
| l002 | Dépose baignoire existante - Dépose et évacuation de l'ancienne baignoire | 1 unité | main-d'œuvre | main-d'œuvre | ok |  |
| l003 | Receveur de douche à l'italienne extra-plat - Fourniture receveur de douche à l' | 1 unité | achat direct | matériau (plumb_sanitary), achat | quantité certaine |  |
| l004 | Robinetterie de douche encastrée - Fourniture ensemble mitigeur thermostatique e | 1 unité | achat direct | matériau (plumb_tap), achat | quantité certaine |  |
| l005 | Installation douche à l'italienne - Pose du receveur, étanchéité, raccordements  | 1 unité | main-d'œuvre + matériaux implicites | main-d'œuvre | ok |  |
| l006 | Paroi de douche fixe vitrée - Fourniture paroi de douche en verre trempé sécurit | 1 unité | achat direct | non reconnu | — |  |
| l007 | Pose paroi de douche - Pose et fixation de la paroi de douche vitrée | 1 unité | main-d'œuvre | main-d'œuvre | ok |  |
| l008 | Carrelage sol grès cérame 40x40 gris anthracite - Fourniture carrelage grès céra | 9 m² | ouvrage à convertir | matériau (tile_tile), achat | — | mesure d'ouvrage envoyée comme quantité d'achat |
| l009 | Pose carrelage sol avec joints noirs - Pose de carrelage au sol, y compris la pr | 9 m² | main-d'œuvre + matériaux implicites | main-d'œuvre | ok |  |
| l010 | Faïence murale salle de bain - Fourniture faïence murale blanche ou ton clair, f | 28 m² | ouvrage à convertir | matériau (tile_tile), achat | — | mesure d'ouvrage envoyée comme quantité d'achat |
| l011 | Pose faïence murale - Pose de la faïence murale jusqu'au plafond (2.30m de haute | 28 m² | main-d'œuvre + matériaux implicites | main-d'œuvre | ok |  |
| l012 | Meuble double vasque - Fourniture meuble de salle de bain suspendu avec double v | 1 unité | achat direct | matériau (plumb_sanitary), achat | quantité certaine |  |
| l013 | Pose meuble double vasque et raccordements - Installation du meuble, fixation, r | 1 unité | main-d'œuvre + matériaux implicites | main-d'œuvre | ok |  |
| l014 | Miroir salle de bain LED - Fourniture miroir de salle de bain avec éclairage LED | 1 unité | achat direct | matériau (elec_lighting), achat | quantité certaine |  |
| l015 | Pose miroir - Fixation du miroir au mur et raccordement électrique si LED | 1 unité | main-d'œuvre | main-d'œuvre | ok |  |
| l016 | Applique murale salle de bain - Fourniture applique murale design pour salle de  | 1 unité | achat direct | matériau (elec_lighting), achat | quantité certaine |  |
| l017 | Plafonnier LED salle de bain - Fourniture plafonnier LED étanche IP44, lumière b | 1 unité | achat direct | matériau (elec_lighting), achat | quantité certaine |  |
| l018 | Spots LED encastrables pour douche (x3) - Fourniture de 3 spots LED encastrables | 1 unité | achat direct | matériau (elec_lighting), achat | quantité certaine |  |
| l019 | Installation électrique et pose luminaires - Préparation des câblages, raccordem | 1 unité | main-d'œuvre + matériaux implicites | main-d'œuvre | ok |  |
| l020 | Réalisation niche de douche - Création d'une niche murale intégrée dans la douch | 1 unité | ouvrage à convertir | matériau (tile_tile), achat | — | mesure d'ouvrage envoyée comme quantité d'achat |
| l021 | Fourniture sèche-serviette électrique Atlantic 750W - Fourniture d'un sèche-serv | 1 unité | achat direct | matériau (plumb_heating), achat | quantité certaine |  |
| l022 | Installation sèche-serviettes - Fixation du sèche-serviettes, raccordement élect | 1 unité | main-d'œuvre | main-d'œuvre | ok |  |
| l023 | VMC simple flux hygroréglable - Fourniture d'un système de Ventilation Mécanique | 1 unité | achat direct | non reconnu | — |  |
| l024 | Installation VMC - Mise en place de la bouche d'extraction, raccordement gaines  | 1 unité | main-d'œuvre + matériaux implicites | main-d'œuvre | ok |  |
| l025 | Ragréage du sol - Application d'une couche de ragréage fibré pour uniformiser et | 9 m² | ouvrage à convertir | main-d'œuvre | — | matériau pris pour de la main-d'œuvre |
| l026 | Peinture plafond salle de bain - Fourniture peinture spéciale salle de bain (ant | 9 m² | ouvrage à convertir | matériau (paint_paint), achat | — | mesure d'ouvrage envoyée comme quantité d'achat |
| l027 | Application peinture plafond - Préparation et application de deux couches de pei | 9 m² | main-d'œuvre | matériau (paint_paint), achat | — | main-d'œuvre prise pour un matériau |

</details>
<details><summary>D-2026-015 — couverture (référence) — détail ligne à ligne</summary>

| Réf. | Désignation | Qté | Vérité | BatiClair a lu | Niveau atteint | Erreur |
|---|---|---|---|---|---|---|
| ligne 1 | Écran de sous-toiture respirant (Fourniture & Pose) - Fourniture et pose d'un éc | 120 m² | ouvrage à convertir | matériau (underlay), ouvrage | compris |  |
| ligne 2 | Contre-lattage en liteaux 27x40 (Fourniture & Pose) - Fourniture et pose de cont | 120 m² | ouvrage à convertir | matériau (batten), ouvrage | compris |  |
| ligne 3 | Lattage en liteaux 27x40 pour tuiles HP10 (Fourniture & Pose) - Fourniture et po | 120 m² | ouvrage à convertir | matériau (batten), ouvrage | compris |  |
| ligne 4 | Couverture en tuiles terre cuite HP10 rouge (Fourniture & Pose) - Fourniture et  | 120 m² | ouvrage à convertir | matériau (roof_tile), ouvrage | compris |  |
| ligne 5 | Rives de toit (Fourniture & Pose) - Fourniture et pose de tuiles de rive pour la | 24 m | ouvrage à convertir | matériau (roof_accessory), ouvrage | compris |  |
| ligne 6 | Faîtage (Fourniture & Pose) - Fourniture et pose de faîtières ventilées avec clo | 10 m | ouvrage à convertir | matériau (roof_accessory), ouvrage | compris |  |
| ligne 7 | Gouttière PVC de 25 sable (Fourniture & Pose) - Fourniture et pose de gouttières | 20 m | article principal + accessoires | matériau (gutter), achat | besoin identifié |  |
| ligne 8 | Descente d'eau pluviale PVC Ø80 avec coudes (Fourniture & Pose) - Fourniture et  | 2 unités | ouvrage à convertir | matériau (downpipe), achat | — | mesure d'ouvrage envoyée comme quantité d'achat |
| ligne 9 | Chatières de ventilation (Fourniture & Pose) - Fourniture et pose de tuiles chat | 10 unités | achat direct | matériau (roof_accessory), achat | quantité certaine |  |
| ligne 10 | Sortie de toit Poujoulat (Fourniture & Pose) - Fourniture et pose d'une sortie d | 1 unité | achat direct | matériau (roof_accessory), achat | quantité certaine |  |

</details>
