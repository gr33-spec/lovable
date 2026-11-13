"use client";

import { useCallback, useState } from "react";
import { PorteAdmin } from "@/components/admin-achat-groupe";
import { BackButton, Button, Card, ErrorNotice, Field, PageTitle, SectionTitle, Spinner } from "@/components/ui";
import { api, messageErreur } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

interface ArticleAdmin {
  cle: string;
  famille: string;
  produit: string;
  variante: string | null;
  designation: string;
  unite: string;
  masque: boolean;
  ajoute: boolean;
  /** Le cœur métier (Greg, 13 novembre 2026) : métier principal, métiers secondaires, où il se lit, d'où il vient. */
  metier: string;
  metiersSecondaires: string[];
  synonymes: string[];
  aVerifier: boolean;
  aliasDe: string | null;
  origine: string;
  modifieLe: string;
  chemins: string[];
}
interface Doublon {
  nature: "ancien_identifiant" | "partage_entre_metiers" | "exact" | "unites_differentes" | "probable";
  designation: string;
  cles: string[];
  canonique: string | null;
}
const NATURES: Record<Doublon["nature"], string> = {
  ancien_identifiant: "Ancien identifiant (le même article sous une clé d'avant) : gardé en base, plus proposé deux fois.",
  partage_entre_metiers: "Le même article sous deux métiers : un seul résultat est montré, l'autre métier est dit.",
  exact: "Même désignation, même unité, même métier : à regarder.",
  unites_differentes: "Même désignation, unités différentes : à regarder, jamais fusionné d'office.",
  probable: "Mêmes mots dans un autre ordre : probablement le même article.",
};

/**
 * L'ADMIN DU CATALOGUE (correction après test de Greg, 30 octobre 2026, point 3) : le catalogue est en données, modifiable
 * ici sans toucher au code : renommer, masquer, ajouter ; et les lignes libres des achats groupés ouverts, à rattacher à
 * un article (elles se cumulent alors) ou à laisser partir telles quelles.
 */
export default function AdminCataloguePage() {
  return (
    <div className="flex flex-col gap-5">
      <BackButton fallback="/admin/pilotage" />
      <PageTitle>Catalogue</PageTitle>
      <PorteAdmin>
        <Synchronisation />
        <Propositions />
        <LignesLibres />
        <Articles />
      </PorteAdmin>
    </div>
  );
}

/**
 * LA SYNCHRONISATION EXPLICITE (Greg, 12 novembre 2026 : « ne conserve pas un système où l'ajout de centaines d'articles
 * dépend silencieusement de la première ouverture du catalogue par un artisan ») : le relevé d'abord, puis un geste de
 * l'admin. Seuls les articles absents entrent ; rien n'est modifié ni supprimé ; rejouée, elle n'ajoute rien.
 */
