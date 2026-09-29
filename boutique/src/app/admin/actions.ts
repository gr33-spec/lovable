"use server";

import QRCode from "qrcode";
import { z } from "zod";
import { anonymizeOrder, clearAttention, refundOrder, setOrderStatus, updateOrderNote } from "@/lib/server/admin-orders";
import {
  bulkUpdate,
  deleteGroup,
  deleteProduct,
  deleteShippingMethod,
  moveGroup,
  moveProduct,
  saveGroup,
  saveProduct,
  saveShippingMethod,
  setStock,
  type BulkAction,
} from "@/lib/server/admin-catalog";
import { changePassword, disableTotp, enableTotp, requireAdmin, revokeOtherSessions, UnauthorizedError, type AdminUser } from "@/lib/server/auth";
import { invalidateCatalog, invalidateSettings } from "@/lib/server/cached";
import { newTotpSecret, readShortLived, signShortLived } from "@/lib/server/crypto";
import { query, queryOne } from "@/lib/server/db";
import { processOutbox } from "@/lib/server/email/outbox";
import { paymentConfig, siteUrl } from "@/lib/server/env";
import { audit, errorMessage } from "@/lib/server/monitoring";
import { payments } from "@/lib/server/payments";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/order-status";
import { THEMES } from "@/lib/themes";
import { cleanText, emailSchema, passwordSchema, socialLinkSchema, whatsappUrl } from "@/lib/validation";

// Toutes les actions de l'administration. Chacune revérifie la session côté
// serveur (une action est joignable directement, sans passer par l'écran)
// et valide ses paramètres.

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string; fieldErrors?: Record<string, string> };

type Failure = { ok: false; error: string; fieldErrors?: Record<string, string> };

async function guarded<R extends { ok: boolean }>(fn: (admin: AdminUser) => Promise<R>): Promise<R | Failure> {
  try {
    return await fn(await requireAdmin());
  } catch (err) {
    if (err instanceof UnauthorizedError) return { ok: false, error: "Votre session a expiré : reconnectez-vous (vos saisies sont conservées sur cette page)." };
    console.error("[admin]", errorMessage(err));
    return { ok: false, error: "L'opération n'a pas pu être enregistrée. Réessayez dans un instant." };
  }
}

const uuid = z.string().uuid();

// ───────────── Produits ─────────────

export async function saveProductAction(input: unknown) {
  return guarded(async (admin) => {
    const res = await saveProduct(input, admin.id);
    if (res.ok) invalidateCatalog();
    return res;
  });
}

export async function deleteProductAction(id: string) {
  return guarded(async (admin) => {
    const res = await deleteProduct(uuid.parse(id), admin.id);
    if (res.ok) invalidateCatalog();
    return res;
  });
}

export async function setStockAction(id: string, next: number, expected: number) {
  return guarded(async (admin) => {
    const res = await setStock(uuid.parse(id), next, expected, admin.id);
    if (res.ok) invalidateCatalog();
    return res.ok ? { ok: true as const, stock: res.stock } : { ok: false as const, error: res.error, ...(res.stock !== undefined ? { fieldErrors: { stock: String(res.stock) } } : {}) };
  });
}

export async function bulkAction(ids: string[], action: BulkAction) {
  return guarded(async (admin) => {
    const parsed = z
      .union([z.object({ type: z.enum(["publish", "draft", "archive"]) }), z.object({ type: z.literal("category"), categoryId: uuid })])
      .parse(action) as BulkAction;
    const count = await bulkUpdate(z.array(uuid).max(200).parse(ids), parsed, admin.id);
    invalidateCatalog();
    return { ok: true as const, count };
  });
}

export async function moveProductAction(id: string, direction: "up" | "down") {
  return guarded(async (admin) => {
    await moveProduct(uuid.parse(id), z.enum(["up", "down"]).parse(direction), admin.id);
    invalidateCatalog();
    return { ok: true as const };
  });
}

// ───────────── Catégories, collections, livraison ─────────────

export async function saveGroupAction(table: "category" | "collection", input: unknown) {
  return guarded(async (admin) => {
    const res = await saveGroup(z.enum(["category", "collection"]).parse(table), input, admin.id);
    if (res.ok) invalidateCatalog();
    return res;
  });
}

