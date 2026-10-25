"use client";

import { BellRing, Check, FileText, MessageSquare, Phone, Users, X } from "lucide-react";
import { useCallback, useState } from "react";
import { Badge, Button, ButtonLink, Card, EmptyState, ErrorNotice, Field, SectionTitle, Skeleton } from "@/components/ui";
import { api, messageErreur } from "@/lib/api";
import type { APrevenir, BesoinNegocie, LignesNegociables, MesBesoins, ModeRegroupement, PrixDuSecteur } from "@/lib/negocie";
import { prixFr } from "@/lib/negocie";
import { jourFr } from "@/lib/recentrage";
import { openFile } from "@/lib/open-document";
import { useResource } from "@/lib/use-resource";

/**
 * LE REGROUPEMENT NÉGOCIÉ, CÔTÉ ARTISAN (business model final, Greg, 25 octobre 2026) : l'artisan déclare ses gros
 * besoins, voit seulement son besoin, « En cours de négociation par Mobiiz », puis l'offre à accepter ou refuser (négoce
 * masqué jusqu'à l'acceptation, commission Mobiiz incluse dans le prix affiché), et ses lignes en veille. Jamais de
 * messagerie, jamais le nom d'une autre entreprise ni d'une commune.
 */

/** Le mode des regroupements (humain par défaut), lu une fois par écran. */
export function useModeRegroupement(): ModeRegroupement | null {
  const fetcher = useCallback((signal: AbortSignal) => api<{ mode: ModeRegroupement }>("/v1/regroupement/mode", { signal }), []);
  const { data } = useResource(fetcher);
  return data?.mode ?? null;
}

export function RegroupementsNegocies() {
  const fetcher = useCallback((signal: AbortSignal) => api<MesBesoins>("/v1/negocie", { signal }), []);
  const { data, error, reload } = useResource(fetcher);
  return (
    <div className="flex flex-col gap-5">
      {error ? <ErrorNotice error={error} onRetry={reload} /> : null}
      {!data && !error ? <Skeleton card="h-40" lines={2} label="Chargement de tes besoins…" /> : null}
      {data && !data.zoneActive ? (
        <EmptyState icon={<Users size={28} aria-hidden="true" />} title="Bientôt chez toi">
          <p className="text-[15px] text-muted">{data.message}</p>
        </EmptyState>
      ) : null}
      {data && data.veille.length > 0 ? <Veille lignes={data.veille} onChange={reload} /> : null}
      {data && data.zoneActive && data.besoins.length === 0 ? (
        <EmptyState icon={<Users size={28} aria-hidden="true" />} title="Pas encore de besoin déclaré">
          <p className="text-[15px] text-muted">Sur un chantier, « Tenter un prix de groupe » sur tes gros articles (ardoise, zinc, bois, isolant). Un chasseur d&apos;opportunités Mobiiz négocie pour toi.</p>
          <ButtonLink href="/chantiers" variant="secondary" className="mt-3">
            Mes chantiers
          </ButtonLink>
        </EmptyState>
      ) : null}
      {data && data.besoins.length > 0 ? (
        <section aria-label="Tes besoins" className="flex flex-col gap-3">
          <SectionTitle>Tes besoins</SectionTitle>
          {data.besoins.map((b) => (
            <CarteBesoin key={b.id} b={b} onChange={reload} />
          ))}
        </section>
      ) : null}
    </div>
  );
}

