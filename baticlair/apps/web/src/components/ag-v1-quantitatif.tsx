"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CARTE, LigneZone, Note, VerificationEntreprise } from "@/components/ag-v1-commun";
import { ChoixCaracteristiques, ConfirmerConditionnement } from "@/components/ag-v1-direct";
import { Button, INPUT, PageTitle, Skeleton } from "@/components/ui";
import { api, ApiError, messageErreur, newActionKey } from "@/lib/api";
import { CASE_PLUSIEURS_LIGNES, CASE_UNE_LIGNE, dateCourte, dateLongue, jourDans, libelleLot, LOTS_PRINCIPAUX_V1, LOTS_V1, PHRASE_ADRESSE_PRIVEE, zoneLisible, type CompatibiliteV1, type EtatV1, type LigneQuantitatifV1 } from "@/lib/ag-v1";
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

/** La raison d'un article qu'on ne peut pas cocher, en une phrase simple. */
const RAISON_SIMPLE: Partial<Record<LigneQuantitatifV1["mention"], string>> = {
  demande_individuelle: "Déjà envoyé à tes négoces en demande de prix.",
  deja_groupe: "Déjà dans un achat groupé.",
  commandee: "Déjà commandé.",
  non_ouvert: "Pas encore proposé en achat groupé : il reste pour tes négoces.",
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
  const [blocage, setBlocage] = useState<string | null>(null);
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
  // Les lignes qu'on ne peut pas grouper (déjà demandées, pas encore ouvertes…) sont repliées en bas : rien n'est caché.
  const groupables = (l: LigneQuantitatifV1) => l.selectionnable || l.mention === "a_preciser";
  const duLot = (id: string) => lignes.filter((l) => l.lot === id && groupables(l));
  const parLotGroupables = LOTS_PRINCIPAUX_V1.map((lot) => ({ lot, lignes: duLot(lot.id), sous: lot.sous.map((x) => ({ lot: x, lignes: duLot(x.id) })).filter((x) => x.lignes.length > 0) })).filter((g) => g.lignes.length > 0 || g.sous.length > 0);
  const nonGroupables = lignes.filter((l) => !groupables(l));
  const nb = lignes.filter((l) => coches.has(l.key) && l.selectionnable).length;

  /** Coche ou décoche ; sur un article à préciser, ouvre la précision (ou la raison) au lieu de ne rien faire. */
  function basculer(l: LigneQuantitatifV1, precisable: boolean) {
    if (l.selectionnable) {
      setCoches((s) => {
        const n = new Set(s);
        if (n.has(l.key)) n.delete(l.key);
        else n.add(l.key);
        return n;
      });
      return;
    }
    // L'intention est gardée : dès que la précision est complète, l'article est coché.
    setCoches((s) => new Set(s).add(l.key));
    setBlocage(l.key);
    if (precisable) setOuvertPreciser(l.key);
    else setPourquoi(l.key);
  }

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
      // UX simplifiée (Greg, 8 novembre 2026) : retour à l'onglet « Achats groupés », les besoins en tête.
      router.push(`/achats-groupes?ajoutes=${r.besoins.length}`);
    } catch (e) {
      setErreur(messageErreur(e, e instanceof ApiError && e.reason === "besoin_identique" ? { besoin_identique: "Un achat groupé identique vient de s'ouvrir : vérifie à nouveau, chaque ligne le rejoindra." } : {}));
      if (e instanceof ApiError && e.reason === "besoin_identique") setCompat({});
      setPending(false);
    }
  }

  if (error) return <p role="alert" className="text-[16px] font-semibold text-danger">{messageErreur(error)}</p>;
  if (!data) return <Skeleton card="h-56" lines={3} label="Chargement de ta liste…" />;

  const rangee = (l: LigneQuantitatifV1) => {
                const produit = l.produit ? etat.produits.find((p) => p.type === l.produit!.type) : null;
                return (
                  <li key={l.key} className="flex flex-col gap-2 border-b border-line p-3 last:border-b-0">
                    {/* Greg, 12 novembre 2026 : « la case ne réagit pas ». Aucun appui n'est ignoré : un article à préciser
                        ouvre ce qui manque, dit pourquoi, et se coche tout seul dès que la précision est donnée. */}
                    <label className="flex min-h-12 cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        aria-describedby={blocage === l.key ? `blocage-${l.key}` : undefined}
                        checked={coches.has(l.key) && l.selectionnable}
                        onChange={() => basculer(l, !!(produit && l.produit?.manquantes.length))}
                        className="mt-0.5 size-6 shrink-0 accent-accent"
                      />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="text-[16px] font-semibold break-words">{l.produit && l.selectionnable ? l.produit.nom : l.designation}</span>
                        <span className="text-[14px] text-muted">{l.quantiteListe !== null ? `${nf(l.quantiteListe)} ${l.unite}` : "Quantité à préciser"}</span>
                      </span>
                    </label>
                    {blocage === l.key && !l.selectionnable ? (
                      <p id={`blocage-${l.key}`} role="status" className="ml-9 rounded-xl bg-warn-bg px-3 py-2 text-[14px] font-semibold text-warn">
                        {produit && l.produit?.manquantes.length ? `Il manque : ${l.produit.manquantes.map((m) => m.libelle.toLowerCase()).join(", ")}. Choisis ci-dessous : l'article sera coché aussitôt.` : "Cet article ne peut pas encore être coché. La raison est juste en dessous."}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2 pl-9">
                      <span className={`rounded-full px-3 py-1 text-[13px] font-bold ${TON[l.mention]}`}>{l.texte}</span>
                      <button type="button" onClick={() => setPourquoi(pourquoi === l.key ? null : l.key)} aria-expanded={pourquoi === l.key} className="min-h-11 text-[14px] font-semibold underline underline-offset-4">
                        Pourquoi ?
                      </button>
                      {l.mention === "a_preciser" && produit && l.produit?.manquantes.length ? (
                        <button type="button" onClick={() => setOuvertPreciser(ouvertPreciser === l.key ? null : l.key)} className="min-h-11 text-[14px] font-semibold underline underline-offset-4">
                          Préciser
                        </button>
                      ) : null}
                    </div>
                    {pourquoi === l.key ? (
                      <div className="flex flex-col gap-2 pl-8">
                        <p className="text-[14px] text-muted">{l.pourquoi}</p>
                        <label className="sr-only" htmlFor={`lot-${l.key}`}>
                          Lot de la ligne {l.designation}
                        </label>
                        <select id={`lot-${l.key}`} value={l.lot} onChange={(e) => void changerLot(l, e.target.value)} className="min-h-11 self-start rounded-full border border-line bg-surface px-3 text-[14px] font-semibold">
                          {LOTS_V1.map((x) => (
                            <option key={x.id} value={x.id}>
                              Lot : {libelleLot(x.id)}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                    {ouvertPreciser === l.key && produit && l.produit ? (
                      <div className="pl-8">
                        <ChoixCaracteristiques produit={produit} attributs={{ ...l.produit.attributs, ...(precisions[l.key] ?? {}) }} onChange={(a) => setPrecisions((p) => ({ ...p, [l.key]: a }))} />
                      </div>
                    ) : null}
                  </li>
                );
  };
  if (etape === "selection")
    return (
      <div className="flex flex-col gap-4 pb-44 lg:mx-auto lg:pb-0 lg:w-full lg:max-w-[44rem]">
        <p className="text-[15px] font-semibold text-muted">{data.nom}</p>
        <PageTitle>Quels articles grouper ?</PageTitle>
        <p className="text-[16px] text-muted">Coche les articles à acheter avec d&apos;autres artisans. Les autres restent dans ton quantitatif, pour tes négoces.</p>
        {lignes.some((l) => l.mention === "recommande") ? (
          <Button variant="secondary" className="self-start" onClick={() => setCoches(new Set(lignes.filter((l) => l.mention === "recommande").map((l) => l.key)))}>
            Cocher les articles conseillés
          </Button>
        ) : null}
        {parLotGroupables.map(({ lot, lignes: ls, sous }) => (
          <section key={lot.id} aria-labelledby={`lot-${lot.id}`} className="flex flex-col gap-2">
            <h2 id={`lot-${lot.id}`} className="text-[20px] font-extrabold">
              {lot.libelle}
            </h2>
            {ls.length ? <ul className={`${CARTE} flex flex-col`}>{ls.map(rangee)}</ul> : null}
            {/* Les sous-lots éventuels d'un lot (aucun depuis le 13 novembre 2026 : la zinguerie est un lot à part). */}
            {sous.map((s) => (
              <section key={s.lot.id} aria-labelledby={`lot-${s.lot.id}`} className="flex flex-col gap-2">
                <h3 id={`lot-${s.lot.id}`} className="text-[16px] font-extrabold text-muted">
                  {s.lot.libelle}
                </h3>
                <ul className={`${CARTE} flex flex-col`}>{s.lignes.map(rangee)}</ul>
              </section>
            ))}
          </section>
        ))}
        {nonGroupables.length ? (
          // « UNE LIGNE, UN SEUL CIRCUIT » (V5.2, Greg, 8 novembre 2026 : « explique simplement le blocage ») : un article
          // déjà envoyé à ses négoces ne se coche pas, et la raison se lit en une phrase. Le serveur refuse de toute façon.
          <details open={parLotGroupables.length === 0} className={`${CARTE} p-4`}>
            <summary className="min-h-11 cursor-pointer text-[15px] font-semibold">
              {nonGroupables.length} article{nonGroupables.length > 1 ? "s" : ""} ne peu{nonGroupables.length > 1 ? "vent" : "t"} pas être groupé{nonGroupables.length > 1 ? "s" : ""}
            </summary>
            {nonGroupables.some((l) => l.mention === "demande_individuelle" || l.mention === "deja_groupe") ? (
              <p className="mt-2 text-[14px] text-muted">Un article part soit chez tes négoces, soit en achat groupé, jamais les deux.</p>
            ) : null}
            <ul aria-label="Articles qui ne peuvent pas être groupés" className="mt-2 flex flex-col gap-2">
              {nonGroupables.map((l) => (
                <li key={l.key} className="flex flex-col">
                  <span className="text-[15px] font-semibold break-words">{l.designation}</span>
                  <span className="text-[14px] text-muted">{RAISON_SIMPLE[l.mention] ?? l.texte}</span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
        {erreur ? (
          <p role="alert" className="text-[15px] font-semibold text-danger">
            {erreur}
          </p>
        ) : null}
        <div className="fixed inset-x-0 bottom-[calc(var(--nav-height)+var(--nav-gap))] z-20 border-t border-line bg-ground px-4 pt-3 pb-2 lg:static lg:border-t-0 lg:bg-transparent lg:p-0">
          {nb === 0 ? <p role="status" className="pb-2 text-center text-[14px] font-semibold text-ink">Coche au moins un article pour continuer.</p> : null}
          <Button className="w-full" disabled={nb === 0} onClick={continuer}>
            {nb === 0 ? "Choisis des articles" : `Continuer avec ${nb} article${nb > 1 ? "s" : ""}`}
          </Button>
        </div>
      </div>
    );

  const plusieurs = choisies.length > 1;
  return (
    <div className="flex flex-col gap-4 pb-44 lg:mx-auto lg:pb-0 lg:w-full lg:max-w-[44rem]">
      <p className="text-[15px] font-semibold text-muted">{data.nom}</p>
      <PageTitle>Vérifie et valide</PageTitle>
      <p className="text-[16px] text-muted">Mobiiz met chaque article dans un achat groupé compatible, ou en ouvre un.</p>
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
                  <p className="text-[15px] font-bold">Rejoint un achat groupé ouvert</p>
                ) : k.ouverture.possible ? (
                  <p className="text-[15px] font-bold">Ouvre un nouvel achat groupé</p>
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
          {plusieurs ? `Valider mes ${choisies.length} articles` : "Valider"}
        </Button>
        <button type="button" onClick={() => setEtape("selection")} className="min-h-11 self-center text-[15px] font-semibold underline underline-offset-4">
          Revenir à la sélection
        </button>
      </div>
    </div>
  );
}
