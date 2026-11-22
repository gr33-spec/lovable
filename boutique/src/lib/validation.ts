import { z } from "zod";
import { COLOR_IDS, MAX_CART_LINES, MAX_QUANTITY_PER_LINE, SOCIAL_NETWORKS } from "./shared";

// Compatibilité : ces constantes vivent dans ./shared (sans zod).
export { MAX_QUANTITY_PER_LINE, MAX_CART_LINES, PRODUCT_COLORS, COLOR_IDS, DELIVERY_LABELS, SOCIAL_NETWORKS, SOCIAL_LABELS, whatsappUrl } from "./shared";
export type { SocialNetwork } from "./shared";

// Schémas de validation partagés. Le navigateur les utilise pour guider la
// saisie ; le serveur les applique TOUJOURS à nouveau (seule barrière fiable).

const trimmed = (max: number) => z.string().trim().max(max, `${max} caractères maximum`);
const required = (max: number, message = "Ce champ est obligatoire") => trimmed(max).min(1, message);

/** Retire les caractères de contrôle (hors retours à la ligne) d'un texte libre. */
export function cleanText(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/\r\n?/g, "\n");
}

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Adresse e-mail trop longue")
  .regex(/^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]{2,}$/, "Adresse e-mail invalide (exemple : prenom@exemple.fr)");


export const cartItemsSchema = z
  .array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_LINE),
    }),
  )
  .min(1, "Votre panier est vide")
  .max(MAX_CART_LINES)
  .refine((items) => new Set(items.map((i) => i.productId)).size === items.length, "Produit en double dans le panier");

const postalRules: Record<string, RegExp> = {
  FR: /^\d{5}$/,
  MC: /^980\d{2}$/,
  BE: /^\d{4}$/,
  LU: /^(L-)?\d{4}$/i,
  CH: /^\d{4}$/,
  DE: /^\d{5}$/,
  ES: /^\d{5}$/,
  IT: /^\d{5}$/,
  NL: /^\d{4}\s?[A-Za-z]{2}$/,
  PT: /^\d{4}-\d{3}$/,
};

export const checkoutSchema = z
  .object({
    idempotencyKey: z.string().uuid(),
    items: cartItemsSchema,
    email: emailSchema,
    firstName: required(80, "Indiquez votre prénom"),
    lastName: required(80, "Indiquez votre nom"),
    phone: z
      .string()
      .trim()
      .max(30)
      .refine((v) => v === "" || /^\+?[0-9 .()-]{6,25}$/.test(v), "Numéro de téléphone invalide")
      .optional()
      .default(""),
    shippingMethodId: z.string().uuid("Choisissez un mode de livraison"),
    country: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Choisissez un pays"),
    line1: trimmed(200).optional().default(""),
    line2: trimmed(200).optional().default(""),
    postalCode: trimmed(20).optional().default(""),
    city: trimmed(100).optional().default(""),
    previousOrderToken: z.string().max(100).optional(),
  })
  .strict();

export type CheckoutInput = z.infer<typeof checkoutSchema>;

/** Téléphone obligatoire pour une réservation : 8 à 15 chiffres. */
export const phoneSchema = z
  .string()
  .trim()
  .max(30, "Numéro de téléphone trop long")
  .refine((v) => /^\+?[0-9 .()-]{6,25}$/.test(v) && /^\d{8,15}$/.test(v.replace(/\D/g, "")), "Numéro de téléphone invalide (exemple : 06 12 34 56 78)");


export const reservationSchema = z
  .object({
    idempotencyKey: z.string().uuid(),
    productId: z.string().uuid(),
    firstName: required(80, "Indiquez votre prénom"),
    phone: phoneSchema,
    email: z.union([z.literal(""), emailSchema]).optional().default(""),
    delivery: z.enum(["hand", "post"], { message: "Choisissez la remise en main propre ou l'envoi" }),
  })
  .strict();

export type ReservationInput = z.infer<typeof reservationSchema>;

/** Contrôle de l'adresse, seulement si le mode de livraison en exige une. */
export function addressErrors(input: Pick<CheckoutInput, "line1" | "postalCode" | "city" | "country">): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.line1) errors.line1 = "Indiquez votre adresse";
  if (!input.city) errors.city = "Indiquez votre ville";
  if (!input.postalCode) errors.postalCode = "Indiquez votre code postal";
  else {
    const rule = postalRules[input.country];
    if (rule && !rule.test(input.postalCode)) errors.postalCode = "Code postal invalide pour ce pays";
    else if (!rule && !/^[A-Za-z0-9 -]{2,12}$/.test(input.postalCode)) errors.postalCode = "Code postal invalide";
  }
  return errors;
}