function Synchronisation() {
  type Etat = { enBase: number; dansLAmorce: number; aAjouter: number; aAjouterParMetier: Record<string, number>; horsAmorce: number; anciensIdentifiants?: number; doublons?: Record<string, number>; bilanParMetier?: { metier: string; libelle: string; enBase: number; aAjouter: number; sansFamille: number }[] };
  const { data, reload } = useResource(useCallback((signal: AbortSignal) => api<Etat>("/v1/admin/catalogue/synchronisation", { signal }), []));
  const [pending, setPending] = useState(false);
  const [fait, setFait] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  if (!data) return null;
  return (
    <section aria-label="Synchronisation du catalogue" className="flex flex-col gap-2">
      <SectionTitle>Synchronisation</SectionTitle>
      <Card className="flex flex-col gap-3">
        <p className="text-[15px]">
          {data.enBase} articles en base, {data.dansLAmorce} dans le catalogue du code.{" "}
          {data.aAjouter > 0
            ? `${data.aAjouter} article${data.aAjouter > 1 ? "s" : ""} à ajouter (${Object.entries(data.aAjouterParMetier)
                .map(([m, n]) => `${m} : ${n}`)
                .join(", ")}).`
            : "Rien à ajouter : la base est à jour."}
          {data.horsAmorce > 0 ? ` ${data.horsAmorce} article${data.horsAmorce > 1 ? "s" : ""} de la base hors du code (ajouts, anciennes clés) : jamais touchés.` : ""}
        </p>
        <p className="text-[13px] text-muted">Seuls les articles absents sont ajoutés. Aucun article existant n&apos;est modifié ni supprimé.</p>
        {data.anciensIdentifiants ? <p className="text-[13px] text-muted">{data.anciensIdentifiants} ancien{data.anciensIdentifiants > 1 ? "s" : ""} identifiant{data.anciensIdentifiants > 1 ? "s" : ""} : gardé{data.anciensIdentifiants > 1 ? "s" : ""} en base, plus proposé{data.anciensIdentifiants > 1 ? "s" : ""} deux fois à l&apos;artisan.</p> : null}
        {/* Le bilan par métier : ce qui est en base, ce qui entrerait, ce qu'aucune famille ne range. */}
        {data.bilanParMetier ? (
          <div className="overflow-x-auto">
            <table aria-label="Bilan par métier" className="w-full text-left text-[14px]">
              <thead>
                <tr className="text-muted">
                  <th className="py-1 pr-3 font-semibold">Métier</th>
                  <th className="py-1 pr-3 text-right font-semibold">En base</th>
                  <th className="py-1 pr-3 text-right font-semibold">À ajouter</th>
                  <th className="py-1 text-right font-semibold">Sans famille</th>
                </tr>
              </thead>
              <tbody>
                {data.bilanParMetier.map((b) => (
                  <tr key={b.metier} className="border-t border-line">
                    <th scope="row" className="py-1 pr-3 font-semibold">{b.libelle}</th>
                    <td className="py-1 pr-3 text-right tabular-nums">{b.enBase}</td>
                    <td className="py-1 pr-3 text-right tabular-nums">{b.aAjouter}</td>
                    <td className="py-1 text-right tabular-nums">{b.sansFamille}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {data.aAjouter > 0 ? (
          <Button
            variant="ink"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              setErreur(null);
              try {
                const r = await api<{ ajoutes: number; apres: Etat }>("/v1/admin/catalogue/synchronisation", { method: "POST" });
                setFait(`${r.ajoutes} article${r.ajoutes > 1 ? "s" : ""} ajouté${r.ajoutes > 1 ? "s" : ""} : ${r.apres.enBase} articles en base.`);
                reload();
              } catch (e) {
                setErreur(messageErreur(e));
              } finally {
                setPending(false);
              }
            }}
          >
            {pending ? "Synchronisation…" : `Ajouter les ${data.aAjouter} articles absents`}
          </Button>
        ) : null}
        {fait ? (
          <p role="status" className="text-[14px] font-semibold text-ok">
            {fait}
          </p>
        ) : null}
        {erreur ? (
          <p role="alert" className="text-[15px] font-semibold text-danger">
            {erreur}
          </p>
        ) : null}
      </Card>
    </section>
  );
}

/**
 * LES INTITULÉS PROPOSÉS PAR LES ARTISANS (Greg, 30 octobre 2026, nuit : une bibliothèque de matériaux génériques) :
 * génériques et écrits par plusieurs entreprises, sans le nom d'aucune ; ajoutés ici au catalogue, ils sont proposés à
 * tous. Depuis le 31 octobre au soir (« le produit sera existant »), dès deux entreprises (écrit ou commandé en achat
 * groupé) ils sont déjà proposés à tous comme « écrit par d'autres artisans » ; l'admin peut les écarter.
 */
function Propositions() {
  const charger = useCallback(
    (signal: AbortSignal) =>
      Promise.all([
        api<{ items: { cle: string; libelle: string; unite: string; entreprises: number; variantes?: string[]; publiee?: boolean }[] }>("/v1/admin/catalogue/propositions", { signal }),
        api<{ metiers: { code: string; libelle: string }[] }>("/v1/admin/catalogue", { signal }),
      ]).then(([p, c]) => ({ items: p.items, metiers: c.metiers })),
    [],
  );
  const { data, reload } = useResource(charger);
  const [choix, setChoix] = useState<Record<string, { metier: string; famille: string }>>({});
  const [erreur, setErreur] = useState<string | null>(null);
  if (!data?.items.length) return null;
  return (
    <section aria-label="Intitulés proposés par les artisans" className="flex flex-col gap-2">
      <SectionTitle>Intitulés proposés par les artisans</SectionTitle>
      <p className="text-[14px] text-muted">
        Écrits par plusieurs entreprises, ou commandés en achat groupé, intitulés voisins rapprochés, sans nom ni référence de chantier. Dès deux entreprises, l&apos;intitulé est déjà proposé à tous comme « écrit par d&apos;autres artisans » : écarte-le s&apos;il ne doit pas l&apos;être, ou vérifie le produit et ajoute-le au catalogue.
      </p>
      {erreur ? <p role="alert" className="text-[14px] font-semibold text-danger">{erreur}</p> : null}
      {data.items.map((p) => {
        const c = choix[p.cle] ?? { metier: data.metiers[0]?.code ?? "couverture", famille: "" };
        const maj = (x: Partial<typeof c>) => setChoix((v) => ({ ...v, [p.cle]: { ...c, ...x } }));
        return (
          <Card key={p.cle} className="flex flex-col gap-2 p-3">
            <p className="text-[15px] font-semibold">
              {p.libelle} · {p.unite}
            </p>
            <p className="text-[13px] text-muted">
              Écrit par {p.entreprises} entreprises{p.publiee ? " · proposé à tous (écrit par d'autres artisans)" : p.publiee === false ? " · écarté, pas proposé à tous" : ""}
            </p>
            {p.variantes?.length ? <p className="text-[13px] text-muted">Aussi écrit : {p.variantes.join(" · ")}</p> : null}
            <label className="flex flex-col gap-1 text-[14px] font-semibold">
              Métier
              <select aria-label={`Métier de ${p.libelle}`} value={c.metier} onChange={(e) => maj({ metier: e.target.value })} className="min-h-11 rounded-xl border border-line bg-surface px-3">
                {data.metiers.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.libelle}
                  </option>
                ))}
              </select>
            </label>
            <Field id={`famille-${p.cle}`} label="Famille" value={c.famille} onChange={(e) => maj({ famille: e.target.value })} />
            <Button
              variant="secondary"
              disabled={!c.famille.trim()}
              onClick={() =>
                void api("/v1/admin/catalogue/propositions/accepter", { method: "POST", body: { cle: p.cle, metier: c.metier, famille: c.famille.trim() } }).then(
                  () => reload(),
                  (e: unknown) => setErreur(messageErreur(e)),
                )
              }
            >
              Ajouter au catalogue
            </Button>
            {p.publiee ? (
              <Button
                variant="secondary"
                onClick={() =>
                  void api("/v1/admin/catalogue/propositions/ecarter", { method: "POST", body: { cle: p.cle } }).then(
                    () => reload(),
                    (e: unknown) => setErreur(messageErreur(e)),
                  )
                }
              >
                Ne plus le proposer à tous
              </Button>
            ) : null}
          </Card>
        );
      })}
    </section>
  );
}

