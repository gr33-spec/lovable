"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CARTE, LigneZone, Note, VerificationEntreprise } from "@/components/ag-v1-commun";
import { ChoixCaracteristiques, ConfirmerConditionnement } from "@/components/ag-v1-direct";
import { Button, INPUT, PageTitle, Skeleton } from "@/components/ui";
import { api, ApiError, messageErreur, newActionKey } from "@/lib/api";
import { CASE_PLUSIEURS_LIGNES, CASE_UNE_LIGNE, dateCourte, dateLongue, jourDans, libelleLot, LOTS_V1, PHRASE_ADRESSE_PRIVEE, zoneLisible, type CompatibiliteV1, type EtatV1, type LigneQuantitatifV1 } from "@/lib/ag-v1";
import { useResource } from "@/lib/use-resource";

const nf = (n: number) => n.toLocaleString("fr-FR").replace(/ | /g, " ");
const TON: Record<LigneQuantitatifV1["mention"], string> = {
  recommande: "bg-ok-bg text-ok",
  compatible: "bg-ground text-ink",
  a_preciser: "bg-warn-bg text-warn",
  demande_individuelle: "bg-ground text-muted",
  deja_groupe: "bg-ground text-muted",
  commandee: "bg-ground text-muted",
  non_ouvert: "bg-ground text-muted",
};

