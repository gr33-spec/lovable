"use client";

import { useCallback, useState } from "react";
import { PorteAdmin } from "@/components/admin-achat-groupe";
import { jourEtHeure, RaccourcisAdmin } from "@/components/admin-vue";
import { BackButton, Button, Card, ErrorNotice, INPUT, PageTitle, SectionTitle, Spinner } from "@/components/ui";
import { api, ApiError, messageErreur } from "@/lib/api";
import { useResource } from "@/lib/use-resource";

interface Etat {
  adresse: string | null;
  source: "admin" | "repli";
  enAttente: { adresse: string; expireLe: string } | null;
}

/**
 * LES RÉGLAGES (Greg, 14 novembre 2026, « page simple ») : l'adresse d'alerte. Double validation : un e-mail de confirmation
 * part vers la nouvelle adresse ; au clic, le changement s'applique tout de suite, sans redéploiement.
 */
export default function AdminReglagesPage() {
  return (
    <div className="flex flex-col gap-5">
      <BackButton fallback="/admin" />
      <PageTitle>Réglages</PageTitle>
      <PorteAdmin>
        <Reglages />
      </PorteAdmin>
    </div>
  );
}

function Reglages() {
  const charger = useCallback((signal: AbortSignal) => api<Etat>("/v1/admin/vue/reglages/alerte", { signal }), []);
  const { data, error, reload } = useResource(charger);
  const [adresse, setAdresse] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  async function demander(e: React.FormEvent) {
    e.preventDefault();
    if (!adresse.trim() || occupe) return;
    setOccupe(true);
    setMessage(null);
    try {
      const r = await api<{ adresse: string }>("/v1/admin/vue/reglages/alerte", { method: "POST", body: { adresse: adresse.trim() } });
      setMessage({ ok: true, texte: `Un e-mail de confirmation est parti vers ${r.adresse}. Ouvre-le et clique sur le lien : le changement s'applique tout de suite.` });
      setAdresse("");
      reload();
    } catch (x) {
      setMessage({ ok: false, texte: x instanceof ApiError && x.status === 400 ? "Cette adresse e-mail n'est pas valable." : `Rien n'est changé : ${messageErreur(x)}` });
    } finally {
      setOccupe(false);
    }
  }
  if (error) return <ErrorNotice error={error} onRetry={reload} />;
  if (!data) return <Spinner />;
  return (
    <>
      <RaccourcisAdmin ici="/admin/reglages" />
      <Card className="flex flex-col gap-3 p-4">
        <SectionTitle>Adresse d&apos;alerte</SectionTitle>
        <p className="text-[16px]">
          Les alertes partent vers <strong>{data.adresse ?? "aucune adresse"}</strong>
          {data.source === "repli" ? " (adresse par défaut)." : "."}
        </p>
        <p className="text-[15px] text-muted">Tu y reçois : un bug signalé, une erreur serveur, un paiement refusé, un négoce en attente de vérification. Les e-mails reçus sur contact@mobiiz.fr y sont aussi transférés.</p>
        {data.enAttente ? (
          <p role="status" className="rounded-xl bg-warn-bg p-3 text-[15px] font-semibold text-warn">
            En attente de confirmation : {data.enAttente.adresse}. Le lien reçu par e-mail est valable jusqu&apos;au {jourEtHeure(data.enAttente.expireLe)}.
          </p>
        ) : null}
        <form onSubmit={(e) => void demander(e)} className="flex flex-col gap-2">
          <label className="flex flex-col gap-1 text-[15px] font-semibold">
            Nouvelle adresse
            <input type="email" required autoComplete="email" value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder="ton.adresse@exemple.fr" className={INPUT} />
          </label>
          <Button type="submit" disabled={occupe || !adresse.trim()}>
            Envoyer l&apos;e-mail de confirmation
          </Button>
        </form>
        {message ? (
          <p role={message.ok ? "status" : "alert"} className={`text-[15px] font-semibold ${message.ok ? "text-ok" : "text-danger"}`}>
            {message.texte}
          </p>
        ) : null}
      </Card>
      <ReglageMissions />
    </>
  );
}

/**
 * L'INTERRUPTEUR DES MISSIONS (Greg, 16 novembre 2026) : coupées, l'application affiche « Bientôt » ; un clic les ouvre pour
 * tout le monde, sans redéploiement. Rien n'est supprimé quand on les recoupe.
 */
function ReglageMissions() {
  const charger = useCallback((signal: AbortSignal) => api<{ actif: boolean; source: "admin" | "defaut" }>("/v1/admin/vue/reglages/missions", { signal }), []);
  const { data, error, reload } = useResource(charger);
  const [occupe, setOccupe] = useState(false);
  const [confirmer, setConfirmer] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  async function regler(actif: boolean) {
    if (occupe) return;
    setOccupe(true);
    setMessage(null);
    try {
      await api("/v1/admin/vue/reglages/missions", { method: "POST", body: { actif } });
      setMessage({ ok: true, texte: actif ? "Les missions sont ouvertes. Les artisans les voient dans la minute." : "Les missions sont coupées : l'application affiche « Bientôt »." });
      setConfirmer(false);
      reload();
    } catch (x) {
      setMessage({ ok: false, texte: `Rien n'est changé : ${messageErreur(x)}` });
    } finally {
      setOccupe(false);
    }
  }
  return (
    <Card className="flex flex-col gap-3 p-4">
      <SectionTitle>Missions</SectionTitle>
      {error ? <ErrorNotice error={error} onRetry={reload} /> : !data ? <Spinner /> : (
        <>
          <p className="text-[16px]">
            Les missions sont <strong>{data.actif ? "ouvertes" : "coupées"}</strong>
            {data.actif ? "." : " : les artisans voient « Bientôt » et le principe."}
          </p>
          <p className="text-[15px] text-muted">Ouvre-les quand il y a assez d&apos;artisans inscrits. Tu peux les recouper à tout moment : rien n&apos;est supprimé.</p>
          {confirmer ? (
            <div role="alertdialog" aria-label={data.actif ? "Couper les missions ?" : "Ouvrir les missions ?"} className="flex flex-col gap-2 rounded-xl bg-warn-bg p-3">
              <p className="text-[15px] font-semibold text-warn">{data.actif ? "Couper les missions pour tous les artisans ?" : "Ouvrir les missions pour tous les artisans ?"}</p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => void regler(!data.actif)} disabled={occupe}>
                  {data.actif ? "Oui, couper" : "Oui, ouvrir"}
                </Button>
                <Button variant="secondary" onClick={() => setConfirmer(false)} disabled={occupe}>
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <Button variant={data.actif ? "secondary" : "primary"} onClick={() => setConfirmer(true)}>
              {data.actif ? "Couper les missions" : "Ouvrir les missions"}
            </Button>
          )}
        </>
      )}
      {message ? (
        <p role={message.ok ? "status" : "alert"} className={`text-[15px] font-semibold ${message.ok ? "text-ok" : "text-danger"}`}>
          {message.texte}
        </p>
      ) : null}
    </Card>
  );
}