function CarteBesoin({ b, onChange }: { b: BesoinNegocie; onChange: () => void }) {
  const [pending, setPending] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  async function faire(geste: "accepter" | "refuser" | "retirer") {
    setPending(geste);
    setErreur(null);
    try {
      await api(`/v1/negocie/besoins/${b.id}/${geste}`, { method: "POST" });
      onChange();
    } catch (e) {
      setErreur(messageErreur(e, { offre_expiree: "Cette offre n'est plus valable.", sans_offre: "Pas encore d'offre." }));
    } finally {
      setPending(null);
    }
  }
  const o = b.offre;
  const statutRegroupement = b.regroupement?.statut;
  return (
    <Card className="flex flex-col gap-3 p-4" aria-label={b.designation}>
      <div className="flex flex-col gap-1">
        <span className="text-[16px] font-extrabold">{b.designation}</span>
        <span className="text-[14px] text-muted">
          {b.quantite.toLocaleString("fr-FR")} {b.unite} · pour le {jourFr(b.dateBesoin)}
        </span>
      </div>
      {b.regroupement ? (
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={b.statut === "accepte" ? "ok" : "neutral"}>{b.statut === "accepte" ? "Commandé" : b.statut === "refuse" ? "Offre refusée" : b.regroupement.libelle}</Badge>
          {/* Sous le seuil d'anonymat, le badge suffit (« Regroupement en cours ») ; au-dessus, « 5+ entreprises » et le département. */}
          {b.regroupement.participants.detail ? (
            <span className="text-[13px] text-muted">
              {b.regroupement.participants.titre} · {b.regroupement.participants.detail}
            </span>
          ) : null}
        </div>
      ) : null}
      {o && b.statut === "declare" ? (
        <div className="flex flex-col gap-2 rounded-xl bg-ground p-3" aria-label="Offre négociée">
          <span className="text-[14px] font-semibold">{o.negoce}</span>
          <span className="text-[22px] font-extrabold">
            {prixFr(o.prixHt)} <span className="text-[13px] font-semibold text-muted">HT / {b.unite.replace(/s$/, "")}</span>
          </span>
          <span className="text-[14px]">
            Livraison {o.livraisonHt === 0 ? "offerte" : `${prixFr(o.livraisonHt)} HT`} · Total {prixFr(o.totalHt)} HT
          </span>
          {o.conditions ? <span className="text-[14px] text-muted">{o.conditions}</span> : null}
          <span className="text-[13px] text-muted">{o.valide ? `Valable jusqu'au ${jourFr(o.valideJusquau)}` : "Offre expirée"}</span>
          {b.perso ? (
            <span className="text-[14px]">
              Ta meilleure demande perso : {prixFr(b.perso.prixHt)} HT ({b.perso.negoce}){" "}
              {b.perso.prixHt > o.prixHt ? <strong className="text-ok">· le groupe est moins cher</strong> : null}
            </span>
          ) : null}
          <ul className="flex flex-col text-[13px] text-muted">
            {o.mentions.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
          {erreur ? (
            <p role="alert" className="text-[15px] font-semibold text-danger">
              {erreur}
            </p>
          ) : null}
          {o.valide ? (
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => void faire("accepter")} pending={pending === "accepter"} disabled={pending !== null}>
                <Check size={18} aria-hidden="true" /> J&apos;accepte
              </Button>
              <Button variant="secondary" onClick={() => void faire("refuser")} pending={pending === "refuser"} disabled={pending !== null}>
                Refuser
              </Button>
            </div>
          ) : null}
          {o.valide ? <p className="text-[13px] text-muted">« J&apos;accepte » vaut commande ferme sur ta quantité. Le bon de commande arrive par e-mail.</p> : null}
        </div>
      ) : null}
      {b.statut === "accepte" ? (
        <div className="flex flex-col gap-2">
          {o ? <span className="text-[14px]">Chez {o.negoce} · {prixFr(o.totalHt)} HT</span> : null}
          <Button variant="secondary" onClick={() => openFile({ url: `/v1/negocie/besoins/${b.id}/bon.pdf`, title: `Bon de commande n° ${b.bonNumero ?? ""}`, fileName: "bon-de-commande.pdf" })}>
            <FileText size={18} aria-hidden="true" /> Mon bon de commande
          </Button>
        </div>
      ) : null}
      {b.statut === "declare" && !o && statutRegroupement !== "commande" ? (
        <button type="button" onClick={() => void faire("retirer")} disabled={pending !== null} className="min-h-11 self-start text-[14px] font-semibold text-muted underline">
          Retirer ce besoin
        </button>
      ) : null}
    </Card>
  );
}

/** « Tes besoins en veille » : des lignes perso groupables, gardées jusqu'à la date de besoin ; « Oui, j'ajoute » quand un regroupement se forme. */
function Veille({ lignes, onChange }: { lignes: MesBesoins["veille"]; onChange: () => void }) {
  const [pending, setPending] = useState<string | null>(null);
  async function faire(id: string, geste: "ajouter" | "non-merci") {
    setPending(`${id}:${geste}`);
    try {
      await api(`/v1/negocie/besoins/${id}/${geste}`, { method: "POST" });
      onChange();
    } finally {
      setPending(null);
    }
  }
  return (
    <section aria-label="Tes besoins en veille" className="flex flex-col gap-3">
      <SectionTitle>Tes besoins en veille</SectionTitle>
      {lignes.map((l) => (
        <Card key={l.id} className="flex flex-col gap-2 p-4">
          <span className="text-[16px] font-extrabold">{l.designation}</span>
          <span className="text-[14px] text-muted">
            {l.quantite.toLocaleString("fr-FR")} {l.unite}
            {l.chantier ? ` · chantier ${l.chantier}` : ""} · jusqu&apos;au {jourFr(l.dateBesoin)}
          </span>
          {l.regroupementDisponible ? (
            <>
              <p className="flex items-start gap-2 text-[15px]">
                <BellRing size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
                Un regroupement se forme sur cet article dans ton secteur. Tu les ajoutes ?
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => void faire(l.id, "ajouter")} pending={pending === `${l.id}:ajouter`} disabled={pending !== null}>
                  Oui, j&apos;ajoute
                </Button>
                <Button variant="secondary" onClick={() => void faire(l.id, "non-merci")} pending={pending === `${l.id}:non-merci`} disabled={pending !== null}>
                  Non merci
                </Button>
              </div>
            </>
          ) : (
            <p className="text-[14px] text-muted">Je te préviens si un regroupement se forme sur cet article.</p>
          )}
        </Card>
      ))}
    </section>
  );
}

