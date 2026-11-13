"use client";

import { Camera, ChevronRight, ClipboardList, FileText, Keyboard, Layers, Mic, PencilLine, Tag, Package, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { lireDescription, type LigneDecrite } from "../../../../packages/domain/src/assistant/assistant";
import { choisirProduit, choisirValeur, confirmer, designationFinale, etapeSuivante, refuser, type ArticleCompris } from "../../../../packages/domain/src/assistant/article-compris";
import { precisionsLisibles } from "../../../../packages/domain/src/groupe/precisions-lisibles";
import { natureDuDocument } from "../../../../packages/domain/src/documents/nature";
import { texteDuPdf } from "@/components/pdf-pages";
import { SaisirMaListe } from "@/components/saisir-ma-liste";
import { InfoAnalyse } from "@/components/coup-de-main-ia";
import { api, ApiError, MAX_DOCUMENT_BYTES, messageErreur, newActionKey, type Project, type Quantitatif } from "@/lib/api";
import { useDictee } from "@/lib/dictee";
import { NEW_PROJECT_NAME } from "@/lib/project-name";
import { useSession } from "@/lib/session";
import { attachFile } from "@/lib/upload";
import { BarreSaisie, Bulle, COULEURS_CHAT, EnTeteChat, TexteMobiiz, useChampDicte, useFil, useZoneVisible } from "./chat-mobiiz";

/**
 * NOUVEAU QUANTITATIF, UNE SEULE PORTE (Greg, 7 novembre 2026, captures « Mobiiz | Assistant » : « deux parcours distincts
 * mais reliés », partie 1) : une conversation. L'artisan écrit ou dicte un ou plusieurs articles (« 1 000 ardoises 32×22
 * Espagne 1er choix et 950 crochets inox 100 mm ») : le CODE les lit (aucun appel IA, aucun quota) et répond « J'ai
 * compris » article par article ; rien n'entre dans la liste sans « Ajouter à ma liste ». Le « + » ouvre « Ajouter » :
 * photos (plusieurs d'un coup), devis ou PDF, catalogue. Un document est lu par l'IA, son coût dit avant, comme avant ;
 * jamais une quantité ni une caractéristique inventée : ce qui manque reste à préciser sur la ligne.
 */
/** Une ligne de la carte : vue sur une photo de chantier (jamais dite), elle le dit. */
type LigneCarte = LigneDecrite & {
  vuSurPhoto?: boolean;
  /** la ligne de la liste en cours qui lui ressemble (doublon possible) ; elle est alors décochée d'office. */
  doublon?: string;
  decochee?: boolean;
  /** la question de CETTE ligne (jamais posée une seconde fois en bulle). */
  question?: { texte: string; choix: string[] };
};

const aPlatCourt = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[×*]/g, "x")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
/** Un doublon possible : même premier mot (à ses 5 premières lettres) et mêmes nombres écrits. Jamais fusionné : signalé. */
function doublonDe(libelle: string, existantes: readonly string[]): string | undefined {
  const cle = (t: string) => {
    const m = aPlatCourt(t).split(" ");
    return `${(m.find((x) => /^[a-z]{3,}/.test(x)) ?? "").slice(0, 5)}|${m.filter((x) => /\d/.test(x)).sort().join(",")}`;
  };
  const c = cle(libelle);
  return existantes.find((e) => cle(e) === c);
}
/** Les questions du modèle rangées avec leur ligne ; celles sans ligne restent pour la conversation. */
function rangerLesQuestions(lignes: LigneCarte[], questions: { texte: string; choix: string[]; ligne?: number | null }[], existantes: readonly string[]) {
  const avec = lignes.map((l, i) => {
    const q = questions.find((x) => x.ligne === i);
    const doublon = doublonDe(l.libelle, existantes);
    return { ...l, ...(q ? { question: { texte: q.texte, choix: q.choix } } : {}), ...(doublon ? { doublon, decochee: true } : {}) };
  });
  return { lignes: avec, generales: questions.filter((q) => q.ligne === null || q.ligne === undefined || q.ligne >= lignes.length) };
}
type SansId = { de: "mobiiz"; texte: string; reconnecter?: boolean; choix?: string[]; lien?: { href: string; texte: string } } | { de: "moi"; texte: string; apercu?: string } | { de: "compris"; texte: string; lignes: LigneCarte[]; propose?: boolean; titre?: string; etat: "ouvert" | "ajoute" | "corrige"; comprises?: (ArticleCompris | null)[] };
type Element = SansId & { id: number };

const EXEMPLE = "Ex. : 1 000 ardoises 32×22 Espagne 1er choix et 950 crochets inox 100 mm";

/** Une quantité dite sans unité devant le nom d'un article (« 1 000 ardoises ») se compte en pièces : c'est ce qui a été dit. */
const avecUnite = (l: LigneDecrite): LigneDecrite => (l.quantite && !l.unite && /^\d+$/.test(l.quantite) ? { ...l, unite: "pièces" } : l);
interface VuePhoto {
  ia: boolean;
  nature: "texte" | "chantier" | "liste" | "devis" | "autre" | null;
  vu: string | null;
  lignes: LigneDecrite[];
  questions: { texte: string; choix: string[] }[];
  message: string;
}

/** Une photo réduite sur le téléphone (1 568 px au plus, JPEG) : assez pour reconnaître un matériau, légère à envoyer. */
async function reduirePhoto(f: File): Promise<Blob> {
  const image = await createImageBitmap(f);
  const echelle = Math.min(1, 1568 / Math.max(image.width, image.height));
  const toile = document.createElement("canvas");
  toile.width = Math.max(1, Math.round(image.width * echelle));
  toile.height = Math.max(1, Math.round(image.height * echelle));
  toile.getContext("2d")!.drawImage(image, 0, 0, toile.width, toile.height);
  image.close();
  return new Promise((ok, non) => toile.toBlob((b) => (b ? ok(b) : non(new Error("photo illisible"))), "image/jpeg", 0.82));
}

/** Les photos envoyées à l'assistant, avec la conversation en cours ; rien n'est gardé côté serveur. */
async function voirLesPhotos(images: File[], echanges: { de: string; texte: string }[]): Promise<VuePhoto> {
  const form = new FormData();
  for (const f of images) form.append("file", await reduirePhoto(f), f.name.replace(/\.[^.]+$/, "") + ".jpg");
  form.append("echanges", JSON.stringify(echanges.slice(-18)));
  return api<VuePhoto>("/v1/assistant/photo", { method: "POST", body: form });
}

