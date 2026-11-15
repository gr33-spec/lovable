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
      <ReglagePlafonds />
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


/**
 * LES PLAFONDS CACHÉS DES ABONNÉS (Greg, 15 novembre 2026) : en euros de consommation par mois d'abonnement et par abonné,
 * 5 € pour Pro et 20 € pour Pro Max au départ. Jamais montrés à un artisan : il ne lit qu'un message le jour où il atteint
 * son plafond. Appliqué tout de suite, sans redéploiement.
 */
function ReglagePlafonds() {
  const charger = useCallback((signal: AbortSignal) => api<{ pro: number; promax: number; source: "admin" | "defaut" }>("/v1/admin/vue/reglages/plafonds-ia", { signal }), []);
  const { data, error, reload } = useResource(charger);
  const [saisie, setSaisie] = useState<{ pro: string; promax: string } | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const valeurs = saisie ?? (data ? { pro: String(data.pro).replace(".", ","), promax: String(data.promax).replace(".", ",") } : null);
  const nombre = (v: string) => Number(v.trim().replace(",", "."));
  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    if (occupe || !valeurs) return;
    const pro = nombre(valeurs.pro);
    const promax = nombre(valeurs.promax);
    if (!Number.isFinite(pro) || !Number.isFinite(promax) || pro < 0 || promax < pro) {
      setMessage({ ok: false, texte: "Écris deux montants en euros ; celui de Pro Max ne peut pas être plus bas que celui de Pro." });
      return;
    }
    setOccupe(true);
    setMessage(null);
    try {
      await api("/v1/admin/vue/reglages/plafonds-ia", { method: "POST", body: { pro, promax } });
      setMessage({ ok: true, texte: "C'est enregistré : les nouveaux plafonds s'appliquent tout de suite." });
      setSaisie(null);
      reload();
    } catch (x) {
      setMessage({ ok: false, texte: `Rien n'est changé : ${messageErreur(x)}` });
    } finally {
      setOccupe(false);
    }
  }
  return (
    <Card className="flex flex-col gap-3 p-4">
      <SectionTitle>Plafond des analyses par abonné</SectionTitle>
      {error ? <ErrorNotice error={error} onRetry={reload} /> : !valeurs ? <Spinner /> : (
        <form onSubmit={(e) => void enregistrer(e)} className="flex flex-col gap-3">
          <p className="text-[15px] text-muted">
            Ce que les analyses d&apos;un abonné peuvent coûter par mois d&apos;abonnement, en euros. L&apos;artisan ne voit jamais ce chiffre : au plafond, il lit seulement « Passe au Pro Max ou attends le renouvellement ».
            {data?.source === "defaut" ? " Ce sont les valeurs de départ." : ""}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-[15px] font-semibold">
              Pro (€ par mois)
              <input inputMode="decimal" required value={valeurs.pro} onChange={(e) => setSaisie({ ...valeurs, pro: e.target.value })} className={INPUT} />
            </label>
            <label className="flex flex-col gap-1 text-[15px] font-semibold">
              Pro Max (€ par mois)
              <input inputMode="decimal" required value={valeurs.promax} onChange={(e) => setSaisie({ ...valeurs, promax: e.target.value })} className={INPUT} />
            </label>
          </div>
          <Button type="submit" disabled={occupe || !saisie}>
            Enregistrer les plafonds
          </Button>
        </form>
      )}
      {message ? (
        <p role={message.ok ? "status" : "alert"} className={`text-[15px] font-semibold ${message.ok ? "text-ok" : "text-danger"}`}>
          {message.texte}
        </p>
      ) : null}
    </Card>
  );
}
