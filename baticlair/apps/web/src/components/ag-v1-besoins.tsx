"use client";

import { MoreHorizontal, Plus } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { CARTE, Note, PastilleStatut, Volumes } from "@/components/ag-v1-commun";
import { Button, INPUT, PageTitle, Skeleton } from "@/components/ui";
import { api, messageErreur, newActionKey } from "@/lib/api";
import { dateCourte, dateLongue, heureCourte, jourDans, zoneLisible, type BesoinV1, type EtatV1 } from "@/lib/ag-v1";
import { useResource } from "@/lib/use-resource";

const nf = (n: number) => n.toLocaleString("fr-FR").replace(/ | /g, " ");
const euros = (n: number) => `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/ | /g, " ")} €`;

/** La ligne d'échéance d'un besoin, selon son statut (« Avant le 5 janvier, 18 h »…). */
function echeance(b: BesoinV1): string | null {
  if (b.statut.code === "preparation" && b.reconfirmerAvant) return b.etat === "reconfirme" ? "Quantité reconfirmée" : `Avant le ${heureCourte(b.reconfirmerAvant)}`;
  if (b.statut.code === "offre_a_examiner" && b.offreAvant) return `Réponse avant le ${heureCourte(b.offreAvant)}`;
  if (b.statut.code === "besoin_confirme") return `Modifiable jusqu'au ${dateCourte(b.achat.ouvertJusquau)}`;
  if (b.statut.code === "consultation_envoyee") return "Les négoces chiffrent";
  if (b.statut.code === "offre_verification") return "Mobiiz vérifie que l'offre est complète";
  if (b.statut.code === "renegociation") return "Mobiiz renégocie ou annule ; tu seras informé";
  if (b.statut.code === "besoin_indicatif") return "Pas transmis aux négoces";
  return null;
}