export async function deleteGroupAction(table: "category" | "collection", id: string) {
  return guarded(async (admin) => {
    const res = await deleteGroup(z.enum(["category", "collection"]).parse(table), uuid.parse(id), admin.id);
    if (res.ok) invalidateCatalog();
    return res;
  });
}

export async function moveGroupAction(table: "category" | "collection", id: string, direction: "up" | "down") {
  return guarded(async () => {
    await moveGroup(z.enum(["category", "collection"]).parse(table), uuid.parse(id), z.enum(["up", "down"]).parse(direction));
    invalidateCatalog();
    return { ok: true as const };
  });
}

export async function saveShippingAction(input: unknown) {
  return guarded((admin) => saveShippingMethod(input, admin.id));
}

export async function deleteShippingAction(id: string) {
  return guarded(async (admin) => {
    await deleteShippingMethod(uuid.parse(id), admin.id);
    return { ok: true as const };
  });
}

// ───────────── Commandes ─────────────

export async function setOrderStatusAction(id: string, to: OrderStatus, tracking?: { trackingNumber?: string; trackingUrl?: string }) {
  return guarded(async (admin) => {
    const status = z.enum(ORDER_STATUSES).parse(to);
    const res = await setOrderStatus(uuid.parse(id), status, admin.id, {
      trackingNumber: tracking?.trackingNumber?.slice(0, 80),
      trackingUrl: tracking?.trackingUrl?.slice(0, 500),
    });
    if (res.ok) await processOutbox(5).catch(() => undefined);
    return res;
  });
}

export async function refundOrderAction(id: string, cancel: boolean, restock: boolean) {
  return guarded(async (admin) => {
    const res = await refundOrder(uuid.parse(id), admin.id, { cancel: Boolean(cancel), restock: Boolean(restock) });
    if (res.ok) {
      invalidateCatalog();
      await processOutbox(5).catch(() => undefined);
    }
    return res;
  });
}

export async function orderNoteAction(id: string, note: string) {
  return guarded((admin) => updateOrderNote(uuid.parse(id), cleanText(String(note)), admin.id));
}

export async function clearAttentionAction(id: string) {
  return guarded((admin) => clearAttention(uuid.parse(id), admin.id));
}

export async function anonymizeOrderAction(id: string) {
  return guarded((admin) => anonymizeOrder(uuid.parse(id), admin.id));
}

export async function retryEmailsAction(orderId: string) {
  return guarded(async (admin) => {
    await query("UPDATE email_outbox SET status = 'pending', attempts = 0, next_attempt_at = now() WHERE order_id = $1 AND status = 'failed'", [uuid.parse(orderId)]);
    await audit(admin.id, "emails_retried", "order", orderId);
    const res = await processOutbox(10);
    return res.failed ? { ok: false as const, error: "L'envoi a de nouveau échoué. Vérifiez la configuration des e-mails." } : { ok: true as const };
  });
}

// ───────────── Apparence et marque ─────────────

export async function saveThemeAction(themeId: string) {
  return guarded(async (admin) => {
    if (!THEMES.some((t) => t.id === themeId)) return { ok: false as const, error: "Thème inconnu." };
    await query("UPDATE shop_settings SET theme = $1, version = version + 1 WHERE id = 1", [themeId]);
    await audit(admin.id, "theme_changed", "settings", "theme", { theme: themeId });
    invalidateSettings();
    return { ok: true as const };
  });
}

const brandSchema = z
  .object({
    shopName: z.string().trim().min(1, "Indiquez le nom de la boutique").max(80),
    tagline: z.string().trim().max(160),
    introText: z.string().trim().max(600).transform(cleanText),
    aboutTitle: z.string().trim().max(120),
    aboutText: z.string().trim().max(6000).transform(cleanText),
    logoImageId: uuid.nullable(),
    faviconImageId: uuid.nullable(),
    heroImageId: uuid.nullable(),
    aboutImageId: uuid.nullable(),
    socials: z.array(z.object({ network: z.string(), url: z.string().max(300) })).max(10),
  })
  .strict();

