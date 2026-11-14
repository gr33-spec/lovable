"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { CARTE, LigneZone, Note, VerificationEntreprise, Volumes } from "@/components/ag-v1-commun";
import { Button, INPUT, PageTitle } from "@/components/ui";
import { api, ApiError, messageErreur, newActionKey } from "@/lib/api";
import { CASE_UNE_LIGNE, dateCourte, dateLongue, jourDans, libelleLot, PHRASE_ADRESSE_PRIVEE, zoneLisible, type BesoinV1, type CompatibiliteV1, type EtatV1, type ProduitV1 } from "@/lib/ag-v1";

type Etape = "produit" | "quantite" | "resultat" | "raison" | "verification" | "confirmer";

const nf = (n: number) => n.toLocaleString("fr-FR").replace(/ | /g, " ");
const unitesDe = (n: number, u: { singulier: string; pluriel: string }) => (n >= 2 ? u.pluriel : u.singulier);

/** Le choix exact du produit : chaque caractéristique indispensable, et seulement elles. */
export function ChoixCaracteristiques({ produit, attributs, onChange }: { produit: ProduitV1; attributs: Record<string, string>; onChange: (a: Record<string, string>) => void }) {
  return (
    <div className={`${CARTE} flex flex-col`}>
      {produit.caracteristiques.map((c) => {
        const id = `ag-${c.attribut}`;
        const manque = !attributs[c.attribut];
        return (
          <div key={c.attribut} className="flex flex-col gap-1 border-b border-line px-4 py-3 last:border-b-0">
            <label htmlFor={id} className="text-[14px] font-semibold text-muted">
              {c.libelle}
            </label>
            <select id={id} value={attributs[c.attribut] ?? ""} onChange={(e) => onChange({ ...attributs, [c.attribut]: e.target.value })} className={`${INPUT} ${manque ? "border-warn" : ""}`}>
              <option value="">À préciser</option>
              {c.options.map((o) => (
                <option key={o.valeur} value={o.valeur}>
                  {o.libelle}
                </option>
              ))}
              {attributs[c.attribut] && !c.options.some((o) => o.valeur === attributs[c.attribut]) ? <option value={attributs[c.attribut]}>{attributs[c.attribut]}</option> : null}
            </select>
            {manque ? <p className="text-[14px] font-semibold text-warn">Précise {c.libelle.toLowerCase() === "choix" ? "le choix" : `${/^[aeéiou]/i.test(c.libelle) ? "l'" : "la "}${c.libelle.toLowerCase()}`} pour rejoindre un achat groupé.</p> : null}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Le produit d'un achat déjà ouvert par d'autres entreprises, en lecture seule (Greg, 8 novembre 2026) : on le rejoint
 * tel quel ; un produit différent passe par Mobiiz et ouvre un autre achat.
 */
function ProduitVerrouille({ produit, attributs }: { produit: ProduitV1; attributs: Record<string, string> }) {
  return (
    <div className={`${CARTE} flex flex-col gap-3 p-4`}>
      <p className="text-[15px] text-muted">Achat groupé ouvert par d&apos;autres entreprises : tu ajoutes ta quantité, le produit ne se modifie pas.</p>
      <dl aria-label="Produit de l'achat groupé" className="flex flex-col">
        {produit.caracteristiques.map((c) => (
          <div key={c.attribut} className="flex items-baseline justify-between gap-3 border-b border-line py-2 last:border-b-0">
            <dt className="text-[14px] text-muted">{c.libelle}</dt>
            <dd className="text-right text-[15px] font-semibold">{c.options.find((o) => o.valeur === attributs[c.attribut])?.libelle ?? attributs[c.attribut]}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** « 1 palette = 480 pièces » : visible, vérifiable ; confirmé par l'artisan ou corrigé, jamais supposé. */
export function ConfirmerConditionnement({ produit, unite, parUnite, confirme, onChange }: { produit: ProduitV1; unite: string; parUnite: number | null; confirme: boolean; onChange: (v: { parUnite: number | null; confirme: boolean }) => void }) {
  const c = produit.conditionnements.find((x) => x.unite.code === unite);
  const [corriger, setCorriger] = useState(parUnite === null);
  if (!c) return null;
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-ground p-3">
      <p className="text-[15px]">
        <span className="font-semibold">Conditionnement</span>{" "}
        {parUnite ? (
          <>
            1 {c.unite.singulier} = {nf(parUnite)} {unitesDe(parUnite, produit.unite)} · {confirme ? "confirmé par toi" : "non garanti par une référence"}
          </>
        ) : (
          <>combien de {produit.unite.pluriel} par {c.unite.singulier} ?</>
        )}
      </p>
      {corriger ? (
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="ag-par-unite" className="text-[15px]">
            {produit.unite.pluriel} par {c.unite.singulier}
          </label>
          <input id="ag-par-unite" type="number" inputMode="numeric" min={1} value={parUnite ?? ""} onChange={(e) => onChange({ parUnite: e.target.value ? Number(e.target.value) : null, confirme: false })} className={`${INPUT} w-32`} />
          <Button variant="secondary" disabled={!parUnite} onClick={() => { setCorriger(false); onChange({ parUnite, confirme: true }); }}>
            Valider
          </Button>
        </div>
      ) : !confirme && parUnite ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="ink" onClick={() => onChange({ parUnite, confirme: true })}>
            Confirmer {nf(parUnite)} {produit.unite.pluriel} par {c.unite.singulier}
          </Button>
          <Button variant="secondary" onClick={() => setCorriger(true)}>
            Corriger
          </Button>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-[14px] font-semibold text-ok">
          <Check size={16} aria-hidden="true" /> Conditionnement confirmé.{" "}
          <button type="button" className="min-h-11 text-ink underline underline-offset-4" onClick={() => setCorriger(true)}>
            Corriger
          </button>
        </p>
      )}
    </div>
  );
}

/**
 * L'ENTRÉE DIRECTE PAR PRODUIT (V5.2, écrans 2, 4, 5) : 1 choisir précisément le produit ; 2 quantité, livraison ou
 * retrait, date ; 3 rejoindre l'achat compatible (ou en ouvrir un s'il n'y en a pas), puis confirmer. La vérification de
 * l'entreprise n'apparaît que la première fois, avant la confirmation. Rien n'est créé avant le clic final.
 */
export function ParcoursDirectV1({ etat: etat0 }: { etat: EtatV1 }) {
  const router = useRouter();
  const params = useSearchParams();
  const [etat, setEtat] = useState(etat0);
  const initial = params.get("type");
  const [type] = useState<string | null>(initial && etat.produits.some((p) => p.type === initial) ? initial : null);
  const produit = etat.produits.find((p) => p.type === type) ?? null;
  const [attributs, setAttributs] = useState<Record<string, string>>(() => {
    const p = etat.produits.find((x) => x.type === initial);
    return p ? Object.fromEntries(p.caracteristiques.map((c) => [c.attribut, params.get(c.attribut) ?? ""]).filter(([, v]) => v)) : {};
  });
  const [etape, setEtape] = useState<Etape>("produit");
  // Venu de la carte d'un achat ouvert : le produit des autres entreprises ne se modifie pas, on ajoute sa quantité.
  const verrouille = !!params.get("achat") && !!produit && produit.caracteristiques.every((c) => attributs[c.attribut]);
  // Le besoin dit dans la conversation Mobiiz arrive prérempli (quantité, unité, réception, date) ; tout reste modifiable.
  const uniteDite = params.get("unite");
  const [unite, setUnite] = useState<string>(() => (uniteDite && produit && [produit.unite.code, ...produit.conditionnements.map((c) => c.unite.code)].includes(uniteDite) ? uniteDite : (produit?.conditionnements[0]?.unite.code ?? produit?.unite.code ?? "")));
  const [parUnite, setParUnite] = useState<number | null>(() => produit?.conditionnements[0]?.parDefaut ?? null);
  const [conversionConfirmee, setConversionConfirmee] = useState(false);
  const [quantite, setQuantite] = useState(() => params.get("quantite") ?? "");
  const [reception, setReception] = useState<"livraison" | "retrait" | null>(() => (params.get("reception") === "livraison" || params.get("reception") === "retrait" ? (params.get("reception") as "livraison" | "retrait") : null));
  const [lieu, setLieu] = useState("");
  const [dateBesoin, setDateBesoin] = useState(() => (/^\d{4}-\d{2}-\d{2}$/.test(params.get("date") ?? "") ? params.get("date")! : ""));
  const [contraintes, setContraintes] = useState("");
  const [compat, setCompat] = useState<CompatibiliteV1 | null>(null);
  const [rejoindre, setRejoindre] = useState<string | null>(null);
  const [identique, setIdentique] = useState(false);
  const [raison, setRaison] = useState<string | null>(null);
  const [apresRaison, setApresRaison] = useState(false);
  const [coche, setCoche] = useState(false);
  const [pending, setPending] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [cleIdempotence] = useState(newActionKey);

  const complet = !!produit && produit.caracteristiques.every((c) => attributs[c.attribut]);
  const cond = produit?.conditionnements.find((c) => c.unite.code === unite) ?? null;
  const q = Number(quantite.replace(",", "."));
  const qOk = Number.isFinite(q) && q > 0;
  const conversionOk = !cond || (!!parUnite && conversionConfirmee);
  const nomExact = compat?.produit.nom ?? produit?.libelle ?? "";
  const quantiteLisible = produit && qOk ? (cond && parUnite ? `${nf(q)} ${unitesDe(q, cond.unite)} = ${nf(q * parUnite)} ${unitesDe(q * parUnite, produit.unite)}` : `${nf(q)} ${unitesDe(q, produit.unite)}`) : "";


  async function chercher() {
    if (!produit || !reception || !dateBesoin) return;
    setPending(true);
    setErreur(null);
    try {
      const c = await api<CompatibiliteV1>("/v1/ag/compatibilite", { method: "POST", body: { type: produit.type, attributs, reception, dateBesoin } });
      // Revenu de « ne me convient pas » sans vraie différence : le même achat correspond encore.
      setIdentique(apresRaison && !!c.compatible && c.compatible.id === compat?.compatible?.id);
      setApresRaison(false);
      setCompat(c);
      setRejoindre(null);
      setEtape("resultat");
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setPending(false);
    }
  }

  function suite(achatId: string | null) {
    setRejoindre(achatId);
    setEtape(etat.verification.complete ? "confirmer" : "verification");
  }

  async function confirmer() {
    if (!produit || !reception) return;
    setPending(true);
    setErreur(null);
    try {
      const r = await api<{ besoins: BesoinV1[] }>("/v1/ag/besoins", {
        method: "POST",
        idempotencyKey: cleIdempotence,
        body: { confirmation: true, cleIdempotence, besoins: [{ type: produit.type, attributs, quantite: q, unite, parUnite: cond ? parUnite : null, conversionConfirmee: cond ? conversionConfirmee : false, reception, lieu, contraintes: contraintes || null, dateBesoin, achatId: rejoindre }] },
      });
      router.push(`/achats-groupes/besoins/${r.besoins[0]!.id}?nouveau=1`);
    } catch (e) {
      if (e instanceof ApiError && e.reason === "besoin_identique") {
        await chercher();
        setIdentique(true);
      } else setErreur(messageErreur(e));
      setPending(false);
    }
  }

  const manqueQuantite = [!qOk ? "la quantité" : null, !reception ? "livraison ou retrait" : null, lieu.trim().length < 3 ? "le lieu" : null, !dateBesoin ? "la date de besoin" : null].filter(Boolean);
  const bloque =
    etape === "produit" && produit && !complet
      ? "Choisis toutes les caractéristiques pour continuer."
      : etape === "produit" && produit && !conversionOk
        ? "Confirme ou corrige le conditionnement pour continuer."
        : etape === "quantite" && !etat.zone
          ? "Ajoute l'adresse de ton entreprise (code postal) dans Profil pour continuer."
          : etape === "quantite" && manqueQuantite.length
            ? `Il manque ${manqueQuantite.join(", ")}.`
            : etape === "resultat" && compat && !compat.compatible && !compat.ouverture.possible
              ? compat.ouverture.message
              : etape === "raison" && !raison
                ? "Choisis une raison pour continuer."
                : etape === "verification" && !etat.verification.complete
                  ? "Complète les trois points ci-dessus pour continuer."
                  : etape === "confirmer" && !coche
                    ? "Coche la case pour confirmer."
                    : null;
  const titre = etape === "produit" ? (verrouille ? "Ajoute ta quantité" : "Choisis précisément le produit") : etape === "quantite" ? "Combien, où et pour quand ?" : etape === "resultat" ? (compat?.compatible ? "Un achat groupé correspond" : "Aucun achat groupé compatible pour le moment") : etape === "raison" ? "Pourquoi cet achat groupé ne te convient pas ?" : etape === "verification" ? "Ton entreprise" : "Confirmer mon besoin";

  return (
    <div className="flex flex-col gap-4 pb-44 lg:mx-auto lg:pb-0 lg:w-full lg:max-w-[40rem]">
      <PageTitle>{titre}</PageTitle>
      {etape !== "produit" && produit ? <p className="text-[16px] font-semibold break-words">{nomExact || produit.libelle}</p> : null}

      {etape === "produit" ? (
        <>
          {!produit ? (
            // Greg, 8 novembre 2026 : plus de catalogue ; un produit inconnu renvoie à Mobiiz.
            <p className={`${CARTE} p-4 text-[15px]`}>
              Ce produit n&apos;est pas reconnu.{" "}
              <Link href="/achats-groupes/nouveau" className="font-semibold underline underline-offset-4">
                Dis ton besoin à Mobiiz
              </Link>
              .
            </p>
          ) : (
            <>
              <p className="text-[15px] text-muted">
                {libelleLot(produit.lot)} › {produit.libelle}
              </p>
              {verrouille ? <ProduitVerrouille produit={produit} attributs={attributs} /> : <ChoixCaracteristiques produit={produit} attributs={attributs} onChange={setAttributs} />}
              {produit.conditionnements.length ? (
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-1 text-[15px] font-semibold">Je compte en</legend>
                  <div className="flex flex-wrap gap-2">
                    {[...produit.conditionnements.map((c) => c.unite), produit.unite].map((u) => (
                      <label key={u.code} className={`flex min-h-11 items-center gap-2 rounded-full border px-4 text-[15px] ${unite === u.code ? "border-ink font-bold" : "border-line"}`}>
                        <input type="radio" name="unite" className="sr-only" checked={unite === u.code} onChange={() => setUnite(u.code)} />
                        {u.pluriel}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : null}
              {cond ? <ConfirmerConditionnement produit={produit} unite={unite} parUnite={parUnite} confirme={conversionConfirmee} onChange={(v) => { setParUnite(v.parUnite); setConversionConfirmee(v.confirme); }} /> : null}
            </>
          )}
          {verrouille ? (
            <Link href="/achats-groupes/nouveau" className="min-h-11 self-center py-2 text-center text-[15px] font-semibold underline underline-offset-4">
              Pas exactement ton produit ? Dis-le à Mobiiz
            </Link>
          ) : (
            <Link href="/achats-groupes" className="min-h-11 self-center py-2 text-[15px] font-semibold underline underline-offset-4">
              Je ne trouve pas mon produit
            </Link>
          )}
        </>
      ) : null}

      {etape === "quantite" && produit ? (
        <>
          <div className={`${CARTE} flex flex-col gap-4 p-4`}>
            <div className="flex flex-col gap-2">
              <label htmlFor="ag-quantite" className="text-[14px] font-semibold">
                Quantité ({(cond?.unite ?? produit.unite).pluriel})
              </label>
              <input id="ag-quantite" inputMode="decimal" value={quantite} onChange={(e) => setQuantite(e.target.value)} className={INPUT} />
              {quantiteLisible ? <p className="text-[15px] font-semibold">{quantiteLisible}</p> : null}
            </div>
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
              <label htmlFor="ag-lieu" className="text-[14px] font-semibold">
                {reception === "retrait" ? "Lieu de retrait (privé)" : "Lieu de livraison (privé)"}
              </label>
              <input id="ag-lieu" value={lieu} onChange={(e) => setLieu(e.target.value)} placeholder="Adresse ou commune exacte" className={INPUT} />
            </div>
            <LigneZone zone={etat.zone} />
            <Note>{PHRASE_ADRESSE_PRIVEE}</Note>
            <div className="flex flex-col gap-2">
              <label htmlFor="ag-date" className="text-[14px] font-semibold">
                J&apos;ai besoin de ces matériaux avant le
              </label>
              <input id="ag-date" type="date" min={jourDans(21)} value={dateBesoin} onChange={(e) => setDateBesoin(e.target.value)} className={INPUT} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="ag-contraintes" className="text-[14px] font-semibold">
                Contraintes de livraison (facultatif)
              </label>
              <input id="ag-contraintes" value={contraintes} onChange={(e) => setContraintes(e.target.value)} placeholder="Camion 19 t maximum" className={INPUT} />
            </div>
          </div>
        </>
      ) : null}

      {etape === "resultat" && compat && produit ? (
        compat.compatible ? (
          <div className={`${CARTE} flex flex-col gap-3 p-4`}>
            <p className="text-[15px] text-muted">
              Zone : {zoneLisible(compat.compatible.zone)} · ouvert jusqu&apos;au {dateCourte(compat.compatible.ouvertJusquau)}
            </p>
            <Volumes achat={compat.compatible} comprendre />
            {identique ? (
              <p role="status" className="rounded-xl bg-warn-bg p-3 text-[15px] font-semibold text-warn">
                {compat.phraseIdentique}
              </p>
            ) : null}
          </div>
        ) : (
          <div className={`${CARTE} flex flex-col gap-3 p-4`}>
            <p className="text-[15px] font-semibold">
              {quantiteLisible} · zone {zoneLisible(compat.zone)}
            </p>
            {compat.ouverture.possible ? (
              <p className="text-[16px] leading-relaxed">
                Tu peux ouvrir ce besoin jusqu&apos;au {dateCourte(compat.ouverture.ouvertJusquau)}. D&apos;autres entreprises de {compat.zone.nom} pourront le rejoindre. Ce n&apos;est pas une commande : tu décideras après réception d&apos;une offre complète.
              </p>
            ) : (
              <p role="alert" className="text-[16px] font-semibold text-danger">
                {compat.ouverture.message}
              </p>
            )}
            <Note>Les premiers achats groupés se forment avec les premiers besoins ouverts.</Note>
          </div>
        )
      ) : null}

      {etape === "raison" ? (
        <fieldset className={`${CARTE} flex flex-col gap-2 p-4`}>
          <legend className="sr-only">Pourquoi cet achat groupé ne te convient pas ?</legend>
          {etat.raisons.map((r) => (
            <label key={r.id} className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 ${raison === r.id ? "border-ink" : "border-line"}`}>
              <input type="radio" name="raison" checked={raison === r.id} onChange={() => setRaison(r.id)} className="size-5 accent-accent" />
              <span className="text-[16px]">{r.libelle}</span>
            </label>
          ))}
          <Note>Précise ensuite ta vraie différence : un nouvel achat groupé ne s&apos;ouvre que si elle existe. Deux achats identiques ne divisent jamais les volumes.</Note>
        </fieldset>
      ) : null}

      {etape === "verification" ? <VerificationEntreprise etat={etat} onChange={setEtat} sansTitre /> : null}

      {etape === "confirmer" && produit && compat ? (
        <>
          <div className={`${CARTE} flex flex-col gap-1 p-4`}>
            <p className="text-[17px] font-bold break-words">{nomExact}</p>
            <p className="text-[15px]">
              {quantiteLisible} · lot {libelleLot(produit.lot)}
            </p>
            <p className="text-[15px] text-muted">
              Zone {zoneLisible(compat.zone)} · avant le {dateCourte(dateBesoin)} · {reception === "retrait" ? "retrait au dépôt" : "livraison sur chantier"}
            </p>
            <p className="mt-1 text-[15px] font-bold">{rejoindre ? "Rejoindra cet achat groupé après confirmation" : "Ouvrira un nouvel achat groupé après confirmation"}</p>
          </div>
          <label className="flex items-start gap-3 rounded-xl border border-line bg-surface p-3">
            <input type="checkbox" checked={coche} onChange={(e) => setCoche(e.target.checked)} className="mt-1 size-5 shrink-0 accent-accent" />
            <span className="text-[15px] leading-relaxed">{CASE_UNE_LIGNE(dateLongue(dateBesoin))}</span>
          </label>
        </>
      ) : null}

      {erreur ? (
        <p role="alert" className="text-[15px] font-semibold text-danger">
          {erreur}
        </p>
      ) : null}

      <div className="fixed inset-x-0 bottom-[calc(var(--nav-height)+var(--nav-gap))] z-20 flex flex-col gap-2 border-t border-line bg-ground px-4 pt-3 pb-2 lg:static lg:border-t-0 lg:bg-transparent lg:p-0">
        {/* Greg, 7 novembre 2026 : la raison d'un bouton désactivé se lit tout de suite, juste au-dessus de lui. */}
        {bloque ? (
          <p role="status" className="text-center text-[14px] font-semibold text-ink">
            {bloque}
          </p>
        ) : null}
        {etape === "produit" && produit ? (
          <Button className="w-full" disabled={!complet || !conversionOk} onClick={() => setEtape("quantite")}>
            Continuer
          </Button>
        ) : null}
        {etape === "quantite" ? (
          <Button className="w-full" pending={pending} disabled={!qOk || !reception || lieu.trim().length < 3 || !dateBesoin || !etat.zone} onClick={() => void chercher()}>
            Continuer
          </Button>
        ) : null}
        {etape === "resultat" && compat ? (
          compat.compatible ? (
            <>
              <Button className="w-full" onClick={() => suite(compat.compatible!.id)}>
                Rejoindre cet achat groupé
              </Button>
              {!identique ? (
                <Button variant="secondary" className="w-full" onClick={() => setEtape("raison")}>
                  Cet achat groupé ne me convient pas
                </Button>
              ) : null}
            </>
          ) : (
            <Button className="w-full" disabled={!compat.ouverture.possible} onClick={() => suite(null)}>
              Ouvrir cet achat groupé
            </Button>
          )
        ) : null}
        {etape === "raison" ? (
          <Button className="w-full" disabled={!raison} onClick={() => { setApresRaison(true); setEtape(raison === "produit" ? "produit" : "quantite"); }}>
            {raison === "produit" ? "Préciser la caractéristique" : raison === "reception" ? "Changer livraison ou retrait" : "Changer ma date"}
          </Button>
        ) : null}
        {etape === "verification" ? (
          <Button className="w-full" disabled={!etat.verification.complete} onClick={() => setEtape("confirmer")}>
            Continuer
          </Button>
        ) : null}
        {etape === "confirmer" ? (
          <Button className="w-full" pending={pending} disabled={!coche} onClick={() => void confirmer()}>
            Confirmer mon besoin
          </Button>
        ) : null}
      </div>
    </div>
  );
}