/** Transforme une erreur Zod en messages par champ (affichés sous chaque champ). */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? String(issue.path[0]) : "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

// ───────────── Produits (administration) ─────────────


const featureSchema = z.object({
  label: required(40, "Nom de la caractéristique manquant"),
  value: required(120, "Valeur manquante"),
});

/** Prix saisi en euros (« 24 », « 24,50 ») → centimes. */
export function parseEuros(value: string): number | null {
  const clean = value.replace(/\s|€/g, "").replace(",", ".");
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(clean)) return null;
  return Math.round(parseFloat(clean) * 100);
}

export const productInputSchema = z
  .object({
    id: z.string().uuid(),
    version: z.number().int().min(0),
    name: required(120, "Donnez un nom à votre création"),
    slug: z
      .string()
      .trim()
      .max(120)
      .regex(/^([a-z0-9]+(-[a-z0-9]+)*)?$/, "Adresse invalide : lettres minuscules, chiffres et tirets uniquement")
      .default(""),
    sku: z
      .string()
      .trim()
      .max(40)
      .regex(/^[A-Za-z0-9._-]*$/, "Référence : lettres, chiffres, points et tirets uniquement")
      .default(""),
    description: trimmed(5000).default("").transform(cleanText),
    categoryId: z.string().uuid("Choisissez une catégorie"),
    collectionId: z.string().uuid().nullable().default(null),
    priceCents: z.number({ message: "Indiquez un prix" }).int().min(1, "Le prix doit être supérieur à 0").max(10_000_000, "Prix trop élevé"),
    compareAtCents: z.number().int().positive().nullable().default(null),
    stock: z.number({ message: "Indiquez le stock" }).int().min(0, "Le stock ne peut pas être négatif").max(100_000),
    /** Stock affiché à l'ouverture de la fiche (détection d'une vente pendant la modification). */
    originalStock: z.number().int().min(0).max(100_000),
    status: z.enum(["draft", "published", "archived"]),
    colors: z.array(z.enum(COLOR_IDS as [string, ...string[]])).max(12).default([]),
    tags: z.array(trimmed(30).min(1)).max(20).default([]),
    features: z.array(featureSchema).max(12).default([]),
    seoTitle: trimmed(120).default(""),
    seoDescription: trimmed(300).default(""),
    imageIds: z.array(z.string().uuid()).max(12, "12 photos maximum").default([]),
    imageAlts: z.record(z.string().uuid(), trimmed(200)).default({}),
  })
  .strict()
  .refine((p) => p.compareAtCents === null || p.compareAtCents > p.priceCents, {
    message: "Le prix barré doit être supérieur au prix de vente",
    path: ["compareAtCents"],
  });

export type ProductInput = z.infer<typeof productInputSchema>;

export const categoryInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: required(80, "Donnez un nom"),
    slug: z.string().trim().max(80).regex(/^([a-z0-9]+(-[a-z0-9]+)*)?$/, "Adresse invalide").default(""),
    description: trimmed(1000).default("").transform(cleanText),
    isVisible: z.boolean().default(true),
  })
  .strict();

/** Catégorie de l'arborescence (parentId vide = premier niveau). */
export const categoryTreeInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    parentId: z.string().uuid().nullable().default(null),
    name: required(80, "Donnez un nom"),
    slug: z.string().trim().max(80).regex(/^([a-z0-9]+(-[a-z0-9]+)*)?$/, "Adresse invalide (lettres minuscules, chiffres et tirets)").default(""),
    description: trimmed(1000).default("").transform(cleanText),
    isVisible: z.boolean().default(true),
  })
  .strict();

export const shippingInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    name: required(80, "Donnez un nom"),
    description: trimmed(300).default(""),
    priceCents: z.number().int().min(0, "Prix invalide").max(100_000),
    freeOverCents: z.number().int().positive().nullable().default(null),
    countries: z.array(z.string().regex(/^[A-Z]{2}$/)).min(1, "Choisissez au moins un pays").max(60),
    requiresAddress: z.boolean(),
    deliveryEstimate: trimmed(80).default(""),
    isActive: z.boolean().default(true),
  })
  .strict();


export const socialLinkSchema = z.object({
  network: z.enum(SOCIAL_NETWORKS),
  url: z
    .string()
    .trim()
    .max(300)
    .refine((v) => /^https:\/\/[^\s<>"]+$/.test(v), "Le lien doit commencer par https://"),
});


export const passwordSchema = z
  .string()
  .min(12, "12 caractères minimum")
  .max(200)
  .refine((v) => new Set(v).size >= 6, "Mot de passe trop simple");
