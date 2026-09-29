"use client";

import { AlertCircle, ArrowLeft, Loader2, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { countryName, formatPrice } from "@/lib/format";
import { shippingPrice } from "@/lib/pricing";
import { addressErrors, emailSchema } from "@/lib/validation";
import { Img } from "../ui/img";
import { cart } from "./cart-store";
import { useCartDetails } from "./use-cart-details";

interface Method {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  freeOverCents: number | null;
  countries: string[];
  requiresAddress: boolean;
  estimate: string;
}

interface Fields {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  shippingMethodId: string;
  line1: string;
  line2: string;
  postalCode: string;
  city: string;
}

const FORM_KEY = "boheme-commande-v1";
const PENDING_KEY = "boheme-paiement-en-cours";
const EMPTY: Fields = { email: "", firstName: "", lastName: "", phone: "", country: "FR", shippingMethodId: "", line1: "", line2: "", postalCode: "", city: "" };

function Field({
  id,
  label,
  error,
  hint,
  optional,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label} {optional ? <span className="font-normal text-text-2">(facultatif)</span> : <span aria-hidden="true" className="text-error">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

export function CheckoutForm({ methods, vatMention, ordersOpen, closedMessage }: { methods: Method[]; vatMention: string | null; ordersOpen: boolean; closedMessage: string }) {
  const { lines, state, retry } = useCartDetails();
  const [releasing, setReleasing] = useState(false);
  const params = useSearchParams();
  const router = useRouter();
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const idempotencyKey = useRef<string>("");
  const formRef = useRef<HTMLFormElement>(null);

  // Données conservées pendant la visite (retour depuis la page de paiement, rafraîchissement).
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    try {
      const saved = JSON.parse(sessionStorage.getItem(FORM_KEY) ?? "null");
      if (saved && typeof saved === "object") setFields((f) => ({ ...f, ...saved }));
    } catch {
      /* rien à restaurer */
    }
    restored.current = true;
  }, []);
  // Sauvegarde à chaque saisie (jamais au chargement : une saisie conservée n'est pas écrasée).
  const updateFields = (fn: (prev: Fields) => Fields) =>
    setFields((prev) => {
      const next = fn(prev);
      try {
        sessionStorage.setItem(FORM_KEY, JSON.stringify(next));
      } catch {
        /* navigation privée */
      }
      return next;
    });

  // Retour depuis Stripe sans payer : la réservation est libérée tout de suite.
  useEffect(() => {
    const token = sessionStorage.getItem(PENDING_KEY);
    if (params.get("retour") === "1" && token) {
      setMessage({ tone: "info", text: "Le paiement n'a pas été finalisé. Votre panier est intact : vous pouvez réessayer quand vous voulez." });
      setReleasing(true);
      fetch("/api/checkout/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })
        .then(() => sessionStorage.removeItem(PENDING_KEY))
        .catch(() => undefined)
        .finally(() => {
          // Le stock réservé vient d'être rendu : on relit les disponibilités.
          setReleasing(false);
          retry();
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une seule fois au retour du paiement
  }, [params]);

  const countries = useMemo(() => {
    const set = new Set(methods.flatMap((m) => m.countries));
    return [...set].sort((a, b) => (a === "FR" ? -1 : b === "FR" ? 1 : countryName(a).localeCompare(countryName(b), "fr")));
  }, [methods]);
  const available = methods.filter((m) => m.countries.includes(fields.country));
  const method = available.find((m) => m.id === fields.shippingMethodId) ?? (available.length === 1 ? available[0] : undefined);

  const rows =
    state.status === "ready"
      ? lines.map((l) => ({ line: l, product: state.products.get(l.productId) })).filter((r) => r.product && r.product.stock > 0)
      : [];
  const subtotal = rows.reduce((s, r) => s + r.product!.priceCents * Math.min(r.line.quantity, r.product!.stock), 0);
  const shipping = method ? shippingPrice({ priceCents: method.priceCents, freeOverCents: method.freeOverCents }, subtotal) : null;
  const total = subtotal + (shipping ?? 0);

  const set = (key: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.value;
    updateFields((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => k !== key)));
  };

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!emailSchema.safeParse(fields.email).success) e.email = "Adresse e-mail invalide (exemple : prenom@exemple.fr)";
    if (!fields.firstName.trim()) e.firstName = "Indiquez votre prénom";
    if (!fields.lastName.trim()) e.lastName = "Indiquez votre nom";
    if (fields.phone && !/^\+?[0-9 .()-]{6,25}$/.test(fields.phone)) e.phone = "Numéro de téléphone invalide";
    if (!method) e.shippingMethodId = "Choisissez un mode de livraison";
    if (method?.requiresAddress) Object.assign(e, addressErrors({ ...fields, line1: fields.line1.trim(), city: fields.city.trim(), postalCode: fields.postalCode.trim() }));
    return e;
  };

  const focusFirstError = (errs: Record<string, string>) => {
    const order = ["email", "firstName", "lastName", "phone", "country", "shippingMethodId", "line1", "postalCode", "city"];
    const first = order.find((k) => errs[k]);
    if (first) requestAnimationFrame(() => (formRef.current?.querySelector(`[name="${first}"]`) as HTMLElement | null)?.focus());
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setMessage(null);
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) {
      focusFirstError(errs);
      return;
    }
    if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();
    setSubmitting(true);
    try {
      const payload = {
        idempotencyKey: idempotencyKey.current,
        items: rows.map((r) => ({ productId: r.product!.id, quantity: Math.min(r.line.quantity, r.product!.stock) })),
        ...fields,
        shippingMethodId: method!.id,
        previousOrderToken: sessionStorage.getItem(PENDING_KEY) ?? undefined,
      };
      let res: Response | null = null;
      for (let attempt = 0; attempt < 4; attempt++) {
        res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (res.status !== 409) break;
        await new Promise((r) => setTimeout(r, 1200)); // commande en cours de création : on patiente
      }
      const data = await res!.json().catch(() => ({}));
      if (data.ok && typeof data.url === "string") {
        sessionStorage.setItem(PENDING_KEY, data.orderToken);
        // Page de paiement Stripe (site externe) : navigation complète.
        window.location.assign(data.url);
        return; // le bouton reste désactivé pendant la redirection
      }
      idempotencyKey.current = "";
      if (data.code === "already_paid" && data.orderToken) {
        router.push(`/commande/suivi/${data.orderToken}`);
        return;
      }
      if (data.code === "unavailable" && Array.isArray(data.unavailable)) {
        for (const u of data.unavailable as { productId: string; available: number }[]) cart.set(u.productId, u.available);
      }
      if (data.fieldErrors) {
        setErrors(data.fieldErrors);
        focusFirstError(data.fieldErrors);
      }
      setMessage({ tone: "error", text: data.message || data.error || "Une erreur est survenue. Merci de réessayer." });
      setSubmitting(false);
    } catch {
      setMessage({ tone: "error", text: "Connexion impossible. Vérifiez votre réseau puis réessayez : rien n'a été débité." });
      setSubmitting(false);
    }
  };

  if (state.status === "ready" && rows.length === 0 && !releasing && lines.length === 0) {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="text-4xl">Votre panier est vide</h1>
        <Link href="/boutique" className="btn btn-primary mt-6">
          Découvrir les créations
        </Link>
      </div>
    );
  }

  const input = (key: keyof Fields, props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      id={key}
      name={key}
      className="input"
      value={fields[key]}
      onChange={set(key)}
      aria-invalid={errors[key] ? true : undefined}
      aria-describedby={errors[key] ? `${key}-error` : undefined}
      {...props}
    />
  );

  return (
    <div className="container-page pt-6 pb-16 sm:pt-10">
      <Link href="/panier" className="inline-flex items-center gap-2 text-sm font-medium text-primary">
        <ArrowLeft size={16} aria-hidden="true" /> Retour au panier
      </Link>
      <h1 className="mt-3 text-4xl sm:text-5xl">Commande</h1>

      {message && (
        <div role={message.tone === "error" ? "alert" : "status"} className={`mt-6 flex gap-3 rounded-2xl p-4 text-sm ${message.tone === "error" ? "bg-error-bg text-error" : "bg-info-bg text-info"}`}>
          <AlertCircle size={20} className="shrink-0" aria-hidden="true" />
          <p>{message.text}</p>
        </div>
      )}
      {!ordersOpen && <p className="mt-6 rounded-2xl bg-primary-light p-4 text-sm font-medium text-primary">{closedMessage || "Les commandes sont momentanément en pause."}</p>}

      <form ref={formRef} onSubmit={submit} noValidate className="mt-8 grid gap-10 lg:grid-cols-[1fr_400px] lg:gap-14">
        <div className="space-y-10">
          <fieldset className="space-y-4">
            <legend className="mb-4 font-serif text-2xl">1. Vos coordonnées</legend>
            <Field id="email" label="E-mail" error={errors.email} hint="Pour la confirmation et le suivi de votre commande.">
              {input("email", { type: "email", autoComplete: "email", inputMode: "email", autoCapitalize: "none", spellCheck: false, maxLength: 254, required: true })}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="firstName" label="Prénom" error={errors.firstName}>
                {input("firstName", { autoComplete: "given-name", maxLength: 80, required: true })}
              </Field>
              <Field id="lastName" label="Nom" error={errors.lastName}>
                {input("lastName", { autoComplete: "family-name", maxLength: 80, required: true })}
              </Field>
            </div>
            <Field id="phone" label="Téléphone" optional error={errors.phone} hint="Uniquement utile au transporteur ou pour un retrait en main propre.">
              {input("phone", { type: "tel", autoComplete: "tel", inputMode: "tel", maxLength: 30 })}
            </Field>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="mb-4 font-serif text-2xl">2. Livraison</legend>
            {methods.length === 0 ? (
              <p className="rounded-2xl bg-warning-bg p-4 text-sm text-warning">La livraison n&apos;est pas encore configurée. Merci de revenir un peu plus tard.</p>
            ) : (
              <>
                {countries.length > 1 && (
                  <Field id="country" label="Pays de livraison" error={errors.country}>
                    <select id="country" name="country" className="input" value={fields.country} onChange={set("country")} autoComplete="country">
                      {countries.map((c) => (
                        <option key={c} value={c}>
                          {countryName(c)}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                <div role="radiogroup" aria-label="Mode de livraison" aria-describedby={errors.shippingMethodId ? "shippingMethodId-error" : undefined} className="space-y-3">
                  {available.map((m) => {
                    const price = shippingPrice({ priceCents: m.priceCents, freeOverCents: m.freeOverCents }, subtotal);
                    const checked = method?.id === m.id;
                    return (
                      <label key={m.id} className={`card flex cursor-pointer items-start gap-3 p-4 transition ${checked ? "border-primary ring-2 ring-primary-light" : "hover:border-primary/50"}`}>
                        <input
                          type="radio"
                          name="shippingMethodId"
                          value={m.id}
                          checked={checked}
                          onChange={() => updateFields((f) => ({ ...f, shippingMethodId: m.id }))}
                          className="mt-1 h-5 w-5 accent-[var(--c-primary)]"
                        />
                        <span className="flex-1">
                          <span className="flex justify-between gap-3 font-medium">
                            {m.name} <span>{price === 0 ? "Offerte" : formatPrice(price)}</span>
                          </span>
                          {(m.description || m.estimate) && <span className="mt-0.5 block text-sm text-text-2">{[m.description, m.estimate].filter(Boolean).join(" · ")}</span>}
                        </span>
                      </label>
                    );
                  })}
                  {available.length === 0 && <p className="text-sm text-text-2">Aucun mode de livraison pour ce pays.</p>}
                  {errors.shippingMethodId && (
                    <p id="shippingMethodId-error" className="field-error">
                      {errors.shippingMethodId}
                    </p>
                  )}
                </div>

                {method?.requiresAddress && (
                  <div className="space-y-4 pt-2">
                    <Field id="line1" label="Adresse" error={errors.line1}>
                      {input("line1", { autoComplete: "address-line1", maxLength: 200, required: true })}
                    </Field>
                    <Field id="line2" label="Complément d'adresse" optional>
                      {input("line2", { autoComplete: "address-line2", maxLength: 200, placeholder: "Bâtiment, étage, lieu-dit…" })}
                    </Field>
                    <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4">
                      <Field id="postalCode" label="Code postal" error={errors.postalCode}>
                        {input("postalCode", { autoComplete: "postal-code", inputMode: fields.country === "FR" ? "numeric" : "text", maxLength: 12, required: true })}
                      </Field>
                      <Field id="city" label="Ville" error={errors.city}>
                        {input("city", { autoComplete: "address-level2", maxLength: 100, required: true })}
                      </Field>
                    </div>
                  </div>
                )}
              </>
            )}
          </fieldset>
        </div>

        <aside aria-label="Votre commande" className="lg:sticky lg:top-[calc(var(--header-h)+24px)] lg:self-start">
          <div className="card p-5 sm:p-6">
            <h2 className="font-serif text-2xl">3. Récapitulatif</h2>
            {state.status !== "ready" ? (
              <div className="mt-4 space-y-3" aria-busy="true">
                <div className="skeleton h-16" />
                <div className="skeleton h-16" />
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {rows.length === 0 && (
                  <li className="text-sm text-text-2">
                    {releasing ? "Mise à jour du panier…" : (
                      <>
                        Les créations de votre panier ne sont plus disponibles. <Link href="/panier" className="text-primary underline">Voir le panier</Link>
                      </>
                    )}
                  </li>
                )}
                {rows.map(({ line, product }) => (
                  <li key={product!.id} className="flex items-center gap-3">
                    <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-secondary">
                      <Img image={product!.image} alt="" sizes="64px" className="h-full w-full" />
                    </div>
                    <p className="min-w-0 flex-1 text-sm">
                      {product!.name}
                      {line.quantity > 1 && <span className="text-text-2"> × {Math.min(line.quantity, product!.stock)}</span>}
                    </p>
                    <p className="text-sm font-medium">{formatPrice(product!.priceCents * Math.min(line.quantity, product!.stock))}</p>
                  </li>
                ))}
              </ul>
            )}
            <dl className="mt-5 space-y-2 border-t border-border pt-4 text-[15px]">
              <div className="flex justify-between">
                <dt className="text-text-2">Sous-total</dt>
                <dd>{formatPrice(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-2">Livraison</dt>
                <dd>{shipping === null ? "—" : shipping === 0 ? "Offerte" : formatPrice(shipping)}</dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-border pt-3">
                <dt className="font-semibold">Total</dt>
                <dd className="text-xl font-semibold">{formatPrice(total)}</dd>
              </div>
            </dl>
            {vatMention && <p className="mt-1 text-right text-xs text-text-2">{vatMention}</p>}
            <button type="submit" className="btn btn-primary mt-5 min-h-[54px] w-full text-base" disabled={submitting || releasing || !ordersOpen || state.status !== "ready" || rows.length === 0 || methods.length === 0}>
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" aria-hidden="true" /> Redirection vers le paiement…
                </>
              ) : (
                <>
                  <Lock size={17} aria-hidden="true" /> Payer {formatPrice(total)}
                </>
              )}
            </button>
            <p className="mt-3 text-center text-xs leading-relaxed text-text-2">
              Paiement sécurisé par Stripe (carte bancaire, Apple Pay, Google Pay). En validant, vous acceptez nos{" "}
              <Link href="/cgv" target="_blank" className="underline">
                conditions générales de vente
              </Link>
              . Vos données servent uniquement à traiter votre commande (
              <Link href="/confidentialite" target="_blank" className="underline">
                confidentialité
              </Link>
              ).
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}
