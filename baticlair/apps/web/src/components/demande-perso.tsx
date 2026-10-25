"use client";

import { Check, Send, ShoppingCart, Truck, Users } from "lucide-react";
import { useCallback, useState } from "react";
import { Button, Card, Field, SectionTitle } from "@/components/ui";
import { api, messageErreur } from "@/lib/api";
import { euros, jourFr, type DemandePerso, type LignesGroupables, type NegocesProposes } from "@/lib/recentrage";
import { DeclarerBesoins, PrevenirNegoce, useModeRegroupement } from "@/components/negocie";
import { useResource } from "@/lib/use-resource";

/**
 * LA DEMANDE PERSO, CÔTÉ ÉCRAN (Greg, 25 octobre 2026 : « le cœur, immédiat, sans cycle ») : après la validation du
 * quantitatif, « Envoyer à mes négoces ». Le but (« Chiffrer un chantier » ou « Commander »), les négoces (habituels, de la
 * zone, ou un nouveau par e-mail ; un seul en gratuit, cinq en payant), la date de besoin, l'accord pour transmettre son
 * identité. Puis les réponses comparées LIVRAISON COMPRISE, « Commander » sur une réponse, le suivi Reçue → Confirmée →
 * Livrée. L'artisan ne choisit jamais la catégorie d'un négoce : le négoce la déclare lui-même.
 */
export function DemandesPerso({ projectId, articles, canCreate, archived }: { projectId: string; articles: string[]; canCreate: boolean; archived: boolean }) {
  const fetchNegoces = useCallback((signal: AbortSignal) => api<NegocesProposes>(`/v1/projects/${projectId}/demandes-perso/negoces`, { signal }), [projectId]);
  const fetchDemandes = useCallback((signal: AbortSignal) => api<DemandePerso[]>(`/v1/projects/${projectId}/demandes-perso`, { signal }), [projectId]);
  const { data: proposes } = useResource(fetchNegoces);
  const { data: demandes, reload } = useResource(fetchDemandes);
  const [ouvert, setOuvert] = useState(false);
  const [aPrevenir, setAPrevenir] = useState<string | null>(null);

  return (
    <section aria-label="Mes demandes de prix" className="flex flex-col gap-3">
      {aPrevenir ? <PrevenirNegoce demandeId={aPrevenir} onFini={() => setAPrevenir(null)} /> : null}
      {(demandes ?? []).map((d) => (
        <Demande key={d.id} d={d} onChange={reload} />
      ))}
      {!archived && canCreate && proposes ? (
        ouvert ? (
          <EnvoiDemande projectId={projectId} articles={articles} proposes={proposes} onEnvoye={(id) => (setOuvert(false), setAPrevenir(id), reload())} onFermer={() => setOuvert(false)} />
        ) : (
          <Button onClick={() => setOuvert(true)} className="w-full">
            <Send size={18} aria-hidden="true" /> Envoyer à mes négoces
          </Button>
        )
      ) : null}
    </section>
  );
}

type Choix = { cle: string; libelle: string; corps: { supplierId: string } | { negoceId: string } | { nom: string; email: string } };

