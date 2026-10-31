"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { CodeAdmin } from "@/components/code-admin";
import { Badge, Button, Card, ErrorNotice, Field, SectionTitle, Spinner } from "@/components/ui";
import { api, ApiError, messageErreur } from "@/lib/api";
import { dateFr, eurosHt, quantite, type AdminAchat, type AdminAchats } from "@/lib/achat-groupe";
import { useResource } from "@/lib/use-resource";

/**
 * L'ADMIN DES ACHATS GROUPÉS PAR MÉTIER (Greg, 27 octobre 2026, 2e message) : la porte (admin et double authentification),
 * la liste (à valider, IA suivie sans correction, lignes corrigées par source, suivi des achats publiés, sans réponse,
 * sorties, exclus, comptes suspects, volume minimum) et l'écran de validation d'un achat (points 14 à 16, 28, 32).
 */
const asError = (e: unknown) => (e instanceof ApiError ? e : new ApiError("internal_error", 500));

export function PorteAdmin({ children }: { children: React.ReactNode }) {
  const [statut, setStatut] = useState<{ admin: boolean; deuxFacteurs: boolean } | null>(null);
  const [erreur, setErreur] = useState<ApiError | null>(null);
  useEffect(() => {
    const c = new AbortController();
    api<{ admin: boolean; deuxFacteurs: boolean }>("/v1/admin/pilotage/statut", { signal: c.signal }).then(setStatut, (e: unknown) => setErreur(asError(e)));
    return () => c.abort();
  }, []);
  if (erreur) return <ErrorNotice error={erreur} />;
  if (!statut) return <Spinner />;
  if (!statut.admin) return <Card className="p-5 text-[16px]">Cette page est réservée à l&apos;équipe Mobiiz.</Card>;
  if (!statut.deuxFacteurs) return <CodeAdmin quoi="l'espace admin" onOk={() => setStatut({ admin: true, deuxFacteurs: true })} />;
  return <>{children}</>;
}

const STATUTS: Record<string, string> = { en_collecte: "Inscriptions", consultation: "Négoces consultés", validation: "À valider", publie: "Publié", pas_assez: "Plan B" };

/** Recette en prévisualisation : clôturer, analyser ou dépasser la date de commande tout de suite (refusé en production). */
async function avancer(id: string, etape: "cloture" | "echeance" | "commande") {
  return api(`/v1/admin/pilotage/achats-groupes/${id}/avancer`, { method: "POST", body: { etape } });
}