export async function saveBrandAction(input: unknown) {
  return guarded(async (admin) => {
    const parsed = brandSchema.safeParse(input);
    if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
    const b = parsed.data;
    const socials: { network: string; url: string }[] = [];
    for (const s of b.socials) {
      if (!s.url.trim()) continue;
      const url = s.network === "whatsapp" ? whatsappUrl(s.url) : s.url.trim();
      const valid = socialLinkSchema.safeParse({ network: s.network, url });
      if (!valid.success) return { ok: false as const, error: `Lien ${s.network} invalide : ${s.network === "whatsapp" ? "indiquez un numéro (06…, +33…)" : "il doit commencer par https://"}` };
      socials.push(valid.data);
    }
    const ids = [b.logoImageId, b.faviconImageId, b.heroImageId, b.aboutImageId].filter(Boolean) as string[];
    if (ids.length) {
      const found = await query("SELECT id FROM image WHERE id = ANY($1::uuid[]) AND kind = 'brand'", [ids]);
      if (found.length !== new Set(ids).size) return { ok: false as const, error: "Une image est introuvable : importez-la à nouveau." };
    }
    await query(
      `UPDATE shop_settings SET shop_name=$1, tagline=$2, intro_text=$3, about_title=$4, about_text=$5, logo_image_id=$6, favicon_image_id=$7,
         hero_image_id=$8, about_image_id=$9, socials=$10, version = version + 1, updated_at = now() WHERE id = 1`,
      [b.shopName, b.tagline, b.introText, b.aboutTitle, b.aboutText, b.logoImageId, b.faviconImageId, b.heroImageId, b.aboutImageId, JSON.stringify(socials)],
    );
    await audit(admin.id, "brand_updated", "settings", "brand");
    invalidateSettings();
    return { ok: true as const };
  });
}

// ───────────── Paramètres ─────────────

const optionalEmail = z.union([z.literal(""), emailSchema]);
const settingsSchema = z
  .object({
    contactEmail: optionalEmail,
    notificationEmail: optionalEmail,
    lowStockThreshold: z.number().int().min(0).max(100),
    ordersOpen: z.boolean(),
    closedMessage: z.string().trim().max(300),
    allowPromotionCodes: z.boolean(),
    vatRegime: z.enum(["franchise", "assujetti"]).nullable(),
    vatRateBp: z.number().int().min(0).max(10000),
    addressRetentionMonths: z.number().int().min(1).max(240).nullable(),
    legal: z
      .object({
        name: z.string().trim().max(160),
        status: z.string().trim().max(160),
        siret: z.string().trim().max(40),
        registration: z.string().trim().max(160),
        vatNumber: z.string().trim().max(40),
        address: z.string().trim().max(300),
        publisher: z.string().trim().max(160),
        host: z.string().trim().max(300),
        mediator: z.string().trim().max(500),
      })
      .strict(),
  })
  .strict();

export async function saveSettingsAction(input: unknown) {
  return guarded(async (admin) => {
    const parsed = settingsSchema.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { ok: false as const, error: issue.path.includes("contactEmail") || issue.path.includes("notificationEmail") ? "Adresse e-mail invalide." : issue.message };
    }
    const s = parsed.data;
    const before = await queryOne<{ orders_open: boolean; vat_regime: string | null }>("SELECT orders_open, vat_regime FROM shop_settings WHERE id = 1");
    await query(
      `UPDATE shop_settings SET contact_email=$1, notification_email=$2, low_stock_threshold=$3, orders_open=$4, closed_message=$5,
         allow_promotion_codes=$6, vat_regime=$7, vat_rate_bp=$8, address_retention_months=$9,
         legal_name=$10, legal_status=$11, legal_siret=$12, legal_registration=$13, legal_vat_number=$14, legal_address=$15,
         legal_publisher=$16, legal_host=$17, legal_mediator=$18, version = version + 1, updated_at = now() WHERE id = 1`,
      [
        s.contactEmail,
        s.notificationEmail,
        s.lowStockThreshold,
        s.ordersOpen,
        s.closedMessage,
        s.allowPromotionCodes,
        s.vatRegime,
        s.vatRateBp,
        s.addressRetentionMonths,
        s.legal.name,
        s.legal.status,
        s.legal.siret,
        s.legal.registration,
        s.legal.vatNumber,
        s.legal.address,
        s.legal.publisher,
        s.legal.host,
        s.legal.mediator,
      ],
    );
    await audit(admin.id, "settings_updated", "settings", "general", {
      ordersOpen: s.ordersOpen,
      ...(before?.vat_regime !== s.vatRegime ? { vatRegime: s.vatRegime } : {}),
    });
    invalidateSettings();
    return { ok: true as const };
  });
}

