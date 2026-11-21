"use client";

import { Bell, Briefcase, CreditCard, Users, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, type NextAction } from "@/lib/api";
import type { MesAchats } from "@/lib/achat-groupe";
import type { AlerteVue } from "@/lib/missions";
import { cleAFaire, prevenirLaCloche, type AFaire } from "@/lib/notifications";
import { useResource } from "@/lib/use-resource";
import { actionsEnAttente } from "./achat-groupe";
import { CARTE, EcranTitre, EtatEcran, GrandTitre, Puces } from "./ux-kit";

/**
 * NOTIFICATIONS COHÉRENTES ET SUPPRIMABLES (Greg, 12 novembre 2026, dossier de corrections UX, point 2).
 *
 * Deux sortes de lignes, un seul modèle : une action « À faire » (calculée : elle existe tant que la chose reste à faire)
 * et une alerte courte (écrite une fois). La pastille de la cloche ne dit qu'une chose : « il y a du nouveau, pas encore
 * vu ». Ouvrir cet écran, c'est voir : le serveur le retient, la pastille s'éteint, et le reste après actualisation,
 * reconnexion ou changement d'appareil. Chaque ligne se retire par glissement (téléphone) ou par son bouton (clavier,
 * ordinateur, lecteur d'écran), avec « Annuler ». Retirer une ligne ne retire que l'alerte, jamais ce qu'elle désigne.
 * Toute nouvelle notification passe par `Ligne` : elle hérite du même comportement.
 */

type Filtre = "toutes" | "actions" | "informations";
const ICONE: Record<string, typeof Bell> = { prix: CreditCard, missions: Briefcase, groupe: Users };
const LARGEUR = 104;

interface Retiree {
  sorte: "alerte" | "afaire";
  id: string;
  titre: string;
}

