"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, MailCheck } from "lucide-react";
import { CarteFrance } from "@/components/onboarding/carte-france";
import { Turnstile, TURNSTILE_ACTIF } from "@/components/turnstile";
import { Button, ErrorNotice, Field } from "@/components/ui";
import { api, ApiError, newActionKey, setActiveCompanyId } from "@/lib/api";
import { VERSION_CGU } from "@/lib/legal";
import { METIERS_INSCRIPTION, type MetierInscription } from "@/lib/metiers-inscription";
import { choisirDepartement as retenirDepartement } from "@/lib/regions/departement-choisi";
import { PHRASE_METIER_EN_RODAGE } from "../../../../../../packages/domain/src/inscription/essai";
import { portableValide } from "../../../../../../packages/domain/src/groupe/identite-artisan";

/**
 * LE NOUVEL ONBOARDING, « ESSAIE D'ABORD » (Greg, 19 novembre 2026 ; RÈGLE CHANGÉE : avant, « Commencer » menait à un
 * formulaire nom, entreprise, métier, e-mail, mot de passe) :
 *   1. la carte de France : il touche sa région, puis son département (zoom animé, retour à la France possible) ;
 *   2. son métier, « Couvreur » en premier ; un autre métier entre aussi, avec le message « en rodage » ;
 *   3. juste avant le premier essai : e-mail et portable, rien d'autre (les CGU à cocher et l'anti-robot restent) ;
 *   4. l'e-mail à vérifier, comme avant (il protège les analyses), puis le nouveau quantitatif.
 * Le SIRET n'est demandé qu'au moment d'envoyer aux négoces, de grouper ou de commander. Le compte n'a pas de mot de
 * passe choisi : un mot de passe aléatoire, jamais montré, et « Mot de passe oublié » pour se reconnecter ailleurs.
 * L'ancienne inscription (`/inscription`) reste en place, plus liée depuis la landing.
 */
type Etape = "carte" | "metier" | "compte" | "email";
const ETAPES: readonly Etape[] = ["carte", "metier", "compte"];
const APRES_VERIFICATION = "/chantiers/nouveau";

function motDePasseAleatoire(): string {
  const octets = new Uint8Array(24);
  crypto.getRandomValues(octets);
  return `Mz-${Array.from(octets, (o) => o.toString(16).padStart(2, "0")).join("")}`;
}

export default function Commencer() {
  const router = useRouter();
  const [etape, setEtape] = useState<Etape>("carte");
  const [departement, setDepartement] = useState<{ code: string; nom: string } | null>(null);
  const [metier, setMetier] = useState<string>(METIERS_INSCRIPTION[0]!.id);
  const [email, setEmail] = useState("");

  // Déjà connecté : l'app directement.
  useEffect(() => {
    const c = new AbortController();
    api<{ companies: unknown[] }>("/v1/me", { signal: c.signal }).then(
      (me) => {
        if (me.companies.length) router.replace("/");
      },
      () => undefined,
    );
    return () => c.abort();
  }, [router]);

  // Chaque étape remonte en haut de l'écran.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [etape]);

  const numero = ETAPES.indexOf(etape);
  const choisi = METIERS_INSCRIPTION.find((m) => m.id === metier)!;
  return (
    <>
      {numero >= 0 ? (
        <div className="flex items-center gap-3">
          {numero > 0 ? (
            <button type="button" onClick={() => setEtape(ETAPES[numero - 1]!)} className="pressable inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line px-4 text-[14px] font-semibold">
              <ArrowLeft size={16} aria-hidden="true" /> Retour
            </button>
          ) : null}
          <p className="text-[13px] font-semibold tracking-wide text-muted uppercase" aria-live="polite">
            Étape {numero + 1} sur 3
          </p>
        </div>
      ) : null}

      {etape === "carte" ? (
        <section className="flex flex-col gap-4" aria-labelledby="t-carte">
          <h1 id="t-carte" className="text-[30px] leading-tight font-extrabold tracking-tight">
            On commence par chez toi.
          </h1>
          <CarteFrance
            departement={departement?.code ?? null}
            onDepartement={(code, nom) => {
              setDepartement({ code, nom });
              retenirDepartement(code);
            }}
          />
          {departement ? (
            <div className="mzo-barre">
              <p className="flex items-center gap-2 text-[16px] font-bold">
                <span className="mzo-coche" aria-hidden="true">
                  <Check size={14} strokeWidth={3} />
                </span>
                {departement.nom} ({departement.code})
              </p>
              <Button onClick={() => setEtape("metier")}>Continuer</Button>
            </div>
          ) : null}
        </section>
      ) : null}

      {etape === "metier" ? <EtapeMetier metier={metier} onMetier={setMetier} onContinuer={() => setEtape("compte")} choisi={choisi} /> : null}

      {etape === "compte" && departement ? (
        <EtapeCompte
          departement={departement.code}
          metier={metier}
          onFait={(e) => {
            setEmail(e);
            setEtape("email");
          }}
        />
      ) : null}

      {etape === "email" ? <EtapeEmail email={email} /> : null}
    </>
  );
}