/** « Depuis un quantitatif » sans liste choisie : les listes de l'entreprise. */
export function ChoixDuQuantitatif() {
  const { data } = useResource(useCallback((s: AbortSignal) => api<{ items: { id: string; name: string }[] }>("/v1/projects?limit=30", { signal: s }), []));
  return (
    <div className="flex flex-col gap-4 lg:mx-auto lg:w-full lg:max-w-[40rem]">
      <PageTitle>Depuis un quantitatif</PageTitle>
      <p className="text-[16px] text-muted">Choisis la liste dont des lignes peuvent rejoindre un achat groupé.</p>
      {data === null ? (
        <Skeleton card="h-20" label="Chargement de tes listes…" />
      ) : data.items.length === 0 ? (
        <p className="text-[16px]">Aucune liste pour le moment.</p>
      ) : (
        <ul className={`${CARTE} flex flex-col`}>
          {data.items.map((p) => (
            <li key={p.id} className="border-b border-line last:border-b-0">
              <Link href={`/achats-groupes/quantitatif/${p.id}`} className="flex min-h-13 items-center gap-3 px-4 py-2 text-[16px] font-semibold">
                <span className="flex-1 break-words">{p.name}</span>
                <ChevronRight size={20} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface LigneChoisie {
  ligne: LigneQuantitatifV1;
  attributs: Record<string, string>;
  quantite: string;
  unite: string;
  parUnite: number | null;
  conversionConfirmee: boolean;
}

/**
 * DEPUIS UN QUANTITATIF (V5.2, écrans 3 et 8) : 1 sélectionner les lignes, classées par lot (correction ligne par ligne,
 * rien de coché d'office, quatre mentions avec leur raison) ; 2 vérifier et confirmer les besoins sélectionnés. Chaque
 * ligne rejoint ou ouvre SON achat groupé ; rien n'est créé avant le clic final.
 */
export function DepuisQuantitatifV1({ etat: etat0, projectId }: { etat: EtatV1; projectId: string }) {
  const router = useRouter();
  const [etat, setEtat] = useState(etat0);
  const fetcher = useCallback((s: AbortSignal) => api<{ nom: string; lignes: LigneQuantitatifV1[] }>(`/v1/ag/projects/${projectId}/lignes`, { signal: s }), [projectId]);
  const { data, setData, error } = useResource(fetcher);
  const [coches, setCoches] = useState<Set<string>>(new Set());
  const [precisions, setPrecisions] = useState<Record<string, Record<string, string>>>({});
  const [ouvertPreciser, setOuvertPreciser] = useState<string | null>(null);
  const [pourquoi, setPourquoi] = useState<string | null>(null);
  const [etape, setEtape] = useState<"selection" | "confirmer">("selection");
  const [choisies, setChoisies] = useState<LigneChoisie[]>([]);
  const [reception, setReception] = useState<"livraison" | "retrait" | null>(null);
  const [lieu, setLieu] = useState("");
  const [dateBesoin, setDateBesoin] = useState("");
  const [compat, setCompat] = useState<Record<string, CompatibiliteV1 | "erreur">>({});
  const [coche, setCoche] = useState(false);
  const [pending, setPending] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [cleIdempotence] = useState(newActionKey);

  /** Une ligne « À préciser » complétée ici devient sélectionnable (le serveur revérifie tout). */
  const lignes = useMemo(
    () =>
      (data?.lignes ?? []).map((l) => {
        const p = precisions[l.key];
        if (!p || l.mention !== "a_preciser" || !l.produit || !l.quantite) return l;
        const produit = etat.produits.find((x) => x.type === l.produit!.type)!;
        const attributs = { ...l.produit.attributs, ...p };
        if (!produit.caracteristiques.every((c) => attributs[c.attribut])) return l;
        return { ...l, produit: { ...l.produit, attributs, manquantes: [] }, mention: "compatible" as const, texte: "Compatible avec un achat groupé", pourquoi: "Produit précisé par toi.", selectionnable: true };
      }),
    [data, precisions, etat.produits],
  );
  const parLot = LOTS_V1.map((lot) => ({ lot, lignes: lignes.filter((l) => l.lot === lot.id) })).filter((g) => g.lignes.length > 0);
  const nb = lignes.filter((l) => coches.has(l.key) && l.selectionnable).length;

  async function changerLot(l: LigneQuantitatifV1, lot: string) {
    try {
      await api(`/v1/ag/projects/${projectId}/lignes/${encodeURIComponent(l.key)}/lot`, { method: "PUT", body: { lot } });
      setData((d) => (d ? { ...d, lignes: d.lignes.map((x) => (x.key === l.key ? { ...x, lot } : x)) } : d));
    } catch (e) {
      setErreur(messageErreur(e));
    }
  }

  function continuer() {
    setChoisies(
      lignes
        .filter((l) => coches.has(l.key) && l.selectionnable && l.produit && l.quantite)
        .map((l) => ({ ligne: l, attributs: l.produit!.attributs, quantite: String(l.quantite!.valeur), unite: l.quantite!.unite, parUnite: l.quantite!.conditionnement?.parDefaut ?? null, conversionConfirmee: false })),
    );
    setEtape("confirmer");
    window.scrollTo({ top: 0 });
  }

  // « Rejoindra » ou « Ouvrira » : la compatibilité de chaque ligne, dès que réception et date sont choisies.
  useEffect(() => {
    if (etape !== "confirmer" || !reception || !dateBesoin) return;
    let annule = false;
    void Promise.all(
      choisies.map(async (c) => {
        try {
          return [c.ligne.key, await api<CompatibiliteV1>("/v1/ag/compatibilite", { method: "POST", body: { type: c.ligne.produit!.type, attributs: c.attributs, reception, dateBesoin } })] as const;
        } catch {
          return [c.ligne.key, "erreur" as const] as const;
        }
      }),
    ).then((r) => {
      if (!annule) setCompat(Object.fromEntries(r));
    });
    return () => {
      annule = true;
    };
  }, [etape, choisies, reception, dateBesoin]);

  const pret = choisies.length > 0 && !!reception && lieu.trim().length >= 3 && !!dateBesoin && choisies.every((c) => Number(c.quantite.replace(",", ".")) > 0 && (!c.parUnite || c.conversionConfirmee) && compat[c.ligne.key] && compat[c.ligne.key] !== "erreur");

  async function confirmer() {
    setPending(true);
    setErreur(null);
    try {
      const r = await api<{ besoins: { id: string }[] }>("/v1/ag/besoins", {
        method: "POST",
        idempotencyKey: cleIdempotence,
        body: {
          confirmation: true,
          cleIdempotence,
          besoins: choisies.map((c) => {
            const k = compat[c.ligne.key] as CompatibiliteV1;
            return { type: c.ligne.produit!.type, attributs: c.attributs, quantite: Number(c.quantite.replace(",", ".")), unite: c.unite, parUnite: c.parUnite, conversionConfirmee: c.conversionConfirmee, reception, lieu, dateBesoin, achatId: k.compatible?.id ?? null, projectId, articleKey: c.ligne.key };
          }),
        },
      });
      router.push(r.besoins.length === 1 ? `/achats-groupes/besoins/${r.besoins[0]!.id}?nouveau=1` : "/achats-groupes/mes-besoins?nouveaux=1");
    } catch (e) {
      setErreur(messageErreur(e, e instanceof ApiError && e.reason === "besoin_identique" ? { besoin_identique: "Un achat groupé identique vient de s'ouvrir : vérifie à nouveau, chaque ligne le rejoindra." } : {}));
      if (e instanceof ApiError && e.reason === "besoin_identique") setCompat({});
      setPending(false);
    }
  }

  if (error) return <p role="alert" className="text-[16px] font-semibold text-danger">{messageErreur(error)}</p>;
  if (!data) return <Skeleton card="h-56" lines={3} label="Chargement de ta liste…" />;

  if (etape === "selection")
    return (
      <div className="flex flex-col gap-4 pb-44 lg:mx-auto lg:pb-0 lg:w-full lg:max-w-[44rem]">
        <p className="text-[15px] font-semibold text-muted">Depuis un quantitatif</p>
        <PageTitle>{data.nom}</PageTitle>
        <Button variant="secondary" className="self-start" disabled={!lignes.some((l) => l.mention === "recommande")} onClick={() => setCoches(new Set(lignes.filter((l) => l.mention === "recommande").map((l) => l.key)))}>
          Sélectionner les recommandations
        </Button>
        {parLot.map(({ lot, lignes: ls }) => (
          <section key={lot.id} aria-labelledby={`lot-${lot.id}`} className="flex flex-col gap-2">
            <h2 id={`lot-${lot.id}`} className="text-[20px] font-extrabold">
              {lot.libelle}
            </h2>
            <ul className={`${CARTE} flex flex-col`}>
              {ls.map((l) => {
                const produit = l.produit ? etat.produits.find((p) => p.type === l.produit!.type) : null;
                return (
                  <li key={l.key} className="flex flex-col gap-2 border-b border-line p-3 last:border-b-0">
                    <label className="flex items-start gap-3">
                      <input type="checkbox" disabled={!l.selectionnable} checked={coches.has(l.key) && l.selectionnable} onChange={() => setCoches((s) => { const n = new Set(s); if (n.has(l.key)) n.delete(l.key); else n.add(l.key); return n; })} className="mt-1 size-5 shrink-0 accent-accent disabled:opacity-40" />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-[16px] font-semibold break-words">{l.produit && l.selectionnable ? l.produit.nom : l.designation}</span>
                        <span className="text-[14px] text-muted">{l.quantiteListe !== null ? `${nf(l.quantiteListe)} ${l.unite}` : "Quantité à préciser"}</span>
                      </span>
                    </label>
                    <div className="flex flex-wrap items-center gap-2 pl-8">
                      <span className={`rounded-full px-3 py-1 text-[13px] font-bold ${TON[l.mention]}`}>{l.texte}</span>
                      <button type="button" onClick={() => setPourquoi(pourquoi === l.key ? null : l.key)} aria-expanded={pourquoi === l.key} className="min-h-11 text-[14px] font-semibold underline underline-offset-4">
                        Pourquoi ?
                      </button>
                      <label className="sr-only" htmlFor={`lot-${l.key}`}>
                        Lot de la ligne {l.designation}
                      </label>
                      <select id={`lot-${l.key}`} value={l.lot} onChange={(e) => void changerLot(l, e.target.value)} className="min-h-11 rounded-full border border-line bg-surface px-3 text-[14px] font-semibold">
                        {LOTS_V1.map((x) => (
                          <option key={x.id} value={x.id}>
                            Lot : {x.libelle}
                          </option>
                        ))}
                      </select>
                      {l.mention === "a_preciser" && produit && l.produit?.manquantes.length ? (
                        <button type="button" onClick={() => setOuvertPreciser(ouvertPreciser === l.key ? null : l.key)} className="min-h-11 text-[14px] font-semibold underline underline-offset-4">
                          Préciser
                        </button>
                      ) : null}
                    </div>
                    {pourquoi === l.key ? <p className="pl-8 text-[14px] text-muted">{l.pourquoi}</p> : null}
                    {ouvertPreciser === l.key && produit && l.produit ? (
                      <div className="pl-8">
                        <ChoixCaracteristiques produit={produit} attributs={{ ...l.produit.attributs, ...(precisions[l.key] ?? {}) }} onChange={(a) => setPrecisions((p) => ({ ...p, [l.key]: a }))} />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        {erreur ? (
          <p role="alert" className="text-[15px] font-semibold text-danger">
            {erreur}
          </p>
        ) : null}
        <div className="fixed inset-x-0 bottom-[calc(var(--nav-height)+var(--nav-gap))] z-20 border-t border-line bg-ground px-4 pt-3 pb-2 lg:static lg:border-t-0 lg:bg-transparent lg:p-0">
          {nb === 0 ? <p role="status" className="pb-2 text-center text-[14px] font-semibold text-ink">Coche au moins une ligne compatible pour continuer.</p> : null}
          <Button className="w-full" disabled={nb === 0} onClick={continuer}>
            {nb === 0 ? "Sélectionne des lignes" : `Continuer avec ${nb} ligne${nb > 1 ? "s" : ""}`}
          </Button>
        </div>
      </div>
    );

  const plusieurs = choisies.length > 1;
  return (
    <div className="flex flex-col gap-4 pb-44 lg:mx-auto lg:pb-0 lg:w-full lg:max-w-[44rem]">
      <p className="text-[15px] font-semibold text-muted">Depuis un quantitatif</p>
      <PageTitle>{plusieurs ? `Confirmer mes ${choisies.length} besoins` : "Confirmer mon besoin"}</PageTitle>
      <div className={`${CARTE} flex flex-col gap-4 p-4`}>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[14px] font-semibold">Réception (obligatoire)</legend>
          {(["livraison", "retrait"] as const).map((r) => (
            <label key={r} className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 ${reception === r ? "border-ink" : "border-line"}`}>
              <input type="radio" name="reception" checked={reception === r} onChange={() => setReception(r)} className="size-5 accent-accent" />
              <span className="text-[16px]">{r === "livraison" ? "Livraison sur chantier" : "Retrait au dépôt"}</span>
            </label>
          ))}
        </fieldset>
        <div className="flex flex-col gap-2">
          <label htmlFor="agq-lieu" className="text-[14px] font-semibold">
            {reception === "retrait" ? "Lieu de retrait (privé)" : "Lieu de livraison (privé)"}
          </label>
          <input id="agq-lieu" value={lieu} onChange={(e) => setLieu(e.target.value)} placeholder="Adresse ou commune exacte" className={INPUT} />
        </div>
        <LigneZone zone={etat.zone} />
        <Note>{PHRASE_ADRESSE_PRIVEE}</Note>
        <div className="flex flex-col gap-2">
          <label htmlFor="agq-date" className="text-[14px] font-semibold">
            J&apos;ai besoin de ces matériaux avant le
          </label>
          <input id="agq-date" type="date" min={jourDans(21)} value={dateBesoin} onChange={(e) => setDateBesoin(e.target.value)} className={INPUT} />
        </div>
      </div>
      <ul aria-label="Besoins à confirmer" className="flex flex-col gap-3">
        {choisies.map((c, i) => {
          const produit = etat.produits.find((p) => p.type === c.ligne.produit!.type)!;
          const cond = produit.conditionnements.find((x) => x.unite.code === c.unite) ?? null;
          const q = Number(c.quantite.replace(",", "."));
          const k = compat[c.ligne.key];
          const maj = (v: Partial<LigneChoisie>) => setChoisies((cs) => cs.map((x, j) => (j === i ? { ...x, ...v } : x)));
          return (
            <li key={c.ligne.key} className={`${CARTE} flex flex-col gap-2 p-4`}>
              <p className="text-[17px] font-bold break-words">{c.ligne.produit!.nom}</p>
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor={`agq-q-${i}`} className="sr-only">
                  Quantité
                </label>
                <input id={`agq-q-${i}`} inputMode="decimal" value={c.quantite} onChange={(e) => maj({ quantite: e.target.value })} className={`${INPUT} w-28`} />
                <span className="text-[15px]">
                  {(cond?.unite ?? produit.unite).pluriel}
                  {cond && c.parUnite && q > 0 ? ` = ${nf(q * c.parUnite)} ${produit.unite.pluriel}` : ""} · lot {libelleLot(c.ligne.lot)}
                </span>
              </div>
              {cond ? <ConfirmerConditionnement produit={produit} unite={c.unite} parUnite={c.parUnite} confirme={c.conversionConfirmee} onChange={(v) => maj({ parUnite: v.parUnite, conversionConfirmee: v.confirme })} /> : null}
              <p className="text-[15px] text-muted">
                {etat.zone ? `Zone ${zoneLisible(etat.zone)}` : "Zone à renseigner"}
                {dateBesoin ? ` · avant le ${dateCourte(dateBesoin)}` : ""}
              </p>
              {k && k !== "erreur" ? (
                k.compatible ? (
                  <p className="text-[15px] font-bold">Rejoindra cet achat groupé après confirmation</p>
                ) : k.ouverture.possible ? (
                  <p className="text-[15px] font-bold">Ouvrira un nouvel achat groupé après confirmation</p>
                ) : (
                  <p className="text-[15px] font-semibold text-danger">{k.ouverture.message}</p>
                )
              ) : k === "erreur" ? (
                <p className="text-[15px] font-semibold text-danger">Vérification impossible pour cette ligne.</p>
              ) : null}
              {k && k !== "erreur" && !k.compatible ? (
                <button type="button" onClick={() => setChoisies((cs) => cs.filter((_, j) => j !== i))} className="min-h-11 self-start text-[15px] font-semibold underline underline-offset-4">
                  Garder cette ligne dans mon quantitatif
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
      {!etat.verification.complete ? <VerificationEntreprise etat={etat} onChange={setEtat} /> : null}
      <label className="flex items-start gap-3 rounded-xl border border-line bg-surface p-3">
        <input type="checkbox" checked={coche} onChange={(e) => setCoche(e.target.checked)} className="mt-1 size-5 shrink-0 accent-accent" />
        <span className="text-[15px] leading-relaxed">{plusieurs ? CASE_PLUSIEURS_LIGNES : CASE_UNE_LIGNE(dateBesoin ? dateLongue(dateBesoin) : "…")}</span>
      </label>
      {erreur ? (
        <p role="alert" className="text-[15px] font-semibold text-danger">
          {erreur}
        </p>
      ) : null}
      <div className="fixed inset-x-0 bottom-[calc(var(--nav-height)+var(--nav-gap))] z-20 flex flex-col gap-2 border-t border-line bg-ground px-4 pt-3 pb-2 lg:static lg:border-t-0 lg:bg-transparent lg:p-0">
        {/* Greg, 7 novembre 2026 : la raison d'un bouton désactivé se lit tout de suite. */}
        {!pret || !etat.verification.complete || !coche ? (
          <p role="status" className="text-center text-[14px] font-semibold text-ink">
            {!reception || lieu.trim().length < 3 || !dateBesoin
              ? `Il manque ${[!reception ? "livraison ou retrait" : null, lieu.trim().length < 3 ? "le lieu" : null, !dateBesoin ? "la date de besoin" : null].filter(Boolean).join(", ")}.`
              : !pret
                ? "Vérifie la quantité et le conditionnement de chaque ligne."
                : !etat.verification.complete
                  ? "Complète la vérification ci-dessus : SIRET, e-mail, qualité."
                  : "Coche la case pour confirmer."}
          </p>
        ) : null}
        <Button className="w-full" pending={pending} disabled={!coche || !pret || !etat.verification.complete} onClick={() => void confirmer()}>
          {plusieurs ? `Confirmer mes ${choisies.length} besoins` : "Confirmer mon besoin"}
        </Button>
        <button type="button" onClick={() => setEtape("selection")} className="min-h-11 self-center text-[15px] font-semibold underline underline-offset-4">
          Revenir à la sélection
        </button>
      </div>
    </div>
  );
}