/** Sur un chantier : déclarer ses gros articles au regroupement négocié (mode humain). */
export function DeclarerBesoins({ projectId }: { projectId: string }) {
  const fetcher = useCallback((signal: AbortSignal) => api<LignesNegociables>(`/v1/projects/${projectId}/negocie/lignes`, { signal }), [projectId]);
  const { data } = useResource(fetcher);
  const [ouvert, setOuvert] = useState(false);
  const [retires, setRetires] = useState<string[]>([]);
  const [dateBesoin, setDateBesoin] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  if (!data || !data.zoneActive) return null;
  const negociables = data.lignes.filter((l) => l.negociable);
  if (negociables.length === 0) return null;
  const choisies = negociables.filter((l) => !retires.includes(l.key));
  async function declarer() {
    setPending(true);
    setErreur(null);
    try {
      for (const l of choisies) await api("/v1/negocie/besoins", { method: "POST", body: { projectId, articleKey: l.key, dateBesoin } });
      setMessage(`${choisies.length} besoin${choisies.length > 1 ? "s" : ""} déclaré${choisies.length > 1 ? "s" : ""}. Un chasseur d'opportunités Mobiiz négocie pour toi : tu reçois l'offre ici, et tu choisis.`);
      setOuvert(false);
    } catch (e) {
      setErreur(messageErreur(e, { livraison_requise: "Il me faut une adresse de livraison avec son code postal (sur le chantier ou ton compte).", abonnement_requis: "Les besoins groupés sont dans la formule payante." }));
    } finally {
      setPending(false);
    }
  }
  return (
    <section aria-label="Tenter un prix de groupe" className="flex flex-col gap-3">
      {message ? (
        <p role="status" className="rounded-xl bg-ok-bg p-4 text-[15px] font-semibold text-ok">
          {message}
        </p>
      ) : null}
      {!ouvert ? (
        <Button variant="secondary" onClick={() => setOuvert(true)} className="w-full">
          <Users size={18} aria-hidden="true" /> Tenter un prix de groupe ({negociables.length} gros article{negociables.length > 1 ? "s" : ""})
        </Button>
      ) : (
        <Card className="flex flex-col gap-3 p-4">
          <SectionTitle>Tenter un prix de groupe</SectionTitle>
          <p className="text-[14px] text-muted">Seuls les gros articles à la référence exacte se regroupent (ardoise, zinc, bois, isolant). Un chasseur d&apos;opportunités Mobiiz négocie au téléphone, et tu acceptes seulement si le prix te plaît.</p>
          <ul className="flex flex-col gap-2">
            {data.lignes.map((l) => (
              <li key={l.key}>
                <label className={`flex items-start gap-3 rounded-xl border border-line px-3 py-2 ${l.negociable ? "bg-surface" : "bg-ground"}`}>
                  <input type="checkbox" disabled={!l.negociable} checked={l.negociable && !retires.includes(l.key)} onChange={() => setRetires((r) => (r.includes(l.key) ? r.filter((k) => k !== l.key) : [...r, l.key]))} className="mt-1 size-5 accent-accent" />
                  <span className="flex flex-col">
                    <span className="text-[15px] font-semibold">{l.designation}</span>
                    <span className="text-[13px] text-muted">{l.negociable ? `${l.quantite.toLocaleString("fr-FR")} ${l.unite}` : l.raison}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <Field id="besoin-date" label="Pour quand ?" type="date" value={dateBesoin} onChange={(e) => setDateBesoin(e.target.value)} />
          {erreur ? (
            <p role="alert" className="text-[15px] font-semibold text-danger">
              {erreur}
            </p>
          ) : null}
          <Button onClick={() => void declarer()} pending={pending} disabled={!dateBesoin || choisies.length === 0}>
            Déclarer mes besoins
          </Button>
          <button type="button" onClick={() => setOuvert(false)} className="min-h-11 self-center text-[15px] font-semibold text-muted underline">
            Annuler
          </button>
        </Card>
      )}
    </section>
  );
}

const LIEN_SECONDAIRE = "pressable inline-flex min-h-13 items-center justify-center gap-2 rounded-full border border-line bg-surface px-4 text-[16px] font-semibold text-ink active:bg-ground";

/**
 * « PRÉVIENS TON NÉGOCE » : après le premier envoi à un négoce qui n'a jamais répondu sur Mobiiz : l'appeler, lui
 * envoyer un SMS déjà écrit, ou « Je l'ai déjà prévenu » (l'écran ne revient plus pour lui).
 */
export function PrevenirNegoce({ demandeId, onFini }: { demandeId: string; onFini: () => void }) {
  const fetcher = useCallback((signal: AbortSignal) => api<APrevenir>(`/v1/demandes-perso/${demandeId}/prevenir`, { signal }), [demandeId]);
  const { data } = useResource(fetcher);
  const [faits, setFaits] = useState<string[]>([]);
  if (!data) return null;
  const restants = data.negoces.filter((n) => !faits.includes(n.supplierId));
  if (restants.length === 0) {
    return (
      <p role="status" className="rounded-xl bg-ok-bg p-4 text-[15px] font-semibold text-ok">
        Ta demande est partie. Les prix arrivent ici.{" "}
        <button type="button" onClick={onFini} className="underline">
          OK
        </button>
      </p>
    );
  }
  async function prevenu(id: string) {
    await api(`/v1/suppliers/${id}/prevenu`, { method: "POST" }).catch(() => undefined);
    setFaits((f) => [...f, id]);
  }
  return (
    <Card className="flex flex-col gap-4 p-4" aria-label="Préviens ton négoce">
      <div className="flex items-start justify-between gap-3">
        <SectionTitle>Préviens ton négoce</SectionTitle>
        <button type="button" onClick={onFini} aria-label="Fermer" className="grid size-11 shrink-0 place-items-center rounded-full text-muted">
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      <p className="text-[15px] leading-relaxed">{data.titre}</p>
      {restants.map((n) => (
        <div key={n.supplierId} className="flex flex-col gap-2 rounded-xl bg-ground p-3">
          <span className="text-[16px] font-extrabold">{n.nom}</span>
          <div className="grid grid-cols-2 gap-2">
            {n.tel ? (
              <a href={n.tel} className={LIEN_SECONDAIRE}>
                <Phone size={18} aria-hidden="true" /> L&apos;appeler
              </a>
            ) : null}
            <a href={n.sms} className={`${LIEN_SECONDAIRE} ${n.tel ? "" : "col-span-2"}`}>
              <MessageSquare size={18} aria-hidden="true" /> SMS
            </a>
          </div>
          <Button onClick={() => void prevenu(n.supplierId)}>Je l&apos;ai déjà prévenu</Button>
        </div>
      ))}
      <p className="text-[13px] text-muted">Le SMS : « {data.sms} »</p>
    </Card>
  );
}

/** « Prix observés dans ton secteur » (Mes prix) : moyennes arrondies des 3 derniers mois, sans aucun nom. */
export function PrixObservesSecteur() {
  const fetcher = useCallback((signal: AbortSignal) => api<PrixDuSecteur>("/v1/mes-prix/secteur", { signal }), []);
  const { data } = useResource(fetcher);
  if (!data || data.articles.length === 0) return null;
  return (
    <section aria-label="Prix observés dans ton secteur" className="flex flex-col gap-3">
      <SectionTitle>Prix observés dans ton secteur</SectionTitle>
      <p className="text-[14px] text-muted">Moyennes des 3 derniers mois{data.departement ? ` dans le ${data.departement}` : ""}, arrondies. Aucun nom d&apos;artisan ni de négoce.</p>
      <ul className="flex flex-col gap-2">
        {data.articles.map((a) => (
          <li key={`${a.libelle}#${a.unite}`}>
            <Card className="flex items-center justify-between gap-3 p-4">
              <span className="text-[15px] font-semibold">{a.libelle}</span>
              <span className="shrink-0 text-[15px] font-extrabold">
                environ {prixFr(a.environ)} <span className="text-[13px] font-semibold text-muted">/ {a.unite.replace(/s$/, "")}</span>
              </span>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
