-- « NÉGOCE COUVERTURE » = COUVERTURE, ZINGUERIE ET ÉTANCHÉITÉ PAR DÉFAUT (Greg, 14 novembre 2026 : « les négoces déjà inscrits
-- en couverture reçoivent les trois par défaut »). Zinguerie et Étanchéité sont devenues des métiers à part le 13 novembre :
-- un négoce déclaré « couverture » avant cette date vendait les trois. On complète donc ceux qui n'ont coché NI l'une NI
-- l'autre (un négoce qui a déjà choisi l'une des deux a fait son tri : on n'y touche pas).
-- Aucune colonne, aucune ligne supprimée : seules des valeurs s'ajoutent à des listes existantes.
--
-- Retour arrière (à ne lancer qu'avec l'accord de Greg) : les lignes touchées sont celles dont la liste contient les trois
-- valeurs ; la migration ne garde pas de trace ligne par ligne, une sauvegarde de ces trois colonnes est à prendre avant.

UPDATE "negoce"
SET "familles" = "familles" || ARRAY['zinguerie', 'etancheite']
WHERE 'couverture' = ANY("familles") AND NOT ('zinguerie' = ANY("familles")) AND NOT ('etancheite' = ANY("familles"));

UPDATE "compte_negoce"
SET "familles" = "familles" || ARRAY['zinguerie', 'etancheite']
WHERE 'couverture' = ANY("familles") AND NOT ('zinguerie' = ANY("familles")) AND NOT ('etancheite' = ANY("familles"));

UPDATE "supplier"
SET "specialites" = "specialites" || ARRAY['zinguerie', 'etancheite']
WHERE 'couverture' = ANY("specialites") AND NOT ('zinguerie' = ANY("specialites")) AND NOT ('etancheite' = ANY("specialites"));
