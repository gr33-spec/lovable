"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Check, ChevronRight, ClipboardList, MessageSquare, Phone, Plus, Search, ShoppingCart, Users, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLienInvitation } from "@/components/inviter";
import { Button, ButtonLink, Card, Field, INPUT, SectionTitle } from "@/components/ui";
import { api, messageErreur, type NextAction } from "@/lib/api";
import { dateFr, eurosHt, negocePourApi, quantite, type AchatOuvert, type CarteAchat, type DetailAchat, type LignesListe, type MesAchats, type Jauge, type Lance, type NegoceChoisi, type NegocesProposes, type Prevenir } from "@/lib/achat-groupe";
import { useResource } from "@/lib/use-resource";

/**
 * L'ACHAT GROUPÉ AUTOMATIQUE, CÔTÉ ÉCRAN (Greg, 27 octobre 2026) : les deux portes (« Lancer un achat groupé », « Ma liste
 * de matériaux »), le formulaire (catalogue, quantité, commune, date, négoces), « Préviens ton négoce », la carte et son
 * état, la jauge du volume, le détail (frise, négoces, Modifier, Retirer ou Me désister), l'offre et la commande, le plan B.
 * Un seul bouton jaune par écran.
 */

const UNITES = ["pièces", "m²", "m", "pots", "palettes", "kg"] as const;
const LIEN_SECONDAIRE = "pressable inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-line bg-surface px-4 text-[15px] font-semibold text-ink active:bg-ground";

/* ------------------------------------------------------------------------------------------- les deux portes */

/** Les deux portes : sur l'accueil (en grand) et dans la feuille du « + » central. */
export function DeuxPortes({ grand = false, onChoix }: { grand?: boolean; onChoix?: () => void }) {
  const porte = `pressable flex items-center gap-4 rounded-2xl p-4 text-left shadow-card ${grand ? "min-h-24" : "min-h-20"}`;
  return (
    <div className={`grid gap-3 ${grand ? "sm:grid-cols-2" : ""}`}>
      <Link href="/achats-groupes/lancer" onClick={onChoix} className={`${porte} bg-accent text-on-accent`}>
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-surface/70 text-ink" aria-hidden="true">
          <Users size={24} />
        </span>
        <span className="flex flex-col gap-0.5">
          <span className="text-[18px] font-extrabold">Lancer un achat groupé</span>
          <span className="text-[14px] opacity-80">Un matériau, ta quantité : on regroupe et tes négoces font leur meilleur prix.</span>
        </span>
      </Link>
      <Link href="/chantiers/nouveau" onClick={onChoix} className={`${porte} border border-line bg-surface text-ink`}>
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-ground" aria-hidden="true">
          <ClipboardList size={24} />
        </span>
        <span className="flex flex-col gap-0.5">
          <span className="text-[18px] font-extrabold">Ma liste de matériaux</span>
          <span className="text-[14px] text-muted">Photo, devis ou saisie : une liste à envoyer à tes négoces ou à acheter en groupe.</span>
        </span>
      </Link>
    </div>
  );
}