function LignesLibres() {
  const charger = useCallback((signal: AbortSignal) => api<{ items: { id: string; libelle: string; quantite: number; unite: string; achat: string }[] }>("/v1/admin/catalogue/lignes-libres", { signal }), []);
  const { data, reload } = useResource(charger);
  const [cles, setCles] = useState<Record<string, string>>({});
  const [erreur, setErreur] = useState<string | null>(null);
  if (!data?.items.length) return null;
  return (
    <section aria-label="Lignes libres à rattacher" className="flex flex-col gap-2">
      <SectionTitle>Lignes libres à rattacher</SectionTitle>
      {erreur ? <p role="alert" className="text-[14px] font-semibold text-danger">{erreur}</p> : null}
      {data.items.map((l) => (
        <Card key={l.id} className="flex flex-col gap-2 p-3">
          <p className="text-[15px] font-semibold">
            {l.libelle} · {l.quantite} {l.unite}
          </p>
          <p className="text-[13px] text-muted">{l.achat}</p>
          <Field id={`cle-${l.id}`} label="Clé de l'article du catalogue" value={cles[l.id] ?? ""} onChange={(e) => setCles((c) => ({ ...c, [l.id]: e.target.value }))} />
          <Button
            variant="secondary"
            disabled={!cles[l.id]?.trim()}
            onClick={() =>
              void api("/v1/admin/catalogue/lignes-libres/rattacher", { method: "POST", body: { ligneId: l.id, cle: cles[l.id]!.trim() } }).then(
                () => reload(),
                (e: unknown) => setErreur(messageErreur(e)),
              )
            }
          >
            Rattacher
          </Button>
        </Card>
      ))}
    </section>
  );
}

/**
 * LES ARTICLES (Greg, 13 novembre 2026, « cœur métier » : « rechercher un article, voir son métier et sa famille, modifier
 * son classement, ajouter un synonyme, masquer, marquer à vérifier, visualiser les doublons possibles, connaître la source
 * et la date de mise à jour »). La recherche porte sur TOUS les métiers ; sans recherche, les articles du métier choisi.
 * Chaque geste part au journal de l'admin (côté serveur). La clé d'un article ne change jamais.
 */