const ENTREE = "pressable flex min-h-14 cursor-pointer items-center gap-2.5 rounded-2xl border border-white/15 bg-white/[0.06] px-3 text-left text-[15px] leading-tight font-bold text-[#FBF8F3] active:bg-white/10";
const ENTREE_SOUS = "ml-auto hidden pl-2 text-right text-[13px] font-normal text-[#FBF8F3]/65 lg:block";

const nombreFr = (q: string) => (/^\d+$/.test(q) ? Number(q).toLocaleString("fr-FR") : q.replace(".", ","));

/**
 * Direction A (Greg, 12 novembre 2026) : `surAjout` ouvre l'assistant DEPUIS une liste en cours de saisie : ce que l'artisan
 * valide rejoint cette liste (rien n'est créé à part), et « Revenir à ma liste » le ramène où il était.
 */
export function NouveauQuantitatif({ onFermer, surAjout, existantes = [] }: { onFermer?: () => void; surAjout?: (lignes: LigneDecrite[]) => void; existantes?: readonly string[] } = {}) {
  const [ajoutes, setAjoutes] = useState(0);
  const router = useRouter();
  const { me, company } = useSession();
  const reprise = useSearchParams().get("liste") === "1";
  const prenom = me.user.name.trim().split(/\s+/)[0] ?? "";
  const [elements, setElements] = useState<Element[]>([]);
  const [liste, setListe] = useState<{ id: string; projetId: string; n: number } | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [feuille, setFeuille] = useState(false);
  const [catalogue, setCatalogue] = useState(reprise);
  const [aConfirmer, setAConfirmer] = useState<{ fichiers: File[]; nature: "devis" | "liste" } | null>(null);
  const [lecture, setLecture] = useState(false);
  const champ = useChampDicte();
  const dictee = useDictee(champ.surVoix);
  const { fil, enBas } = useFil([elements.length, occupe, lecture]);
  const zone = useZoneVisible(enBas);
  const compteur = useRef(0);
  const ids = { photo: useId(), galerie: useId(), document: useId() };
  const cleDepot = useRef(newActionKey());
  // Plein écran par-dessus l'app : l'en-tête et le menu derrière deviennent inertes (ni touchés, ni lus) tant qu'elle est ouverte.
  useEffect(() => {
    // ouvert à côté d'une liste (ordinateur), il ne fige pas la liste, qui reste lisible et modifiable.
    if (surAjout) return;
    const inertes: HTMLElement[] = [];
    for (let el = zone.current as HTMLElement | null; el && el !== document.body; el = el.parentElement) {
      for (const frere of Array.from(el.parentElement?.children ?? [])) {
        // Dans la page : tout le reste (en-tête, bandeaux). Hors de la page : seulement le menu, jamais le guide de première
        // visite ni l'afficheur de fichiers, qui s'ouvrent par-dessus la conversation.
        const dansLaPage = !!el.parentElement?.closest("main");
        const menu = frere.tagName === "NAV" || !!frere.querySelector?.('nav[aria-label="Navigation principale"]');
        if (frere !== el && frere instanceof HTMLElement && !frere.inert && frere.tagName !== "SCRIPT" && !(frere instanceof HTMLInputElement) && (dansLaPage || menu)) {
          frere.inert = true;
          inertes.push(frere);
        }
      }
    }
    return () => inertes.forEach((e) => (e.inert = false));
  });
  // L'identifiant est pris tout de suite (jamais dans la mise à jour, qui s'exécute plus tard) : une réponse du serveur
  // retrouve ainsi sa carte.
  const ajouterElement = (e: SansId) => {
    const id = ++compteur.current;
    setElements((xs) => [...xs, { ...e, id }]);
    return id;
  };
  const dire = (texte: string) => ajouterElement({ de: "mobiiz", texte });
  const pathname = usePathname();

  /**
   * L'ASSISTANT CONNECTÉ À L'IA (Greg, 12 novembre 2026 : « Ici, je veux une IA connectée […] l'IA doit poser des questions
   * si besoin, comme un salarié de comptoir ») : ce qui est dit part au serveur avec la conversation en cours (les phrases
   * de l'artisan et les questions posées depuis la dernière carte ajoutée). Le modèle découpe en articles et questionne ;
   * le serveur revalide (aucune quantité, aucun article non dit). Éteint, plafond atteint ou sans réseau : le code lit la
   * phrase ici, comme avant.
   */
  const conversation = useRef<{ echanges: { de: "artisan" | "assistant" | "photo"; texte: string }[]; carte: number | null }>({ echanges: [], carte: null });

  async function envoyer(dit?: string) {
    const texte = (dit ?? champ.saisie).trim();
    if (!texte || occupe) return;
    dictee.arreter();
    champ.setSaisie("");
    ajouterElement({ de: "moi", texte });
    const echanges = [...conversation.current.echanges, { de: "artisan" as const, texte }];
    setOccupe(true);
    const ia = await api<{ ia: boolean; lignes: LigneDecrite[]; questions: { texte: string; choix: string[]; ligne?: number | null }[]; message: string }>("/v1/assistant/description", { method: "POST", body: { echanges: echanges.slice(-20) } }).catch(() => null);
    setOccupe(false);
    let lignes: LigneCarte[];
    if (ia?.ia) {
      // La carte en cours est remplacée par la liste à jour (la réponse à une question complète l'article).
      const ancienne = conversation.current.carte;
      if (ancienne !== null) setElements((xs) => xs.filter((x) => x.id !== ancienne));
      lignes = ia.lignes.map(avecUnite);
      conversation.current = { echanges: [...echanges, ...ia.questions.map((q) => ({ de: "assistant" as const, texte: q.choix.length ? `${q.texte} (${q.choix.join(", ")})` : q.texte }))], carte: null };
      if (lignes.length === 0 && ia.questions.length === 0) return dire(ia.message || "Je n'ai pas trouvé de matériau. Dis-le avec sa quantité, par exemple « 10 sacs de colle », ou touche + pour une photo ou un document.");
    } else {
      conversation.current = { echanges: [], carte: null };
      const r = lireDescription(texte);
      lignes = [...r.lignes, ...r.aConfirmer].map(avecUnite);
      if (lignes.length === 0) return dire("Je n'ai pas trouvé de matériau. Dis-le avec sa quantité, par exemple « 10 sacs de colle », ou touche + pour une photo ou un document.");
    }
    if (ia?.ia && ia.message) dire(ia.message);
    if (lignes.length === 0) {
      for (const q of ia?.questions ?? []) ajouterElement({ de: "mobiiz", texte: q.texte, choix: q.choix });
      return;
    }
    if (ia?.ia) {
      // chaque question va AVEC sa ligne, dans la carte ; la conversation dit seulement pourquoi il manque quelque
      // chose. Les questions du catalogue ne sont pas reposées par-dessus (jamais deux fois la même information).
      const r = rangerLesQuestions(lignes, ia.questions, existantes);
      conversation.current.carte = ajouterElement({ de: "compris", texte, lignes: r.lignes, etat: "ouvert", propose: true });
      for (const q of r.generales) ajouterElement({ de: "mobiiz", texte: q.texte, choix: q.choix });
      return;
    }
    const id = ajouterElement({ de: "compris", texte, lignes, etat: "ouvert" });
    // Greg, 8 novembre 2026 (« 36 mètres de Lito ») : chaque article est rapproché du catalogue métier, sans appel IA ; une
    // interprétation à confirmer et les questions utiles s'affichent dans la carte. Sans réponse du serveur : rien ne change.
    void api<{ articles: (ArticleCompris | null)[] }>("/v1/catalogue/comprendre", { method: "POST", body: { lignes: lignes.map((l) => ({ libelle: l.libelle, unite: l.unite })) } })
      .then((r) => setElements((xs) => xs.map((x) => (x.id === id && x.de === "compris" ? { ...x, comprises: r.articles } : x))))
      .catch(() => undefined);
  }

  function changerCompris(id: number, i: number, c: ArticleCompris | null) {
    setElements((xs) => xs.map((x) => (x.id === id && x.de === "compris" ? { ...x, comprises: (x.comprises ?? x.lignes.map(() => null)).map((y, j) => (j === i ? c : y)) } : x)));
  }

  /** « Ajouter à ma liste » : la liste naît avec ces lignes, ou les reçoit. */
  async function ajouter(id: number, lignes: LigneDecrite[]) {
    if (surAjout) {
      surAjout(lignes.map(({ libelle, quantite, unite }) => ({ libelle, quantite, unite })));
      setElements((xs) => xs.map((x) => (x.id === id && x.de === "compris" ? { ...x, etat: "ajoute" } : x)));
      conversation.current = { echanges: [], carte: null };
      setAjoutes((n) => n + lignes.length);
      dire("C'est dans ta liste en cours. Autre chose ? Sinon, reviens à ta liste : tu peux encore tout modifier.");
      return;
    }
    setOccupe(true);
    try {
      let n = liste?.n ?? 0;
      if (!liste) {
        const q = await api<Quantitatif>("/v1/quantitatifs", { method: "POST", body: { lignes: lignes.map((l) => ({ libelle: l.libelle, quantite: l.quantite, unite: l.unite })) }, idempotencyKey: newActionKey() });
        n = lignes.length;
        setListe({ id: q.id, projetId: q.projetId, n });
      } else {
        for (const l of lignes) await api(`/v1/quantitatifs/${encodeURIComponent(liste.id)}/corrections`, { method: "POST", body: { action: "ajouter", ligne: { libelle: l.libelle, quantite: l.quantite, unite: l.unite } } });
        n += lignes.length;
        setListe({ ...liste, n });
      }
      setElements((xs) => xs.map((x) => (x.id === id && x.de === "compris" ? { ...x, etat: "ajoute" } : x)));
      // Ces articles sont dans la liste : la conversation avec le modèle repart de zéro.
      conversation.current = { echanges: [], carte: null };
      dire(`C'est ajouté. Ta liste compte ${n} article${n > 1 ? "s" : ""}. Autre chose ? Quand c'est complet, touche « Voir ma liste ».`);
    } catch (e) {
      dire(`Rien n'est ajouté : ${messageErreur(e)}`);
    } finally {
      setOccupe(false);
    }
  }

  function corriger(id: number, texte: string) {
    setElements((xs) => xs.map((x) => (x.id === id && x.de === "compris" ? { ...x, etat: "corrige" } : x)));
    conversation.current = { echanges: [], carte: null };
    champ.setSaisie(texte);
  }

  /** Les fichiers choisis (une ou plusieurs photos, ou un PDF) : le type est reconnu, le coût dit avant l'analyse. */
  async function fichiers(fs: File[]) {
    setFeuille(false);
    if (fs.length === 0) return;
    const pdfs = fs.filter((f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name));
    const images = fs.filter((f) => f.type.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name));
    if (pdfs.length + images.length !== fs.length) return dire("Ce fichier n'est ni une photo ni un PDF.");
    if (pdfs.length > 1 || (pdfs.length === 1 && images.length > 0)) return dire("Un PDF à la fois, ou plusieurs photos ensemble.");
    if (fs.some((f) => f.size > MAX_DOCUMENT_BYTES)) return dire("C'est trop volumineux pour être envoyé. Envoie une photo plus légère ou un PDF de moins de pages.");
    const nature = fs.length === 1 ? natureDuDocument({ type: fs[0]!.type, nom: fs[0]!.name }, pdfs.length ? await texteDuPdf(fs[0]!) : null) : "liste";
    // LA PHOTO (Greg, 12 novembre 2026 : « un artisan doit pouvoir donner une photo pour aider l'IA à comprendre le contexte du
    // chantier […] aussi prendre en photo une liste de matériaux. L'IA devra s'adapter ») : jusqu'à trois photos partent
    // d'abord à l'assistant, qui dit ce qu'elles montrent. Un chantier : ses matériaux sont proposés ici, à confirmer, avec
    // les questions. Une liste ou un devis : la lecture de document, comme avant. Éteint ou en panne : comme avant.
    if (!liste && pdfs.length === 0 && images.length > 0 && images.length <= 3) {
      setOccupe(true);
      const vue = await voirLesPhotos(images, conversation.current.echanges).catch(() => null);
      setOccupe(false);
      if (vue?.ia && vue.nature === "chantier") return montrerLeChantier(images, vue);
      if (vue?.ia && vue.nature === "autre") {
        ajouterElement({ de: "moi", texte: images.length > 1 ? `${images.length} photos` : "Photo", apercu: URL.createObjectURL(images[0]!) });
        return dire(vue.message || "Je ne vois ni chantier ni liste de matériaux sur cette photo. Reprends-la, ou dis-moi ce qu'il te faut.");
      }
      if (vue?.ia && (vue.nature === "liste" || vue.nature === "devis")) return setAConfirmer({ fichiers: fs, nature: vue.nature });
    }
    setAConfirmer({ fichiers: fs, nature });
  }

  /** Une photo de chantier : ce que l'assistant y voit, ses matériaux à confirmer (sans quantité), puis ses questions. */
  function montrerLeChantier(images: File[], vue: VuePhoto) {
    ajouterElement({ de: "moi", texte: images.length > 1 ? `${images.length} photos du chantier` : "Photo du chantier", apercu: URL.createObjectURL(images[0]!) });
    const ancienne = conversation.current.carte;
    if (ancienne !== null) setElements((xs) => xs.filter((x) => x.id !== ancienne));
    const lignes = vue.lignes.map(avecUnite);
    conversation.current = {
      echanges: [
        ...conversation.current.echanges,
        { de: "artisan" as const, texte: "Voici une photo." },
        ...(vue.vu ? [{ de: "photo" as const, texte: vue.vu }] : []),
        ...vue.questions.map((q) => ({ de: "assistant" as const, texte: q.choix.length ? `${q.texte} (${q.choix.join(", ")})` : q.texte })),
      ],
      carte: null,
    };
    if (vue.message) dire(vue.message);
    const r = rangerLesQuestions(lignes, vue.questions, existantes);
    if (lignes.length) {
      dire("Une photo ne donne pas les mesures : donne-les sur chaque ligne, ou dis-les-moi. Ce qui manque reste « À préciser ».");
      conversation.current.carte = ajouterElement({ de: "compris", texte: "", lignes: r.lignes, etat: "ouvert", propose: true, titre: "Vu sur ta photo" });
    }
    for (const q of r.generales) ajouterElement({ de: "mobiiz", texte: q.texte, choix: q.choix });
  }

  async function analyser(fs: File[], nature: "devis" | "liste") {
    // depuis une liste en cours, le document est LU SANS RIEN CRÉER ; ses lignes sont proposées à part, les
    // doublons possibles signalés et décochés ; rien n'écrase une ligne de la liste, rien n'entre sans accord.
    if (surAjout) {
      ajouterElement({ de: "moi", texte: fs.length > 1 ? `${fs.length} photos` : fs[0]!.name });
      setOccupe(true);
      try {
        const form = new FormData();
        if (fs.length === 1) await attachFile(form, fs[0]!);
        else for (const f of fs) form.append("file", f);
        // Une clé par document choisi : un double clic ou un nouvel essai ne relit pas et ne décompte pas deux fois.
        const r = await api<{ nature: string; lignes: LigneDecrite[] }>("/v1/assistant/document", { method: "POST", body: form, idempotencyKey: newActionKey() });
        const rangees = rangerLesQuestions(r.lignes.map(avecUnite), [], existantes);
        const doublons = rangees.lignes.filter((l) => l.doublon).length;
        dire(`J'ai lu ${r.lignes.length} lignes dans ton document.${doublons ? ` ${doublons > 1 ? `${doublons} ressemblent` : "Une ressemble"} à une ligne de ta liste : je l${doublons > 1 ? "es" : "a"} laisse décochée${doublons > 1 ? "s" : ""}, à toi de voir.` : ""} Rien n'est ajouté pour l'instant.`);
        ajouterElement({ de: "compris", texte: "", lignes: rangees.lignes, etat: "ouvert", propose: true, titre: "Lu dans ton document" });
      } catch (e) {
        const err = e instanceof ApiError ? e : new ApiError("internal_error", 500);
        // Le quota de scans est pris : rien n'a été lu ni dépensé ; la phrase de la formule est celle du serveur.
        if (err.code === "abonnement_requis") ajouterElement({ de: "mobiiz", texte: `${err.phrase ?? "Tes scans de liste sont utilisés."} Ta liste en cours n'a pas bougé : tu peux continuer à la main.`, choix: [], lien: { href: "/formules", texte: "Voir les formules" } });
        else if (err.reason === "nothing_read") dire("Je n'ai rien lu sur ce document. Reprends la photo bien à plat, bien éclairée, ou envoie un PDF. Ta liste en cours n'a pas bougé.");
        else if (err.code === "ai_unavailable" || err.code === "analysis_failed") dire("La lecture de document n'est pas disponible pour le moment. Ta liste en cours n'a pas bougé : continue à la main, ou réessaie plus tard. Rien n'a été décompté.");
        else if (err.code === "unauthenticated") ajouterElement({ de: "mobiiz", texte: `Le document n'est pas lu : ${messageErreur(err)}`, reconnecter: true });
        else dire(`Je n'ai pas pu lire ce document : ${messageErreur(err)} Ta liste en cours n'a pas bougé, et rien n'a été décompté.`);
      } finally {
        setOccupe(false);
      }
      return;
    }
    setLecture(true);
    ajouterElement({ de: "moi", texte: fs.length > 1 ? `${fs.length} photos` : fs[0]!.name });
    try {
      const trade = company?.trades.find((t) => t !== "other") ?? null;
      const projet = await api<Project>("/v1/projects", { method: "POST", body: { name: NEW_PROJECT_NAME, clientName: null, address: null, trade }, idempotencyKey: cleDepot.current });
      const form = new FormData();
      if (nature === "liste") {
        if (fs.length === 1) await attachFile(form, fs[0]!);
        else for (const f of fs) form.append("file", f);
        await api(`/v1/projects/${encodeURIComponent(projet.id)}/liste?ecran=1`, { method: "POST", body: form });
        const jour = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
        await api(`/v1/projects/${encodeURIComponent(projet.id)}`, { method: "PATCH", body: { name: `Ma liste du ${jour}` } }).catch(() => undefined);
      } else {
        form.append("purpose", "client_quote");
        if (fs.length === 1) await attachFile(form, fs[0]!);
        else for (const f of fs) form.append("file", f);
        await api(`/v1/projects/${encodeURIComponent(projet.id)}/documents`, { method: "POST", body: form });
      }
      router.replace(`/chantiers/${projet.id}`);
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError("internal_error", 500);
      if (err.reason === "nothing_read") dire("Je n'ai rien lu sur ce fichier. Reprends la photo bien à plat, bien éclairée, ou envoie un PDF.");
      // Plan « finition », bloc 6 : une session expirée dit quoi faire, avec le lien qui ramène ici après la connexion.
      else ajouterElement({ de: "mobiiz", texte: `Le document n'est pas lu : ${messageErreur(err)}`, ...(err.code === "unauthenticated" ? { reconnecter: true } : {}) });
      // La même clé au nouvel essai : un seul chantier, quel que soit le nombre d'essais (cas limites, bloc 6).
      setLecture(false);
    }
  }

  if (catalogue) return <SaisirMaListe onFermer={() => setCatalogue(false)} />;
  const prendre = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fs = [...(e.target.files ?? [])];
    e.target.value = "";
    void fichiers(fs);
  };
  // Les champs de fichier restent dans la page (la feuille « Ajouter » ne fait que les ouvrir) ; désactivés une fois la
  // liste commencée : un document ouvre une nouvelle liste.
  const champs = (
    <>
      <input id={ids.photo} type="file" accept="image/*" capture="environment" multiple className="sr-only" aria-label="Prendre une photo" aria-hidden="true" tabIndex={-1} disabled={lecture} onChange={prendre} />
      <input id={ids.galerie} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple className="sr-only" aria-label="Choisir une photo" aria-hidden="true" tabIndex={-1} disabled={lecture} onChange={prendre} />
      <input id={ids.document} type="file" accept="application/pdf,.pdf,image/jpeg,image/png,image/webp,image/heic,image/heif" multiple className="sr-only" aria-label="Choisir un PDF ou un fichier" aria-hidden="true" tabIndex={-1} disabled={lecture} onChange={prendre} />
    </>
  );

  return (
    <div ref={zone} role="dialog" aria-modal="true" aria-label="Nouveau quantitatif" className={`fixed top-0 left-0 z-50 flex h-[100dvh] w-full flex-col text-[#FBF8F3] ${surAjout ? "lg:left-1/2 lg:w-1/2 lg:border-l lg:border-white/15" : ""}`} style={{ backgroundColor: COULEURS_CHAT.fond }}>
      {champs}
      <EnTeteChat onFermer={onFermer ?? (() => router.push("/chantiers/nouveau"))} />
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col">
        <div ref={fil} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-3 py-4">
          {liste ? (
            <button type="button" onClick={() => router.push(`/chantiers/${liste.projetId}`)} className="pressable flex min-h-11 items-center gap-2 self-end rounded-full border-2 px-4 text-[15px] font-bold" style={{ borderColor: COULEURS_CHAT.jaune }}>
              <ClipboardList size={18} aria-hidden="true" style={{ color: COULEURS_CHAT.jaune }} /> Ma liste · {liste.n}
            </button>
          ) : null}
          <Bulle de="mobiiz">
            <TexteMobiiz>{surAjout ? "Je complète ta liste en cours. Donne-moi ce que tu as, tu vérifies avant d'ajouter." : `Bonjour${prenom ? ` ${prenom}` : ""}. Donne-moi ce que tu as : je prépare, tu vérifies.`}</TexteMobiiz>
          </Bulle>
          {/* les façons d'entrer sont visibles tout de suite, avec leurs mots (jamais un écran vide ni une icône seule). */}
          {elements.length === 0 && !liste ? (
            <div role="group" aria-label="Donne à Mobiiz ce que tu as" className="ml-10 grid grid-cols-2 gap-2">
              <label htmlFor={ids.photo} className={ENTREE}>
                <Camera size={22} aria-hidden="true" className="shrink-0 text-[#FED206]" />
                <span>Prendre une photo</span>
                <span className={ENTREE_SOUS}>Chantier ou liste écrite</span>
              </label>
              <label htmlFor={ids.document} className={ENTREE}>
                <FileText size={22} aria-hidden="true" className="shrink-0 text-[#FED206]" />
                <span>Importer un document</span>
                <span className={ENTREE_SOUS}>Devis, PDF, liste</span>
              </label>
              <button
                type="button"
                className={ENTREE}
                onClick={() => {
                  champ.avantDictee();
                  dictee.demarrer();
                }}
              >
                <Mic size={22} aria-hidden="true" className="shrink-0 text-[#FED206]" />
                <span>Dicter</span>
                <span className={ENTREE_SOUS}>Dis ce qu&apos;il te faut</span>
              </button>
              <button type="button" className={ENTREE} onClick={() => zone.current?.querySelector<HTMLElement>("textarea, input[type=text]")?.focus()}>
                <Keyboard size={22} aria-hidden="true" className="shrink-0 text-[#FED206]" />
                <span>Écrire</span>
                <span className={ENTREE_SOUS}>Tape ta demande</span>
              </button>
            </div>
          ) : null}
          <p className="pl-10 text-[14px] text-[#FBF8F3]/70">{EXEMPLE}</p>
          {elements.map((e) =>
            e.de === "moi" ? (
              <Bulle key={e.id} de="moi">
                {/* eslint-disable-next-line @next/next/no-img-element -- la photo que l'artisan vient de prendre, lue sur son téléphone */}
                {e.apercu ? <img src={e.apercu} alt={e.texte} className="mb-1 max-h-48 w-auto rounded-xl" /> : null}
                {e.texte}
              </Bulle>
            ) : e.de === "mobiiz" ? (
              <Bulle key={e.id} de="mobiiz">
                <TexteMobiiz>{e.texte}</TexteMobiiz>
                {e.choix?.length ? (
                  <div role="group" aria-label={`Réponses à : ${e.texte}`} className="mt-2 flex flex-wrap gap-2">
                    {e.choix.map((c) => (
                      <button key={c} type="button" disabled={occupe} onClick={() => void envoyer(c)} className="pressable min-h-11 rounded-full border-2 border-[#FED206] px-4 text-[15px] font-bold disabled:opacity-50">
                        {c}
                      </button>
                    ))}
                  </div>
                ) : null}
                {e.lien ? (
                  <Link href={e.lien.href} className="mt-2 inline-flex min-h-11 items-center rounded-full bg-[#FED206] px-4 font-semibold text-[#111111]">
                    {e.lien.texte}
                  </Link>
                ) : null}
                {e.reconnecter ? (
                  <Link href={`/connexion?retour=${encodeURIComponent(pathname)}`} className="mt-2 inline-flex min-h-11 items-center rounded-full bg-[#FED206] px-4 font-semibold text-[#111111]">
                    Me reconnecter
                  </Link>
                ) : null}
              </Bulle>
            ) : (
              <CarteCompris
                key={e.id}
                lignes={e.lignes}
                comprises={e.comprises}
                onCompris={(i, c) => changerCompris(e.id, i, c)}
                etat={e.etat}
                occupe={occupe}
                onAjouter={() => void ajouter(e.id, lignesRetenues(e.lignes, e.comprises).filter((_, i) => !e.lignes[i]!.decochee))}
                onCorriger={() => corriger(e.id, e.texte)}
                propose={e.propose === true}
                titre={e.titre}
                onBasculer={(i) => setElements((xs) => xs.map((x) => (x.id === e.id && x.de === "compris" ? { ...x, lignes: x.lignes.map((l, j) => (j === i ? { ...l, decochee: !l.decochee } : l)) } : x)))}
                onRepondre={(i, valeur) => (valeur === null ? setElements((xs) => xs.map((x) => (x.id === e.id && x.de === "compris" ? { ...x, lignes: x.lignes.map((l, j) => (j === i ? { ...l, question: undefined } : l)) as LigneCarte[] } : x))) : void envoyer(valeur))}
                onRetirer={(i) =>
                  setElements((xs) =>
                    xs.flatMap((x) => {
                      if (x.id !== e.id || x.de !== "compris") return [x];
                      const lignes = x.lignes.filter((_, j) => j !== i);
                      return lignes.length ? [{ ...x, lignes, ...(x.comprises ? { comprises: x.comprises.filter((_, j) => j !== i) } : {}) }] : [];
                    }),
                  )
                }
                onMoiMeme={liste || surAjout ? undefined : () => setCatalogue(true)}
              />
            ),
          )}
          {lecture ? <p className="pl-10 text-[14px] text-[#FBF8F3]/70">J&apos;envoie ton document… la lecture continue sur ta liste.</p> : null}
        </div>
        <BarreSaisie
          valeur={champ.saisie}
          onChange={champ.setSaisie}
          onEnvoyer={() => void envoyer()}
          occupe={occupe || lecture}
          ecoute={dictee.ecoute}
          probleme={dictee.probleme}
          onDicter={() => {
            champ.avantDictee();
            dictee.demarrer();
          }}
          onArreter={dictee.arreter}
          onAnnulerDictee={() => {
            dictee.annuler();
            champ.rendre();
          }}
          onPlus={() => setFeuille(true)}
          invite={liste ? "Écris ou dicte…" : "Décris ton besoin…"}
          avant={
            surAjout ? (
              <button type="button" onClick={onFermer} className="pressable mb-2 flex min-h-12 w-full items-center justify-center rounded-2xl text-[16px] font-extrabold text-[#111111]" style={{ backgroundColor: COULEURS_CHAT.jaune }}>
                {ajoutes > 0 ? `Revenir à ma liste · ${ajoutes} ajouté${ajoutes > 1 ? "s" : ""}` : "Revenir à ma liste"}
              </button>
            ) : liste ? (
              <button type="button" onClick={() => router.push(`/chantiers/${liste.projetId}`)} className="pressable mb-2 flex min-h-12 w-full items-center justify-center rounded-2xl text-[16px] font-extrabold text-[#111111]" style={{ backgroundColor: COULEURS_CHAT.jaune }}>
                Voir ma liste ({liste.n})
              </button>
            ) : undefined
          }
        />
      </div>
      {feuille ? <FeuilleAjouter liste={liste !== null} ids={ids} onListe={liste ? () => router.push(`/chantiers/${liste.projetId}`) : undefined} onFermer={() => setFeuille(false)} /> : null}
      {aConfirmer ? (
        <ConfirmerAnalyse
          nature={aConfirmer.nature}
          nombre={aConfirmer.fichiers.length}
          onChanger={() => setAConfirmer((c) => (c ? { ...c, nature: c.nature === "devis" ? "liste" : "devis" } : c))}
          onAnnuler={() => setAConfirmer(null)}
          onAnalyser={() => {
            const c = aConfirmer;
            setAConfirmer(null);
            void analyser(c.fichiers, c.nature);
          }}
        />
      ) : null}
    </div>
  );
}