/** La feuille du « + » central de la barre du bas. */
export function FeuilleDeuxPortes({ onFermer }: { onFermer: () => void }) {
  useEffect(() => {
    const fermer = (e: KeyboardEvent) => e.key === "Escape" && onFermer();
    document.addEventListener("keydown", fermer);
    return () => document.removeEventListener("keydown", fermer);
  }, [onFermer]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 lg:items-center" onClick={onFermer}>
      <div role="dialog" aria-modal="true" aria-label="Que veux-tu faire ?" onClick={(e) => e.stopPropagation()} className="animate-rise flex w-full max-w-lg flex-col gap-4 rounded-t-3xl bg-ground p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] lg:rounded-3xl">
        <div className="flex items-center justify-between">
          <p className="text-[20px] font-extrabold">Que veux-tu faire ?</p>
          <button type="button" onClick={onFermer} aria-label="Fermer" className="grid size-11 place-items-center rounded-full text-muted">
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <DeuxPortes onChoix={onFermer} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------- la jauge */

export function JaugeVolume({ j }: { j: Jauge | null }) {
  if (!j) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <div role="meter" aria-label="Volume pour lancer la consultation" aria-valuemin={0} aria-valuemax={100} aria-valuenow={j.pourcent} className="h-2.5 overflow-hidden rounded-full bg-line">
        <div className={`h-full rounded-full ${j.atteint ? "bg-ok" : "bg-accent"}`} style={{ width: `${Math.max(j.pourcent, 6)}%` }} />
      </div>
      {j.phrase ? <p className="text-[13px] text-muted">{j.phrase}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------ les cartes */

const TON: Record<string, string> = { offre: "bg-accent-soft", pas_assez: "bg-warn-bg", commande: "bg-ok-bg" };

/** Une participation : l'état en une phrase, la date clé, la jauge. Tout le reste est dans le détail. */
export function CarteAchatGroupe({ c }: { c: CarteAchat }) {
  return (
    <Link href={`/achats-groupes/${c.id}`} aria-label={`${c.libelle} : ${c.titre}`} className={`pressable flex flex-col gap-3 rounded-2xl p-4 shadow-card ${TON[c.etat] ?? "bg-surface"}`}>
      <span className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[16px] font-extrabold">{c.libelle}</span>
          <span className="text-[14px] text-muted">
            {quantite(c.quantite)} {c.unite} · {c.commune}
          </span>
        </span>
        <ChevronRight size={20} className="mt-1 shrink-0 text-muted" aria-hidden="true" />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-[15px] font-bold">{c.titre}</span>
        {c.sousTitre ? <span className="text-[14px] text-muted">{c.sousTitre}</span> : null}
      </span>
      <JaugeVolume j={c.jauge} />
    </Link>
  );
}

/** « Achats groupés près de chez toi » : la phrase de l'alerte, le nombre d'entreprises à partir du seuil, Rejoindre. */
export function CarteAchatOuvert({ a }: { a: AchatOuvert }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-card">
      <span className="text-[16px] font-extrabold">{a.libelle}</span>
      <span className="text-[14px] text-muted">
        {a.dateBesoin ? `Livraison avant le ${dateFr(a.dateBesoin)} · ` : ""}secteur {a.zone}
        {a.entreprises ? ` · ${a.entreprises} entreprises` : ""}
      </span>
      <JaugeVolume j={a.jauge} />
      <span className="text-[14px] font-semibold">Rejoins-le avant le {dateFr(a.clotureLe)}.</span>
      <ButtonLink href={`/achats-groupes/lancer?rejoindre=${a.id}&libelle=${encodeURIComponent(a.libelle)}&unite=${encodeURIComponent(a.unite ?? "")}`} variant="secondary">
        Rejoindre
      </ButtonLink>
    </div>
  );
}

/* ----------------------------------------------------------------------------------------- choisir ses négoces */

/** Ses négoces : les habituels (carnet), la recherche par nom ou SIRET, ou un nouveau tapé (nom, e-mail, téléphone). */
export function ChoixNegoces({ choisis, onChange }: { choisis: NegoceChoisi[]; onChange: (n: NegoceChoisi[]) => void }) {
  const [q, setQ] = useState("");
  const [cherche, setCherche] = useState("");
  const fetcher = useCallback((signal: AbortSignal) => api<NegocesProposes>(`/v1/achats-groupes/negoces?q=${encodeURIComponent(cherche)}`, { signal }), [cherche]);
  const { data } = useResource(fetcher);
  const [nouveau, setNouveau] = useState(false);
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [tel, setTel] = useState("");
  const cle = (n: NegoceChoisi) => ("supplierId" in n ? `s:${n.supplierId}` : "negoceId" in n ? `n:${n.negoceId}` : `e:${n.email.toLowerCase()}`);
  const deja = new Set(choisis.map(cle));
  const ajouter = (n: NegoceChoisi) => !deja.has(cle(n)) && onChange([...choisis, n]);
  const propositions: NegoceChoisi[] = [...(data?.habituels ?? []).map((h) => ({ supplierId: h.supplierId, nom: h.nom })), ...(data?.inscrits ?? []).map((i) => ({ negoceId: i.negoceId, nom: i.nom }))].filter((n) => !deja.has(cle(n)));
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-2 text-[14px] font-semibold">À quels négoces envoyer la demande ?</legend>
      {choisis.length ? (
        <ul aria-label="Négoces choisis" className="flex flex-wrap gap-2">
          {choisis.map((n) => (
            <li key={cle(n)}>
              <button type="button" onClick={() => onChange(choisis.filter((x) => cle(x) !== cle(n)))} aria-label={`Retirer ${n.nom}`} className="pressable inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-4 text-[15px] font-semibold text-white">
                <Check size={16} aria-hidden="true" /> {n.nom} <X size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setCherche(q.trim());
        }}
        className="flex min-h-13 items-center gap-3 rounded-xl border border-line bg-surface px-4 focus-within:border-accent"
      >
        <Search size={18} className="text-muted" aria-hidden="true" />
        <label htmlFor="cherche-negoce" className="sr-only">
          Chercher un négoce par nom ou SIRET
        </label>
        <input id="cherche-negoce" value={q} onChange={(e) => setQ(e.target.value)} onBlur={() => setCherche(q.trim())} placeholder="Nom ou SIRET du négoce" className="min-h-12 grow bg-transparent text-[16px] outline-none placeholder:text-muted" />
      </form>
      {propositions.length ? (
        <ul aria-label="Négoces proposés" className="flex flex-wrap gap-2">
          {propositions.slice(0, 8).map((n) => (
            <li key={cle(n)}>
              <button type="button" onClick={() => ajouter(n)} className="pressable inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-[15px] font-semibold">
                <Plus size={16} aria-hidden="true" /> {n.nom}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {nouveau ? (
        <div className="flex flex-col gap-3 rounded-xl bg-ground p-3">
          <Field id="negoce-nom" label="Nom du négoce" value={nom} onChange={(e) => setNom(e.target.value)} />
          <Field id="negoce-email" label="Son e-mail" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Field id="negoce-tel" label="Son téléphone (pour le prévenir)" type="tel" inputMode="tel" value={tel} onChange={(e) => setTel(e.target.value)} />
          <Button
            variant="secondary"
            disabled={!nom.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())}
            onClick={() => {
              ajouter({ nom: nom.trim(), email: email.trim(), telephone: tel.trim() || null });
              setNom("");
              setEmail("");
              setTel("");
              setNouveau(false);
            }}
          >
            Ajouter ce négoce
          </Button>
        </div>
      ) : (
        <button type="button" onClick={() => setNouveau(true)} className="min-h-11 self-start text-[15px] font-semibold text-accent-text underline">
          Ajouter un autre négoce
        </button>
      )}
    </fieldset>
  );
}

/* ---------------------------------------------------------------------------------------- lancer ou rejoindre */

const dansJours = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

/**
 * Le formulaire : le matériau (catalogue + recherche, ou celui de l'achat qu'on rejoint), la quantité, la commune, la date
 * de besoin, au moins un négoce. Après l'envoi, l'écran « Préviens ton négoce ».
 */
export function FormulaireAchatGroupe({ rejoindre }: { rejoindre: { id: string; libelle: string; unite: string } | null }) {
  const [q, setQ] = useState("");
  const fetcher = useCallback((signal: AbortSignal) => (rejoindre ? Promise.resolve({ references: [] }) : api<{ references: { designation: string; unite: string }[] }>(`/v1/achats-groupes/catalogue?q=${encodeURIComponent(q)}`, { signal })), [q, rejoindre]);
  const { data } = useResource(fetcher);
  const [designation, setDesignation] = useState(rejoindre?.libelle ?? "");
  const [unite, setUnite] = useState<string>(rejoindre?.unite || "pièces");
  const [qte, setQte] = useState("");
  const [livraison, setLivraison] = useState("");
  // La commune par défaut : l'adresse de l'entreprise (Profil), modifiable.
  useEffect(() => {
    let vivant = true;
    void api<{ address: string | null }>("/v1/company/profile")
      .then((p) => vivant && p.address && setLivraison((l) => l || p.address!))
      .catch(() => undefined);
    return () => {
      vivant = false;
    };
  }, []);
  const [dateBesoin, setDateBesoin] = useState(dansJours(30));
  const [negoces, setNegoces] = useState<NegoceChoisi[]>([]);
  const [pending, setPending] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [lance, setLance] = useState<Lance | null>(null);
  const n = Number(qte.replace(/\s/g, "").replace(",", "."));

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (negoces.length === 0) return setErreur("Ajoute au moins un négoce à qui envoyer la demande.");
    setPending(true);
    try {
      const corps = { quantite: n, livraison: livraison.trim(), dateBesoin, negoces: negoces.map(negocePourApi) };
      const r = rejoindre
        ? await api<Lance>(`/v1/achats-groupes/ouverts/${rejoindre.id}/rejoindre`, { method: "POST", body: corps })
        : await api<Lance>("/v1/achats-groupes", { method: "POST", body: { ...corps, designation: designation.trim(), unite } });
      setLance(r);
    } catch (err) {
      setErreur(messageErreur(err));
    } finally {
      setPending(false);
    }
  }

  if (lance) return <EcranPrevenir p={lance.prevenir} besoinId={lance.besoinId} message={lance.ajoute ? "Ta quantité s'ajoute à ta participation : pas de doublon." : lance.rejoint ? "Tu as rejoint l'achat groupé." : "Ton achat groupé est lancé. Les entreprises du secteur sont prévenues."} />;

  return (
    <form onSubmit={(e) => void envoyer(e)} aria-label={rejoindre ? "Rejoindre l'achat groupé" : "Lancer un achat groupé"} className="flex flex-col gap-5">
      {rejoindre ? (
        <Card className="p-4">
          <p className="text-[14px] text-muted">Matériau</p>
          <p className="text-[18px] font-extrabold">{rejoindre.libelle}</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          <label htmlFor="cherche-materiau" className="text-[14px] font-semibold">
            Quel matériau ?
          </label>
          <div className="flex min-h-13 items-center gap-3 rounded-xl border border-line bg-surface px-4 focus-within:border-accent">
            <Search size={18} className="text-muted" aria-hidden="true" />
            <input id="cherche-materiau" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ardoise 32×22, zinc 0,65, OSB…" className="min-h-12 grow bg-transparent text-[16px] outline-none placeholder:text-muted" autoComplete="off" />
          </div>
          <ul aria-label="Catalogue" className="flex flex-wrap gap-2">
            {(data?.references ?? []).slice(0, 8).map((r) => (
              <li key={r.designation}>
                <button
                  type="button"
                  aria-pressed={designation === r.designation}
                  onClick={() => {
                    setDesignation(r.designation);
                    setUnite(r.unite);
                  }}
                  className={`pressable min-h-11 rounded-full border px-4 text-left text-[15px] font-semibold ${designation === r.designation ? "border-ink bg-ink text-white" : "border-line bg-surface"}`}
                >
                  {r.designation}
                </button>
              </li>
            ))}
          </ul>
          <Field id="materiau" label="Référence exacte" hint="Format, épaisseur, origine : seuls les articles identiques se regroupent." value={designation} onChange={(e) => setDesignation(e.target.value)} autoComplete="off" />
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field id="quantite" label="Quantité" inputMode="decimal" value={qte} onChange={(e) => setQte(e.target.value)} />
        <div className="flex flex-col gap-2">
          <label htmlFor="unite" className="text-[14px] font-semibold">
            Unité
          </label>
          <select id="unite" value={unite} disabled={!!rejoindre} onChange={(e) => setUnite(e.target.value)} className={INPUT}>
            {[...new Set([unite, ...UNITES])].map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Field id="commune" label="Commune de livraison" placeholder="22300 Lannion" value={livraison} onChange={(e) => setLivraison(e.target.value)} />
      <Field id="date-besoin" label="Livraison avant le" type="date" value={dateBesoin} onChange={(e) => setDateBesoin(e.target.value)} />
      <ChoixNegoces choisis={negoces} onChange={setNegoces} />
      {erreur ? (
        <p role="alert" className="rounded-xl bg-danger-bg p-4 text-[15px] font-semibold text-danger">
          {erreur}
        </p>
      ) : null}
      <Button type="submit" pending={pending} disabled={!(n > 0) || !designation.trim() || !livraison.trim() || !dateBesoin}>
        {rejoindre ? "Rejoindre l'achat groupé" : "Lancer l'achat groupé"}
      </Button>
    </form>
  );
}

/* ------------------------------------------------------------------------------------- « Préviens ton négoce » */

/** Point 12 : le texte exact, Appeler, le SMS prérempli, « Je l'ai prévenu ». */
export function EcranPrevenir({ p, besoinId, message }: { p: Prevenir; besoinId: string; message?: string }) {
  const [faits, setFaits] = useState<string[]>(p.negoces.filter((n) => n.prevenu).map((n) => n.id));
  async function prevenu(id: string) {
    await api(`/v1/achats-groupes/negoces/${id}/prevenu`, { method: "POST" }).catch(() => undefined);
    setFaits((f) => [...f, id]);
  }
  return (
    <section aria-label="Préviens ton négoce" className="flex flex-col gap-5">
      {message ? (
        <p role="status" className="rounded-xl bg-ok-bg p-4 text-[15px] font-semibold text-ok">
          {message}
        </p>
      ) : null}
      <h1 className="text-[28px] leading-[1.05] font-extrabold tracking-[-0.03em]">{p.titre}</h1>
      <p className="text-[17px] leading-relaxed">{p.texte}</p>
      {p.negoces.map((n) => (
        <Card key={n.id} className="flex flex-col gap-3 p-4">
          <span className="text-[17px] font-extrabold">{n.nom}</span>
          <div className="grid grid-cols-2 gap-2">
            {n.tel ? (
              <a href={n.tel} className={LIEN_SECONDAIRE}>
                <Phone size={18} aria-hidden="true" /> Appeler
              </a>
            ) : null}
            <a href={n.smsLien} className={`${LIEN_SECONDAIRE} ${n.tel ? "" : "col-span-2"}`}>
              <MessageSquare size={18} aria-hidden="true" /> SMS
            </a>
          </div>
          {faits.includes(n.id) ? (
            <p className="flex min-h-12 items-center justify-center gap-2 text-[15px] font-semibold text-ok">
              <Check size={18} aria-hidden="true" /> Prévenu
            </p>
          ) : (
            <Button variant="secondary" onClick={() => void prevenu(n.id)}>
              Je l&apos;ai prévenu
            </Button>
          )}
        </Card>
      ))}
      <p className="rounded-xl bg-ground p-3 text-[14px] text-muted">Le SMS : « {p.sms} »</p>
      <ButtonLink href={`/achats-groupes/${besoinId}`}>Voir mon achat groupé</ButtonLink>
    </section>
  );
}

/* ---------------------------------------------------------------------------------------------------- le détail */

export function DetailAchatGroupe({ id }: { id: string }) {
  const router = useRouter();
  const fetcher = useCallback((signal: AbortSignal) => api<DetailAchat>(`/v1/achats-groupes/${id}`, { signal }), [id]);
  const { data: d, error, reload } = useResource(fetcher);
  const [confirmer, setConfirmer] = useState<"retirer" | "desister" | null>(null);
  const [modifier, setModifier] = useState(false);
  const [qte, setQte] = useState("");
  const [raison, setRaison] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  if (error) return <p role="alert" className="rounded-xl bg-danger-bg p-4 font-semibold text-danger">{messageErreur(error)}</p>;
  if (!d) return null;

  async function geste(nom: string, chemin: string, corps?: unknown, apres?: (r: unknown) => void) {
    setPending(nom);
    setErreur(null);
    try {
      const r = await api(chemin, { method: chemin.endsWith(id) ? "PUT" : "POST", body: corps });
      apres?.(r);
      setConfirmer(null);
      setModifier(false);
      reload();
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setPending(null);
    }
  }

  const o = d.offres;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] leading-[1.05] font-extrabold tracking-[-0.03em]">{d.libelle}</h1>
        <p className="text-[16px] text-muted">
          {quantite(d.quantite)} {d.unite} · {d.commune} · avant le {dateFr(d.dateBesoin)}
        </p>
      </div>
      <Card className={`flex flex-col gap-3 p-4 ${TON[d.etat] ?? ""}`}>
        <p className="text-[18px] font-extrabold">{d.titre}</p>
        {d.sousTitre ? <p className="text-[15px] text-muted">{d.sousTitre}</p> : null}
        <JaugeVolume j={d.jauge} />
      </Card>
      {fait ? (
        <p role="status" className="rounded-xl bg-ok-bg p-4 text-[15px] font-semibold text-ok">
          {fait}
        </p>
      ) : null}

      <ol aria-label="Étapes" className="grid grid-cols-4 gap-1">
        {d.frise.etapes.map((e, i) => (
          <li key={e} aria-current={i === d.frise.courante ? "step" : undefined} className="flex flex-col gap-1.5">
            <span className={`h-1.5 rounded-full ${i <= d.frise.courante ? "bg-accent" : "bg-line"}`} />
            <span className={`text-[12px] leading-tight ${i === d.frise.courante ? "font-bold text-ink" : "text-muted"}`}>{e}</span>
          </li>
        ))}
      </ol>

      {o ? (
        <section aria-label="Les offres" className="flex flex-col gap-3">
          <SectionTitle>Les offres</SectionTitle>
          {o.mien ? (
            <Card className="flex flex-col gap-1 p-4">
              <p className="text-[14px] text-muted">Ton négoce</p>
              <p className="text-[17px] font-extrabold">{o.mien.nom}</p>
              <p className="text-[16px]">{eurosHt(o.mien.totalHt)} livré</p>
            </Card>
          ) : null}
          {o.meilleure ? (
            <Card className="flex flex-col gap-1 p-4">
              <p className="text-[14px] text-muted">La meilleure offre du groupe</p>
              <p className="text-[17px] font-extrabold">{o.meilleure.nom}</p>
              <p className="text-[16px]">{eurosHt(o.meilleure.totalHt)} livré</p>
              {!o.meilleure.nomVisible ? <p className="text-[13px] text-muted">Le nom du négoce est réservé aux abonnés.</p> : null}
            </Card>
          ) : null}
          {o.economieHt ? <p className="rounded-xl bg-ok-bg p-4 text-[17px] font-bold text-ok">Économie : {eurosHt(o.economieHt)}</p> : null}
          {o.enAttente.map((a) => (
            <p key={a.nom} className="text-[14px] text-muted">
              {a.nom} : {a.raison}
            </p>
          ))}
          {d.actions.commander ? (
            <div className="flex flex-col gap-2">
              {[o.meilleure?.consultationId ? { id: o.meilleure.consultationId, nom: o.meilleure.nom } : null, o.mien?.consultationId && o.mien.consultationId !== o.meilleure?.consultationId ? { id: o.mien.consultationId, nom: o.mien.nom } : null]
                .filter((x): x is { id: string; nom: string } => !!x)
                .map((c, i) => (
                  <Button key={c.id} variant={i === 0 ? "primary" : "secondary"} pending={pending === c.id} onClick={() => void geste(c.id, `/v1/achats-groupes/${id}/commander`, { consultationId: c.id }, () => setFait(`C'est commandé chez ${c.nom}. Ton bon de commande est parti chez le négoce.`))}>
                    <ShoppingCart size={18} aria-hidden="true" /> Commander chez {c.nom}
                  </Button>
                ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {d.bonNumero ? (
        <a href={`/v1/achats-groupes/${id}/bon.pdf`} className={LIEN_SECONDAIRE}>
          Mon bon de commande n° {d.bonNumero}
        </a>
      ) : null}

      {d.actions.planB ? (
        <Button pending={pending === "planB"} onClick={() => void geste("planB", `/v1/achats-groupes/${id}/plan-b`, undefined, () => setFait("Ta demande est partie chez tes négoces. Les prix arrivent dans Mes listes."))}>
          Envoyer à mes négoces
        </Button>
      ) : null}

      <section aria-label="Détail" className="flex flex-col gap-2 rounded-2xl bg-surface p-4 shadow-card">
        <p className="text-[15px]">
          <span className="text-muted">Commune : </span>
          {d.commune}
        </p>
        {d.dernierPrix ? <p className="text-[15px]">{d.dernierPrix}</p> : null}
        <p className="text-[15px] text-muted">Tes négoces :</p>
        <ul className="flex flex-col gap-1">
          {d.negoces.map((n) => (
            <li key={n.id} className="text-[15px] font-semibold">
              {n.nom}
              <span className="font-normal text-muted">{n.parti ? " · demande partie" : n.prevenu ? " · prévenu" : ""}</span>
            </li>
          ))}
        </ul>
      </section>

      {modifier ? (
        <Card className="flex flex-col gap-3 p-4">
          <Field id="nouvelle-quantite" label="Nouvelle quantité" inputMode="decimal" value={qte} onChange={(e) => setQte(e.target.value)} />
          <Button variant="secondary" pending={pending === "modifier"} disabled={!(Number(qte.replace(",", ".")) > 0)} onClick={() => void geste("modifier", `/v1/achats-groupes/${id}`, { quantite: Number(qte.replace(/\s/g, "").replace(",", ".")) })}>
            Enregistrer
          </Button>
        </Card>
      ) : null}
      {confirmer ? (
        <Card role="alertdialog" aria-label={confirmer === "retirer" ? "Retirer ma participation" : "Me désister"} className="flex flex-col gap-3 p-4">
          <p className="text-[16px] font-bold">{confirmer === "retirer" ? "Tu retires ta participation ?" : "Tu te désistes ? Le négoce garde son prix pour les autres."}</p>
          {confirmer === "desister" ? <Field id="raison" label="Pourquoi ? (facultatif)" value={raison} onChange={(e) => setRaison(e.target.value)} /> : null}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setConfirmer(null)}>
              Annuler
            </Button>
            <Button variant="ink" pending={pending === confirmer} onClick={() => void geste(confirmer, `/v1/achats-groupes/${id}/${confirmer}`, confirmer === "desister" ? { raison: raison.trim() || null } : undefined, () => router.push("/achats-groupes"))}>
              {confirmer === "retirer" ? "Oui, retirer" : "Oui, me désister"}
            </Button>
          </div>
        </Card>
      ) : null}
      {erreur ? (
        <p role="alert" className="rounded-xl bg-danger-bg p-4 text-[15px] font-semibold text-danger">
          {erreur}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {d.actions.modifier && !modifier ? (
          <Button variant="secondary" onClick={() => (setQte(String(d.quantite)), setModifier(true))}>
            Modifier
          </Button>
        ) : null}
        {d.actions.retirer && !confirmer ? (
          <Button variant="secondary" onClick={() => setConfirmer("retirer")}>
            Retirer
          </Button>
        ) : null}
        {d.actions.desister && !confirmer ? (
          <Button variant="secondary" onClick={() => setConfirmer("desister")}>
            Me désister
          </Button>
        ) : null}
      </div>
      {d.actions.retirer && d.negoces.some((n) => !n.prevenu) ? <PrevenirDepuisDetail id={id} /> : null}
      <InviteLe phrase={d.invite} libelle={d.libelle} />
    </div>
  );
}

/** « Préviens ton négoce » depuis le détail, tant que la demande n'est pas partie. */
function PrevenirDepuisDetail({ id }: { id: string }) {
  const [p, setP] = useState<Prevenir | null>(null);
  if (p) return <EcranPrevenir p={p} besoinId={id} />;
  return (
    <Button variant="secondary" onClick={() => void api<{ prevenir: Prevenir }>(`/v1/achats-groupes/${id}/prevenir`).then((r) => setP(r.prevenir))}>
      <Phone size={18} aria-hidden="true" /> Préviens ton négoce
    </Button>
  );
}

/** « Un collègue commande aussi des ardoises ? Invite-le » : le lien partagé par SMS ou WhatsApp. */
function InviteLe({ phrase, libelle }: { phrase: string; libelle: string }) {
  const lien = useLienInvitation();
  const message = `Je lance un achat groupé de ${libelle} sur Mobiiz : plus on est nombreux, meilleur est le prix. Rejoins-nous : ${lien}`;
  return (
    <section aria-label="Inviter un collègue" className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
      <p className="text-[16px] font-bold">{phrase}</p>
      <div className="grid grid-cols-2 gap-2">
        <a href={`sms:?&body=${encodeURIComponent(message)}`} className={LIEN_SECONDAIRE}>
          SMS
        </a>
        <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" className={LIEN_SECONDAIRE}>
          WhatsApp
        </a>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------------------------------------- la cloche */

/** Les actions qui attendent l'artisan : une offre à comparer, un plan B, puis la prochaine action de chaque liste. */
export function actionsEnAttente(achats: CarteAchat[], next: NextAction[]): { cle: string; texte: string; href: string }[] {
  const a = [
    ...achats.filter((c) => c.etat === "offre").map((c) => ({ cle: `o-${c.id}`, texte: `Offre reçue : ${c.libelle}`, href: `/achats-groupes/${c.id}` })),
    ...achats.filter((c) => c.etat === "pas_assez" && c.actions.planB).map((c) => ({ cle: `p-${c.id}`, texte: `Pas assez de volume : envoie ${c.libelle} à tes négoces`, href: `/achats-groupes/${c.id}` })),
    ...next.slice(0, 3).map((n) => ({ cle: `n-${n.projectId}`, texte: `${n.projectName} : ${n.label}`, href: `/chantiers/${n.projectId}#${n.target}` })),
  ];
  return a.slice(0, 5);
}

/**
 * La cloche en haut à droite (point 10) : les mêmes actions que l'accueil, sur chaque écran ; un point jaune quand il y en
 * a, la liste en un appui.
 */
export function Cloche() {
  const fetchMes = useCallback((signal: AbortSignal) => api<MesAchats>("/v1/achats-groupes", { signal }).catch(() => null), []);
  const fetchNext = useCallback((signal: AbortSignal) => api<{ items: NextAction[] }>("/v1/next-actions", { signal }).catch(() => null), []);
  const { data: mes } = useResource(fetchMes);
  const { data: next } = useResource(fetchNext);
  const [ouvert, setOuvert] = useState(false);
  const actions = actionsEnAttente(mes?.achats ?? [], next?.items ?? []);
  return (
    <div className="relative">
      <button type="button" aria-label={actions.length ? `Notifications : ${actions.length}` : "Notifications"} aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)} className="pressable relative flex size-11 items-center justify-center rounded-full border border-line bg-surface">
        <Bell size={20} aria-hidden="true" />
        {actions.length ? <span aria-hidden="true" className="absolute top-1.5 right-1.5 size-3 rounded-full bg-accent ring-2 ring-surface" /> : null}
      </button>
      {ouvert ? (
        <div role="dialog" aria-label="Notifications" className="animate-rise absolute top-13 right-0 z-40 flex w-72 flex-col divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-card">
          {actions.length === 0 ? <p className="p-4 text-[15px] text-muted">Rien de nouveau. On te prévient dès qu&apos;il y a du nouveau.</p> : null}
          {actions.map((a) => (
            <Link key={a.cle} href={a.href} onClick={() => setOuvert(false)} className="flex min-h-13 items-center justify-between gap-2 px-4 py-2 text-[15px] font-semibold hover:bg-ground">
              {a.texte}
              <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-muted" />
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------- « Acheter en groupe » depuis une liste */

/**
 * Précision 2 (27 octobre 2026) : chaque ligne de la liste qui a une référence du catalogue demande une confirmation d'un
 * tap (« C'est bien de l'ardoise 32×22 ? ») ; une ligne sans référence, ou non confirmée, reste en demande perso.
 */
export function AcheterEnGroupe({ projectId }: { projectId: string }) {
  const fetcher = useCallback((signal: AbortSignal) => api<LignesListe>(`/v1/projects/${projectId}/achat-groupe`, { signal }).catch(() => null), [projectId]);
  const { data } = useResource(fetcher);
  const [ouvert, setOuvert] = useState(false);
  const [oui, setOui] = useState<string[]>([]);
  const [dateBesoin, setDateBesoin] = useState(dansJours(30));
  const [negoces, setNegoces] = useState<NegoceChoisi[]>([]);
  const [pending, setPending] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<{ lancees: { besoinId: string }[]; perso: unknown[] } | null>(null);
  if (!data) return null;
  const rattachables = data.lignes.filter((l) => l.question);
  if (rattachables.length === 0) return null;
  async function lancer() {
    setErreur(null);
    if (negoces.length === 0) return setErreur("Ajoute au moins un négoce à qui envoyer la demande.");
    setPending(true);
    try {
      setFait(await api(`/v1/projects/${projectId}/achat-groupe`, { method: "POST", body: { confirmees: oui, dateBesoin, negoces: negoces.map(negocePourApi) } }));
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setPending(false);
    }
  }
  if (fait)
    return (
      <div role="status" className="flex flex-col gap-3 rounded-xl bg-ok-bg p-4 text-ok">
        <p className="text-[15px] font-semibold">
          {fait.lancees.length} ligne{fait.lancees.length > 1 ? "s" : ""} en achat groupé. {fait.perso.length ? `Les ${fait.perso.length} autres restent pour ta demande à tes négoces.` : ""}
        </p>
        <ButtonLink href={`/achats-groupes/${fait.lancees[0]!.besoinId}`} variant="secondary">
          Préviens ton négoce
        </ButtonLink>
      </div>
    );
  if (!ouvert)
    return (
      <Button onClick={() => setOuvert(true)} className="w-full">
        <Users size={18} aria-hidden="true" /> Acheter en groupe
      </Button>
    );
  return (
    <Card className="flex flex-col gap-4 p-4" aria-label="Acheter en groupe">
      <SectionTitle>Acheter en groupe</SectionTitle>
      <p className="text-[14px] text-muted">Seuls les matériaux identiques se regroupent : confirme chaque référence. Le reste part en demande à tes négoces.</p>
      <ul className="flex flex-col gap-2">
        {data.lignes.map((l) => (
          <li key={l.key} className="flex flex-col gap-2 rounded-xl border border-line p-3">
            <span className="text-[15px] font-semibold">
              {l.designation} · {quantite(l.quantite)} {l.unite}
            </span>
            {l.question ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[15px]">{l.question}</span>
                <button type="button" aria-pressed={oui.includes(l.key)} onClick={() => setOui((o) => (o.includes(l.key) ? o : [...o, l.key]))} className={`min-h-11 rounded-full border px-4 text-[15px] font-semibold ${oui.includes(l.key) ? "border-ink bg-ink text-white" : "border-line bg-surface"}`}>
                  Oui
                </button>
                <button type="button" aria-pressed={!oui.includes(l.key)} onClick={() => setOui((o) => o.filter((k) => k !== l.key))} className={`min-h-11 rounded-full border px-4 text-[15px] font-semibold ${!oui.includes(l.key) ? "border-ink bg-ground" : "border-line bg-surface"}`}>
                  Non
                </button>
              </div>
            ) : (
              <span className="text-[14px] text-muted">Reste en demande à tes négoces.</span>
            )}
          </li>
        ))}
      </ul>
      <Field id="liste-date-besoin" label="Livraison avant le" type="date" value={dateBesoin} onChange={(e) => setDateBesoin(e.target.value)} />
      <ChoixNegoces choisis={negoces} onChange={setNegoces} />
      {erreur ? (
        <p role="alert" className="text-[15px] font-semibold text-danger">
          {erreur}
        </p>
      ) : null}
      <Button variant="ink" pending={pending} disabled={oui.length === 0} onClick={() => void lancer()}>
        Lancer {oui.length > 1 ? `ces ${oui.length} achats groupés` : "l'achat groupé"}
      </Button>
    </Card>
  );
}