function EtapeMetier({ metier, onMetier, onContinuer, choisi }: { metier: string; onMetier: (id: string) => void; onContinuer: () => void; choisi: MetierInscription }) {
  const [tous, setTous] = useState(false);
  const [premier, ...autres] = METIERS_INSCRIPTION;
  const montres = tous ? autres : autres.filter((m, i) => i < 9 || m.id === metier);
  return (
    <section className="flex flex-col gap-4" aria-labelledby="t-metier">
      <h1 id="t-metier" className="text-[30px] leading-tight font-extrabold tracking-tight">
        Ton métier ?
      </h1>
      <button
        type="button"
        aria-pressed={metier === premier!.id}
        onClick={() => onMetier(premier!.id)}
        className={`pressable flex min-h-16 items-center gap-3 rounded-2xl border px-4 py-3 text-left ${metier === premier!.id ? "mzo-choisi" : "border-line bg-surface text-ink"}`}
      >
        <span className="grid size-7 shrink-0 place-items-center rounded-full border border-current" aria-hidden="true">
          {metier === premier!.id ? <Check size={16} strokeWidth={3} /> : null}
        </span>
        <span className="flex flex-col">
          <span className="text-[18px] font-extrabold">{premier!.nom}</span>
          <span className="text-[13px] opacity-75">{premier!.detail}</span>
        </span>
      </button>
      <p className="text-[13px] font-semibold text-muted">Ou un autre métier :</p>
      <div className="flex flex-wrap gap-2">
        {montres.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={metier === m.id}
            onClick={() => onMetier(m.id)}
            className={`pressable inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-[15px] font-semibold ${metier === m.id ? "mzo-choisi" : "border-line bg-surface text-ink"}`}
          >
            {metier === m.id ? <Check size={15} strokeWidth={3} aria-hidden="true" /> : null}
            {m.nom}
          </button>
        ))}
        {!tous && autres.length > montres.length ? (
          <button type="button" onClick={() => setTous(true)} className="pressable inline-flex min-h-11 items-center rounded-full border border-dashed border-line px-4 text-[15px] font-semibold text-accent-text">
            Voir les {autres.length - montres.length} autres
          </button>
        ) : null}
      </div>
      {!choisi.ouvert ? (
        <p role="status" className="mzo-rodage">
          {PHRASE_METIER_EN_RODAGE}
        </p>
      ) : null}
      <div className="mzo-barre">
        <p className="text-[16px] font-bold">{choisi.nom}</p>
        <Button onClick={onContinuer}>Continuer</Button>
      </div>
    </section>
  );
}

