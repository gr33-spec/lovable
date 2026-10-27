"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Check, ChevronRight, ClipboardList, MessageSquare, Phone, Plus, Search, ShoppingCart, Users, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLienInvitation } from "@/components/inviter";
import { Button, ButtonLink, Card, Field, INPUT, SectionTitle } from "@/components/ui";
import { api, messageErreur, type NextAction } from "@/lib/api";
import { dateFr, eurosHt, negocePourApi, quantite, type AchatOuvert, type CarteAchat, type DetailAchat, type Droit, type EngagementTexte, type LignesListe, type MesAchats, type Jauge, type Lance, type NegoceChoisi, type NegocesProposes, type Prevenir, type ResultatAchat } from "@/lib/achat-groupe";
import { useResource } from "@/lib/use-resource";

/**
 * L'ACHAT GROUPÉ PAR MÉTIER, CÔTÉ ÉCRAN (Greg, 27 octobre 2026, 2e message) : les deux portes, la liste au catalogue,
 * l'engagement (règles en clair et case obligatoire), « Préviens ton négoce », la carte et son état, le détail (frise, sa
 * liste, Modifier, Retirer, les deux sorties), les résultats sur SES lignes, commander ou ouvrir un compte, Livré /
 * Problème, le plan B, les cases à cocher d'une liste et la suggestion. Un seul bouton jaune par écran.
 */

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
          <span className="text-[18px] font-extrabold">Achat groupé de ton métier</span>
          <span className="text-[14px] opacity-80">Ta liste rejoint celles des artisans du secteur : les négoces font leur meilleur prix.</span>
        </span>
      </Link>
      <Link href="/chantiers/nouveau" onClick={onChoix} className={`${porte} border border-line bg-surface text-ink`}>
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-ground" aria-hidden="true">
          <ClipboardList size={24} />
        </span>
        <span className="flex flex-col gap-0.5">
          <span className="text-[18px] font-extrabold">Ma liste de matériaux</span>
          <span className="text-[14px] text-muted">Depuis ton devis, une photo, ou notée toi-même : à envoyer à tes négoces ou à mettre en achat groupé.</span>
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
    <Link href={`/achats-groupes/${c.id}`} aria-label={`${c.titreAchat} : ${c.titre}`} className={`pressable flex flex-col gap-3 rounded-2xl p-4 shadow-card ${TON[c.etat] ?? "bg-surface"}`}>
      <span className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[16px] font-extrabold">{c.titreAchat}</span>
          <span className="text-[14px] text-muted">
            {c.lignes.length} ligne{c.lignes.length > 1 ? "s" : ""} · {c.commune}
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

