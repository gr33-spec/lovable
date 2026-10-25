"use client";

import { useParams, useRouter } from "next/navigation";
import { CalendarClock, Info, Lock, MapPin, Plus, Users } from "lucide-react";
import { useCallback, useState } from "react";
import { Pastille, VignetteMateriau, phraseCloture } from "@/components/regroupements";
import { BackButton, Button, ButtonLink, Card, ErrorNotice, Field, SectionTitle, Skeleton } from "@/components/ui";
import { api, messageErreur } from "@/lib/api";
import type { DetailRegroupement } from "@/lib/recentrage";
import { useResource } from "@/lib/use-resource";

/**
 * LE DÉTAIL D'UN REGROUPEMENT (Greg, 25 octobre 2026, maquette écran 3, corrigée) : la famille, le département, la date
 * de consultation, les matériaux concernés, les entreprises déjà présentes seulement au-dessus du seuil (« 5+ entreprises »
 * et le département, jamais de commune), « Les quantités exactes seront précisées… », et UN SEUL bouton : « Rejoindre ce
 * regroupement » (une ligne d'un chantier, un devis à importer, ou la quantité tapée).
 */
export default function RegroupementPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const fetcher = useCallback((signal: AbortSignal) => api<DetailRegroupement>(`/v1/regroupements/${id}`, { signal }), [id]);
  const { data: r, error, reload } = useResource(fetcher);
  const [rejoindre, setRejoindre] = useState(false);
  const [cle, setCle] = useState<string | null>(null);
  const [quantite, setQuantite] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function envoyer() {
    if (!r) return;
    const q = Number(quantite.replace(",", "."));
    const materiau = cle ?? r.materiaux[0]?.cle;
    if (!materiau || !(q > 0)) return setErreur("Choisis un matériau et tape ta quantité.");
    setPending(true);
    setErreur(null);
    try {
      await api(`/v1/regroupements/${r.id}/rejoindre`, { method: "POST", body: { cle: materiau, quantite: q } });
      setMessage("C'est noté : ta quantité est dans le regroupement. Tu commanderas seulement si le prix te plaît.");
      setRejoindre(false);
      setQuantite("");
      reload();
    } catch (e) {
      setErreur(messageErreur(e, { commande_close: "La consultation est déjà partie : rejoins le cycle suivant." }));
    } finally {
      setPending(false);
    }
  }

  async function basculer(vers: "suivant" | "perso") {
    if (!r) return;
    setPending(true);
    try {
      const res = await api<{ vers: string; regroupementId?: string; chantiers?: { projectId: string; articles: string[] }[] }>(`/v1/regroupements/${r.id}/basculer`, { method: "POST", body: { vers } });
      if (vers === "suivant" && res.regroupementId) router.push(`/regroupements/${res.regroupementId}`);
      else if (res.chantiers?.[0]) router.push(`/chantiers/${res.chantiers[0].projectId}?demande=perso`);
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <BackButton fallback="/regroupements" label="Regroupements" compact />
      {error ? <ErrorNotice error={error} onRetry={reload} /> : null}
      {!r && !error ? <Skeleton card="h-72" lines={3} label="Chargement du regroupement…" /> : null}
      {r ? (
        <>
          <Card className="flex gap-4 p-4">
            <VignetteMateriau famille={r.famille} className="size-24" />
            <div className="flex min-w-0 flex-col gap-1.5">
              <h1 className="text-[22px] leading-tight font-extrabold">{r.titre}</h1>
              <span className="w-fit rounded-full bg-accent-soft px-2.5 py-0.5 text-[13px] font-bold text-ink">{r.participants}</span>
              <span className="flex items-center gap-1.5 text-[14px] text-muted">
                <MapPin size={15} aria-hidden="true" /> {r.participantsDetail ?? `Département ${r.departement}`}
              </span>
              <span className="flex items-center gap-1.5 text-[14px] text-muted">
                <CalendarClock size={15} aria-hidden="true" /> {phraseCloture(r)} · cycle {r.cycle}
              </span>
            </div>
          </Card>

          <section className="flex flex-col gap-3" aria-label="Matériaux concernés">
            <SectionTitle>Matériaux concernés</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {r.materiaux.map((m) => (
                <Pastille key={m.cle}>{m.libelle}</Pastille>
              ))}
            </div>
          </section>

          <p className="flex gap-3 rounded-xl bg-accent-soft p-4 text-[15px] leading-relaxed text-ink">
            <Info size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
            Les quantités exactes sont précisées par chaque entreprise quand elle rejoint. Les prix ne sont pas affichés, et personne ne voit ton nom.
          </p>

          {r.mesLignes.length > 0 ? (
            <section className="flex flex-col gap-2" aria-label="Mes lignes">
              <SectionTitle>Mes lignes</SectionTitle>
              <Card className="divide-y divide-line">
                {r.mesLignes.map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="flex min-w-0 flex-col">
                      <span className="text-[15px] font-semibold">{l.designation}</span>
                      <span className="text-[13px] text-muted">
                        {l.quantite.toLocaleString("fr-FR")} {l.unite} · {l.chantier}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-ground px-3 py-1 text-[12px] font-semibold text-muted">{l.libelle}</span>
                  </div>
                ))}
              </Card>
            </section>
          ) : null}

          {message ? (
            <p role="status" className="rounded-xl bg-ok-bg p-4 text-[15px] font-semibold text-ok">
              {message}
            </p>
          ) : null}
          {erreur ? (
            <p role="alert" className="text-[15px] font-semibold text-danger">
              {erreur}
            </p>
          ) : null}

          {r.nonConsulte && r.jeSuisDedans ? (
            <Card className="flex flex-col gap-3 p-4">
              <p className="text-[16px] font-semibold">Pas assez de volume ce cycle : les négoces n&apos;ont pas été consultés. Choisis la suite, en un clic.</p>
              <Button onClick={() => void basculer("suivant")} pending={pending}>
                Passer au cycle suivant
              </Button>
              <Button variant="secondary" onClick={() => void basculer("perso")} disabled={pending}>
                Faire une demande perso
              </Button>
            </Card>
          ) : r.phase !== "inscriptions" && r.jeSuisDedans ? (
            <ButtonLink href="/groupe" className="w-full">
              Voir les prix et commander
            </ButtonLink>
          ) : r.phase === "inscriptions" ? (
            <section className="flex flex-col gap-3">
              <SectionTitle>Ton chantier est similaire ?</SectionTitle>
              {!rejoindre ? (
                <Button onClick={() => setRejoindre(true)} className="w-full">
                  <Plus size={20} aria-hidden="true" /> Rejoindre ce regroupement
                </Button>
              ) : (
                <Card className="flex flex-col gap-4 p-4" aria-label="Rejoindre ce regroupement">
                  <p className="text-[15px] font-semibold">Trois façons de rejoindre :</p>
                  <ButtonLink href="/chantiers" variant="secondary">
                    Reprendre une ligne d&apos;un chantier
                  </ButtonLink>
                  <ButtonLink href="/chantiers/nouveau" variant="secondary">
                    Importer un devis
                  </ButtonLink>
                  <div className="flex flex-col gap-3 rounded-xl bg-ground p-3">
                    <span className="text-[15px] font-semibold">Ou tape ta quantité</span>
                    <div role="radiogroup" aria-label="Matériau" className="flex flex-wrap gap-2">
                      {r.materiaux.map((m) => (
                        <button
                          key={m.cle}
                          type="button"
                          role="radio"
                          aria-checked={(cle ?? r.materiaux[0]?.cle) === m.cle}
                          onClick={() => setCle(m.cle)}
                          className={`min-h-11 rounded-full border-2 px-3 text-[14px] font-semibold ${(cle ?? r.materiaux[0]?.cle) === m.cle ? "border-ink bg-surface" : "border-line bg-surface text-muted"}`}
                        >
                          {m.libelle}
                        </button>
                      ))}
                    </div>
                    <Field id="quantite-regroupement" label={`Quantité (${r.materiaux.find((m) => m.cle === (cle ?? r.materiaux[0]?.cle))?.unite ?? "unités"})`} inputMode="decimal" value={quantite} onChange={(e) => setQuantite(e.target.value)} />
                    <Button onClick={() => void envoyer()} pending={pending}>
                      Ajouter ma quantité
                    </Button>
                  </div>
                </Card>
              )}
              <p className="flex items-center gap-2 text-[13px] text-muted">
                <Lock size={14} aria-hidden="true" /> Sans engagement : tu commandes seulement si le prix te plaît.
              </p>
            </section>
          ) : null}
          {!r.jeSuisDedans && r.phase !== "inscriptions" ? (
            <p className="flex items-center gap-2 text-[15px] text-muted">
              <Users size={16} aria-hidden="true" /> Cette consultation est partie. Le prochain cycle s&apos;ouvre bientôt.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