function EnvoiDemande({ projectId, articles, proposes, onEnvoye, onFermer }: { projectId: string; articles: string[]; proposes: NegocesProposes; onEnvoye: (demandeId: string) => void; onFermer: () => void }) {
  const [but, setBut] = useState<"chiffrer" | "commander">("chiffrer");
  const [choisis, setChoisis] = useState<string[]>([]);
  const [nouveaux, setNouveaux] = useState<Choix[]>([]);
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [dateBesoin, setDateBesoin] = useState("");
  // Business model final (Greg, 25 octobre 2026) : la case d'accord est cochée d'office (à relire par l'avocat, A-FAIRE-RELIRE).
  const [accord, setAccord] = useState(true);
  const [pending, setPending] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const options: Choix[] = [
    ...proposes.habituels.map((h) => ({ cle: `s:${h.supplierId}`, libelle: h.nom, corps: { supplierId: h.supplierId } })),
    ...proposes.zoneNegoces.map((n) => ({ cle: `n:${n.negoceId}`, libelle: `${n.nom}${n.generaliste ? " · généraliste" : ""}`, corps: { negoceId: n.negoceId } })),
    ...nouveaux,
  ];
  const basculer = (cle: string) => setChoisis((c) => (c.includes(cle) ? c.filter((x) => x !== cle) : c.length >= proposes.max ? (proposes.max === 1 ? [cle] : c) : [...c, cle]));

  async function envoyer() {
    setPending(true);
    setErreur(null);
    try {
      const envoyee = await api<{ id: string }>(`/v1/projects/${projectId}/demandes-perso`, {
        method: "POST",
        body: { but, accord: true, articles, dateBesoin: dateBesoin || null, negoces: options.filter((o) => choisis.includes(o.cle)).map((o) => o.corps) },
      });
      onEnvoye(envoyee.id);
    } catch (e) {
      setErreur(messageErreur(e, { negoces: "En gratuit, ta demande part chez un seul négoce.", accord_requis: "Coche l'accord pour transmettre ton identité." }));
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4 p-4" aria-label="Envoyer à mes négoces">
      <SectionTitle>Envoyer à mes négoces</SectionTitle>
      <div role="radiogroup" aria-label="C'est pour" className="grid grid-cols-2 gap-2">
        {(
          [
            ["chiffrer", "Chiffrer un chantier"],
            ["commander", "Commander"],
          ] as const
        ).map(([v, l]) => (
          <button key={v} type="button" role="radio" aria-checked={but === v} onClick={() => setBut(v)} className={`min-h-12 rounded-xl border-2 px-3 text-[15px] font-semibold ${but === v ? "border-ink bg-accent-soft" : "border-line bg-surface text-muted"}`}>
            {l}
          </button>
        ))}
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-[15px] font-semibold">{proposes.max === 1 ? "Ton négoce (un seul en gratuit)" : `Tes négoces (jusqu'à ${proposes.max})`}</legend>
        {options.length === 0 ? <p className="text-[14px] text-muted">Ajoute ton négoce ci-dessous.</p> : null}
        {options.map((o) => (
          <label key={o.cle} className="flex min-h-12 items-center gap-3 rounded-xl border border-line bg-surface px-3">
            <input type={proposes.max === 1 ? "radio" : "checkbox"} name="negoce-perso" checked={choisis.includes(o.cle)} onChange={() => basculer(o.cle)} className="size-5 accent-accent" />
            <span className="text-[15px]">{o.libelle}</span>
          </label>
        ))}
      </fieldset>
      <div className="flex flex-col gap-2 rounded-xl bg-ground p-3">
        <span className="text-[14px] font-semibold">Un nouveau négoce, par e-mail</span>
        <Field id="perso-nom" label="Nom du négoce" value={nom} onChange={(e) => setNom(e.target.value)} maxLength={120} />
        <Field id="perso-email" label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} />
        <Button
          variant="secondary"
          disabled={!nom.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())}
          onClick={() => {
            const cle = `e:${email.trim().toLowerCase()}`;
            setNouveaux((n) => [...n.filter((x) => x.cle !== cle), { cle, libelle: nom.trim(), corps: { nom: nom.trim(), email: email.trim() } }]);
            basculer(cle);
            setNom("");
            setEmail("");
          }}
        >
          Ajouter ce négoce
        </Button>
      </div>
      <Field id="perso-date" label="Date de besoin (facultatif)" type="date" value={dateBesoin} onChange={(e) => setDateBesoin(e.target.value)} />
      <label className="flex items-start gap-3 text-[14px] leading-snug">
        <input type="checkbox" checked={accord} onChange={(e) => setAccord(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-accent" />
        {proposes.accord}
      </label>
      {erreur ? (
        <p role="alert" className="text-[15px] font-semibold text-danger">
          {erreur}
        </p>
      ) : null}
      <Button onClick={() => void envoyer()} pending={pending} disabled={!accord || choisis.length === 0}>
        <Send size={18} aria-hidden="true" /> {choisis.length > 1 ? `Envoyer à ${choisis.length} négoces` : "Envoyer"}
      </Button>
      <button type="button" onClick={onFermer} className="min-h-11 self-center text-[15px] font-semibold text-muted underline">
        Annuler
      </button>
    </Card>
  );
}

const STATUTS: Record<string, string> = { a_envoyer: "À envoyer", envoye: "Envoyée", relance: "Relancé", repondu: "A répondu", refuse: "Ne chiffre pas" };
const SUIVI: Record<string, string> = { recue: "Commande reçue", confirmee: "Commande confirmée", livree: "Livrée" };

function Demande({ d, onChange }: { d: DemandePerso; onChange: () => void }) {
  const [pending, setPending] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const meilleure = d.offres.find((o) => o.complete && o.valide);
  async function poster(chemin: string, recipientId: string) {
    setPending(recipientId);
    setErreur(null);
    try {
      await api(`/v1/demandes-perso/${d.id}/${chemin}`, { method: "POST", body: { recipientId } });
      onChange();
    } catch (e) {
      setErreur(messageErreur(e, { offre_expiree: "Cette offre n'est plus valable : demande au négoce de la renouveler.", deja_commande: "Cette demande est déjà commandée." }));
    } finally {
      setPending(null);
    }
  }
  return (
    <Card className="flex flex-col gap-3 p-4" aria-label={`Demande de prix : ${d.but === "commander" ? "commander" : "chiffrer un chantier"}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[16px] font-extrabold">{d.but === "commander" ? "Demande pour commander" : "Demande de chiffrage"}</span>
        <span className="text-[13px] text-muted">{d.close ? "Close" : d.closLe ? `Ouverte jusqu'au ${jourFr(d.closLe)}` : ""}</span>
      </div>
      <ul className="flex flex-wrap gap-2" aria-label="Négoces sollicités">
        {d.destinataires.map((r) => (
          <li key={r.id} className="rounded-full bg-ground px-3 py-1 text-[13px] font-semibold text-muted">
            {r.nom} · {r.suivi ? SUIVI[r.suivi] : STATUTS[r.statut]}
          </li>
        ))}
      </ul>
      {d.lignes.some((l) => l.repere) ? (
        <details className="text-[14px]">
          <summary className="cursor-pointer font-semibold">Tes derniers prix sur ces articles</summary>
          <ul className="mt-2 flex flex-col gap-1 text-muted">
            {d.lignes
              .filter((l) => l.repere)
              .map((l) => (
                <li key={l.cle}>
                  {l.designation} : {l.repere!.replace(/^Ton dernier prix pour cet article : /, "")}
                </li>
              ))}
          </ul>
        </details>
      ) : null}
      {d.commande ? (
        <div role="status" className="flex flex-col gap-2 rounded-xl bg-ok-bg p-4 text-ok">
          <span className="flex items-center gap-2 text-[15px] font-bold">
            <ShoppingCart size={18} aria-hidden="true" /> Commandé chez {d.commande.nom} · {d.commande.suivi ? SUIVI[d.commande.suivi] : ""}
          </span>
          {d.commande.suivi !== "livree" ? (
            <Button variant="secondary" pending={pending === d.commande.recipientId} onClick={() => void poster("livree", d.commande!.recipientId)}>
              <Truck size={18} aria-hidden="true" /> C&apos;est livré
            </Button>
          ) : null}
        </div>
      ) : null}
      {d.offres.length > 0 ? (
        <ol aria-label="Les offres, livraison comprise" className="flex flex-col gap-2">
          {d.offres.map((o) => (
            <li key={o.recipientId} className={`flex flex-col gap-1 rounded-xl border-2 p-3 ${meilleure?.recipientId === o.recipientId ? "border-accent" : "border-line"}`}>
              <span className="flex items-center justify-between gap-2">
                <span className="text-[15px] font-extrabold">{o.nom}</span>
                <span className="text-[16px] font-extrabold">{euros(o.totalLivreHt)} HT livré</span>
              </span>
              <span className="text-[13px] text-muted">
                {o.livraisonHt > 0 ? `Livraison ${euros(o.livraisonHt)}` : "Livraison offerte"}
                {o.delaiJours !== null ? ` · ${o.delaiJours} j` : ""} · valable jusqu&apos;au {jourFr(o.valideJusquau)}
              </span>
              {!o.complete ? <span className="text-[13px] font-semibold text-warn">{o.lignesManquantes.length} ligne{o.lignesManquantes.length > 1 ? "s" : ""} non chiffrée{o.lignesManquantes.length > 1 ? "s" : ""}</span> : o.ecartHt === 0 ? <span className="text-[13px] font-bold text-ok">La moins chère</span> : o.ecartHt !== null ? <span className="text-[13px] font-semibold text-muted">{euros(o.ecartHt)} de plus</span> : null}
              {!d.commande && o.valide ? (
                <Button variant={meilleure?.recipientId === o.recipientId ? "primary" : "secondary"} pending={pending === o.recipientId} onClick={() => void poster("commander", o.recipientId)} className="mt-1">
                  <Check size={18} aria-hidden="true" /> Commander chez {o.nom}
                </Button>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-[14px] text-muted">Les réponses arrivent ici, comparées livraison comprise. Relance automatique à 48 h ouvrées.</p>
      )}
      {erreur ? (
        <p role="alert" className="text-[15px] font-semibold text-danger">
          {erreur}
        </p>
      ) : null}
    </Card>
  );
}

/**
 * « Tenter un prix de groupe » (Greg, 25 octobre 2026) : sur les lignes groupables du chantier (gros articles identiques,
 * 1 000 € HT estimés), pour « ce cycle » ou « le suivant ». Le reste reste en demande perso, sans fractionner par obligation.
 */
export function TenterPrixDeGroupe({ projectId }: { projectId: string }) {
  const mode = useModeRegroupement();
  if (mode === null) return null;
  return mode === "humain" ? <DeclarerBesoins projectId={projectId} /> : <TenterAutomatique projectId={projectId} />;
}

/** Le regroupement automatique (consultation des négoces par cycle), derrière `MODE_REGROUPEMENT=automatique`. */
function TenterAutomatique({ projectId }: { projectId: string }) {
  const fetcher = useCallback((signal: AbortSignal) => api<LignesGroupables>(`/v1/projects/${projectId}/regroupements/lignes`, { signal }), [projectId]);
  const { data, reload } = useResource(fetcher);
  const [ouvert, setOuvert] = useState(false);
  const [cles, setCles] = useState<string[]>([]);
  const [mois, setMois] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  if (!data || !data.zoneActive) return null;
  const groupables = data.lignes.filter((l) => l.groupable);
  if (groupables.length === 0) return null;
  async function tenter() {
    setPending(true);
    setErreur(null);
    try {
      const r = await api<{ ajoutees: unknown[]; refusees: { designation: string; raison: string }[] }>(`/v1/projects/${projectId}/regroupements`, { method: "POST", body: { articles: cles.length ? cles : groupables.map((l) => l.key), mois: mois ?? data!.cycles[0]!.cle } });
      setMessage(`${r.ajoutees.length} ligne${r.ajoutees.length > 1 ? "s" : ""} dans le regroupement. Tu commanderas seulement si le prix te plaît.`);
      setOuvert(false);
      reload();
    } catch (e) {
      setErreur(messageErreur(e, { commande_close: "Ce cycle vient de partir : choisis le suivant." }));
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
          <Users size={18} aria-hidden="true" /> Tenter un prix de groupe ({groupables.length} gros article{groupables.length > 1 ? "s" : ""})
        </Button>
      ) : (
        <Card className="flex flex-col gap-3 p-4">
          <SectionTitle>Tenter un prix de groupe</SectionTitle>
          <p className="text-[14px] text-muted">Seuls les gros articles identiques se regroupent. Le reste part en demande perso.</p>
          <ul className="flex flex-col gap-2">
            {data.lignes.map((l) => (
              <li key={l.key}>
                <label className={`flex items-start gap-3 rounded-xl border border-line px-3 py-2 ${l.groupable ? "bg-surface" : "bg-ground"}`}>
                  <input type="checkbox" disabled={!l.groupable} checked={l.groupable && (cles.length === 0 || cles.includes(l.key))} onChange={() => setCles((c) => (c.length === 0 ? groupables.map((g) => g.key).filter((k) => k !== l.key) : c.includes(l.key) ? c.filter((k) => k !== l.key) : [...c, l.key]))} className="mt-1 size-5 accent-accent" />
                  <span className="flex flex-col">
                    <span className="text-[15px] font-semibold">{l.designation}</span>
                    <span className="text-[13px] text-muted">{l.groupable ? `${l.quantite.toLocaleString("fr-FR")} ${l.unite}` : l.raison}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div role="radiogroup" aria-label="Quel cycle" className="grid grid-cols-2 gap-2">
            {data.cycles.map((c, i) => (
              <button key={c.cle} type="button" role="radio" aria-checked={(mois ?? data.cycles[0]!.cle) === c.cle} onClick={() => setMois(c.cle)} className={`min-h-12 rounded-xl border-2 px-2 text-[14px] font-semibold ${(mois ?? data.cycles[0]!.cle) === c.cle ? "border-ink bg-accent-soft" : "border-line bg-surface text-muted"}`}>
                {i === 0 ? "Ce cycle" : "Le suivant"} · {c.de.replace(/^du /, "")}
              </button>
            ))}
          </div>
          {erreur ? (
            <p role="alert" className="text-[15px] font-semibold text-danger">
              {erreur}
            </p>
          ) : null}
          <Button onClick={() => void tenter()} pending={pending}>
            Rejoindre le regroupement
          </Button>
        </Card>
      )}
    </section>
  );
}
