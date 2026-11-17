"use client";

import { Briefcase, CalendarDays, Wrench } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * « ENTRE PROS » (Greg, 16 novembre 2026) : le site de l'artisan a deux niveaux. Un visiteur ne voit que le site ; une
 * entreprise CONNECTÉE à Mobiiz (missions ouvertes) voit en plus ce bloc : disponibilité publiée, compétences, « Proposer
 * une mission ». Le bloc ne vient QUE du serveur, après la connexion vérifiée : la page publique (mise en cache, la même
 * pour tous) n'en contient rien. Ni CV, ni diplôme, ni attestation : ils s'échangent dans la discussion de Mission.
 */
interface EntreProsVue {
  mienne: boolean;
  entrepriseId: string;
  competences: string[];
  services: string | null;
  disponibilite: { annonceId: string; du: string; au: string | null } | null;
}

function date(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(new Date(`${iso}T12:00:00Z`));
}

export function EntrePros({ adresse }: { adresse: string }) {
  const [vue, setVue] = useState<EntreProsVue | null>(null);
  useEffect(() => {
    const c = new AbortController();
    fetch(`/v1/pages-entreprises/${encodeURIComponent(adresse)}/entre-pros`, { credentials: "same-origin", cache: "no-store", signal: c.signal })
      .then((r) => (r.ok ? (r.json() as Promise<EntreProsVue>) : null))
      .then((v) => setVue(v))
      .catch(() => undefined);
    return () => c.abort();
  }, [adresse]);
  // Arrivé depuis Mission (`#entre-pros`) : le bloc apparaît après la page, on l'amène à l'écran.
  useEffect(() => {
    if (vue && window.location.hash === "#entre-pros") document.getElementById("entre-pros")?.scrollIntoView({ block: "start" });
  }, [vue]);
  if (!vue) return null;
  const d = vue.disponibilite;
  return (
    <section id="entre-pros" className="pe-entre-pros" aria-labelledby="pe-t-entre-pros">
      <div className="pe-cadre">
        <div className="pe-ep-carte">
          <p className="pe-ep-etiquette">
            <Briefcase size={15} strokeWidth={2.4} aria-hidden="true" /> Entre pros
          </p>
          <h2 id="pe-t-entre-pros">{vue.mienne ? "Ce que voient les entreprises connectées" : "Besoin de renfort sur un chantier ?"}</h2>
          <p className="pe-ep-note">Visible seulement par les entreprises connectées à Mobiiz. Vos clients ne voient pas ce bloc.</p>
          <div className="pe-ep-grille">
            <div>
              <h3>
                <CalendarDays size={18} aria-hidden="true" /> Disponibilités
              </h3>
              <p>{d ? `Disponible ${d.au ? `du ${date(d.du)} au ${date(d.au)}` : `à partir du ${date(d.du)}`}.` : "Pas de disponibilité publiée en ce moment."}</p>
            </div>
            {vue.competences.length || vue.services ? (
              <div>
                <h3>
                  <Wrench size={18} aria-hidden="true" /> Compétences
                </h3>
                {vue.competences.length ? (
                  <ul className="pe-ep-competences">
                    {vue.competences.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                ) : null}
                {vue.services ? <p className="pe-ep-services">{vue.services}</p> : null}
              </div>
            ) : null}
          </div>
          <div className="pe-ep-actions">
            {!vue.mienne && d ? (
              <Link href={`/missions/${d.annonceId}`} className="pe-btn pe-btn-appel">
                Proposer une mission
              </Link>
            ) : null}
            {!vue.mienne && !d ? (
              <Link href="/missions/nouvelle" className="pe-btn pe-btn-appel">
                Publier une mission
              </Link>
            ) : null}
            <Link href={vue.mienne ? "/compte/profil-public" : "/missions"} className="pe-btn pe-btn-second">
              {vue.mienne ? "Modifier mon profil Mission" : "Revenir aux missions"}
            </Link>
          </div>
          <p className="pe-ep-note">Mobiiz fait uniquement la mise en relation. Contrat, assurances et attestations : vous les échangez entre vous, dans la discussion de Mission.</p>
        </div>
      </div>
    </section>
  );
}
