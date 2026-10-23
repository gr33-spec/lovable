"use client";

import { Check, FileText, Store, Users } from "lucide-react";
import { useCallback, useId, useState } from "react";
import { InviterCollegue } from "@/components/inviter";
import type { Groupe } from "@/components/groupe";
import { Button, ErrorNotice, Field } from "@/components/ui";
import { api, ApiError, newActionKey } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

/**
 * LA COMMANDE COMMUNE DU MOIS (Greg, 22 octobre 2026, au soir) côté écran : une commande par mois avec les couvreurs de
 * la région. On parle en QUANTITÉS, jamais en nombre d'entreprises ; le chrono est partout ; « Sans engagement : tu
 * commandes seulement si le prix te plaît ». Toutes les phrases viennent de l'API (calculées par le domaine).
 */
export interface NegoceDuResultat {
  negoceId: string;
  nom: string;
  totalHt: number;
  marchandiseHt: number;
  livraisonHt: number;
  manquantes: number;
  complet: boolean;
  premierSurLeTotal: boolean;
}

export interface CommandeDuMois {
  cycleId: string;
  numero: number;
  mois: string;
  de: string;
  phase: "inscriptions" | "negoces" | "resultats";
  clotureDans: string | null;
  reponseDans: string | null;
  toi: string;
  tout: string;
  cloture: string | null;
  premier: string | null;
  mesLignes: { id: string; designation: string; quantite: number; unite: string; nature: string | null; chantier: string; projectId: string }[];
  suivi: { etape: number; phrase: string; aFaire: string | null };
  resultats: null | { parDefaut: string | null; moinsCherPourToi: string | null; negoces: NegoceDuResultat[]; choix: { negoceId: string; totalHt: number; commandeLe: string | null } | null };
}

export interface EtatDuMois {
  mode: "mois" | "lots";
  commandes: CommandeDuMois[];
  /** La commande ouverte du département du chantier (si `projectId` est donné), sinon de celui de l'entreprise. */
  prochaine: { mois: string; de: string; zone?: string; clotureDans: string; tout: string; vide: boolean } | null;
  phrases: { sansEngagement: string };
}

export function useCommandeDuMois(actif: boolean, projectId?: string) {
  const fetchEtat = useCallback(
    (signal: AbortSignal) => (actif ? api<EtatDuMois>(`/v1/commande-du-mois${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ""}`, { signal }) : Promise.resolve(null)),
    [actif, projectId],
  );
  return useResource(fetchEtat);
}

