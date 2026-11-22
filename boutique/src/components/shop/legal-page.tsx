import { notFound } from "next/navigation";
import { formatDate } from "@/lib/format";
import { renderRichText } from "@/lib/rich-text";
import { getLegalPage, getSettings } from "@/lib/server/cached";

export async function LegalPage({ slug }: { slug: "mentions-legales" | "cgv" | "confidentialite" | "livraison-retours" }) {
  const [page, s] = await Promise.all([getLegalPage(slug), getSettings()]);
  if (!page) notFound();
  const missing = "[À COMPLÉTER]";
  return (
    <article className="container-page max-w-3xl py-10 sm:py-14">
      <h1 className="text-4xl sm:text-5xl">{page.title}</h1>
      <p className="mt-2 text-sm text-text-2">Mise à jour le {formatDate(page.updated_at)}</p>
      <div className="prose-shop mt-8">
        {slug === "mentions-legales" && (
          <>
            <h2>Éditrice du site</h2>
            <div>
              <p className="!mb-1 font-semibold">{s.shopName}</p>
              {renderRichText(
                [
                  s.legal.name || `${missing} Nom ou raison sociale`,
                  s.legal.status || `${missing} Statut juridique`,
                  s.legal.address || `${missing} Adresse`,
                  `SIRET : ${s.legal.siret || missing}`,
                  s.legal.registration,
                  s.legal.vatNumber && `N° de TVA : ${s.legal.vatNumber}`,
                  `Contact : ${s.contactEmail || missing}`,
                  `Directeur·rice de la publication : ${s.legal.publisher || missing}`,
                ]
                  .filter(Boolean)
                  .join("\n"),
              )}
            </div>
            <h2>Hébergement</h2>
            {renderRichText(s.legal.host || `${missing} Nom, adresse et téléphone de l'hébergeur du site`)}
            <h2>Médiation de la consommation</h2>
            {renderRichText(s.legal.mediator || `${missing} Coordonnées du médiateur de la consommation`)}
          </>
        )}
        {renderRichText(page.body)}
      </div>
    </article>
  );
}
