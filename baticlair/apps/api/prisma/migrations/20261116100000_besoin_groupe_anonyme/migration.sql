-- Greg, 16 novembre 2026 : dans un achat groupé, les noms des entreprises sont visibles (jamais la quantité de chacune),
-- et chaque artisan peut cocher « rester anonyme ».
-- Les besoins DÉJÀ publiés l'ont été sous la règle « jamais de nom » : ils restent anonymes (défaut vrai à l'ajout de la
-- colonne), seuls les nouveaux besoins montrent le nom de l'entreprise (défaut faux ensuite).
-- Additive (une colonne, aucune donnée existante modifiée). Retour arrière :
--   ALTER TABLE "besoin_groupe_v1" DROP COLUMN "anonyme";
ALTER TABLE "besoin_groupe_v1" ADD COLUMN "anonyme" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "besoin_groupe_v1" ALTER COLUMN "anonyme" SET DEFAULT false;
