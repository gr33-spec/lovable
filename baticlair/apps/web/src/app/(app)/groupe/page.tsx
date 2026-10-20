"use client";

import Link from "next/link";
import { Check, FileText, Store, Tag, Truck, Users } from "lucide-react";
import { useCallback, useState } from "react";
import { Button, ButtonLink, Card, ErrorNotice, PageTitle, Spinner } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

interface EtatGroupe {
  eligible: boolean;
  siret: { renseigne: boolean; verifie: boolean };
  etapes: { siret: boolean; devis: boolean; negoces: boolean };
}
interface BesoinLot {
  id: string;
  designation: string;
  quantite: string;
  unite: string;
  statut: "en_attente" | "signe" | "retire" | "engage" | "commande" | "livre";
  projectId: string;
  chantier: string;
  lot: { numero: number; statut: string } | null;
  offre: { prixUnitaire: string; negoce: string; dateLivraison: string | null } | null;
}

const STATUT_LOT: Record<string, string> = {
  ouvert: "Lot ouvert, en attente d'autres artisans",
  forme: "Lot formé, demande en préparation",
  envoye: "Demande partie aux négoces, réponses sous 7 jours",
  choisi: "Négoce retenu",
  clos: "Lot clos sans offre",
  annule: "Lot annulé",
};

/**
 * L'ONGLET « GROUPÉ » (demande du fondateur, 2026-10-20) : visible même sans SIRET ni devis. Une phrase et trois étapes
 * illustrées disent ce que ça fait (section 2 du parcours groupé) ; puis ce qui manque pour en profiter, coché au fur et
 * à mesure ; tout rempli, « Mes lots ».
 */