/** Une carte (comme `Card`), mais une région nommée : « Commande d'octobre ». */
const CARTE = "flex flex-col rounded-3xl bg-surface p-4 shadow-card";
const unite = (u: string) => (u === "ml" ? "m" : u);
const euros = (n: number) => `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const quantite = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

/** Les trois étapes, en mots d'enfant de 12 ans (Greg, 22 octobre). */
export function EtapesDuMois() {
  const etapes = [
    { icone: <FileText size={20} aria-hidden="true" />, texte: "Dépose ta liste avant la clôture." },
    { icone: <Store size={20} aria-hidden="true" />, texte: "On envoie tout le volume aux négoces." },
    { icone: <Check size={20} aria-hidden="true" />, texte: "Tu vois le meilleur prix et tu commandes si ça te plaît." },
  ];
  return (
    <ol aria-label="Comment ça marche" className="flex flex-col gap-2">
      {etapes.map((e, i) => (
        <li key={e.texte} className="flex items-center gap-3 text-[15px] font-semibold">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ground text-accent-text">{e.icone}</span>
          <span>
            {i + 1}. {e.texte}
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * Sur « Ton chantier », pendant qu'on coche : chantier signé ou stock (les deux vont dans la même commande), la phrase
 * « sans engagement », puis « Ajouter à la commande d'octobre ». Ni dates, ni engagement à cocher.
 */
export function CommandeDuMoisBar({
  count,
  de,
  phrase,
  onCancel,
  onDeposer,
  onAdresse,
}: {
  count: number;
  de: string;
  phrase: string;
  onCancel: () => void;
  onDeposer: (nature: "chantier" | "stock") => Promise<void>;
  onAdresse?: (adresse: string) => Promise<void>;
}) {
  const id = useId();
  const [adresse, setAdresse] = useState("");
  const [nature, setNature] = useState<"chantier" | "stock" | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const choix = "inline-flex min-h-12 grow items-center justify-center rounded-2xl px-3 text-[15px] font-extrabold";
  const adresseManque = error?.reason === "adresse_requise" && Boolean(onAdresse);
  return (
    <section aria-label={`Ajouter à la commande ${de}`} className="flex flex-col gap-2 rounded-[22px] bg-surface p-3 shadow-card">
      <p className="text-[14px] font-extrabold">{count === 0 ? `Coche les lignes à ajouter à la commande ${de}` : `${count} ligne${count > 1 ? "s" : ""} pour la commande ${de}`}</p>
      <p className="text-[13px] leading-snug text-muted">{phrase}</p>
      <p className="text-[13px] font-bold text-muted">C&apos;est pour quoi ?</p>
      <div role="radiogroup" aria-label="C'est pour quoi ?" className="flex gap-2">
        {(
          [
            ["chantier", "Un chantier signé"],
            ["stock", "Du stock"],
          ] as const
        ).map(([v, label]) => (
          <button key={v} type="button" role="radio" aria-checked={nature === v} onClick={() => setNature(v)} className={`${choix} ${nature === v ? "bg-accent text-white" : "bg-ground text-ink"}`}>
            {label}
          </button>
        ))}
      </div>
      {adresseManque ? (
        <Field id={`${id}-adresse`} label="Adresse du chantier, avec le code postal" hint="La commande se fait avec les couvreurs de ton département : il faut l'adresse de livraison." value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder="4 rue du Port, 22500 Paimpol" autoComplete="street-address" />
      ) : error ? (
        <ErrorNotice error={error} />
      ) : null}
      <div className="flex gap-2">
        <Button className="grow" variant="secondary" onClick={onCancel} disabled={pending}>
          Annuler
        </Button>
        <Button
          className="grow"
          pending={pending}
          disabled={count === 0 || !nature || (adresseManque && !/\d{5}/.test(adresse))}
          onClick={async () => {
            if (!nature) return;
            setPending(true);
            setError(null);
            try {
              if (adresseManque && onAdresse) await onAdresse(adresse.trim());
              await onDeposer(nature);
            } catch (e) {
              setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
            } finally {
              setPending(false);
            }
          }}
        >
          <Users size={18} aria-hidden="true" />
          Ajouter
        </Button>
      </div>
    </section>
  );
}

/**
 * En haut de « Ton chantier » : « Commande commune de novembre », le chrono, les quantités de toute la commande (jamais un
 * nombre d'entreprises), puis « Ajouter à la commande de novembre ». Après un dépôt tardif : « Trop tard pour octobre… ».
 */
export function CommandeDuMoisBloc({ etat, onAjouter, message }: { etat: EtatDuMois | null; onAjouter: () => void; message: string | null }) {
  // Greg (23 octobre) : la commande du département du CHANTIER (`prochaine`, lue avec son `projectId`), jamais celle de
  // l'entreprise quand le chantier est ailleurs.
  const p = etat?.prochaine ?? null;
  const de = p?.de ?? null;
  const chronoTexte = p ? `Clôture dans ${p.clotureDans}` : null;
  const tout = p && !p.vide ? p.tout : null;
  return (
    <section aria-label={de ? `Commande commune ${de}` : "Commande commune"} className="mb-3 flex flex-col gap-2 rounded-[20px] bg-surface p-4 shadow-card">
      <p className="flex items-center gap-2 text-[15px] font-extrabold">
        <Users size={18} aria-hidden="true" className="text-accent-text" />
        {de ? `Commande commune ${de}` : "Commande commune"}
      </p>
      <p className="text-[14px] leading-snug text-muted">Une commande par mois avec les couvreurs de ta région.</p>
      {chronoTexte ? <p className="text-[15px] font-extrabold text-accent-text">{chronoTexte}</p> : null}
      {tout ? <p className="text-[14px] font-bold">{tout}</p> : null}
      {message ? (
        <p role="status" className="rounded-2xl bg-ground p-3 text-[14px] font-bold">
          {message}
        </p>
      ) : null}
      <Button variant="secondary" className="self-start" onClick={onAjouter}>
        {de ? `Ajouter à la commande ${de}` : "Ajouter à la commande"}
      </Button>
    </section>
  );
}

/** Sous la liste : ce que ce chantier a mis dans la commande du mois, avec « Retirer » tant qu'elle n'est pas close. */
export function MesLignesDuMois({ groupe }: { groupe: Groupe }) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const ids = new Set([...groupe.besoins.values()].map((b) => b.id));
  const commandes = (groupe.mois?.commandes ?? []).map((c) => ({ c, lignes: c.mesLignes.filter((l) => ids.has(l.id)) })).filter((x) => x.lignes.length > 0);
  if (commandes.length === 0) return null;
  return (
    <>
      {commandes.map(({ c, lignes }) => (
        <section key={c.cycleId} aria-label={`Dans la commande ${c.de}`} className="mt-3 flex flex-col gap-2 rounded-[20px] bg-surface p-3 shadow-card">
          <h3 className="text-[13px] font-extrabold text-muted">{`Dans la commande ${c.de}`}</h3>
          <p className="text-[13px] font-bold text-accent-text">{c.suivi.phrase}</p>
          <ul className="flex flex-col gap-1.5">
            {lignes.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-ground px-3 py-2">
                <span className="min-w-0 text-[14px] font-bold">
                  {l.designation} <span className="font-extrabold">{`· ${quantite(l.quantite)} ${unite(l.unite)}`}</span>
                  <span className="block text-[12px] font-semibold text-muted">{l.nature === "stock" ? "Stock" : "Chantier signé"}</span>
                </span>
                {c.phase === "inscriptions" ? (
                  <Button
                    variant="secondary"
                    className="min-h-10 px-3 text-[13px]"
                    pending={pending === l.id}
                    onClick={async () => {
                      setPending(l.id);
                      setError(null);
                      try {
                        await api(`/v1/commande-du-mois/lignes/${encodeURIComponent(l.id)}`, { method: "DELETE" });
                        groupe.rechargerMois();
                      } catch (e) {
                        setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
                      } finally {
                        setPending(null);
                      }
                    }}
                  >
                    Retirer
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
          {error ? <ErrorNotice error={error} /> : null}
        </section>
      ))}
    </>
  );
}

/** Le dépôt d'une liste dans la commande du mois (« Trop tard pour octobre… » renvoyé tel quel). */
export async function deposerDansLeMois(projectId: string, articles: string[], nature: "chantier" | "stock"): Promise<{ mois: string; message: string | null }> {
  return api(`/v1/projects/${encodeURIComponent(projectId)}/commande-du-mois`, { method: "POST", body: { articles, nature }, idempotencyKey: newActionKey() });
}

/** L'onglet « Commande commune » : chaque commande du mois, ses chiffres en quantités, le partage, puis les résultats. */
export function CommandeDuMoisPanneau({ etat, onChange }: { etat: EtatDuMois; onChange: () => void }) {
  const commandes = etat.commandes;
  const ouverte = commandes.find((c) => c.phase === "inscriptions");
  return (
    <div className="flex flex-col gap-4">
      {!ouverte && etat.prochaine ? (
        <section aria-label={`Commande ${etat.prochaine.de}`} className={`${CARTE} gap-2`}>
          <h2 className="font-display text-xl font-extrabold">{`Commande ${etat.prochaine.de}`}</h2>
          <p className="text-[15px] font-extrabold text-accent-text">{`Clôture dans ${etat.prochaine.clotureDans}`}</p>
          <p className="text-[15px] font-semibold">{etat.prochaine.vide ? "Pour l'instant, la commande est vide. Dépose ta liste pour la lancer." : etat.prochaine.tout}</p>
          <InviterCollegue texte="Plus on est nombreux dans la commande, plus les prix baissent." />
        </section>
      ) : null}
      {commandes.map((c) => (
        <CarteDuMois key={c.cycleId} c={c} onChange={onChange} />
      ))}
    </div>
  );
}

function CarteDuMois({ c, onChange }: { c: CommandeDuMois; onChange: () => void }) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [choisi, setChoisi] = useState<string | null>(null);
  const run = async (cle: string, f: () => Promise<unknown>) => {
    setPending(cle);
    setError(null);
    try {
      await f();
      onChange();
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError("internal_error", 500));
    } finally {
      setPending(null);
    }
  };
  const r = c.resultats;
  const commande = r?.choix?.commandeLe ? r.negoces.find((n) => n.negoceId === r.choix!.negoceId) : null;
  const parDefaut = r ? (r.negoces.find((n) => n.negoceId === r.parDefaut && n.complet) ?? r.negoces.find((n) => n.negoceId === r.moinsCherPourToi) ?? null) : null;
  const selection = r ? (r.negoces.find((n) => n.negoceId === choisi) ?? parDefaut) : null;
  return (
    <section aria-label={`Commande ${c.de}`} className={`${CARTE} gap-3`}>
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-xl font-extrabold">{`Commande ${c.de}`}</h2>
        <p className="text-[15px] font-extrabold text-accent-text">{c.phase === "inscriptions" ? c.cloture : c.phase === "negoces" ? `Commande close. Les négoces chiffrent : leurs prix dans ${c.reponseDans}.` : "Les prix sont là."}</p>
      </div>
      <p className="text-[16px] font-bold">{c.toi}</p>
      <p className="text-[16px] font-bold">{c.tout}</p>
      {c.premier ? <p className="rounded-2xl bg-ground p-3 text-[14px] font-semibold">{c.premier}</p> : null}
      {c.phase === "inscriptions" ? <InviterCollegue texte="Plus on est nombreux dans la commande, plus les prix baissent." /> : null}

      {c.mesLignes.length > 0 ? (
        <section aria-label="Mes lignes" className="flex flex-col gap-1.5">
          <h3 className="text-[13px] font-extrabold text-muted">Mes lignes</h3>
          <ul className="flex flex-col gap-1.5">
            {c.mesLignes.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-ground px-3 py-2">
                <span className="min-w-0 text-[14px] font-bold">
                  {l.designation} <span className="font-extrabold">{`· ${quantite(l.quantite)} ${unite(l.unite)}`}</span>
                  <span className="block text-[12px] font-semibold text-muted">{`${l.nature === "stock" ? "Stock" : "Chantier signé"} · ${l.chantier}`}</span>
                </span>
                {c.phase === "inscriptions" ? (
                  <Button variant="secondary" className="min-h-10 px-3 text-[13px]" pending={pending === l.id} onClick={() => run(l.id, () => api(`/v1/commande-du-mois/lignes/${encodeURIComponent(l.id)}`, { method: "DELETE" }))}>
                    Retirer
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {r ? (
        <section aria-label="Tes prix" className="flex flex-col gap-2">
          <h3 className="text-[15px] font-extrabold">Ton prix livré chez chaque négoce</h3>
          {commande ? (
            <p role="status" className="rounded-2xl bg-ok/10 p-3 text-[15px] font-extrabold text-ok">{`Commandé chez ${commande.nom} : ${euros(commande.totalHt)} HT livré. Le bon de commande est parti.`}</p>
          ) : null}
          <ul className="flex flex-col gap-2">
            {r.negoces.map((n) => (
              <li key={n.negoceId}>
                <label className={`flex items-start gap-3 rounded-2xl p-3 ${n.complet ? "bg-ground" : "bg-ground opacity-70"} ${selection?.negoceId === n.negoceId && !commande ? "ring-2 ring-accent" : ""}`}>
                  {commande ? null : <input type="radio" name={`negoce-${c.cycleId}`} disabled={!n.complet} checked={selection?.negoceId === n.negoceId} onChange={() => setChoisi(n.negoceId)} className="mt-1 size-5 shrink-0 accent-accent" />}
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[15px] font-extrabold">{`Chez ${n.nom} : ${euros(n.totalHt)} HT livré`}</span>
                    <span className="text-[13px] font-semibold text-muted">{`${euros(n.marchandiseHt)} de matériaux, livraison ${n.livraisonHt > 0 ? euros(n.livraisonHt) : "gratuite"}`}</span>
                    {n.premierSurLeTotal ? <span className="text-[13px] font-bold text-accent-text">Le moins cher sur toute la commande</span> : null}
                    {r.moinsCherPourToi === n.negoceId && !n.premierSurLeTotal ? <span className="text-[13px] font-bold text-ok">Le moins cher pour toi</span> : null}
                    {!n.complet ? <span className="text-[13px] font-bold text-warn">{`Il n'a pas chiffré ${n.manquantes} article${n.manquantes > 1 ? "s" : ""} de ta liste`}</span> : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {!commande && !selection ? (
            <p role="status" className="rounded-2xl bg-warn-bg p-3 text-[14px] font-bold text-warn">
              Aucun négoce n&apos;a chiffré toute ta liste : commande-la en direct chez ton négoce.
            </p>
          ) : null}
          {!commande && selection ? (
            <Button pending={pending === "commander"} onClick={() => run("commander", () => api(`/v1/commande-du-mois/${encodeURIComponent(c.cycleId)}/commander`, { method: "POST", body: { negoceId: selection.negoceId } }))}>
              {`Commander chez ${selection.nom}`}
            </Button>
          ) : null}
          <p className="text-[13px] text-muted">Sans engagement : tu commandes seulement si le prix te plaît. Le bon part au négoce, avec ton nom ; tu paies sur ton compte, comme d&apos;habitude.</p>
        </section>
      ) : c.phase === "resultats" ? (
        <p className="text-[14px] font-semibold text-muted">Aucun négoce n&apos;a chiffré ta liste cette fois-ci.</p>
      ) : null}
      {error ? <ErrorNotice error={error} /> : null}
    </section>
  );
}
