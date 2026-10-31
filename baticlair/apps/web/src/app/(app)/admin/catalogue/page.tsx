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
}

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
        <Propositions />
        <LignesLibres />
        <Articles />
      </PorteAdmin>
    </div>
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

function Articles() {
  const [metier, setMetier] = useState("couverture");
  const charger = useCallback((signal: AbortSignal) => api<{ metiers: { code: string; libelle: string }[]; articles: ArticleAdmin[] }>(`/v1/admin/catalogue?metier=${metier}`, { signal }), [metier]);
  const { data, error, reload } = useResource(charger);
  const [filtre, setFiltre] = useState("");
  const [ajout, setAjout] = useState({ famille: "", produit: "", variante: "", unite: "pièces" });
  const [erreur, setErreur] = useState<string | null>(null);
  const modifier = (cle: string, body: Record<string, unknown>) =>
    api(`/v1/admin/catalogue?cle=${encodeURIComponent(cle)}`, { method: "PATCH", body }).then(
      () => reload(),
      (e: unknown) => setErreur(messageErreur(e)),
    );
  if (error) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <Spinner />;
  const vus = data.articles.filter((a) => !filtre || a.designation.toLowerCase().includes(filtre.toLowerCase()));
  return (
    <section aria-label="Articles du catalogue" className="flex flex-col gap-3">
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
      <Field id="filtre" label={`Chercher parmi ${data.articles.length} articles`} value={filtre} onChange={(e) => setFiltre(e.target.value)} />
      <ul className="flex flex-col gap-1">
        {vus.slice(0, 200).map((a) => (
          <li key={a.cle} className={`flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface p-2 ${a.masque ? "opacity-50" : ""}`}>
            <span className="grow text-[14px]">
              <span className="text-muted">{a.famille} › </span>
              {a.designation} <span className="text-muted">· {a.unite}</span>
            </span>
            <button
              type="button"
              className="min-h-11 px-2 text-[14px] font-semibold text-accent-text underline"
              onClick={() => {
                const nom = window.prompt("Nouvelle désignation", a.designation);
                if (nom && nom.trim() && nom.trim() !== a.designation) void modifier(a.cle, { designation: nom.trim() });
              }}
            >
              Renommer
            </button>
            <button type="button" className="min-h-11 px-2 text-[14px] font-semibold text-accent-text underline" onClick={() => void modifier(a.cle, { masque: !a.masque })}>
              {a.masque ? "Afficher" : "Masquer"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