/** Une ligne de notification : s'ouvre d'un appui, se retire par glissement vers la gauche ou par son bouton. */
function Ligne({ href, titre, detail, action, Icone, nouvelle, onOuvrir, onRetirer }: { href: string; titre: string; detail?: string; action: string; Icone: typeof Bell; nouvelle: boolean; onOuvrir?: () => void; onRetirer: () => void }) {
  const [dx, setDx] = useState(0);
  const [glisse, setGlisse] = useState(false);
  const depart = useRef<{ x: number; y: number; base: number; sens: "?" | "x" | "y" } | null>(null);
  const bouge = useRef(false);
  const ouvert = dx <= -LARGEUR;

  return (
    <li className="relative overflow-hidden rounded-[20px]">
      {/* Révélé par le glissement. Hors de portée du clavier tant qu'il est caché : le bouton « Retirer » de la ligne suffit. */}
      <button type="button" tabIndex={ouvert ? 0 : -1} aria-hidden={!ouvert} onClick={onRetirer} style={{ width: LARGEUR }} className="absolute inset-y-0 right-0 flex items-center justify-center rounded-r-[20px] bg-ink text-[15px] font-extrabold text-ground">
        Supprimer
      </button>
      <div
        className={`relative flex items-stretch ${CARTE} ${glisse ? "" : "transition-transform duration-200 motion-reduce:transition-none"}`}
        style={{ transform: `translateX(${dx}px)`, touchAction: "pan-y" }}
        onTouchStart={(e) => {
          const t = e.touches[0]!;
          depart.current = { x: t.clientX, y: t.clientY, base: dx, sens: "?" };
          bouge.current = false;
        }}
        onTouchMove={(e) => {
          const d = depart.current;
          if (!d) return;
          const t = e.touches[0]!;
          const ex = t.clientX - d.x;
          const ey = t.clientY - d.y;
          if (d.sens === "?" && Math.abs(ex) + Math.abs(ey) > 8) d.sens = Math.abs(ex) > Math.abs(ey) ? "x" : "y";
          if (d.sens !== "x") return;
          bouge.current = true;
          setGlisse(true);
          setDx(Math.max(-LARGEUR - 16, Math.min(0, d.base + ex)));
        }}
        onTouchEnd={() => {
          if (depart.current?.sens === "x") setDx(dx < -LARGEUR / 2 ? -LARGEUR : 0);
          depart.current = null;
          setGlisse(false);
        }}
        onClickCapture={(e) => {
          // Un glissement n'ouvre jamais la notification par erreur ; un appui sur une ligne ouverte la referme.
          if (bouge.current || ouvert) {
            e.preventDefault();
            e.stopPropagation();
            bouge.current = false;
            if (ouvert) setDx(0);
          }
        }}
      >
        <Link href={href} onClick={onOuvrir} aria-label={`${titre}${detail ? `, ${detail}` : ""}${nouvelle ? ", nouvelle" : ""}`} className="pressable flex min-w-0 flex-1 items-start gap-3 py-4 pl-4">
          <span aria-hidden="true" className={`flex size-12 shrink-0 items-center justify-center rounded-full ${nouvelle ? "bg-accent text-on-accent" : "bg-[#efece6]"}`}>
            <Icone size={20} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[16px] leading-tight font-extrabold break-words">{titre}</span>
            {detail ? <span className="truncate text-[13px] font-extrabold text-[#6b5300]">{detail}</span> : null}
            <span className="text-[13px] font-extrabold text-[#0b6b43]">{action}</span>
          </span>
        </Link>
        <button type="button" onClick={onRetirer} aria-label={`Supprimer la notification : ${titre}`} className="pressable flex w-12 shrink-0 items-start justify-center pt-4 text-[#5c5648]">
          <X size={20} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

/** La cloche ouvre cet écran : des alertes courtes qui mènent à la bonne action. */
export function CentreNotifications() {
  const [filtre, setFiltre] = useState<Filtre>("toutes");
  const fetcher = useCallback(
    (signal: AbortSignal) =>
      Promise.all([
        api<{ items: AlerteVue[]; nonLues: number }>("/v1/alertes", { signal }),
        api<{ vues: string[]; masquees: string[] }>("/v1/alertes/a-faire", { signal }),
        api<MesAchats>("/v1/achats-groupes", { signal }).catch(() => null),
        api<{ items: NextAction[] }>("/v1/next-actions", { signal }).catch(() => null),
        api<{ items: AFaire[] }>("/v1/rapprochements/actions", { signal }).catch(() => null),
      ]).then(([alertes, etats, mes, next, rap]) => ({
        alertes: alertes.items,
        etats,
        // Ce qui attend l'artisan existe ici même si un e-mail ou un push n'est jamais parti (« À faire » fait foi).
        aFaire: [...actionsEnAttente(mes?.achats ?? [], next?.items ?? []), ...(rap?.items ?? [])] as AFaire[],
      })),
    [],
  );
  const { data, error, reload, setData } = useResource(fetcher);
  const [retiree, setRetiree] = useState<Retiree | null>(null);
  const [echec, setEchec] = useState<string | null>(null);

  // Voir, c'est lire : dès que la liste est affichée, le serveur retient ce qui a été vu et la pastille s'éteint.
  const vuUneFois = useRef(false);
  useEffect(() => {
    if (!data || vuUneFois.current) return;
    vuUneFois.current = true;
    const nouvelles = data.aFaire.map(cleAFaire).filter((c) => !data.etats.vues.includes(c) && !data.etats.masquees.includes(c));
    const gestes: Promise<unknown>[] = [];
    if (nouvelles.length) gestes.push(api("/v1/alertes/a-faire", { method: "POST", body: { cles: nouvelles.slice(0, 60), geste: "vu" } }));
    if (data.alertes.some((a) => !a.lue)) gestes.push(api("/v1/alertes/lues", { method: "POST", body: { avant: new Date().toISOString() } }));
    if (gestes.length) void Promise.all(gestes).then(prevenirLaCloche, () => undefined);
  }, [data]);

  // « Annuler » reste proposé quelques secondes, puis s'efface.
  useEffect(() => {
    if (!retiree) return;
    const t = setTimeout(() => setRetiree(null), 8000);
    return () => clearTimeout(t);
  }, [retiree]);

  const masquees = new Set(data?.etats.masquees ?? []);
  const aFaire = filtre === "informations" ? [] : (data?.aFaire ?? []).filter((a) => !masquees.has(cleAFaire(a)));
  const alertes = (data?.alertes ?? []).filter((a) => (filtre === "toutes" ? true : filtre === "actions" ? a.genre === "action" : a.genre === "information"));

  async function retirer(r: Retiree) {
    if (!data) return;
    setEchec(null);
    const avant = data;
    // La ligne part tout de suite ; si le serveur refuse, elle revient et l'erreur se lit.
    setData(r.sorte === "alerte" ? { ...data, alertes: data.alertes.filter((a) => a.id !== r.id) } : { ...data, etats: { ...data.etats, masquees: [...data.etats.masquees, r.id] } });
    setRetiree(r);
    try {
      if (r.sorte === "alerte") await api(`/v1/alertes/${r.id}`, { method: "DELETE" });
      else await api("/v1/alertes/a-faire", { method: "POST", body: { cles: [r.id], geste: "masquer" } });
      prevenirLaCloche();
    } catch {
      setData(avant);
      setRetiree(null);
      setEchec("La notification n'a pas pu être supprimée. Vérifie ta connexion et réessaie.");
    }
  }

  async function annuler(r: Retiree) {
    setRetiree(null);
    try {
      if (r.sorte === "alerte") await api(`/v1/alertes/${r.id}/restaurer`, { method: "POST", body: {} });
      else await api("/v1/alertes/a-faire", { method: "POST", body: { cles: [r.id], geste: "restaurer" } });
      reload();
    } catch {
      setEchec("La notification n'a pas pu être remise. Vérifie ta connexion et réessaie.");
    }
  }

  return (
    <>
      <EcranTitre titre="Notifications" retour="/" />
      <GrandTitre sous="Des alertes courtes qui ouvrent la bonne action.">À ne pas manquer</GrandTitre>
      <Puces label="Filtrer les notifications" choix={[{ id: "toutes", libelle: "Toutes" }, { id: "actions", libelle: "Actions" }, { id: "informations", libelle: "Informations" }] as const} valeur={filtre} onChange={setFiltre} />
      {echec ? (
        <p role="alert" className="rounded-xl bg-[#3a1512] px-4 py-3 text-[14px] font-semibold text-[#ffb4a8]">
          {echec}
        </p>
      ) : null}
      {data === null ? (
        <EtatEcran erreur={error} onReessayer={reload} />
      ) : alertes.length + aFaire.length === 0 ? (
        <div className={`flex flex-col gap-1 p-5 ${CARTE}`}>
          <p className="text-[16px] font-extrabold">Rien de nouveau</p>
          <p className="text-[14px] text-[#5c5648]">On te prévient dès qu&apos;un négoce répond, qu&apos;un besoin est à reconfirmer ou qu&apos;un message arrive.</p>
        </div>
      ) : (
        <>
          <ul aria-label="Notifications" className="flex flex-col gap-3">
            {aFaire.map((a) => {
              const cle = cleAFaire(a);
              return <Ligne key={cle} href={a.href} titre={a.texte} action="Ouvrir" Icone={Bell} nouvelle={!data.etats.vues.includes(cle)} onRetirer={() => void retirer({ sorte: "afaire", id: cle, titre: a.texte })} />;
            })}
            {alertes.map((a) => (
              <Ligne key={a.id} href={a.href} titre={a.titre} detail={a.detail} action={a.action} Icone={ICONE[a.categorie] ?? Bell} nouvelle={!a.lue} onRetirer={() => void retirer({ sorte: "alerte", id: a.id, titre: a.titre })} />
            ))}
          </ul>
          <p className="text-center text-[13px] text-muted lg:hidden">Glisse une notification vers la gauche pour la supprimer.</p>
        </>
      )}
      <p className="text-center text-[13px] text-muted">
        Les conversations complètes restent dans la boîte
        <br />
        <Link href="/messages" className="font-extrabold underline underline-offset-4">
          « Messages et réponses »
        </Link>
        .
      </p>
      {retiree ? (
        <div role="status" className="fixed inset-x-4 bottom-[calc(var(--nav-height)+var(--nav-gap)+12px)] z-30 mx-auto flex max-w-[30rem] items-center gap-3 rounded-[18px] bg-ink px-4 py-2 text-ground shadow-card lg:bottom-6">
          <span className="min-w-0 flex-1 text-[14px] font-semibold">Notification supprimée. Ta demande n&apos;est pas touchée.</span>
          <button type="button" onClick={() => void annuler(retiree)} className="pressable min-h-11 shrink-0 rounded-full px-3 text-[15px] font-extrabold underline underline-offset-4">
            Annuler
          </button>
        </div>
      ) : null}
    </>
  );
}