export async function saveLegalPageAction(slug: string, title: string, body: string) {
  return guarded(async (admin) => {
    const s = z.enum(["mentions-legales", "cgv", "confidentialite", "livraison-retours"]).parse(slug);
    const t = z.string().trim().min(1).max(120).parse(title);
    const b = cleanText(z.string().max(60000).parse(body));
    await query("UPDATE legal_page SET title = $2, body = $3, updated_at = now() WHERE slug = $1", [s, t, b]);
    await audit(admin.id, "legal_page_updated", "legal_page", s);
    invalidateSettings();
    return { ok: true as const };
  });
}

// ───────────── Sécurité du compte ─────────────

export async function changePasswordAction(current: string, next: string) {
  return guarded(async (admin) => {
    const valid = passwordSchema.safeParse(next);
    if (!valid.success) return { ok: false as const, error: valid.error.issues[0].message };
    const error = await changePassword(admin, String(current).slice(0, 200), next);
    return error ? { ok: false as const, error } : { ok: true as const };
  });
}

export async function startTotpAction() {
  return guarded(async (admin) => {
    const secret = newTotpSecret();
    const label = encodeURIComponent(`La Bohème en Paillettes:${admin.email}`);
    const uri = `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent("La Bohème en Paillettes")}&digits=6&period=30`;
    const qr = await QRCode.toString(uri, { type: "svg", margin: 1, width: 200 });
    // Le secret ne quitte le serveur que signé : il ne peut pas être remplacé par un autre.
    return { ok: true as const, secret, uri, qr, pending: signShortLived(secret, `totp-setup|${admin.id}`, 15 * 60_000) };
  });
}

export async function enableTotpAction(pending: string, code: string) {
  return guarded(async (admin) => {
    const secret = readShortLived(pending, `totp-setup|${admin.id}`);
    if (!secret) return { ok: false as const, error: "Délai dépassé : recommencez l'activation." };
    return (await enableTotp(admin, secret, code)) ? { ok: true as const } : { ok: false as const, error: "Code incorrect : vérifiez l'heure du téléphone et réessayez." };
  });
}

export async function disableTotpAction(password: string) {
  return guarded(async (admin) => ((await disableTotp(admin, String(password))) ? { ok: true as const } : { ok: false as const, error: "Mot de passe incorrect." }));
}

export async function revokeSessionsAction() {
  return guarded(async (admin) => ({ ok: true as const, count: await revokeOtherSessions(admin) }));
}

// ───────────── Paiement et surveillance ─────────────

export async function stripeAccountAction() {
  return guarded(async () => {
    const cfg = paymentConfig();
    if (!cfg.ok) return { ok: false as const, error: cfg.reason };
    try {
      const account = await payments().account();
      const expected = cfg.provider === "stripe" ? cfg.accountId : undefined;
      return { ok: true as const, account, mode: cfg.mode, matchesExpected: expected ? expected === account.id : null };
    } catch (err) {
      return { ok: false as const, error: `Stripe ne répond pas : ${errorMessage(err)}` };
    }
  });
}

export async function resolveIncidentsAction() {
  return guarded(async (admin) => {
    await query("UPDATE system_event SET resolved_at = now() WHERE resolved_at IS NULL");
    await audit(admin.id, "incidents_resolved", "system", "");
    return { ok: true as const };
  });
}

// ───────────── Créations d'exemple ─────────────

export async function loadDemoAction() {
  return guarded(async (admin) => {
    const { headers } = await import("next/headers");
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const origin = host ? `${h.get("x-forwarded-proto") ?? "https"}://${host}` : siteUrl();
    const { createDemoProducts } = await import("@/lib/server/demo");
    const res = await createDemoProducts(admin.id, async (file) => {
      // Photos d'exemple servies par le site lui-même (dossier public/demo).
      const r = await fetch(`${origin}/demo/${file}`, { cache: "no-store" });
      if (!r.ok) throw new Error(`Photo d'exemple introuvable (${r.status})`);
      return Buffer.from(await r.arrayBuffer());
    });
    if (res.ok) invalidateCatalog();
    return res;
  });
}

export async function removeDemoAction() {
  return guarded(async (admin) => {
    const { removeDemoProducts } = await import("@/lib/server/demo");
    const count = await removeDemoProducts(admin.id);
    invalidateCatalog();
    return { ok: true as const, count };
  });
}