export default function GroupePage() {
  const fetchEtat = useCallback((signal: AbortSignal) => api<EtatGroupe>("/v1/groupe", { signal }), []);
  const etat = useResource(fetchEtat);
  const [pending, setPending] = useState(false);
  const [siretErreur, setSiretErreur] = useState<string | null>(null);

  if (etat.error && !etat.data) return <ErrorNotice error={etat.error} onRetry={etat.reload} />;
  if (!etat.data) return <Spinner />;
  const { etapes, siret } = etat.data;
  const tout = etapes.siret && etapes.devis && etapes.negoces;

  async function verifierSiret() {
    setPending(true);
    setSiretErreur(null);
    try {
      const r = await api<{ verifie: boolean; statut: string }>("/v1/groupe/siret", { method: "POST" });
      if (!r.verifie) setSiretErreur(r.statut === "ferme" ? "Ce SIRET est fermé à l'INSEE." : r.statut === "inconnu" ? "Ce SIRET est inconnu à l'INSEE : vérifie-le dans Compte." : "La vérification est indisponible pour l'instant, réessaie plus tard.");
      etat.reload();
    } catch (e) {
      setSiretErreur(e instanceof ApiError && e.reason === "siret_invalide" ? "Ce SIRET n'a pas 14 chiffres valides : corrige-le dans Compte." : "La vérification n'a pas abouti, réessaie dans un instant.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <PageTitle>Groupé</PageTitle>
      <Card className="flex flex-col gap-4 p-4">
        <p className="text-[17px] leading-snug font-extrabold">Tes commandes d&apos;ardoise regroupées avec les autres couvreurs du département, un seul négoce, un seul prix.</p>
        <ol aria-label="Comment ça marche" className="grid grid-cols-3 gap-2">
          {[
            { icon: FileText, titre: "1. Tu proposes", texte: "Une ligne de ta liste, une fenêtre de livraison, « chantier signé »." },
            { icon: Users, titre: "2. On regroupe", texte: "Même référence, même département : un seul lot, un seul négoce." },
            { icon: Tag, titre: "3. Tu commandes", texte: "À ton prix groupé, sur ton compte, livré sur ton chantier." },
          ].map((e) => (
            <li key={e.titre} className="flex flex-col gap-1.5 rounded-2xl bg-ground p-3">
              <e.icon size={22} aria-hidden="true" className="text-accent-text" />
              <span className="text-[13px] font-extrabold">{e.titre}</span>
              <span className="text-[12px] leading-snug text-muted">{e.texte}</span>
            </li>
          ))}
        </ol>
        <p className="text-[13px] text-muted">Gratuit pour toi. Personne ne voit ton nom ni tes chantiers.</p>
      </Card>

      {tout ? (
        <MesLots />
      ) : (
        <Card className="flex flex-col gap-3 p-4">
          <h2 className="font-display text-xl font-extrabold">Pour en profiter</h2>
          <ul aria-label="Ce qui manque" className="flex flex-col gap-2">
            <Etape fait={etapes.siret} titre="Renseigne ton SIRET">
              {siret.renseigne ? (
                <div className="flex flex-col gap-1">
                  <Button variant="secondary" className="min-h-10 self-start px-3.5 text-[14px]" pending={pending} onClick={verifierSiret}>
                    Vérifier mon SIRET
                  </Button>
                  {siretErreur ? <p className="text-[13px] font-semibold text-warn">{siretErreur}</p> : null}
                </div>
              ) : (
                <ButtonLink href="/compte" variant="secondary" className="min-h-10 self-start px-3.5 text-[14px]">
                  Compte
                </ButtonLink>
              )}
            </Etape>
            <Etape fait={etapes.devis} titre="Dépose un devis">
              <ButtonLink href="/chantiers/nouveau" variant="secondary" className="min-h-10 self-start px-3.5 text-[14px]">
                Nouveau chantier
              </ButtonLink>
            </Etape>
            <Etape fait={etapes.negoces} titre="Ajoute tes négoces">
              <ButtonLink href="/fournisseurs" variant="secondary" className="min-h-10 self-start px-3.5 text-[14px]">
                Fournisseurs
              </ButtonLink>
            </Etape>
          </ul>
        </Card>
      )}
    </>
  );
}

function Etape({ fait, titre, children }: { fait: boolean; titre: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 rounded-2xl bg-ground p-3">
      <span
        aria-label={fait ? "Fait" : "À faire"}
        className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full ${fait ? "bg-mark-ok text-white" : "border-2 border-mark-warn bg-surface"}`}
      >
        {fait ? <Check size={14} strokeWidth={3} aria-hidden="true" /> : null}
      </span>
      <div className="flex min-w-0 grow flex-col gap-2">
        <span className={`text-[15px] font-bold ${fait ? "text-muted line-through" : ""}`}>{titre}</span>
        {fait ? null : children}
      </div>
    </li>
  );
}

function MesLots() {
  const fetchLots = useCallback((signal: AbortSignal) => api<{ besoins: BesoinLot[] }>("/v1/groupe/lots", { signal }), []);
  const { data, error, reload } = useResource(fetchLots);
  if (error && !data) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <Spinner />;
  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="font-display text-xl font-extrabold">Mes lots</h2>
      {data.besoins.length === 0 ? (
        <p className="text-[15px] font-semibold text-muted">Aucun lot pour l&apos;instant, propose un chantier au groupé.</p>
      ) : (
        <ul aria-label="Mes lots" className="flex flex-col gap-2">
          {data.besoins.map((b) => (
            <li key={b.id} className="flex flex-col gap-1 rounded-2xl bg-ground p-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 text-[15px] font-bold">{b.designation}</span>
                <span className="shrink-0 text-[15px] font-extrabold">{`${b.quantite.replace(".", ",")} ${b.unite}`}</span>
              </div>
              <Link href={`/chantiers/${encodeURIComponent(b.projectId)}`} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent-text underline decoration-dotted underline-offset-4">
                <Store size={14} aria-hidden="true" />
                {b.chantier}
              </Link>
              <p className="text-[13px] font-semibold text-muted">
                {b.lot ? `Lot n° ${b.lot.numero} · ${STATUT_LOT[b.lot.statut] ?? b.lot.statut}` : "En attente du prochain lot"}
                {b.statut === "en_attente" ? " · devis en attente (volume probable)" : ""}
              </p>
              {b.offre ? (
                <p className="inline-flex items-center gap-1.5 text-[14px] font-extrabold text-ok">
                  <Truck size={14} aria-hidden="true" />
                  {Number(b.offre.prixUnitaire).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} € HT l&apos;unité chez {b.offre.negoce}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