function CarteBesoin({ b }: { b: BesoinV1 }) {
  const [menu, setMenu] = useState(false);
  const href = `/achats-groupes/besoins/${b.id}`;
  const e = echeance(b);
  const bouton = b.actions.reconfirmer ? "Reconfirmer ma quantité" : b.statut.code === "offre_a_examiner" ? "Voir l'offre" : b.actions.confirmer ? "Confirmer" : null;
  return (
    <li className={`${CARTE} flex flex-col gap-2 p-4`}>
      <div className="flex items-start justify-between gap-2">
        <PastilleStatut code={b.statut.code} libelle={b.statut.libelle} />
        {b.actions.modifier || b.actions.retirer ? (
          <div className="relative">
            <button type="button" aria-label="Plus d'actions" aria-expanded={menu} onClick={() => setMenu((m) => !m)} className="flex size-11 items-center justify-center rounded-full">
              <MoreHorizontal size={22} aria-hidden="true" />
            </button>
            {menu ? (
              <ul role="menu" className="absolute right-0 z-10 flex w-56 flex-col rounded-xl bg-surface py-1 shadow-float ring-1 ring-ink/10">
                {b.actions.modifier ? (
                  <li role="none">
                    <Link role="menuitem" href={`${href}?geste=modifier`} className="flex min-h-11 items-center px-4 text-[15px]">
                      Modifier
                    </Link>
                  </li>
                ) : null}
                <li role="none">
                  <Link role="menuitem" href={`${href}?geste=retirer`} className="flex min-h-11 items-center px-4 text-[15px]">
                    Retirer
                  </Link>
                </li>
                <li role="none">
                  <Link role="menuitem" href={`${href}#historique`} className="flex min-h-11 items-center px-4 text-[15px]">
                    Voir l&apos;historique
                  </Link>
                </li>
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>
      <Link href={href} className="flex flex-col">
        <span className="text-[16px] font-bold break-words">{b.nom}</span>
        <span className="text-[15px]">{b.quantite.lisible}</span>
        {e ? <span className="text-[14px] text-muted">{e}</span> : null}
      </Link>
      {bouton ? (
        <Link href={href} className="pressable inline-flex min-h-12 items-center justify-center self-start rounded-full bg-accent px-5 text-[15px] font-extrabold text-on-accent">
          {bouton}
        </Link>
      ) : null}
    </li>
  );
}

/** MES BESOINS GROUPÉS (V5.2, écran 10) : les cartes qui demandent une action d'abord ; statuts aux noms complets. */
export function MesBesoinsV1() {
  const params = useSearchParams();
  const { data, error } = useResource(useCallback((s: AbortSignal) => api<{ aFaire: BesoinV1[]; enCours: BesoinV1[]; termines: BesoinV1[] }>("/v1/ag/besoins", { signal: s }), []));
  if (error) return <p role="alert" className="text-[16px] font-semibold text-danger">{messageErreur(error)}</p>;
  if (!data) return <Skeleton card="h-32" lines={2} label="Chargement de tes besoins…" />;
  const vide = !data.aFaire.length && !data.enCours.length && !data.termines.length;
  return (
    <div className="flex flex-col gap-5 lg:mx-auto lg:w-full lg:max-w-[44rem]">
      <PageTitle>Mes besoins groupés</PageTitle>
      {params.get("nouveaux") ? (
        <p role="status" className="rounded-xl bg-ok-bg p-3 text-[15px] font-semibold text-ok">
          Tes besoins sont confirmés. Ce n&apos;est pas encore une commande : tu décideras après réception d&apos;une offre complète.
        </p>
      ) : null}
      {vide ? (
        <div className={`${CARTE} flex flex-col gap-2 p-4`}>
          <p className="text-[17px] font-bold">Aucun besoin groupé pour le moment</p>
          <p className="text-[15px] text-muted">Les premiers achats groupés se forment avec les premiers besoins ouverts.</p>
          {/* Revue UX (8 novembre 2026) : un écran vide propose l'action qui le remplit. */}
          <Link href="/achats-groupes/nouveau" className="pressable inline-flex min-h-12 items-center gap-2 self-start rounded-full bg-accent px-5 text-[16px] font-extrabold text-on-accent shadow-card">
            <Plus size={20} aria-hidden="true" /> Ajouter un matériau
          </Link>
          <Link href="/achats-groupes" className="min-h-11 py-2 text-[15px] font-semibold underline underline-offset-4">
            Voir les achats groupés
          </Link>
        </div>
      ) : null}
      {(
        [
          ["À faire", data.aFaire],
          ["En cours", data.enCours],
          ["Terminés", data.termines],
        ] as const
      ).map(([titre, liste]) =>
        liste.length ? (
          <section key={titre} aria-label={titre} className="flex flex-col gap-2">
            <h2 className="text-[20px] font-extrabold">{titre}</h2>
            <ul className="flex flex-col gap-3">
              {liste.map((b) => (
                <CarteBesoin key={b.id} b={b} />
              ))}
            </ul>
          </section>
        ) : null,
      )}
    </div>
  );
}

const LIBELLES_HISTORIQUE: Record<string, string> = {
  ouvert: "Achat groupé ouvert avec ton besoin",
  rejoint: "Achat groupé rejoint",
  surveillance_arretee: "La surveillance de la ligne s'est arrêtée",
  quantite_modifiee: "Quantité modifiée",
  date_modifiee: "Date de besoin modifiée",
  reconfirme: "Quantité reconfirmée",
  confirme: "Besoin confirmé",
  indicatif: "Non reconfirmé à temps : besoin indicatif",
  transmis: "Volume transmis aux négoces",
  retire: "Besoin retiré",
};

/**
 * MON BESOIN (V5.2, écrans 11 et 13, statuts) : le détail, la reconfirmation, « Retirer ou modifier » (« Garder mon
 * besoin » reste l'action principale d'un retrait), l'offre complète jusqu'à « Offre à examiner ». Le bouton final reste
 * un emplacement désactivé tant que le cadre juridique n'est pas décidé.
 */
export function BesoinV1Detail({ id, etat }: { id: string; etat: EtatV1 }) {
  const params = useSearchParams();
  const fetcher = useCallback((s: AbortSignal) => api<BesoinV1>(`/v1/ag/besoins/${id}`, { signal: s }), [id]);
  const { data: b, setData, error } = useResource(fetcher);
  const geste0 = params.get("geste");
  const [motif, setMotif] = useState<string | null>(geste0 === "modifier" ? "quantite" : null);
  const [ouvert, setOuvert] = useState(geste0 === "modifier" || geste0 === "retirer");
  const [quantite, setQuantite] = useState("");
  const [date, setDate] = useState("");
  const [precision, setPrecision] = useState("");
  const [pending, setPending] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(params.get("nouveau") ? "Ton besoin est confirmé. Ce n'est pas encore une commande : tu décideras après réception d'une offre complète." : null);

  async function agir(chemin: string, body: unknown, message: string) {
    setPending(true);
    setErreur(null);
    try {
      setData(await api<BesoinV1>(`/v1/ag/besoins/${id}/${chemin}`, { method: "POST", body, idempotencyKey: newActionKey() }));
      setFait(message);
      setOuvert(false);
      setMotif(null);
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setPending(false);
    }
  }

  if (error) return <p role="alert" className="text-[16px] font-semibold text-danger">{messageErreur(error)}</p>;
  if (!b) return <Skeleton card="h-56" lines={2} label="Chargement de ton besoin…" />;
  const m = etat.motifs.find((x) => x.id === motif) ?? null;
  const q = Number(quantite.replace(",", "."));

  return (
    <div className="flex flex-col gap-4 pb-6 lg:mx-auto lg:w-full lg:max-w-[40rem]">
      <p className="text-[15px] font-semibold text-muted">Mon besoin</p>
      <div className="flex flex-col gap-2">
        <PastilleStatut code={b.statut.code} libelle={b.statut.libelle} />
        <PageTitle>{b.statut.code === "offre_a_examiner" ? "Offre à examiner" : b.nom}</PageTitle>
      </div>
      {fait ? (
        <p role="status" className="rounded-xl bg-ok-bg p-3 text-[15px] font-semibold text-ok">
          {fait}
        </p>
      ) : null}

      <div className={`${CARTE} flex flex-col gap-1 p-4`}>
        <p className="text-[17px] font-bold break-words">{b.nom}</p>
        <p className="text-[15px]">{b.quantite.lisible}</p>
        <p className="text-[15px] text-muted">
          Zone {zoneLisible(b.achat.zone)} · avant le {dateCourte(b.dateBesoin)} · {b.reception === "retrait" ? "retrait au dépôt" : "livraison sur chantier"}
        </p>
        <p className="text-[14px] text-muted">
          {b.reception === "retrait" ? "Lieu de retrait" : "Lieu de livraison"} (privé) : {b.lieu}
          {b.contraintes ? ` · ${b.contraintes}` : ""}
        </p>
      </div>

      {b.statut.code === "preparation" ? (
        <div className={`${CARTE} flex flex-col gap-2 p-4`}>
          <h2 className="text-[18px] font-extrabold">Préparation de la consultation</h2>
          {b.etat === "reconfirme" ? (
            <p className="text-[15px]">Quantité reconfirmée : elle sera transmise aux négoces à la clôture.</p>
          ) : (
            <p className="text-[15px] leading-relaxed">
              Mobiiz est prêt à consulter les négoces. Reconfirme ta quantité{b.reconfirmerAvant ? ` avant le ${heureCourte(b.reconfirmerAvant)}` : ""}. Sans reconfirmation, ton besoin reste indicatif et n&apos;est pas transmis.
            </p>
          )}
          {b.actions.reconfirmer ? (
            <Button pending={pending} onClick={() => void agir("reconfirmation", {}, "Quantité reconfirmée.")} className="w-full">
              Reconfirmer ma quantité
            </Button>
          ) : null}
        </div>
      ) : null}

      {b.actions.confirmer ? (
        <Button pending={pending} onClick={() => void agir("confirmation", {}, "Besoin confirmé.")} className="w-full">
          Confirmer
        </Button>
      ) : null}

      {b.offre ? (
        <section aria-label="Offre" className={`${CARTE} flex flex-col gap-3 p-4`}>
          {!b.offre.complete ? (
            <>
              <h2 className="text-[18px] font-extrabold">Offre reçue — vérification en cours</h2>
              <p className="text-[15px]">Une information obligatoire manque ({b.offre.manques.join(", ")}). Mobiiz la demande au négoce ; l&apos;offre ne peut pas être acceptée en l&apos;état.</p>
            </>
          ) : (
            <>
              <h2 className="text-[18px] font-extrabold">{b.offre.fournisseur}</h2>
              <p className="text-[15px] font-semibold">{b.quantite.lisible}</p>
              <ul className="flex flex-col gap-1 text-[15px]">
                {b.offre.calcul!.lignes.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
              <p className="text-[20px] font-extrabold">{euros(b.offre.calcul!.ht)} HT livré</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[15px]">
                <dt className="text-muted">Fournisseur</dt>
                <dd>{b.offre.fournisseur}</dd>
                <dt className="text-muted">Délai</dt>
                <dd>{b.offre.delai}</dd>
                <dt className="text-muted">Lieu</dt>
                <dd>{b.offre.lieu}</dd>
                <dt className="text-muted">Paiement</dt>
                <dd>{b.offre.paiement}</dd>
                <dt className="text-muted">Validité</dt>
                <dd>{b.offre.validite}</dd>
                <dt className="text-muted">Annulation</dt>
                <dd>{b.offre.annulation}</dd>
              </dl>
              {b.offreAvant ? <p className="text-[14px] text-muted">Réponse avant le {heureCourte(b.offreAvant)}</p> : null}
              <button type="button" disabled aria-disabled="true" className="inline-flex min-h-13 w-full cursor-not-allowed items-center justify-center rounded-full border border-dashed border-line px-6 text-[16px] font-extrabold text-muted">
                [bouton final : texte à fixer]
              </button>
              <Note>L&apos;acceptation n&apos;est pas encore ouverte : le cadre juridique est en cours de validation. Aucune commande ne part d&apos;ici.</Note>
            </>
          )}
        </section>
      ) : null}

      <section aria-label="L'achat groupé" className={`${CARTE} flex flex-col gap-2 p-4`}>
        <h2 className="text-[16px] font-bold">L&apos;achat groupé</h2>
        <p className="text-[14px] text-muted">
          Zone {zoneLisible(b.achat.zone)} · ouvert jusqu&apos;au {dateCourte(b.achat.ouvertJusquau)}
        </p>
        <Volumes achat={b.achat} comprendre />
      </section>

      {b.actions.modifier || b.actions.retirer ? (
        <section aria-label="Retirer ou modifier" className={`${CARTE} flex flex-col gap-3 p-4`}>
          {!ouvert ? (
            <Button variant="secondary" onClick={() => setOuvert(true)}>
              Retirer ou modifier
            </Button>
          ) : (
            <>
              <h2 className="text-[18px] font-extrabold">Retirer ou modifier</h2>
              <p className="text-[15px] font-semibold">{b.quantite.lisible}</p>
              <fieldset className="flex flex-col gap-2">
                <legend className="sr-only">Motif</legend>
                {etat.motifs
                  .filter((x) => (x.geste === "modifier" ? b.actions.modifier : b.actions.retirer))
                  .map((x) => (
                    <label key={x.id} className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 ${motif === x.id ? "border-ink" : "border-line"}`}>
                      <input type="radio" name="motif" checked={motif === x.id} onChange={() => setMotif(x.id)} className="size-5 accent-accent" />
                      <span className="text-[16px]">{x.libelle}</span>
                    </label>
                  ))}
              </fieldset>
              {motif === "quantite" ? (
                <div className="flex flex-col gap-2">
                  <label htmlFor="ag-nouvelle-q" className="text-[14px] font-semibold">
                    Nouvelle quantité ({b.quantite.parUnite ? b.quantite.unite : b.quantite.reference.pluriel})
                  </label>
                  <input id="ag-nouvelle-q" inputMode="decimal" value={quantite} onChange={(e) => setQuantite(e.target.value)} className={INPUT} />
                  {b.quantite.parUnite && q > 0 ? <p className="text-[15px]">= {nf(q * b.quantite.parUnite)} {b.quantite.reference.pluriel}</p> : null}
                </div>
              ) : null}
              {motif === "report" ? (
                <div className="flex flex-col gap-2">
                  <label htmlFor="ag-nouvelle-date" className="text-[14px] font-semibold">
                    Nouvelle date de besoin
                  </label>
                  <input id="ag-nouvelle-date" type="date" min={jourDans(1)} value={date} onChange={(e) => setDate(e.target.value)} className={INPUT} />
                </div>
              ) : null}
              {m?.geste === "retirer" ? (
                <div className="flex flex-col gap-2">
                  <label htmlFor="ag-precision" className="text-[14px] font-semibold">
                    Précision (facultatif)
                  </label>
                  <input id="ag-precision" value={precision} onChange={(e) => setPrecision(e.target.value)} className={INPUT} />
                </div>
              ) : null}
              {b.avertissements && m ? <p className="rounded-xl bg-warn-bg p-3 text-[15px] font-semibold text-warn">{m.geste === "retirer" ? b.avertissements.retrait : b.avertissements.modification}</p> : null}
              {motif === "quantite" ? (
                <Button pending={pending} disabled={!(q > 0)} onClick={() => void agir("quantite", { quantite: q }, "Quantité mise à jour. Ton besoin reste dans l'achat groupé.")} className="w-full">
                  Mettre à jour ma quantité
                </Button>
              ) : motif === "report" ? (
                <Button pending={pending} disabled={!date} onClick={() => void agir("date", { dateBesoin: date }, "Date mise à jour. Ton besoin reste dans l'achat groupé.")} className="w-full">
                  Mettre à jour la date
                </Button>
              ) : m?.geste === "retirer" ? (
                <>
                  <Button onClick={() => { setOuvert(false); setMotif(null); }} className="w-full">
                    Garder mon besoin
                  </Button>
                  <Button variant="secondary" pending={pending} onClick={() => void agir("retrait", { motif, precision: precision || null }, "Besoin retiré. Ton historique est conservé.")} className="w-full">
                    Confirmer le retrait
                  </Button>
                </>
              ) : null}
            </>
          )}
        </section>
      ) : null}

      {erreur ? (
        <p role="alert" className="text-[15px] font-semibold text-danger">
          {erreur}
        </p>
      ) : null}

      <section id="historique" aria-label="Historique" className="flex flex-col gap-2">
        <h2 className="text-[16px] font-bold">Historique</h2>
        <ol className="flex flex-col gap-1 text-[14px]">
          {b.historique.map((h, i) => (
            <li key={i} className="flex flex-wrap gap-x-2">
              <span className="text-muted">{dateLongue(h.le)}</span>
              <span>{LIBELLES_HISTORIQUE[h.type] ?? h.type}</span>
              {h.transmis ? <span className="text-muted">· transmis aux négoces concernés</span> : null}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