function EtapeCompte({ departement, metier, onFait }: { departement: string; metier: string; onFait: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [cgu, setCgu] = useState(false);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [erreur, setErreur] = useState<ApiError | null>(null);
  const [faute, setFaute] = useState<"email" | "portable" | null>(null);
  const motDePasse = useRef<string | null>(null);
  const compteCree = useRef(false);
  const cle = useRef(newActionKey());

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setFaute("email");
    if (!portableValide(telephone)) return setFaute("portable");
    setFaute(null);
    setPending(true);
    try {
      if (!compteCree.current) {
        motDePasse.current ??= motDePasseAleatoire();
        await api("/v1/auth/sign-up/email", { method: "POST", body: { name: "", email: email.trim(), password: motDePasse.current, callbackURL: APRES_VERIFICATION }, captcha });
        compteCree.current = true;
      }
      const c = await api<{ id: string }>("/v1/companies", { method: "POST", body: { name: "Mon entreprise", trades: [metier], departement, telephone: telephone.trim(), parcours: "essai" }, idempotencyKey: cle.current });
      setActiveCompanyId(c.id);
      await api("/v1/me/cgu", { method: "POST", body: { version: VERSION_CGU } });
      // Le premier essai d'abord : le guide ne s'ouvre pas par-dessus (il reste dans le menu, « Revoir le guide »).
      await api("/v1/me/guide/vu", { method: "POST" }).catch(() => undefined);
      onFait(email.trim());
    } catch (x) {
      setErreur(x instanceof ApiError ? x : new ApiError("internal_error", 500));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="flex flex-col gap-4" aria-labelledby="t-compte">
      <h1 id="t-compte" className="text-[30px] leading-tight font-extrabold tracking-tight">
        Et on essaie.
      </h1>
      <p className="text-[16px] leading-relaxed text-muted">Ton e-mail et ton portable, rien d&apos;autre. Ton SIRET ne te sera demandé qu&apos;au moment d&apos;envoyer une liste à tes négoces.</p>
      <form onSubmit={(e) => void envoyer(e)} className="flex flex-col gap-4" noValidate>
        {erreur ? <ErrorNotice error={erreur} /> : null}
        {erreur?.code === "USER_ALREADY_EXISTS" || erreur?.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" ? (
          <Link href="/connexion" className="font-semibold text-accent-text underline">
            Me connecter
          </Link>
        ) : null}
        <Field
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          label="Ton e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={faute === "email" ? "Vérifie ton adresse e-mail." : undefined}
          hint="Pour te connecter. On t'envoie un lien pour le vérifier."
        />
        <Field
          id="portable"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          label="Ton portable"
          placeholder="06 12 34 56 78"
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
          error={faute === "portable" ? "Il me faut un portable (06 ou 07)." : undefined}
          hint="Pour que tes négoces puissent t'appeler. Jamais donné à un autre artisan."
        />
        <label className="flex cursor-pointer items-start gap-3 text-[15px] leading-snug">
          <input type="checkbox" checked={cgu} onChange={(e) => setCgu(e.target.checked)} className="mt-0.5 size-5 shrink-0 rounded accent-accent" />
          <span>
            J&apos;accepte les{" "}
            <Link href="/cgu" className="font-semibold text-accent-text underline">
              conditions générales d&apos;utilisation
            </Link>{" "}
            et la{" "}
            <Link href="/confidentialite" className="font-semibold text-accent-text underline">
              politique de confidentialité
            </Link>
            .
          </span>
        </label>
        <Turnstile onToken={setCaptcha} />
        <Button type="submit" pending={pending} disabled={!cgu || (TURNSTILE_ACTIF && !captcha)}>
          Essayer Mobiiz
        </Button>
        <p className="text-center text-[15px]">
          Déjà un compte ?{" "}
          <Link href="/connexion" className="font-semibold text-accent-text">
            Se connecter
          </Link>
        </p>
      </form>
    </section>
  );
}

/** L'e-mail à vérifier : le lien ouvre le nouveau quantitatif ; cet écran suit tout seul quand c'est fait. */
function EtapeEmail({ email }: { email: string }) {
  const router = useRouter();
  const [renvoye, setRenvoye] = useState(false);
  useEffect(() => {
    let fini = false;
    const regarder = async () => {
      const me = await api<{ user: { emailVerified: boolean } }>("/v1/me").catch(() => null);
      if (!fini && me?.user.emailVerified) router.replace(APRES_VERIFICATION);
    };
    const id = window.setInterval(() => void regarder(), 3000);
    return () => {
      fini = true;
      window.clearInterval(id);
    };
  }, [router]);
  async function renvoyer() {
    await api("/v1/auth/send-verification-email", { method: "POST", body: { email, callbackURL: APRES_VERIFICATION } }).catch(() => undefined);
    setRenvoye(true);
  }
  return (
    <section className="flex flex-col gap-4" aria-labelledby="t-email">
      <span className="mzo-coche mzo-coche-grande" aria-hidden="true">
        <MailCheck size={26} />
      </span>
      <h1 id="t-email" className="text-[30px] leading-tight font-extrabold tracking-tight">
        Vérifie ton e-mail.
      </h1>
      <p className="text-[16px] leading-relaxed">
        On vient d&apos;envoyer un lien à <strong className="break-all">{email}</strong>. Ouvre-le : tu arrives directement sur ton premier quantitatif, prêt à déposer ton devis, une photo ou ta liste.
      </p>
      <p className="text-[15px] text-muted">La vérification protège tes analyses de devis. Tu peux déjà saisir une liste à la main en attendant.</p>
      <Button variant="secondary" onClick={() => router.replace(APRES_VERIFICATION)}>
        Commencer sans attendre
      </Button>
      <button type="button" onClick={() => void renvoyer()} disabled={renvoye} className="min-h-11 self-start text-[15px] font-semibold text-accent-text underline disabled:no-underline disabled:opacity-70">
        {renvoye ? "Lien renvoyé." : "Je n'ai rien reçu : renvoyer le lien"}
      </button>
      <p className="text-[13px] text-muted">Pour te reconnecter sur un autre appareil : « Mot de passe oublié » sur la page de connexion t&apos;envoie un lien.</p>
    </section>
  );
}