/** « Achats groupés de ton métier près de chez toi » : la phrase de l'alerte (point 21), les entreprises au-delà du seuil. */
export function CarteAchatOuvert({ a }: { a: AchatOuvert }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-card">
      <span className="text-[16px] font-extrabold">{a.titre}</span>
      <span className="text-[15px]">{a.phrase}</span>
      {a.entreprises ? <span className="text-[14px] text-muted">{a.entreprises} entreprises</span> : null}
      <JaugeVolume j={a.jauge} />
      <ButtonLink href={`/achats-groupes/lancer?rejoindre=${a.id}&titre=${encodeURIComponent(a.titre)}`} variant="secondary">
        Ajouter ma liste
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

/* ------------------------------------------------------------------------------------- l'engagement (B6 à B9) */

/**
 * Point 9 : les règles en clair, puis la case obligatoire « Je commande ces quantités… » ; le premier achat groupé est
 * offert, ensuite l'abonnement (point 25).
 */
export function Engagement({ droit, texte, coche, onCoche }: { droit: Droit; texte: EngagementTexte; coche: boolean; onCoche: (v: boolean) => void }) {
  if (!droit.ok)
    return (
      <div role="status" className="flex flex-col gap-3 rounded-xl bg-accent-soft p-4">
        <p className="text-[16px] font-bold">{droit.phrase}</p>
        <ButtonLink href="/abonnement" variant="secondary">
          M&apos;abonner
        </ButtonLink>
      </div>
    );
  return (
    <section aria-label="Mon engagement" className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
      <p className="text-[16px] font-extrabold">En rejoignant, tu t&apos;engages</p>
      <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[15px] leading-snug">
        {texte.regles.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <label className="flex items-start gap-3 rounded-xl bg-ground p-3 text-[15px] font-semibold">
        <input type="checkbox" checked={coche} onChange={(e) => onCoche(e.target.checked)} className="mt-0.5 size-6 shrink-0 accent-accent" />
        <span>{texte.phrase}</span>
      </label>
      {droit.offert && droit.phrase ? <p className="rounded-xl bg-ok-bg p-3 text-[15px] font-bold text-ok">{droit.phrase}</p> : null}
    </section>
  );
}

/* ---------------------------------------------------------------------------------------- ajouter sa liste */

const dansJours = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

/**
 * Sans liste enregistrée : le panier se compose au catalogue (une référence, sa quantité, autant de lignes que voulu), la
 * commune, la date (sauf quand on rejoint un achat : c'est la sienne), ses négoces, puis l'engagement.
 */
export function FormulaireAchatGroupe({ rejoindre }: { rejoindre: { id: string; titre: string } | null }) {
  const [q, setQ] = useState("");
  const fetchCat = useCallback((signal: AbortSignal) => api<{ references: { designation: string; unite: string }[] }>(`/v1/achats-groupes/catalogue?q=${encodeURIComponent(q)}`, { signal }), [q]);
  const fetchMes = useCallback((signal: AbortSignal) => api<MesAchats>("/v1/achats-groupes", { signal }), []);
  const { data } = useResource(fetchCat);
  const { data: mes } = useResource(fetchMes);
  const [lignes, setLignes] = useState<{ designation: string; unite: string; qte: string }[]>([]);
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
  const [engage, setEngage] = useState(false);
  const [pending, setPending] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [lance, setLance] = useState<Lance | null>(null);
  const nombre = (s: string) => Number(s.replace(/\s/g, "").replace(",", "."));
  const pretes = lignes.filter((l) => nombre(l.qte) > 0);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (negoces.length === 0) return setErreur("Ajoute au moins un négoce à qui envoyer la demande.");
    if (!engage) return setErreur("Coche la case d'engagement pour rejoindre l'achat groupé.");
    setPending(true);
    try {
      setLance(
        await api<Lance>("/v1/achats-groupes", {
          method: "POST",
          body: { achatId: rejoindre?.id ?? null, lignes: pretes.map((l) => ({ designation: l.designation, quantite: nombre(l.qte), unite: l.unite })), livraison: livraison.trim(), dateBesoin: rejoindre ? null : dateBesoin, negoces: negoces.map(negocePourApi), engagement: true },
        }),
      );
    } catch (err) {
      setErreur(messageErreur(err));
    } finally {
      setPending(false);
    }
  }

  if (lance) return <EcranPrevenir p={lance.prevenir} besoinId={lance.besoinId} message={lance.ajoute ? "Tes lignes s'ajoutent à ta liste dans cet achat groupé." : `Ta liste est dans l'achat groupé : ${lance.titre}.${lance.offert ? " Ton premier achat groupé est offert." : ""}`} />;

  return (
    <form onSubmit={(e) => void envoyer(e)} aria-label={rejoindre ? "Rejoindre l'achat groupé" : "Ajouter ma liste à un achat groupé"} className="flex flex-col gap-5">
      {rejoindre ? (
        <Card className="p-4">
          <p className="text-[14px] text-muted">Achat groupé</p>
          <p className="text-[18px] font-extrabold">{rejoindre.titre}</p>
        </Card>
      ) : null}
      {mes?.exclusion ? (
        <p role="alert" className="rounded-xl bg-danger-bg p-4 text-[15px] font-semibold text-danger">
          {mes.exclusion}
        </p>
      ) : null}
      <div className="flex flex-col gap-3">
        <label htmlFor="cherche-materiau" className="text-[14px] font-semibold">
          Ajoute tes matériaux
        </label>
        <div className="flex min-h-13 items-center gap-3 rounded-xl border border-line bg-surface px-4 focus-within:border-accent">
          <Search size={18} className="text-muted" aria-hidden="true" />
          <input id="cherche-materiau" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ardoise 32×22, liteaux, zinc 0,65…" className="min-h-12 grow bg-transparent text-[16px] outline-none placeholder:text-muted" autoComplete="off" />
        </div>
        <ul aria-label="Catalogue" className="flex flex-wrap gap-2">
          {(data?.references ?? [])
            .filter((r) => !lignes.some((l) => l.designation === r.designation))
            .slice(0, 8)
            .map((r) => (
              <li key={r.designation}>
                <button type="button" onClick={() => setLignes((ls) => [...ls, { designation: r.designation, unite: r.unite, qte: "" }])} className="pressable inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-left text-[15px] font-semibold">
                  <Plus size={16} aria-hidden="true" /> {r.designation}
                </button>
              </li>
            ))}
        </ul>
        {lignes.length ? (
          <ul aria-label="Ma liste" className="flex flex-col gap-2">
            {lignes.map((l, i) => (
              <li key={l.designation} className="flex items-end gap-2 rounded-xl border border-line bg-surface p-3">
                <div className="flex min-w-0 grow flex-col gap-1">
                  <span className="text-[15px] font-semibold">{l.designation}</span>
                  <label className="flex items-center gap-2 text-[14px] text-muted">
                    <span className="sr-only">Quantité de {l.designation}</span>
                    <input inputMode="decimal" value={l.qte} placeholder="Quantité" onChange={(e) => setLignes((ls) => ls.map((x, j) => (j === i ? { ...x, qte: e.target.value } : x)))} className={`${INPUT} max-w-36`} />
                    {l.unite}
                  </label>
                </div>
                <button type="button" aria-label={`Retirer ${l.designation}`} onClick={() => setLignes((ls) => ls.filter((_, j) => j !== i))} className="grid size-11 shrink-0 place-items-center rounded-full text-muted">
                  <X size={20} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <Field id="commune" label="Commune de livraison" placeholder="22300 Lannion" value={livraison} onChange={(e) => setLivraison(e.target.value)} />
      {rejoindre ? null : <Field id="date-besoin" label="Livraison avant le" type="date" value={dateBesoin} onChange={(e) => setDateBesoin(e.target.value)} />}
      <ChoixNegoces choisis={negoces} onChange={setNegoces} />
      {mes ? <Engagement droit={mes.droit} texte={mes.engagement} coche={engage} onCoche={setEngage} /> : null}
      {erreur ? (
        <p role="alert" className="rounded-xl bg-danger-bg p-4 text-[15px] font-semibold text-danger">
          {erreur}
        </p>
      ) : null}
      <Button type="submit" pending={pending} disabled={pretes.length === 0 || !livraison.trim() || (!rejoindre && !dateBesoin) || !mes?.droit.ok || !!mes?.exclusion}>
        Je m&apos;engage et j&apos;ajoute ma liste
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
  const [confirmer, setConfirmer] = useState<"retirer" | string | null>(null);
  const [modifier, setModifier] = useState<Record<string, string> | null>(null);
  const [probleme, setProbleme] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  if (error) return <p role="alert" className="rounded-xl bg-danger-bg p-4 font-semibold text-danger">{messageErreur(error)}</p>;
  if (!d) return null;

  async function geste(nom: string, chemin: string, corps?: unknown, apres?: (r: unknown) => void, methode: "POST" | "PUT" = "POST") {
    setPending(nom);
    setErreur(null);
    try {
      const r = await api(chemin, { method: methode, body: corps });
      apres?.(r);
      setConfirmer(null);
      setModifier(null);
      setProbleme(null);
      reload();
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setPending(null);
    }
  }

  const r = d.resultat;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-[26px] leading-[1.08] font-extrabold tracking-[-0.03em]">{d.titreAchat}</h1>
        <p className="text-[16px] text-muted">
          {d.lignes.length} ligne{d.lignes.length > 1 ? "s" : ""} · {d.commune}
          {d.offert ? " · offert" : ""}
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

      {r ? <Resultat id={id} d={d} r={r} pending={pending} geste={geste} /> : null}

      {d.bonNumero ? (
        <div className="flex flex-col gap-2">
          <p className="text-[15px] font-semibold">{d.commandeRecue ? "Commande reçue par le négoce." : "En attente de « Commande reçue » du négoce."}</p>
          <a href={`/v1/achats-groupes/${id}/bon.pdf`} className={LIEN_SECONDAIRE}>
            Mon bon de commande n° {d.bonNumero}
          </a>
        </div>
      ) : null}
      {d.livre ? <p className="rounded-xl bg-ok-bg p-3 text-[15px] font-semibold text-ok">Livré.</p> : null}
      {d.probleme ? <p className="rounded-xl bg-warn-bg p-3 text-[15px] font-semibold">Problème signalé : {d.probleme}</p> : null}
      {d.actions.livre ? (
        probleme !== null ? (
          <Card className="flex flex-col gap-3 p-4">
            <Field id="probleme" label="Quel problème ?" value={probleme} onChange={(e) => setProbleme(e.target.value)} />
            <Button variant="secondary" disabled={!probleme.trim()} pending={pending === "probleme"} onClick={() => void geste("probleme", `/v1/achats-groupes/${id}/livre`, { probleme: probleme.trim() })}>
              Envoyer
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" pending={pending === "livre"} onClick={() => void geste("livre", `/v1/achats-groupes/${id}/livre`, {}, () => setFait("Merci, c'est noté : livré."))}>
              <Check size={18} aria-hidden="true" /> Livré
            </Button>
            <Button variant="secondary" onClick={() => setProbleme("")}>
              Problème
            </Button>
          </div>
        )
      ) : null}

      {d.actions.planB ? (
        <Button pending={pending === "planB"} onClick={() => void geste("planB", `/v1/achats-groupes/${id}/plan-b`, undefined, () => setFait("Ta liste est partie chez tes négoces. Les prix arrivent dans Mes listes."))}>
          Envoyer ma liste à mes négoces
        </Button>
      ) : null}

      <section aria-label="Ma liste" className="flex flex-col gap-2 rounded-2xl bg-surface p-4 shadow-card">
        <p className="text-[15px] font-bold">Ma liste</p>
        <ul className="flex flex-col divide-y divide-line">
          {d.lignes.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 py-2 text-[15px]">
              <span>{l.libelle}</span>
              {modifier ? (
                <input aria-label={`Quantité de ${l.libelle}`} inputMode="decimal" value={modifier[l.id] ?? ""} onChange={(e) => setModifier({ ...modifier, [l.id]: e.target.value })} className={`${INPUT} max-w-28`} />
              ) : (
                <span className="shrink-0 font-semibold whitespace-nowrap">
                  {quantite(l.quantite)} {l.unite}
                </span>
              )}
            </li>
          ))}
        </ul>
        {modifier ? (
          <Button
            variant="secondary"
            pending={pending === "modifier"}
            onClick={() => void geste("modifier", `/v1/achats-groupes/${id}`, { quantites: Object.fromEntries(Object.entries(modifier).map(([k, v]) => [k, Number(v.replace(/\s/g, "").replace(",", ".")) || 0])) }, undefined, "PUT")}
          >
            Enregistrer
          </Button>
        ) : null}
        <p className="pt-2 text-[15px] text-muted">Tes négoces :</p>
        <ul className="flex flex-col gap-1">
          {d.negoces.map((n) => (
            <li key={n.id} className="text-[15px] font-semibold">
              {n.nom}
              <span className="font-normal text-muted">{n.parti ? " · demande partie" : n.prevenu ? " · prévenu" : ""}</span>
            </li>
          ))}
        </ul>
      </section>

      {confirmer === "retirer" ? (
        <Card role="alertdialog" aria-label="Retirer ma liste" className="flex flex-col gap-3 p-4">
          <p className="text-[16px] font-bold">Tu retires ta liste de cet achat groupé ?</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setConfirmer(null)}>
              Annuler
            </Button>
            <Button variant="ink" pending={pending === "retirer"} onClick={() => void geste("retirer", `/v1/achats-groupes/${id}/retirer`, undefined, () => router.push("/achats-groupes"))}>
              Oui, retirer
            </Button>
          </div>
        </Card>
      ) : confirmer ? (
        <Card role="alertdialog" aria-label="Sortir de l'achat groupé" className="flex flex-col gap-3 p-4">
          <p className="text-[16px] font-bold">Tu sors de l&apos;achat groupé : « {d.motifsSortie.find((m) => m.valeur === confirmer)?.libelle} » ?</p>
          <p className="text-[14px] text-muted">Deux sorties en trois mois, ou une commande pas passée sans motif : plus d&apos;achat groupé pendant 3 mois.</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setConfirmer(null)}>
              Annuler
            </Button>
            <Button variant="ink" pending={pending === "sortir"} onClick={() => void geste("sortir", `/v1/achats-groupes/${id}/sortir`, { motif: confirmer }, (x) => setFait((x as { exclusion: string | null }).exclusion ?? "C'est noté : tu es sorti de cet achat groupé."))}>
              Oui, sortir
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
          <Button variant="secondary" onClick={() => setModifier(Object.fromEntries(d.lignes.map((l) => [l.id, String(l.quantite)])))}>
            Modifier mes quantités
          </Button>
        ) : null}
        {d.actions.retirer && !confirmer ? (
          <Button variant="secondary" onClick={() => setConfirmer("retirer")}>
            Retirer ma liste
          </Button>
        ) : null}
      </div>
      {d.actions.sortir && !confirmer ? (
        <section aria-label="Sortir de l'achat groupé" className="flex flex-col gap-2">
          <p className="text-[14px] text-muted">Sortir de l&apos;achat groupé, avec le motif :</p>
          {d.motifsSortie.map((m) => (
            <Button key={m.valeur} variant="secondary" onClick={() => setConfirmer(m.valeur)}>
              {m.libelle}
            </Button>
          ))}
        </section>
      ) : null}
      {d.actions.retirer && d.negoces.some((n) => !n.prevenu) ? <PrevenirDepuisDetail id={id} /> : null}
      <InviteLe phrase={d.invite} libelle={d.metier.toLowerCase()} />
    </div>
  );
}

/**
 * Points 13, 17 à 19 : la phrase de la publication, puis chaque offre sur SES lignes (complètes d'abord, « N lignes non
 * chiffrées »), et pour commander : son négoce habituel, ou ouvrir un compte (conditions, coordonnées avec son accord).
 */
function Resultat({ id, d, r, pending, geste }: { id: string; d: DetailAchat; r: ResultatAchat; pending: string | null; geste: (nom: string, chemin: string, corps?: unknown, apres?: (r: unknown) => void) => Promise<void> }) {
  const [accord, setAccord] = useState<string | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);
  return (
    <section aria-label="Les offres" className="flex flex-col gap-3">
      {r.phrase ? <p className="rounded-xl bg-ok-bg p-4 text-[17px] font-bold text-ok">{r.phrase}</p> : null}
      {r.commandeChez ? <p className="text-[15px] font-semibold">Commandé chez {r.commandeChez}.</p> : null}
      {d.commandeAvantLe && d.actions.commander ? <p className="text-[14px] text-muted">Commande avant le {dateFr(d.commandeAvantLe)}.</p> : null}
      <SectionTitle>Les offres pour ta liste</SectionTitle>
      {r.offres.map((o, i) => (
        <Card key={o.consultationId} className="flex flex-col gap-2 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <p className="text-[17px] font-extrabold">{o.nom}</p>
              <p className="text-[13px] text-muted">{i === 0 ? "La meilleure offre" : o.habituel ? "Ton négoce" : "Négoce du groupe"}</p>
            </div>
            <p className="shrink-0 text-[16px] font-bold whitespace-nowrap">{eurosHt(o.totalHt)}</p>
          </div>
          <p className={`text-[14px] font-semibold ${o.complete ? "text-ok" : "text-warn"}`}>{o.complete ? "Toute ta liste, livraison comprise" : o.manquantes}</p>
          <button type="button" aria-expanded={ouvert === o.consultationId} onClick={() => setOuvert(ouvert === o.consultationId ? null : o.consultationId)} className="min-h-11 self-start text-[14px] font-semibold text-accent-text underline">
            {ouvert === o.consultationId ? "Masquer les prix" : "Voir les prix"}
          </button>
          {ouvert === o.consultationId ? (
            <ul className="flex flex-col divide-y divide-line text-[14px]">
              {o.lignes.map((l) => (
                <li key={l.libelle} className="flex justify-between gap-2 py-1.5">
                  <span>
                    {l.libelle} · {quantite(l.quantite)} {l.unite}
                  </span>
                  <span className={l.prixHt === null ? "text-danger" : "font-semibold"}>{l.prixHt === null ? "non chiffrée" : eurosHt(l.prixHt)}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {d.actions.commander ? (
            o.habituel ? (
              <Button variant={i === 0 ? "primary" : "secondary"} pending={pending === o.consultationId} onClick={() => void geste(o.consultationId, `/v1/achats-groupes/${id}/commander`, { consultationId: o.consultationId })}>
                <ShoppingCart size={18} aria-hidden="true" /> Commander chez {o.nom}
              </Button>
            ) : (
              <div className="flex flex-col gap-2 rounded-xl bg-ground p-3">
                <p className="text-[15px] font-semibold">{o.ouvertureCompte}</p>
                {r.coordonneesTransmises === o.nom ? (
                  <p className="text-[15px] font-semibold text-ok">Tes coordonnées sont parties : {o.nom} te rappelle de la part de Mobiiz.</p>
                ) : (
                  <>
                    <label className="flex items-start gap-3 text-[14px]">
                      <input type="checkbox" checked={accord === o.consultationId} onChange={(e) => setAccord(e.target.checked ? o.consultationId : null)} className="mt-0.5 size-5 shrink-0 accent-accent" />
                      <span>J&apos;accepte que Mobiiz transmette à {o.nom} mon nom, mon entreprise, mon téléphone, mon e-mail et mon SIRET, pour ouvrir un compte.</span>
                    </label>
                    <Button variant={i === 0 ? "primary" : "secondary"} disabled={accord !== o.consultationId} pending={pending === `c-${o.consultationId}`} onClick={() => void geste(`c-${o.consultationId}`, `/v1/achats-groupes/${id}/coordonnees`, { consultationId: o.consultationId, consentement: true })}>
                      Je suis intéressé, transmettre mes coordonnées
                    </Button>
                  </>
                )}
                <Button variant="secondary" pending={pending === o.consultationId} onClick={() => void geste(o.consultationId, `/v1/achats-groupes/${id}/commander`, { consultationId: o.consultationId })}>
                  J&apos;ai déjà un compte : commander
                </Button>
              </div>
            )
          ) : null}
        </Card>
      ))}
    </section>
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
  const message = `Je mets ma liste en achat groupé ${libelle} sur Mobiiz : plus on est nombreux, meilleur est le prix. Rejoins-nous : ${lien}`;
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
    ...achats.filter((c) => c.etat === "offre").map((c) => ({ cle: `o-${c.id}`, texte: `Résultats : ${c.titreAchat}`, href: `/achats-groupes/${c.id}` })),
    ...achats.filter((c) => c.etat === "pas_assez" && c.actions.planB).map((c) => ({ cle: `p-${c.id}`, texte: `Pas assez de volume : envoie ta liste à tes négoces`, href: `/achats-groupes/${c.id}` })),
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
 * Depuis la liste (points 2, 3 et 22) : une case par ligne ; cocher une ligne, c'est confirmer d'un tap sa référence du
 * catalogue (« C'est bien de l'ardoise 32×22 ? ») ; « Tout cocher » ; une ligne sans référence reste en demande perso. Une
 * grosse quantité amène la suggestion, qui ouvre les cases avec ces lignes déjà cochées. Puis l'achat ouvert du secteur
 * (ou une date), ses négoces, l'engagement.
 */
export function AcheterEnGroupe({ projectId }: { projectId: string }) {
  const fetcher = useCallback((signal: AbortSignal) => api<LignesListe>(`/v1/projects/${projectId}/achat-groupe`, { signal }).catch(() => null), [projectId]);
  const { data } = useResource(fetcher);
  const [cochees, setCochees] = useState<string[] | null>(null);
  const [achatId, setAchatId] = useState<string | null | undefined>(undefined);
  const [dateBesoin, setDateBesoin] = useState(dansJours(30));
  const [livraison, setLivraison] = useState<string | null>(null);
  const [negoces, setNegoces] = useState<NegoceChoisi[]>([]);
  const [engage, setEngage] = useState(false);
  const [pending, setPending] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<(Lance & { perso: unknown[]; lancees: unknown[] }) | null>(null);
  if (!data) return null;
  const rattachables = data.lignes.filter((l) => l.question);
  if (rattachables.length === 0) return null;
  const achat = achatId === undefined ? (data.achatsOuverts[0]?.id ?? null) : achatId;

  async function lancer() {
    setErreur(null);
    if (negoces.length === 0) return setErreur("Ajoute au moins un négoce à qui envoyer la demande.");
    if (!engage) return setErreur("Coche la case d'engagement pour rejoindre l'achat groupé.");
    setPending(true);
    try {
      setFait(await api(`/v1/projects/${projectId}/achat-groupe`, { method: "POST", body: { confirmees: cochees ?? [], achatId: achat, livraison: (livraison ?? data?.adresse ?? "").trim() || null, dateBesoin: achat ? null : dateBesoin, negoces: negoces.map(negocePourApi), engagement: true } }));
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
          {fait.lancees.length} ligne{fait.lancees.length > 1 ? "s" : ""} dans l&apos;achat groupé : {fait.titre}. {fait.perso.length ? `Les ${fait.perso.length} autres restent pour ta demande à tes négoces.` : ""}
        </p>
        {fait.offert ? <p className="text-[15px] font-bold">Ton premier achat groupé est offert.</p> : null}
        <ButtonLink href={`/achats-groupes/${fait.besoinId}`} variant="secondary">
          Préviens ton négoce
        </ButtonLink>
      </div>
    );
  if (cochees === null)
    return (
      <div className="flex flex-col gap-3">
        {data.suggestion ? (
          <div className="flex flex-col gap-3 rounded-xl bg-accent-soft p-4">
            <p className="text-[16px] font-bold">{data.suggestion.phrase}</p>
            <Button onClick={() => setCochees(data.suggestion!.keys)}>
              <Users size={18} aria-hidden="true" /> Mettre en achat groupé
            </Button>
          </div>
        ) : null}
        <Button variant={data.suggestion ? "secondary" : "primary"} onClick={() => setCochees([])} className="w-full">
          <Users size={18} aria-hidden="true" /> Acheter en groupe
        </Button>
      </div>
    );
  const tout = rattachables.every((l) => cochees.includes(l.key));
  return (
    <Card className="flex flex-col gap-4 p-4" aria-label="Acheter en groupe">
      <div className="flex items-center justify-between gap-3">
        <SectionTitle>Acheter en groupe</SectionTitle>
        <button type="button" onClick={() => setCochees(tout ? [] : rattachables.map((l) => l.key))} className="min-h-11 shrink-0 text-[15px] font-semibold text-accent-text underline">
          {tout ? "Tout décocher" : "Tout cocher"}
        </button>
      </div>
      <p className="text-[14px] text-muted">Coche les lignes à mettre en achat groupé : chaque case confirme la référence du catalogue. Le reste part en demande à tes négoces.</p>
      <ul className="flex flex-col gap-2">
        {data.lignes.map((l) => (
          <li key={l.key}>
            {l.question ? (
              <label className={`flex items-start gap-3 rounded-xl border p-3 ${cochees.includes(l.key) ? "border-ink bg-ground" : "border-line"}`}>
                <input type="checkbox" checked={cochees.includes(l.key)} onChange={(e) => setCochees((c) => (e.target.checked ? [...(c ?? []), l.key] : (c ?? []).filter((k) => k !== l.key)))} className="mt-0.5 size-6 shrink-0 accent-accent" />
                <span className="flex flex-col gap-0.5">
                  <span className="text-[15px] font-semibold">
                    {l.designation} · {quantite(l.quantite)} {l.unite}
                  </span>
                  <span className="text-[14px] text-muted">{l.question}</span>
                </span>
              </label>
            ) : (
              <div className="flex flex-col gap-0.5 rounded-xl border border-dashed border-line p-3">
                <span className="text-[15px] font-semibold">
                  {l.designation} · {quantite(l.quantite)} {l.unite}
                </span>
                <span className="text-[14px] text-muted">Reste en demande perso à tes négoces.</span>
              </div>
            )}
          </li>
        ))}
      </ul>
      {data.achatsOuverts.length ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[14px] font-semibold">Quel achat groupé ?</legend>
          {data.achatsOuverts.map((a) => (
            <label key={a.id} className="flex items-start gap-3 rounded-xl border border-line p-3 text-[15px]">
              <input type="radio" name="achat" checked={achat === a.id} onChange={() => setAchatId(a.id)} className="mt-0.5 size-5 accent-accent" />
              <span>
                <span className="font-semibold">{a.titre}</span>
                <span className="block text-[14px] text-muted">Ajoute ta liste avant le {dateFr(a.clotureLe)}.</span>
              </span>
            </label>
          ))}
          <label className="flex items-center gap-3 rounded-xl border border-line p-3 text-[15px]">
            <input type="radio" name="achat" checked={achat === null} onChange={() => setAchatId(null)} className="size-5 accent-accent" />
            Une autre date de livraison
          </label>
        </fieldset>
      ) : null}
      <Field id="liste-commune" label="Commune de livraison" placeholder="22300 Lannion" value={livraison ?? data.adresse ?? ""} onChange={(e) => setLivraison(e.target.value)} />
      {achat === null ? <Field id="liste-date-besoin" label="Livraison avant le" type="date" value={dateBesoin} onChange={(e) => setDateBesoin(e.target.value)} /> : null}
      <ChoixNegoces choisis={negoces} onChange={setNegoces} />
      <Engagement droit={data.droit} texte={data.engagement} coche={engage} onCoche={setEngage} />
      {erreur ? (
        <p role="alert" className="text-[15px] font-semibold text-danger">
          {erreur}
        </p>
      ) : null}
      <Button variant="ink" pending={pending} disabled={cochees.length === 0 || !data.droit.ok} onClick={() => void lancer()}>
        Je m&apos;engage et j&apos;ajoute {cochees.length > 1 ? `ces ${cochees.length} lignes` : "cette ligne"}
      </Button>
    </Card>
  );
}
