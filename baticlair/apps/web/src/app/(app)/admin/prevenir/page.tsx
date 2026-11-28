"use client";

import { useCallback, useEffect, useState } from "react";
import { Send } from "lucide-react";
import { PorteAdmin } from "@/components/admin-achat-groupe";
import { BackButton, Button, Card, ErrorNotice, INPUT, PageTitle, Spinner } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { METIERS_INSCRIPTION } from "@/lib/metiers-inscription";
import { useResource } from "@/lib/use-resource";
import { DEPARTEMENTS } from "../../../../../../../packages/domain/src/groupe/geographie";

interface Apercu {
  metier: string;
  departements: { code: string; nom: string; dejaOuvert: boolean }[];
  nombre: number;
  dejaPrevenus: number;
  desinscrits: number;
  sansDepartement: number;
  parDepartement: { code: string; nom: string; nombre: number }[];
  sujet: string;
  texte: string;
  public: string;
}
interface Annonce {
  id: string;
  metier: string;
  public: string;
  departements: { code: string; nom: string }[];
  auteur: string;
  le: string;
  termineeLe: string | null;
  total: number;
  envoyes: number;
  aEnvoyer: number;
  echecs: number;
  annules: number;
}
interface Lot {
  envoyes: number;
  echecs: number;
  annules: number;
  restants: number;
}
const quand = (iso: string) => new Date(iso).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const personnes = (n: number) => `${n} personne${n > 1 ? "s" : ""}`;
const lesMetiers = (metier: string) => `les ${METIERS_INSCRIPTION.find((m) => m.id === metier)?.pluriel ?? "artisans"}`;

/**
 * « PRÉVENIR LES INSCRITS » (chantier 05, Greg, 28 novembre 2026) : un métier, un ou plusieurs départements ; combien de
 * personnes seront prévenues et l'e-mail tel qu'il partira ; puis la confirmation (sur ce nombre). L'envoi part par petits
 * lots, chaque inscrit une seule fois ; le journal dit ce qui est parti. Confirmer ouvre aussi Mobiiz pour ce métier dans
 * ces départements (rien ne change aux achats groupés).
 */
export default function AdminPrevenir() {
  return (
    <div className="flex flex-col gap-5">
      <BackButton fallback="/admin/liste-attente" />
      <PageTitle>Prévenir les inscrits</PageTitle>
      <PorteAdmin>
        <Prevenir />
      </PorteAdmin>
    </div>
  );
}

