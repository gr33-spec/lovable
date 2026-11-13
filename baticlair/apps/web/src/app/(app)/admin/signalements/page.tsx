"use client";

import { useCallback, useState } from "react";
import { PorteAdmin } from "@/components/admin-achat-groupe";
import { BackButton, Button, Card, ErrorNotice, INPUT, PageTitle, Spinner } from "@/components/ui";
import { api, getActiveCompanyId, messageErreur } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

type Statut = "nouveau" | "en_cours" | "corrige";
interface Signalement {
  id: string;
  createdAt: string;
  statut: Statut;
  origine: string;
  page: string;
  message: string;
  email: string | null;
  contexte: string | null;
  capture: boolean;
  resume: string | null;
  gravite: "bloquant" | "genant" | "detail" | null;
  correctionValidee: string | null;
  corrigeLe: string | null;
  mailCorrigeLe: string | null;
}
const STATUTS: { id: Statut; libelle: string }[] = [
  { id: "nouveau", libelle: "Nouveau" },
  { id: "en_cours", libelle: "En cours" },
  { id: "corrige", libelle: "Corrigé" },
];
const ORIGINES: Record<string, string> = { artisan: "Artisan", negoce: "Négoce", public: "Page publique" };
const quand = (iso: string) => new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * LES SIGNALEMENTS (Greg, 13 novembre 2026) : la liste par statut (nouveau, en cours, corrigé), la page et la capture
 * jointes, le résumé du réparateur, « Valider la correction » (rien n'est corrigé avant), puis « Marquer corrigé », qui
 * envoie « C'est corrigé, merci » à l'utilisateur.
 */
export default function AdminSignalementsPage() {
  return (
    <div className="flex flex-col gap-5">
      <BackButton fallback="/admin/pilotage" />
      <PageTitle>Signalements</PageTitle>
      <PorteAdmin>
        <Liste />
      </PorteAdmin>
    </div>
  );
}

function Liste() {
  const [statut, setStatut] = useState<Statut | null>(null);
  const charger = useCallback((signal: AbortSignal) => api<{ signalements: Signalement[]; comptes: Record<Statut, number> }>(`/v1/admin/signalements${statut ? `?statut=${statut}` : ""}`, { signal }), [statut]);
  const { data, error, reload } = useResource(charger);
  if (error) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <Spinner />;
  return (
    <>
      <div role="group" aria-label="Filtrer par statut" className="flex flex-wrap gap-2">
        <button type="button" aria-pressed={statut === null} onClick={() => setStatut(null)} className={`min-h-11 rounded-full border px-4 text-[15px] font-semibold ${statut === null ? "border-ink bg-ink text-white" : "border-line"}`}>
          Tous
        </button>
        {STATUTS.map((s) => (
          <button key={s.id} type="button" aria-pressed={statut === s.id} onClick={() => setStatut(s.id)} className={`min-h-11 rounded-full border px-4 text-[15px] font-semibold ${statut === s.id ? "border-ink bg-ink text-white" : "border-line"}`}>
            {s.libelle} · {data.comptes[s.id]}
          </button>
        ))}
      </div>
      {data.signalements.length === 0 ? (
        <Card className="p-5 text-[16px]">Aucun signalement ici.</Card>
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Signalements">
          {data.signalements.map((s) => (
            <li key={s.id}>
              <Ligne s={s} onFait={reload} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Ligne({ s, onFait }: { s: Signalement; onFait: () => void }) {
  const [resume, setResume] = useState(s.resume ?? "");
  const [gravite, setGravite] = useState(s.gravite ?? "");
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  async function suivre(geste: string, body: Record<string, unknown>) {
    setErreur(null);
    setEnvoi(geste);
    try {
      await api(`/v1/admin/signalements/${s.id}`, { method: "PUT", body });
      onFait();
    } catch (e) {
      setErreur(messageErreur(e, { correction_non_validee: "Valide d'abord la correction proposée." }));
    } finally {
      setEnvoi(null);
    }
  }
  async function voirLaCapture() {
    const companyId = getActiveCompanyId();
    const r = await fetch(`/v1/admin/signalements/${s.id}/capture`, { headers: companyId ? { "x-company-id": companyId } : {}, credentials: "same-origin" }).catch(() => null);
    if (r?.ok) setImage(URL.createObjectURL(await r.blob()));
    else setErreur("La capture ne s'ouvre pas.");
  }
  const libelleStatut = STATUTS.find((x) => x.id === s.statut)?.libelle ?? s.statut;
  return (
    <Card className="flex flex-col gap-3 p-5" aria-label={`Signalement du ${quand(s.createdAt)}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-muted">
        <span className="rounded-full border border-line px-3 py-1 text-[13px] font-bold text-ink">{libelleStatut}</span>
        <span>{quand(s.createdAt)}</span>
        <span>{ORIGINES[s.origine] ?? s.origine}</span>
        {s.email ? <span>{s.email}</span> : <span>sans e-mail</span>}
      </div>
      <p className="text-[15px] font-semibold break-all">Page : {s.page}</p>
      <p className="text-[16px] whitespace-pre-wrap">{s.message}</p>
      {s.contexte ? <p className="text-[13px] text-muted break-all">{s.contexte}</p> : null}
      {s.capture ? (
        image ? (
          // eslint-disable-next-line @next/next/no-img-element -- une image protégée, lue avec la session de l'admin
          <img src={image} alt="Capture d'écran du signalement" className="max-h-[70vh] w-auto self-start rounded-xl border border-line" />
        ) : (
          <button type="button" onClick={() => void voirLaCapture()} className="min-h-11 self-start text-[15px] font-semibold text-accent-text underline">
            Voir la capture d&apos;écran
          </button>
        )
      ) : (
        <p className="text-[14px] text-muted">Pas de capture d&apos;écran.</p>
      )}
      <label htmlFor={`resume-${s.id}`} className="text-[15px] font-semibold">
        Résumé du réparateur (ce qui se passe, pourquoi, la correction proposée)
      </label>
      <textarea id={`resume-${s.id}`} value={resume} onChange={(e) => setResume(e.target.value)} rows={4} maxLength={5000} className={`${INPUT} py-3`} />
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Gravité" value={gravite} onChange={(e) => setGravite(e.target.value as typeof gravite)} className={INPUT}>
          <option value="">Gravité à estimer</option>
          <option value="bloquant">Bloquant</option>
          <option value="genant">Gênant</option>
          <option value="detail">Détail</option>
        </select>
        <Button variant="ink" disabled={envoi !== null || resume.trim().length === 0} onClick={() => void suivre("resume", { resume, ...(gravite ? { gravite } : {}) })}>
          {envoi === "resume" ? "Enregistrement…" : "Enregistrer le résumé"}
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
        {s.statut === "nouveau" ? (
          <Button variant="ink" disabled={envoi !== null} onClick={() => void suivre("en_cours", { statut: "en_cours" })}>
            Passer en cours
          </Button>
        ) : null}
        {s.correctionValidee ? (
          <span className="text-[15px] font-semibold">Correction validée le {quand(s.correctionValidee)}</span>
        ) : s.statut !== "corrige" ? (
          <Button variant="ink" disabled={envoi !== null} onClick={() => void suivre("valider", { validerLaCorrection: true })}>
            Valider la correction
          </Button>
        ) : null}
        {s.statut !== "corrige" ? (
          <Button variant="ink" disabled={envoi !== null || !s.correctionValidee} onClick={() => void suivre("corrige", { statut: "corrige" })}>
            Marquer corrigé
          </Button>
        ) : (
          <span className="text-[15px]">{s.mailCorrigeLe ? `« C'est corrigé, merci » envoyé le ${quand(s.mailCorrigeLe)}.` : "Corrigé (pas d'e-mail à prévenir)."}</span>
        )}
      </div>
      {s.statut !== "corrige" && !s.correctionValidee ? <p className="text-[14px] text-muted">« Marquer corrigé » envoie l&apos;e-mail à l&apos;utilisateur : valide d&apos;abord la correction, puis marque-la une fois en ligne.</p> : null}
      {erreur ? (
        <p role="alert" className="text-[15px] font-semibold text-[#a3261a]">
          {erreur}
        </p>
      ) : null}
    </Card>
  );
}