/** La désignation retenue : celle du catalogue une fois l'interprétation confirmée, sinon les mots de l'artisan. */
const designationRetenue = (l: LigneDecrite, c: ArticleCompris | null | undefined) => (c && c.confirme && c.choixProduit !== null ? designationFinale(c) : l.libelle);
const lignesRetenues = (lignes: LigneDecrite[], comprises?: (ArticleCompris | null)[]) => lignes.map((l, i) => ({ ...l, libelle: designationRetenue(l, comprises?.[i]) }));

/** « J'ai compris » : chaque article lu, ses caractéristiques reconnues, sa quantité ; rien d'ajouté sans le bouton. */
function CarteCompris({ lignes, comprises, onCompris, etat, occupe, onAjouter, onCorriger, onMoiMeme, propose = false, onRetirer, titre, onBasculer, onRepondre }: { propose?: boolean; titre?: string | undefined; onBasculer?: (i: number) => void; onRepondre?: (i: number, valeur: string | null) => void; onRetirer?: (i: number) => void; lignes: LigneCarte[]; comprises?: (ArticleCompris | null)[] | undefined; onCompris: (i: number, c: ArticleCompris | null) => void; etat: "ouvert" | "ajoute" | "corrige"; occupe: boolean; onAjouter: () => void; onCorriger: () => void; onMoiMeme?: (() => void) | undefined }) {
  // Une question à la fois (Greg, 8 novembre 2026) : celle du premier article qui en a encore une.
  const enCours = etat === "ouvert" ? lignes.findIndex((l, i) => { const c = comprises?.[i]; return !!c && etapeSuivante(c, l.quantite, l.unite) !== null; }) : -1;
  return (
    <div className="flex flex-col gap-2">
      <section aria-label="J'ai compris" className="ml-10 flex flex-col gap-3 rounded-[22px] bg-[#FBF8F3] p-4 text-[#111111]">
        <p className="text-[18px] font-extrabold">{propose ? `${titre ?? "Mobiiz propose"} · ${lignes.length > 1 ? `${lignes.length} articles` : "1 article"}` : `J'ai compris${lignes.length > 1 ? ` ${lignes.length} articles` : ""}`}</p>
        {/* une proposition n'est pas une information validée ; elle le dit, et rien n'entre sans le bouton. */}
        {propose && etat === "ouvert" ? <p className="-mt-2 text-[14px] text-[#111111]/70">Vérifie chaque ligne. Rien n&apos;entre dans ta liste sans ton accord.</p> : null}
        <ul className="flex flex-col gap-3">
          {lignes.map((l0, i) => {
            const c = comprises?.[i];
            const l = { ...l0, libelle: designationRetenue(l0, c) };
            const precisions = precisionsLisibles(l.libelle);
            return (
              <li key={i} className="flex flex-col gap-1 border-b border-[#111111]/10 pb-2 last:border-b-0 last:pb-0">
                <span className="flex items-start gap-2 text-[16px] font-bold">
                  {propose && etat === "ouvert" && onBasculer ? (
                    <input type="checkbox" checked={!l0.decochee} onChange={() => onBasculer(i)} aria-label={`Ajouter à ma liste : ${l.libelle}`} className="mt-0.5 size-5 shrink-0 accent-[#111111]" />
                  ) : (
                    <Layers size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
                  )}{" "}
                  <span className="min-w-0 flex-1">{l.libelle}</span>
                  {etat === "ouvert" && onRetirer ? (
                    <button type="button" onClick={() => onRetirer(i)} aria-label={`Retirer : ${l.libelle}`} className="pressable -mt-2 -mr-2 grid size-11 shrink-0 place-items-center rounded-full text-[#111111]/60">
                      <X size={18} aria-hidden="true" />
                    </button>
                  ) : null}
                </span>
                {l0.vuSurPhoto ? <span className="self-start rounded-full bg-[#FFE9D6] px-2.5 py-0.5 text-[13px] font-bold text-[#8A3D06]">Vu sur ta photo · à confirmer</span> : null}
                {l0.doublon ? <span className="self-start rounded-xl bg-[#FFE9D6] px-2.5 py-1 text-[13px] font-bold text-[#8A3D06]">Peut-être déjà dans ta liste : « {l0.doublon} ». Coche pour l&apos;ajouter quand même.</span> : null}
                {precisions.length ? (
                  <span className="flex items-center gap-2 text-[14px] text-[#111111]/75">
                    <Tag size={16} aria-hidden="true" className="shrink-0" />
                    {precisions.join(" · ")}
                  </span>
                ) : null}
                <span className="flex items-center gap-2 text-[15px] font-semibold">
                  <Package size={16} aria-hidden="true" className="shrink-0" />
                  {l.quantite ? `${nombreFr(l.quantite)}${l.unite ? ` ${l.unite}` : ""}` : <span className="text-[#B5560F]">Quantité à préciser</span>}
                </span>
                {l0.question && etat === "ouvert" && onRepondre ? (
                  <div role="group" aria-label={`Question de Mobiiz : ${l.libelle}`} className="mt-1 flex flex-col gap-2 rounded-2xl bg-[#111111]/5 p-3">
                    <p className="text-[15px] font-bold">{l0.question.texte}</p>
                    <div className="flex flex-wrap gap-2">
                      {l0.question.choix.map((x) => (
                        <button key={x} type="button" disabled={occupe} onClick={() => onRepondre(i, x)} className="pressable min-h-11 rounded-full border border-[#111111]/25 bg-white px-4 text-[15px] font-semibold">
                          {x}
                        </button>
                      ))}
                    </div>
                    <p className="text-[13px] text-[#111111]/70">Tu peux aussi l&apos;écrire ou le dicter en bas.</p>
                    <button type="button" onClick={() => onRepondre(i, null)} className="min-h-11 self-start px-1 text-[15px] font-semibold underline underline-offset-4">
                      Laisser « À préciser »
                    </button>
                  </div>
                ) : null}
                {i === enCours && c ? <QuestionArticle key={`${c.choixProduit}|${c.confirme}|${c.valeurs.join("|")}|${c.produits.length}`} c={c} ligne={l0} onCompris={(x) => onCompris(i, x)} /> : null}
              </li>
            );
          })}
        </ul>
        {etat === "ouvert" ? (
          <>
            <button type="button" disabled={occupe || lignes.every((l) => l.decochee)} onClick={onAjouter} className="pressable min-h-12 rounded-2xl text-[16px] font-extrabold disabled:opacity-60" style={{ backgroundColor: COULEURS_CHAT.jaune }}>
              {(() => {
                const n = lignes.filter((l) => !l.decochee).length;
                return n === 0 ? "Coche au moins une ligne" : n > 1 ? `Ajouter les ${n} à ma liste` : "Ajouter à ma liste";
              })()}
            </button>
            <button type="button" disabled={occupe} onClick={onCorriger} className="pressable min-h-12 rounded-2xl border-2 border-[#111111] text-[16px] font-bold">
              Corriger
            </button>
          </>
        ) : (
          <p className="text-[14px] font-semibold text-[#111111]/70">{etat === "ajoute" ? "Ajouté à ta liste." : "À corriger dans la case du bas."}</p>
        )}
      </section>
      {etat === "ouvert" && onMoiMeme ? (
        <button type="button" onClick={onMoiMeme} className="ml-10 flex min-h-11 items-center gap-2 self-start text-[15px] font-semibold" style={{ color: COULEURS_CHAT.jaune }}>
          <PencilLine size={18} aria-hidden="true" /> Ce n&apos;est pas ça : je l&apos;écris moi-même
        </button>
      ) : null}
    </div>
  );
}