function Prevenir() {
  const [metier, setMetier] = useState("");
  const [deps, setDeps] = useState<string[]>([]);
  const [apercu, setApercu] = useState<Apercu | null>(null);
  const [erreur, setErreur] = useState<ApiError | null>(null);
  const [confirmer, setConfirmer] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState<{ id: string; total: number; envoyes: number; echecs: number; restants: number; enCours: boolean } | null>(null);
  const charger = useCallback((s: AbortSignal) => api<{ annonces: Annonce[] }>("/v1/admin/annonces", { signal: s }), []);
  const { data: journal, reload } = useResource(charger);

  useEffect(() => {
    if (!metier) return;
    const c = new AbortController();
    api<Apercu>(`/v1/admin/annonces/apercu?metier=${metier}&departements=${deps.join(",")}`, { signal: c.signal }).then(
      (a) => {
        setApercu(a);
        setErreur(null);
      },
      (e) => !c.signal.aborted && setErreur(e instanceof ApiError ? e : new ApiError("internal_error", 500)),
    );
    return () => c.abort();
  }, [metier, deps]);

  const basculer = (code: string) => {
    setConfirmer(false);
    setDeps((d) => (d.includes(code) ? d.filter((x) => x !== code) : [...d, code]));
  };

  /** Les lots, l'un après l'autre, jusqu'au bout ; un refus arrête et laisse « Reprendre l'envoi ». */
  async function envoyerLesLots(id: string, total: number) {
    let cumul = { envoyes: 0, echecs: 0 };
    setEnvoi({ id, total, envoyes: 0, echecs: 0, restants: total, enCours: true });
    for (;;) {
      let r: Lot;
      try {
        r = await api<Lot>(`/v1/admin/annonces/${id}/lot`, { method: "POST" });
      } catch (e) {
        setErreur(e instanceof ApiError ? e : new ApiError("internal_error", 500));
        break;
      }
      cumul = { envoyes: cumul.envoyes + r.envoyes, echecs: cumul.echecs + r.echecs };
      setEnvoi({ id, total, ...cumul, restants: r.restants, enCours: r.restants > 0 });
      if (r.restants === 0 || r.envoyes + r.echecs + r.annules === 0) break;
    }
    setEnvoi((e) => (e ? { ...e, enCours: false } : e));
    reload();
  }

  async function confirmerEnvoi() {
    if (!apercu) return;
    setErreur(null);
    setMessage(null);
    try {
      const a = await api<{ id: string; total: number }>("/v1/admin/annonces", { method: "POST", body: { metier, departements: deps, nombre: apercu.nombre } });
      setConfirmer(false);
      await envoyerLesLots(a.id, a.total);
      setDeps([]);
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError("internal_error", 500);
      if (err.reason === "nombre_change") {
        setConfirmer(false);
        setMessage("Le nombre de personnes a changé depuis l'aperçu. Vérifie le nouveau nombre, puis confirme.");
        setDeps((d) => [...d]);
      } else setErreur(err);
    }
  }

  const proposes = apercu?.parDepartement ?? [];
  const autres = DEPARTEMENTS.filter((d) => !proposes.some((p) => p.code === d.code));

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-4 p-4">
        <label className="flex flex-col gap-1.5 text-[15px] font-semibold">
          Métier
          <select
            className={INPUT}
            value={metier}
            onChange={(e) => {
              setMetier(e.target.value);
              setDeps([]);
              setApercu(null);
              setConfirmer(false);
            }}
          >
            <option value="">Choisis un métier</option>
            {METIERS_INSCRIPTION.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nom}
              </option>
            ))}
          </select>
        </label>

        {metier && apercu ? (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-[15px] font-semibold">Départements</legend>
            {proposes.length ? (
              <div className="flex flex-wrap gap-2">
                {proposes.map((d) => (
                  <label key={d.code} className={`pressable inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-[15px] font-semibold ${deps.includes(d.code) ? "border-ink bg-ink text-white" : "border-line bg-surface"}`}>
                    <input type="checkbox" className="sr-only" checked={deps.includes(d.code)} onChange={() => basculer(d.code)} />
                    {d.code} · {d.nom} <span className="tabular-nums opacity-80">({d.nombre})</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-[15px] text-muted">Personne n&apos;est encore inscrit pour ce métier.</p>
            )}
            <select className={INPUT} value="" aria-label="Ajouter un autre département" onChange={(e) => e.target.value && basculer(e.target.value)}>
              <option value="">Ajouter un autre département…</option>
              {autres.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.code} · {d.nom}
                </option>
              ))}
            </select>
            {deps.filter((c) => !proposes.some((p) => p.code === c)).length ? (
              <p className="text-[14px] text-muted">
                Aussi : {deps.filter((c) => !proposes.some((p) => p.code === c)).join(", ")}{" "}
                <button type="button" className="font-semibold underline" onClick={() => setDeps((d) => d.filter((c) => proposes.some((p) => p.code === c)))}>
                  retirer
                </button>
              </p>
            ) : null}
          </fieldset>
        ) : null}
      </Card>

      {message ? (
        <p role="status" className="rounded-2xl bg-warn-bg p-4 text-[15px] font-semibold">
          {message}
        </p>
      ) : null}
      {erreur ? <ErrorNotice error={erreur} /> : null}

      {envoi ? (
        <Card className="flex flex-col gap-2 p-4" aria-live="polite">
          <p className="text-[17px] font-extrabold">
            {envoi.enCours ? "Envoi en cours…" : envoi.restants === 0 ? "Envoi terminé" : "Envoi arrêté"}
          </p>
          <p className="text-[15px]">
            <strong className="tabular-nums">{envoi.envoyes}</strong> sur <strong className="tabular-nums">{envoi.total}</strong> envoyés
            {envoi.echecs ? `, ${envoi.echecs} en échec` : ""}.
          </p>
        </Card>
      ) : null}

      {metier && apercu && deps.length ? (
        <section className="flex flex-col gap-3" aria-labelledby="t-apercu">
          <h2 id="t-apercu" className="text-[20px] font-extrabold">
            Aperçu
          </h2>
          <Card className="flex flex-col gap-1 p-4 text-[15px]">
            <p className="text-[18px]">
              <strong className="tabular-nums">{personnes(apercu.nombre)}</strong> {apercu.nombre > 1 ? "seront prévenues, une seule fois chacune." : "sera prévenue, une seule fois."}
            </p>
            {apercu.departements.some((d) => d.dejaOuvert) ? (
              <p className="text-muted">Déjà ouvert : {apercu.departements.filter((d) => d.dejaOuvert).map((d) => `${d.code} · ${d.nom}`).join(", ")}.</p>
            ) : null}
            <p className="text-muted">
              Déjà prévenues : {apercu.dejaPrevenus} · Désinscrites : {apercu.desinscrits} · Sans département (non prévenues) : {apercu.sansDepartement}
            </p>
          </Card>
          <Card className="flex flex-col gap-2 p-4">
            <p className="text-[14px] font-semibold text-muted">L&apos;e-mail, tel qu&apos;il partira</p>
            <p className="text-[16px] font-extrabold">{apercu.sujet}</p>
            <pre className="font-sans text-[15px] leading-relaxed whitespace-pre-wrap">{apercu.texte}</pre>
            <p className="text-[13px] text-muted">Chaque personne reçoit son propre lien de désinscription. Le logo et le pied légal de Mobiiz sont ajoutés à l&apos;envoi.</p>
          </Card>
          {confirmer ? (
            <Card className="flex flex-col gap-3 border-2 border-ink p-4">
              <p className="text-[16px] font-bold">
                Tu confirmes ? Mobiiz s&apos;ouvre pour {lesMetiers(metier)} ({apercu.departements.map((d) => `${d.code} ${d.nom}`).join(", ")}) et{" "}
                {apercu.nombre ? `${personnes(apercu.nombre)} reçoivent l'e-mail.` : "personne n'est à prévenir."}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void confirmerEnvoi()} disabled={!!envoi?.enCours}>
                  <Send size={17} aria-hidden="true" /> Confirmer l&apos;envoi
                </Button>
                <Button variant="secondary" onClick={() => setConfirmer(false)}>
                  Annuler
                </Button>
              </div>
            </Card>
          ) : (
            <Button className="self-start" onClick={() => setConfirmer(true)} disabled={!!envoi?.enCours}>
              Prévenir {personnes(apercu.nombre)}
            </Button>
          )}
        </section>
      ) : null}

      <section className="flex flex-col gap-2" aria-labelledby="t-journal">
        <h2 id="t-journal" className="text-[20px] font-extrabold">
          Annonces déjà faites
        </h2>
        {!journal ? (
          <Spinner />
        ) : journal.annonces.length === 0 ? (
          <p className="text-[15px] text-muted">Aucune pour l&apos;instant.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {journal.annonces.map((a) => (
              <LigneAnnonce key={a.id} a={a} onReprendre={() => void envoyerLesLots(a.id, a.total)} onRelancer={async () => {
                await api(`/v1/admin/annonces/${a.id}/echecs`, { method: "POST" }).catch(() => undefined);
                await envoyerLesLots(a.id, a.total);
              }} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function LigneAnnonce({ a, onReprendre, onRelancer }: { a: Annonce; onReprendre: () => void; onRelancer: () => Promise<void> }) {
  const [envois, setEnvois] = useState<{ destinataire: string; departement: string | null; statut: string; envoyeLe: string | null; erreur: string | null }[] | null>(null);
  return (
    <li>
      <Card className="flex flex-col gap-1 p-4 text-[15px]">
        <span className="font-bold">
          {lesMetiers(a.metier).replace(/^l/, "L")} · {a.departements.map((d) => `${d.code} ${d.nom}`).join(", ")}
        </span>
        <span className="text-muted">
          {quand(a.le)} · par {a.auteur}
        </span>
        <span>
          <strong className="tabular-nums">{a.envoyes}</strong> sur {a.total} envoyés
          {a.aEnvoyer ? ` · ${a.aEnvoyer} à envoyer` : ""}
          {a.echecs ? ` · ${a.echecs} en échec` : ""}
          {a.annules ? ` · ${a.annules} annulés (désinscrits)` : ""}
        </span>
        <div className="flex flex-wrap gap-x-4">
          {a.aEnvoyer ? (
            <button type="button" className="flex min-h-11 items-center font-semibold underline underline-offset-4" onClick={onReprendre}>
              Reprendre l&apos;envoi
            </button>
          ) : null}
          {a.echecs ? (
            <button type="button" className="flex min-h-11 items-center font-semibold underline underline-offset-4" onClick={() => void onRelancer()}>
              Réessayer les échecs
            </button>
          ) : null}
          {a.total ? (
            <button
              type="button"
              className="flex min-h-11 items-center font-semibold underline underline-offset-4"
              onClick={() => (envois ? setEnvois(null) : void api<{ envois: NonNullable<typeof envois> }>(`/v1/admin/annonces/${a.id}/journal`).then((r) => setEnvois(r.envois), () => setEnvois([])))}
            >
              {envois ? "Masquer le journal" : "Voir le journal"}
            </button>
          ) : null}
        </div>
        {envois ? (
          <ul className="mt-1 divide-y divide-line text-[14px]">
            {envois.map((e, i) => (
              <li key={i} className="flex flex-wrap justify-between gap-2 py-2">
                <span>
                  {e.destinataire} · {e.departement ?? "?"}
                </span>
                <span className="text-muted">
                  {e.statut === "envoye" ? `Envoyé ${e.envoyeLe ? quand(e.envoyeLe) : ""}` : e.statut === "echec" ? `Échec${e.erreur ? ` : ${e.erreur}` : ""}` : e.statut === "annule" ? "Annulé (désinscrit)" : "À envoyer"}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </Card>
    </li>
  );
}
