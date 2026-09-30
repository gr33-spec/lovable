"use client";

import { Check, Hand, Heart, Loader2, Package, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { formatPrice } from "@/lib/format";

// Bouton « Je réserve ce bijou » et son petit formulaire (prénom, téléphone,
// e-mail facultatif, main propre ou envoi). Aucun compte, aucun paiement :
// la créatrice recontacte la cliente. Sur téléphone, le formulaire s'ouvre
// en bas de l'écran et une barre fixe garde le bouton à portée de pouce.

type Delivery = "hand" | "post";
type Errors = Partial<Record<"firstName" | "phone" | "email" | "delivery" | "_form", string>>;

export function ReserveButton({
  productId,
  name,
  priceCents,
  availability,
  ordersOpen,
  shopName,
}: {
  productId: string;
  name: string;
  priceCents: number;
  availability: "in_stock" | "low_stock" | "reserved" | "sold_out";
  ordersOpen: boolean;
  shopName: string;
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const mainButton = useRef<HTMLDivElement>(null);
  const [showBar, setShowBar] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const key = useRef<string | null>(null);

  useEffect(() => {
    const el = mainButton.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const obs = new IntersectionObserver(([entry]) => setShowBar(!entry.isIntersecting && entry.boundingClientRect.top < 0), { threshold: 0 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Pièce indisponible : message à la place du bouton. La fenêtre de réservation reste
  // montée, pour qu'une cliente devancée d'une seconde lise l'explication au lieu de la voir disparaître.
  const blocked = done ? null : availability === "reserved" ? (
    <div className="rounded-2xl bg-primary-soft p-4 text-primary" role="status">
      <p className="font-semibold">Réservé – en attente de confirmation</p>
      <p className="mt-1 text-sm">Ce bijou vient d&apos;être réservé. Il sera peut-être de nouveau disponible prochainement : d&apos;autres modèles vous attendent dans la boutique.</p>
    </div>
  ) : availability === "sold_out" ? (
    <div className="rounded-2xl bg-soldout-bg p-4 text-soldout" role="status">
      <p className="font-semibold">Cette création n&apos;est plus disponible.</p>
      <p className="mt-1 text-sm">Chaque pièce est faite main : d&apos;autres modèles vous attendent dans la boutique.</p>
    </div>
  ) : !ordersOpen ? (
    <p className="rounded-2xl bg-primary-light p-4 text-sm font-medium text-primary" role="status">
      Les réservations sont momentanément en pause.
    </p>
  ) : null;

  const open = () => {
    key.current ??= crypto.randomUUID();
    setErrors({});
    dialog.current?.showModal();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    const local: Errors = {};
    if (!firstName.trim()) local.firstName = "Indiquez votre prénom";
    if (phone.replace(/\D/g, "").length < 8) local.phone = "Indiquez un numéro de téléphone valide";
    if (!delivery) local.delivery = "Choisissez la remise en main propre ou l'envoi";
    if (Object.keys(local).length) return setErrors(local);
    setSending(true);
    setErrors({});
    try {
      const res = await fetch("/api/reservation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotencyKey: key.current, productId, firstName, phone, email: email.trim(), delivery }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; fieldErrors?: Errors };
      if (data.ok) {
        setDone(true);
        router.refresh();
      } else {
        setErrors({ ...(data.fieldErrors ?? {}), _form: data.message || "La réservation n'a pas pu être enregistrée. Réessayez dans un instant." });
        if (res.status === 409) router.refresh();
      }
    } catch {
      setErrors({ _form: "Connexion impossible. Vérifiez votre réseau puis réessayez." });
    } finally {
      setSending(false);
    }
  };

  const field = "input min-h-[52px] text-base";
  const choice = (value: Delivery, label: string, hint: string, Icon: typeof Hand) => (
    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-[1.5px] border-border bg-surface p-3.5 transition has-[:checked]:border-primary has-[:checked]:bg-primary-soft">
      <input type="radio" name="delivery" value={value} checked={delivery === value} onChange={() => setDelivery(value)} className="sr-only" />
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 text-primary">
        <Icon size={19} strokeWidth={1.6} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{label}</span>
        <span className="block text-[13px] text-text-2">{hint}</span>
      </span>
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${delivery === value ? "border-primary bg-primary text-on-primary" : "border-border-strong"}`} aria-hidden="true">
        {delivery === value && <Check size={14} strokeWidth={3} />}
      </span>
    </label>
  );

  return (
    <>
      <div ref={mainButton}>
        {blocked ?? (done ? (
          <SuccessMessage shopName={shopName} />
        ) : (
          <>
            <button type="button" className="btn btn-primary min-h-[56px] w-full text-base" onClick={open}>
              <Heart size={18} aria-hidden="true" /> Je réserve ce bijou
            </button>
            <p className="mt-2.5 text-center text-sm text-text-2">Sans compte et sans paiement en ligne : nous vous recontactons.</p>
          </>
        ))}
      </div>

      <dialog
        ref={dialog}
        aria-labelledby="titre-reservation"
        className="mx-auto mt-auto mb-0 max-h-[92dvh] w-full max-w-lg rounded-t-[28px] bg-surface p-0 text-text shadow-lift sm:my-auto sm:rounded-[28px]"
        onClick={(e) => e.target === dialog.current && !sending && dialog.current?.close()}
      >
        <div className="relative px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-7 sm:pt-7">
          <button type="button" className="btn btn-ghost btn-icon absolute top-3 right-3" aria-label="Fermer" onClick={() => dialog.current?.close()}>
            <X size={20} />
          </button>
          {done ? (
            <div className="pt-9">
              <SuccessMessage shopName={shopName} />
              <button type="button" className="btn btn-primary mt-5 w-full" onClick={() => dialog.current?.close()}>
                Fermer
              </button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <p className="eyebrow">Réservation</p>
              <h2 id="titre-reservation" className="mt-1 pr-10 text-[1.7rem] leading-tight">
                {name}
              </h2>
              <p className="mt-1 text-sm text-text-2">{formatPrice(priceCents)} · réglé directement avec la créatrice</p>

              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="field-label">Prénom</span>
                  <input
                    className={field}
                    name="given-name"
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    maxLength={80}
                    aria-invalid={Boolean(errors.firstName)}
                    aria-describedby={errors.firstName ? "err-prenom" : undefined}
                  />
                  {errors.firstName && (
                    <span id="err-prenom" className="mt-1 block text-sm text-error">
                      {errors.firstName}
                    </span>
                  )}
                </label>
                <label className="block">
                  <span className="field-label">Numéro de téléphone</span>
                  <input
                    className={field}
                    type="tel"
                    inputMode="tel"
                    name="tel"
                    autoComplete="tel"
                    placeholder="06 12 34 56 78"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={30}
                    aria-invalid={Boolean(errors.phone)}
                    aria-describedby={errors.phone ? "err-tel" : undefined}
                  />
                  {errors.phone && (
                    <span id="err-tel" className="mt-1 block text-sm text-error">
                      {errors.phone}
                    </span>
                  )}
                </label>
                <label className="block">
                  <span className="field-label">
                    Adresse e-mail <span className="font-normal text-text-2">(facultatif)</span>
                  </span>
                  <input
                    className={field}
                    type="email"
                    inputMode="email"
                    name="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={254}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? "err-email" : undefined}
                  />
                  {errors.email && (
                    <span id="err-email" className="mt-1 block text-sm text-error">
                      {errors.email}
                    </span>
                  )}
                </label>
                <fieldset>
                  <legend className="field-label">Comment souhaitez-vous le recevoir ?</legend>
                  <div className="grid gap-2">
                    {choice("hand", "Remise en main propre", "Nous convenons ensemble d'un rendez-vous", Hand)}
                    {choice("post", "Envoi postal", "Frais de port selon le poids, vus ensemble", Package)}
                  </div>
                  {errors.delivery && <span className="mt-1 block text-sm text-error">{errors.delivery}</span>}
                </fieldset>
              </div>

              {errors._form && (
                <p role="alert" className="mt-4 rounded-xl bg-error-bg p-3 text-sm text-error">
                  {errors._form}
                </p>
              )}

              <button type="submit" className="btn btn-primary mt-5 min-h-[56px] w-full text-base" disabled={sending}>
                {sending ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Check size={18} aria-hidden="true" />}
                Confirmer ma réservation
              </button>
              <p className="mt-3 text-center text-xs text-text-2">
                Aucun paiement n&apos;est demandé sur le site. Vos coordonnées servent uniquement à vous recontacter pour cette réservation (
                <Link href="/confidentialite" className="underline">
                  confidentialité
                </Link>
                ).
              </p>
            </form>
          )}
        </div>
      </dialog>

      {/* Barre fixe sur mobile quand le bouton principal n'est plus visible. */}
      {!done && !blocked && (
        <div
          className={`fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur transition-transform duration-300 md:hidden ${
            showBar ? "translate-y-0" : "translate-y-full"
          }`}
          aria-hidden={!showBar}
        >
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{name}</p>
              <p className="text-sm font-semibold">{formatPrice(priceCents)}</p>
            </div>
            <button type="button" className="btn btn-primary" onClick={open} tabIndex={showBar ? 0 : -1}>
              Je réserve
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function SuccessMessage({ shopName }: { shopName: string }) {
  return (
    <div className="rounded-2xl bg-primary-soft p-5" role="status">
      <p className="flex items-center gap-2 font-semibold text-primary">
        <Check size={20} aria-hidden="true" /> Réservation enregistrée
      </p>
      <p className="mt-2 text-[15px]">
        Votre demande de réservation a bien été enregistrée. {shopName} vous contactera rapidement pour confirmer votre réservation et organiser la remise en main
        propre ou l&apos;envoi. Aucun paiement n&apos;est demandé sur le site.
      </p>
    </div>
  );
}