/**
 * LA QUESTION DE L'ARTICLE (Greg, 8 novembre 2026) : « Tu veux dire 36 mètres linéaires de liteaux ? » (Oui / Non), puis
 * l'article exact s'il y en a plusieurs, puis chaque caractéristique utile (« Quelle section ? ») avec les valeurs du
 * catalogue, « Autre » (ses mots) et « Passer ». Rien n'est inventé ; « Ajouter à ma liste » reste la validation finale.
 */
function QuestionArticle({ c, ligne, onCompris }: { c: ArticleCompris; ligne: LigneDecrite; onCompris: (c: ArticleCompris | null) => void }) {
  const [autre, setAutre] = useState<string | null>(null);
  const etape = etapeSuivante(c, ligne.quantite, ligne.unite);
  if (!etape) return null;
  const puce = "pressable min-h-11 rounded-full border border-[#111111]/25 bg-white px-4 text-[15px] font-semibold";
  const lien = "min-h-11 px-2 text-[15px] font-semibold underline underline-offset-4";
  return (
    <div role="group" aria-label="Question de Mobiiz" className="mt-1 flex flex-col gap-2 rounded-2xl bg-[#111111]/5 p-3">
      {etape.type === "confirmer" ? (
        <>
          <p className="text-[16px] font-bold">{etape.phrase}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={`${puce} border-[#111111] bg-[#FED206]`} onClick={() => onCompris(confirmer(c))}>
              Oui
            </button>
            <button type="button" className={puce} onClick={() => onCompris(refuser(c))}>
              Non
            </button>
          </div>
        </>
      ) : etape.type === "produit" ? (
        <>
          <p className="text-[16px] font-bold">{etape.question}</p>
          <div className="flex flex-wrap gap-2">
            {etape.choix.map((x, j) => (
              <button key={x} type="button" className={puce} onClick={() => onCompris(choisirProduit(c, j))}>
                {x}
              </button>
            ))}
          </div>
          <button type="button" className={`${lien} self-start`} onClick={() => onCompris(null)}>
            Aucun : garder « {c.dit} »
          </button>
        </>
      ) : (
        <>
          <p className="text-[16px] font-bold">{etape.question}</p>
          <div className="flex flex-wrap gap-2">
            {etape.choix.map((x) => (
              <button key={x} type="button" className={puce} onClick={() => onCompris(choisirValeur(c, etape.index, x))}>
                {x}
              </button>
            ))}
            <button type="button" className={puce} onClick={() => setAutre("")}>
              Autre
            </button>
          </div>
          {autre !== null ? (
            <form
              className="flex gap-2"
              onSubmit={(ev) => {
                ev.preventDefault();
                if (autre.trim()) {
                  onCompris(choisirValeur(c, etape.index, autre));
                  setAutre(null);
                }
              }}
            >
              <input aria-label={etape.question} autoFocus value={autre} onChange={(ev) => setAutre(ev.target.value)} maxLength={80} className="min-h-11 min-w-0 flex-1 rounded-xl border border-[#111111]/25 bg-white px-3 text-[16px]" />
              <button type="submit" className={`${puce} border-[#111111]`}>
                OK
              </button>
            </form>
          ) : null}
          <button type="button" className={`${lien} self-start`} onClick={() => onCompris(choisirValeur(c, etape.index, ""))}>
            Passer : le négoce précisera
          </button>
        </>
      )}
    </div>
  );
}