function Articles() {
  const [metier, setMetier] = useState("couverture");
  const [q, setQ] = useState("");
  const recherche = q.trim();
  const charger = useCallback(
    (signal: AbortSignal) => api<{ metiers: { code: string; libelle: string }[]; articles: ArticleAdmin[]; doublons: Doublon[] }>(`/v1/admin/catalogue?${new URLSearchParams({ metier, ...(recherche.length >= 2 ? { q: recherche } : {}) })}`, { signal }),
    [metier, recherche],
  );
  const { data, error, reload } = useResource(charger);
  const [ajout, setAjout] = useState({ famille: "", produit: "", variante: "", unite: "pièces" });
  const [erreur, setErreur] = useState<string | null>(null);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const modifier = (cle: string, body: Record<string, unknown>) =>
    api(`/v1/admin/catalogue?cle=${encodeURIComponent(cle)}`, { method: "PATCH", body }).then(
      () => (setErreur(null), reload()),
      (e: unknown) => setErreur(messageErreur(e)),
    );
  if (error) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <Spinner />;
  const libelle = (code: string) => data.metiers.find((m) => m.code === code)?.libelle ?? code;
  const date = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const LIEN = "min-h-11 px-2 text-[14px] font-semibold text-accent-text underline";
  return (
    <section aria-label="Articles du catalogue" className="flex flex-col gap-3">
      <SectionTitle>Articles</SectionTitle>
      <label className="flex items-center gap-2 text-[15px] font-semibold">
        Métier :
        <select value={metier} onChange={(e) => setMetier(e.target.value)} className="min-h-11 rounded-xl border border-line bg-surface px-3">
          {data.metiers.map((m) => (
            <option key={m.code} value={m.code}>
              {m.libelle}
            </option>
          ))}
        </select>
      </label>
      {erreur ? <p role="alert" className="text-[14px] font-semibold text-danger">{erreur}</p> : null}
      <Card className="flex flex-col gap-2 p-3">
        <p className="text-[15px] font-bold">Ajouter un article</p>
        <Field id="ajout-famille" label="Famille" value={ajout.famille} onChange={(e) => setAjout({ ...ajout, famille: e.target.value })} />
        <Field id="ajout-produit" label="Produit" value={ajout.produit} onChange={(e) => setAjout({ ...ajout, produit: e.target.value })} />
        <Field id="ajout-variante" label="Format / dimension / qualité" value={ajout.variante} onChange={(e) => setAjout({ ...ajout, variante: e.target.value })} />
        <Field id="ajout-unite" label="Unité" value={ajout.unite} onChange={(e) => setAjout({ ...ajout, unite: e.target.value })} />
        <Button
          variant="secondary"
          disabled={!ajout.famille.trim() || !ajout.produit.trim() || !ajout.unite.trim()}
          onClick={() =>
            void api("/v1/admin/catalogue", { method: "POST", body: { metier, famille: ajout.famille, produit: ajout.produit, variante: ajout.variante || null, designation: null, unite: ajout.unite, synonymes: [] } }).then(
              () => (setAjout({ famille: "", produit: "", variante: "", unite: "pièces" }), reload()),
              (e: unknown) => setErreur(messageErreur(e)),
            )
          }
        >
          Ajouter
        </Button>
      </Card>
      <Field id="filtre" label="Chercher un article dans tous les métiers" value={q} onChange={(e) => setQ(e.target.value)} />
      <p role="status" className="text-[13px] text-muted">
        {recherche.length >= 2 ? `${data.articles.length} article${data.articles.length > 1 ? "s" : ""} pour « ${recherche} », tous métiers.` : `${data.articles.length} articles en ${libelle(metier)}.`}
      </p>
      <ul aria-label="Articles" className="flex flex-col gap-1">
        {data.articles.slice(0, 200).map((a) => (
          <li key={a.cle} className={`flex flex-col gap-1 rounded-xl border border-line bg-surface p-2 ${a.masque || a.aliasDe ? "opacity-60" : ""}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="grow text-[14px]">
                {a.designation} <span className="text-muted">· {a.unite}</span>
                {a.aVerifier ? <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-[12px] font-bold">À vérifier</span> : null}
                {a.masque ? <span className="ml-2 rounded-full bg-ground px-2 py-0.5 text-[12px] font-bold">Masqué</span> : null}
              </span>
              <button type="button" className={LIEN} aria-expanded={ouvert === a.cle} onClick={() => setOuvert(ouvert === a.cle ? null : a.cle)}>
                {ouvert === a.cle ? "Fermer" : "Détail"}
              </button>
            </div>
            <p className="text-[13px] text-muted">{a.chemins.length ? a.chemins.join(" ; ") : `${libelle(a.metier)} · ${a.famille}`}</p>
            {ouvert === a.cle ? (
              <div className="flex flex-col gap-2 border-t border-line pt-2 text-[14px]">
                <p className="text-muted">
                  Origine : {a.origine}. Modifié le {date(a.modifieLe)}.{a.aliasDe ? " Ancien identifiant de " : ""}
                  {a.aliasDe ? <code className="break-all">{a.aliasDe}</code> : null}
                </p>
                <p className="break-all text-[12px] text-muted">Clé : {a.cle}</p>
                <p>Mots de recherche : {a.synonymes.length ? a.synonymes.join(", ") : "aucun"}</p>
                <label className="flex flex-wrap items-center gap-2 font-semibold">
                  Métier principal :
                  <select aria-label={`Métier principal de ${a.designation}`} value={a.metier} onChange={(e) => void modifier(a.cle, { metier: e.target.value, metiersSecondaires: a.metiersSecondaires.filter((m) => m !== e.target.value) })} className="min-h-11 rounded-xl border border-line bg-surface px-3">
                    {data.metiers.map((m) => (
                      <option key={m.code} value={m.code}>
                        {m.libelle}
                      </option>
                    ))}
                  </select>
                </label>
                <fieldset className="flex flex-col gap-1">
                  <legend className="font-semibold">Aussi proposé en (une seule fiche, jamais une copie) :</legend>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {data.metiers
                      .filter((m) => m.code !== a.metier)
                      .map((m) => (
                        <label key={m.code} className="flex min-h-11 items-center gap-2">
                          <input
                            type="checkbox"
                            checked={a.metiersSecondaires.includes(m.code)}
                            onChange={(e) => void modifier(a.cle, { metiersSecondaires: e.target.checked ? [...a.metiersSecondaires, m.code] : a.metiersSecondaires.filter((x) => x !== m.code) })}
                            className="size-5"
                          />
                          {m.libelle}
                        </label>
                      ))}
                  </div>
                </fieldset>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    className={LIEN}
                    onClick={() => {
                      const nom = window.prompt("Nouvelle désignation", a.designation);
                      if (nom && nom.trim() && nom.trim() !== a.designation) void modifier(a.cle, { designation: nom.trim() });
                    }}
                  >
                    Renommer
                  </button>
                  <button
                    type="button"
                    className={LIEN}
                    onClick={() => {
                      const mot = window.prompt("Mot de recherche à ajouter (un synonyme, une appellation du comptoir)", "");
                      if (mot && mot.trim() && !a.synonymes.includes(mot.trim())) void modifier(a.cle, { synonymes: [...a.synonymes, mot.trim()] });
                    }}
                  >
                    Ajouter un synonyme
                  </button>
                  <button type="button" className={LIEN} onClick={() => void modifier(a.cle, { aVerifier: !a.aVerifier })}>
                    {a.aVerifier ? "Marquer vérifié" : "Marquer à vérifier"}
                  </button>
                  <button type="button" className={LIEN} onClick={() => void modifier(a.cle, { masque: !a.masque })}>
                    {a.masque ? "Afficher" : "Masquer"}
                  </button>
                </div>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      {data.doublons.length ? (
        <details className="rounded-xl border border-line bg-surface p-3">
          <summary className="min-h-11 cursor-pointer py-2 text-[15px] font-bold">Doublons possibles ({data.doublons.length})</summary>
          <p className="pb-2 text-[13px] text-muted">Rien n&apos;est fusionné ni supprimé d&apos;office. Un quantitatif déjà créé ne garde que le texte de ses lignes : il ne change pas.</p>
          <ul aria-label="Doublons possibles" className="flex flex-col gap-2">
            {data.doublons.slice(0, 100).map((d) => (
              <li key={`${d.nature}-${d.cles.join("|")}`} className="flex flex-col gap-0.5 border-t border-line pt-2 text-[14px]">
                <span className="font-semibold">{d.designation}</span>
                <span className="text-[13px] text-muted">{NATURES[d.nature]}</span>
                {d.cles.map((c) => (
                  <code key={c} className="break-all text-[12px]">
                    {c}
                    {c === d.canonique ? " (gardée)" : ""}
                  </code>
                ))}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