export function ListeAdminAchats() {
  const fetcher = useCallback((signal: AbortSignal) => api<AdminAchats>("/v1/admin/pilotage/achats-groupes", { signal }), []);
  const { data, error, reload } = useResource(fetcher);
  const [famille, setFamille] = useState("couverture");
  const [montant, setMontant] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  if (error) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <Spinner />;
  async function geste(f: () => Promise<unknown>, ok: string) {
    try {
      await f();
      setMsg(ok);
      reload();
    } catch (e) {
      setMsg(messageErreur(e));
    }
  }
  return (
    <div className="flex flex-col gap-6">
      {msg ? (
        <p role="status" className="rounded-xl bg-ground p-3 font-semibold">
          {msg}
        </p>
      ) : null}
      <section aria-label="À valider" className="flex flex-col gap-3">
        <SectionTitle>À valider ({data.aValider.length})</SectionTitle>
        {data.aValider.map((a) => (
          <Link key={a.id} href={`/admin/achats-groupes/${a.id}`} className="pressable flex items-center justify-between gap-3 rounded-2xl bg-accent-soft p-4 shadow-card">
            <span className="flex flex-col">
              <span className="font-bold">
                n° {a.numero} · {a.titre}
              </span>
              <span className="text-[14px] text-muted">{a.reponses} négoces ont répondu</span>
            </span>
            <ChevronRight size={20} aria-hidden="true" />
          </Link>
        ))}
      </section>
      <section aria-label="Statistiques" className="grid gap-3 sm:grid-cols-3">
        <Card className="flex flex-col gap-1 p-4">
          <p className="text-[13px] text-muted">Choix de l&apos;IA suivi sans correction</p>
          <p className="text-[24px] font-extrabold">{data.iaSuivie.part === null ? "—" : `${data.iaSuivie.part} %`}</p>
          <p className="text-[13px] text-muted">
            {data.iaSuivie.sansCorrection} sur {data.iaSuivie.publies} achats publiés
          </p>
        </Card>
        {data.correctionsParSource.map((s) => (
          <Card key={s.source} className="flex flex-col gap-1 p-4">
            <p className="text-[13px] text-muted">Lignes corrigées, liste {s.source === "devis" ? "depuis un devis" : "depuis une photo"}</p>
            <p className="text-[24px] font-extrabold">{s.taux === null ? "—" : `${s.taux} %`}</p>
            <p className="text-[13px] text-muted">
              {s.corrigees} sur {s.lignes} lignes
            </p>
          </Card>
        ))}
      </section>
      <section aria-label="Tous les achats" className="flex flex-col gap-3">
        <SectionTitle>Tous les achats ({data.achats.length})</SectionTitle>
        {data.achats.map((a) => (
          <Card key={a.id} className="flex flex-col gap-2 p-4">
            <Link href={`/admin/achats-groupes/${a.id}`} className="flex items-center justify-between gap-2 font-bold underline-offset-2 hover:underline">
              n° {a.numero} · {a.titre}
              <Badge>{STATUTS[a.statut] ?? a.statut}</Badge>
            </Link>
            <p className="text-[14px] text-muted">
              {a.entreprises} entreprise{a.entreprises > 1 ? "s" : ""} · {a.references} références{a.estimeHt !== null ? ` · ≈ ${eurosHt(a.estimeHt)}` : ""} · réponses {a.reponses}
            </p>
            <p className="text-[14px] text-muted">
              Clôture {dateFr(a.clotureLe)} · réponses avant le {dateFr(a.reponseAvantLe)}
              {a.commandeAvantLe ? ` · commande avant le ${dateFr(a.commandeAvantLe)}` : ""}
            </p>
            {a.suivi ? (
              <p className="text-[14px] font-semibold">
                Vu {a.suivi.vus} · abonnés {a.suivi.abonnes} · commandé {a.suivi.commandes} · sortis {a.suivi.sortis} (sur {a.suivi.participants})
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {a.statut === "en_collecte" ? (
                <Button variant="secondary" onClick={() => void geste(() => avancer(a.id, "cloture"), "Clôturé : les listes sont parties chez les négoces.")}>
                  Clôturer maintenant
                </Button>
              ) : null}
              {a.statut === "consultation" ? (
                <Button variant="secondary" onClick={() => void geste(() => avancer(a.id, "echeance"), "Offres analysées : à valider.")}>
                  Analyser maintenant
                </Button>
              ) : null}
              {a.statut === "publie" ? (
                <Button variant="secondary" onClick={() => void geste(() => avancer(a.id, "commande"), "Date de commande passée.")}>
                  Passer la date de commande
                </Button>
              ) : null}
            </div>
          </Card>
        ))}
      </section>
      <section aria-label="Sans réponse" className="flex flex-col gap-3">
        <SectionTitle>Sans réponse 48 h après l&apos;envoi ({data.sansReponse.length})</SectionTitle>
        {data.sansReponse.map((a) => (
          <Card key={a.id} className="flex flex-col gap-2 p-4">
            <p className="font-bold">
              n° {a.numero} · {a.titre}
            </p>
            {a.negoces.map((n) => (
              <p key={n.email} className="text-[15px]">
                {n.nom} · {n.email}
                {n.telephone ? ` · ${n.telephone}` : ""}
              </p>
            ))}
          </Card>
        ))}
      </section>
      <section aria-label="Sorties" className="flex flex-col gap-2">
        <SectionTitle>Sorties ({data.desistements.length})</SectionTitle>
        {data.desistements.map((d) => (
          <p key={d.id} className="text-[15px]">
            {dateFr(d.le)} · {d.entreprise} · {d.achat} · {d.motif}
          </p>
        ))}
      </section>
      <section aria-label="Exclus" className="flex flex-col gap-2">
        <SectionTitle>Exclus des achats groupés ({data.exclus.length})</SectionTitle>
        {data.exclus.map((e) => (
          <p key={e.companyId} className="text-[15px]">
            {e.entreprise} · jusqu&apos;au {dateFr(e.jusquau)}
          </p>
        ))}
      </section>
      <section aria-label="Comptes à surveiller" className="flex flex-col gap-2">
        <SectionTitle>Rejoignent sans jamais commander ({data.suspects.length})</SectionTitle>
        {data.suspects.map((s) => (
          <p key={s.companyId} className="text-[15px]">
            {s.entreprise} · SIRET {s.siret ?? "?"} · NAF {s.naf ?? "?"} · {s.participations} participations, {s.commandes} commandes
          </p>
        ))}
      </section>
      <section aria-label="Volume minimum" className="flex flex-col gap-3">
        <SectionTitle>Volume minimum par famille</SectionTitle>
        <p className="text-[15px]">
          {Object.entries(data.volumesMin)
            .map(([f, m]) => `${f} : ${eurosHt(m)}`)
            .join(" · ")}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Field id="famille" label="Famille" value={famille} onChange={(e) => setFamille(e.target.value)} />
          <Field id="montant" label="Montant HT" inputMode="decimal" value={montant} onChange={(e) => setMontant(e.target.value)} />
        </div>
        <Button variant="secondary" onClick={() => void geste(() => api("/v1/admin/pilotage/achats-groupes/volume-min", { method: "PUT", body: { famille, montantHt: Number(montant.replace(",", ".")) } }), "Volume minimum enregistré.")}>
          Enregistrer
        </Button>
        {data.commissionPct > 0 ? <p className="text-[14px] text-muted">Commission : {data.commissionPct} % (factures préparées le 1er du mois, envoi coupé).</p> : null}
      </section>
    </div>
  );
}

/**
 * L'écran de validation (point 14) : les négoces consultés et combien ont répondu, chaque offre avec son total sur le
 * panier, ses lignes manquantes en rouge, les alertes de l'IA et le PDF d'origine à un tap ; la proposition ; Valider,
 * Écarter, corriger un prix (gardé), Publier.
 */
export function ValidationAchat({ id }: { id: string }) {
  const fetcher = useCallback((signal: AbortSignal) => api<AdminAchat>(`/v1/admin/pilotage/achats-groupes/${id}`, { signal }), [id]);
  const { data, error, reload } = useResource(fetcher);
  const [prix, setPrix] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  if (error) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <Spinner />;
  const ouvert = data.statut === "validation" || data.statut === "pas_assez";
  async function geste(nom: string, f: () => Promise<unknown>, ok: string) {
    setPending(nom);
    try {
      await f();
      setMsg(ok);
      reload();
    } catch (e) {
      setMsg(messageErreur(e));
    } finally {
      setPending(null);
    }
  }
  const lire = (s: string) => (s.trim() === "" || /^non$/i.test(s.trim()) ? null : Number(s.replace(/\s/g, "").replace(",", ".")));
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-[24px] leading-tight font-extrabold">
          n° {data.numero} · {data.titre}
        </h1>
        <p className="text-[16px] font-semibold">
          {data.reponses} négoces ont répondu · {STATUTS[data.statut] ?? data.statut}
          {data.corrections ? ` · ${data.corrections} correction${data.corrections > 1 ? "s" : ""}` : ""}
        </p>
      </div>
      {msg ? (
        <p role="status" className="rounded-xl bg-ground p-3 font-semibold">
          {msg}
        </p>
      ) : null}
      <Card className="flex flex-col gap-1 p-4">
        <p className="text-[14px] font-semibold text-muted">Le panier</p>
        {data.panier.map((l) => (
          <p key={l.cle} className="text-[15px]">
            {l.libelle} · {quantite(l.quantite)} {l.unite}
          </p>
        ))}
      </Card>
      {data.offres.map((o) => {
        const proposee = o.consultationId === data.proposeeId;
        return (
          <Card key={o.consultationId} aria-label={`Offre ${o.nom}`} className={`flex flex-col gap-3 p-4 ${proposee ? "ring-2 ring-accent" : ""} ${o.ecartee ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col">
                <p className="text-[17px] font-extrabold">{o.nom}</p>
                <p className="text-[13px] text-muted">
                  {o.email}
                  {o.telephone ? ` · ${o.telephone}` : ""}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {proposee ? <Badge>Meilleure offre proposée</Badge> : null}
                {o.ecartee ? <Badge>Écartée</Badge> : null}
                {!o.repondu ? <Badge>Pas de réponse</Badge> : null}
              </div>
            </div>
            {/* Le suivi par négoce (Greg, 28 octobre 2026, point 3) : vu, PDF téléchargé, Excel téléchargé, répondu. */}
            <ul aria-label={`Suivi ${o.nom}`} className="flex flex-wrap gap-x-3 gap-y-1 text-[13px] font-semibold">
              {(
                [
                  ["Vu", o.vu],
                  ["PDF téléchargé", o.pdfTelecharge],
                  ["Excel téléchargé", o.excelTelecharge],
                  ["Répondu", o.repondu],
                ] as const
              ).map(([t, oui]) => (
                <li key={t} className={oui ? "text-ok" : "text-muted line-through decoration-1"}>
                  {oui ? "✓ " : ""}
                  {t}
                </li>
              ))}
            </ul>
            {o.repondu ? <p className="text-[16px] font-bold">{o.totalHt === null ? "Aucun prix lu" : `${eurosHt(o.totalHt)} sur le panier`}</p> : null}
            {o.manquantes.length && o.repondu ? <p className="text-[14px] font-semibold text-danger">Non chiffrées : {o.manquantes.join(", ")}</p> : null}
            {o.alertes.length ? (
              <ul aria-label="Alertes" className="list-disc pl-5 text-[14px] text-warn">
                {o.alertes.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            ) : null}
            {o.pdf ? (
              <a href={`/v1/admin/pilotage/achats-groupes/consultations/${o.consultationId}/devis.pdf`} className="text-[15px] font-semibold underline">
                Ouvrir le devis d&apos;origine ({o.pdf})
              </a>
            ) : null}
            {o.ouvertureCompte ? <p className="text-[14px] text-muted">{o.ouvertureCompte}</p> : null}
            {o.repondu ? (
              <ul className="flex flex-col divide-y divide-line">
                {o.lignes.map((l) => {
                  const k = `${o.consultationId}:${l.cle}`;
                  return (
                    <li key={l.cle} className="flex flex-wrap items-center justify-between gap-2 py-2 text-[14px]">
                      <span className={l.prixHt === null ? "font-semibold text-danger" : ""}>
                        {l.libelle} · {quantite(l.quantite)} {l.unite}
                      </span>
                      {ouvert ? (
                        <span className="flex items-center gap-2">
                          <input aria-label={`Prix de ${l.libelle} chez ${o.nom}`} inputMode="decimal" placeholder={l.prixHt === null ? "non" : String(l.prixHt).replace(".", ",")} value={prix[k] ?? ""} onChange={(e) => setPrix({ ...prix, [k]: e.target.value })} className="min-h-10 w-24 rounded-lg border border-line px-2" />
                          <Button variant="secondary" className="min-h-10 px-3" disabled={!prix[k]?.trim()} pending={pending === k} onClick={() => void geste(k, () => api(`/v1/admin/pilotage/achats-groupes/consultations/${o.consultationId}/prix`, { method: "PUT", body: { cle: l.cle, prixHt: lire(prix[k]!) } }), "Prix corrigé (correction gardée).")}>
                            Corriger
                          </Button>
                        </span>
                      ) : (
                        <span className="font-semibold">{l.prixHt === null ? "non chiffrée" : eurosHt(l.prixHt)}</span>
                      )}
                      {l.corrige ? <span className="w-full text-[12px] text-muted">corrigé par l&apos;admin</span> : null}
                    </li>
                  );
                })}
              </ul>
            ) : null}
            {ouvert && o.repondu ? (
              <div className="grid grid-cols-2 gap-2">
                {o.ecartee || o.statut === "douteuse" ? (
                  <Button variant="secondary" pending={pending === `v-${o.consultationId}`} onClick={() => void geste(`v-${o.consultationId}`, () => api(`/v1/admin/pilotage/achats-groupes/consultations/${o.consultationId}/valider`, { method: "POST" }), `Offre de ${o.nom} validée.`)}>
                    Valider
                  </Button>
                ) : null}
                {!o.ecartee ? (
                  <Button variant="secondary" pending={pending === `e-${o.consultationId}`} onClick={() => void geste(`e-${o.consultationId}`, () => api(`/v1/admin/pilotage/achats-groupes/consultations/${o.consultationId}/ecarter`, { method: "POST" }), `Offre de ${o.nom} écartée.`)}>
                    Écarter
                  </Button>
                ) : null}
              </div>
            ) : null}
          </Card>
        );
      })}
      {ouvert ? (
        <Button pending={pending === "publier"} disabled={!data.proposeeId} onClick={() => void geste("publier", () => api(`/v1/admin/pilotage/achats-groupes/${id}/publier`, { method: "POST" }), "Publié : chaque artisan a reçu sa comparaison.")}>
          Publier
        </Button>
      ) : null}
    </div>
  );
}