/** « Ajouter » : photos (plusieurs), document ; les champs de fichier restent dans la page. */
function FeuilleAjouter({ liste, ids, onListe, onFermer }: { liste: boolean; ids: { photo: string; document: string }; onListe?: (() => void) | undefined; onFermer: () => void }) {
  const option = "pressable flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-[#111111]/10 px-4 text-[17px] font-bold active:bg-black/5";
  return (
    <div className="fixed top-0 left-0 z-[60] flex h-[100dvh] w-full items-end justify-center bg-black/50 lg:items-center" onClick={onFermer}>
      <div role="dialog" aria-modal="true" aria-label="Ajouter" onClick={(e) => e.stopPropagation()} className="flex w-full max-w-md flex-col gap-2 rounded-t-[28px] bg-surface p-4 pb-[max(env(safe-area-inset-bottom),16px)] text-[#111111] lg:rounded-[28px]">
        <span className="mx-auto mb-1 h-1.5 w-12 rounded-full bg-[#111111]/80" aria-hidden="true" />
        <div className="flex items-center justify-between">
          <h2 className="text-[22px] font-extrabold">Ajouter</h2>
          <button type="button" onClick={onFermer} aria-label="Fermer" className="grid size-10 place-items-center rounded-full">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {liste ? (
          <>
            <p className="text-[14px] text-[#111111]/70">Un document ou des photos ouvrent une nouvelle liste. Pour compléter celle-ci, écris ou dicte dans la conversation.</p>
            {onListe ? (
              <button type="button" onClick={onListe} className={option}>
                <ClipboardList size={22} aria-hidden="true" /> <span className="flex-1 text-left">Voir ma liste</span> <ChevronRight size={20} aria-hidden="true" />
              </button>
            ) : null}
          </>
        ) : (
          <>
            <label htmlFor={ids.photo} className={option} onClick={() => setTimeout(onFermer, 0)}>
              <Camera size={22} aria-hidden="true" /> <span className="flex-1">Prendre une photo</span> <ChevronRight size={20} aria-hidden="true" />
            </label>
            <label htmlFor={ids.document} className={option} onClick={() => setTimeout(onFermer, 0)}>
              <FileText size={22} aria-hidden="true" /> <span className="flex-1">Choisir un document</span> <ChevronRight size={20} aria-hidden="true" />
            </label>
            {/* Le catalogue n'est plus ici (Greg, 13 novembre 2026, « cœur métier » : « ne duplique pas le catalogue dans
                l'assistant […] le bouton doit rester dans le parcours manuel prévu ») : il s'ouvre par « Je saisis ma liste ». */}
            {/* Photos et documents sont lus par l'IA : la phrase, le compteur et « Comment fonctionne l'analyse ? ». */}
            <InfoAnalyse />
          </>
        )}
        <p className="pt-1 text-center text-[14px] text-[#111111]/75">Tu peux aussi écrire directement dans la conversation.</p>
      </div>
    </div>
  );
}

/** Avant de consommer une analyse (Greg, 1er novembre 2026) : le type reconnu et son coût ; « Annuler » ne décompte rien. */
function ConfirmerAnalyse({ nature, nombre, onChanger, onAnnuler, onAnalyser }: { nature: "devis" | "liste"; nombre: number; onChanger: () => void; onAnnuler: () => void; onAnalyser: () => void }) {
  const devis = nature === "devis";
  return (
    <div className="fixed top-0 left-0 z-[60] flex h-[100dvh] w-full items-end justify-center bg-black/50 p-4 lg:items-center" onClick={onAnnuler}>
      <div role="alertdialog" aria-modal="true" aria-label="Analyser ce document ?" onClick={(e) => e.stopPropagation()} className="flex w-full max-w-md flex-col gap-3 rounded-3xl bg-[#FBF8F3] p-5 pb-[max(env(safe-area-inset-bottom),20px)] text-[#111111]">
        <h2 className="text-[18px] font-extrabold">{nombre > 1 ? `Analyser ces ${nombre} photos ?` : "Analyser ce document ?"}</h2>
        <p className="text-[16px] leading-snug">
          {devis
            ? `${nombre > 1 ? "Ces photos semblent être un devis" : "Ce document semble être un devis"}. Son analyse utilisera 1 analyse de devis.`
            : `${nombre > 1 ? "Ces photos semblent être une liste" : "Ce document semble être une liste"}. Son analyse utilisera 1 analyse de photo ou de liste.`}
        </p>
        <button type="button" onClick={onChanger} className="min-h-10 self-start text-[14px] font-semibold underline underline-offset-4">
          {devis ? "C'est une liste ? L'analyser comme une liste" : "C'est un devis ? L'analyser comme un devis"}
        </button>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <button type="button" onClick={onAnnuler} className="pressable min-h-12 rounded-xl border border-[#111111]/20 px-3 text-[15px] font-semibold">
            Annuler
          </button>
          <button type="button" onClick={onAnalyser} className="pressable min-h-12 rounded-xl px-3 text-[15px] font-bold" style={{ backgroundColor: COULEURS_CHAT.jaune }}>
            Analyser le document
          </button>
        </div>
      </div>
    </div>
  );
}
