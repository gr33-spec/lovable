import "server-only";
import { z } from "zod";
import type { ImageRef } from "../image-ref";
import { CUSTOM_THEME_ID, getTheme, isHexColor, type CustomPalette } from "../themes";
import { socialLinkSchema, type SocialNetwork } from "../validation";
import { query, queryOne, type Queryable } from "./db";
import { toImageRef, type ImageRow } from "./images";

// Paramètres de la boutique : une seule ligne en base, source de vérité
// unique pour le nom, les textes, les réseaux, le thème, la fiscalité…

export interface ShopSettings {
  shopName: string;
  tagline: string;
  introText: string;
  aboutTitle: string;
  aboutText: string;
  contactEmail: string;
  notificationEmail: string;
  logo: ImageRef | null;
  favicon: ImageRef | null;
  hero: ImageRef | null;
  aboutImage: ImageRef | null;
  logoImageId: string | null;
  faviconImageId: string | null;
  heroImageId: string | null;
  aboutImageId: string | null;
  socials: { network: SocialNetwork; url: string }[];
  themeId: string;
  themeCustom: CustomPalette | null;
  lowStockThreshold: number;
  ordersOpen: boolean;
  closedMessage: string;
  allowPromotionCodes: boolean;
  vatRegime: "franchise" | "assujetti" | null;
  vatRateBp: number;
  legal: {
    name: string;
    status: string;
    siret: string;
    registration: string;
    vatNumber: string;
    address: string;
    publisher: string;
    host: string;
    mediator: string;
  };
  addressRetentionMonths: number | null;
  version: number;
}

type Row = Record<string, unknown>;

export async function loadSettings(client?: Queryable): Promise<ShopSettings> {
  const row = await queryOne<Row>("SELECT * FROM shop_settings WHERE id = 1", [], client);
  if (!row) throw new Error("Paramètres introuvables");
  const imageIds = [row.logo_image_id, row.favicon_image_id, row.hero_image_id, row.about_image_id].filter(Boolean) as string[];
  const images = imageIds.length
    ? await query<ImageRow>("SELECT id, width, height, widths, placeholder, alt, base_url FROM image WHERE id = ANY($1::uuid[])", [imageIds], client)
    : [];
  const ref = (id: unknown) => {
    const img = images.find((i) => i.id === id);
    return img ? toImageRef(img) : null;
  };
  const socials = z.array(socialLinkSchema).catch([]).parse(row.socials);
  return {
    shopName: row.shop_name as string,
    tagline: row.tagline as string,
    introText: row.intro_text as string,
    aboutTitle: row.about_title as string,
    aboutText: row.about_text as string,
    contactEmail: row.contact_email as string,
    notificationEmail: row.notification_email as string,
    logo: ref(row.logo_image_id),
    favicon: ref(row.favicon_image_id),
    hero: ref(row.hero_image_id),
    aboutImage: ref(row.about_image_id),
    logoImageId: (row.logo_image_id as string) ?? null,
    faviconImageId: (row.favicon_image_id as string) ?? null,
    heroImageId: (row.hero_image_id as string) ?? null,
    aboutImageId: (row.about_image_id as string) ?? null,
    socials,
    themeId: row.theme === CUSTOM_THEME_ID && parsePalette(row.theme_custom) ? CUSTOM_THEME_ID : getTheme(row.theme as string).id,
    themeCustom: parsePalette(row.theme_custom),
    lowStockThreshold: row.low_stock_threshold as number,
    ordersOpen: row.orders_open as boolean,
    closedMessage: row.closed_message as string,
    allowPromotionCodes: row.allow_promotion_codes as boolean,
    vatRegime: (row.vat_regime as ShopSettings["vatRegime"]) ?? null,
    vatRateBp: row.vat_rate_bp as number,
    legal: {
      name: row.legal_name as string,
      status: row.legal_status as string,
      siret: row.legal_siret as string,
      registration: row.legal_registration as string,
      vatNumber: row.legal_vat_number as string,
      address: row.legal_address as string,
      publisher: row.legal_publisher as string,
      host: row.legal_host as string,
      mediator: row.legal_mediator as string,
    },
    addressRetentionMonths: (row.address_retention_months as number) ?? null,
    version: row.version as number,
  };
}

/** Éléments encore à fournir avant d'ouvrir la boutique au public. */
export function missingLegalInfo(s: ShopSettings): string[] {
  const missing: string[] = [];
  if (!s.legal.name) missing.push("Nom ou raison sociale");
  if (!s.legal.status) missing.push("Statut juridique");
  if (!s.legal.siret) missing.push("Numéro SIRET");
  if (!s.legal.address) missing.push("Adresse de l'entreprise");
  if (!s.legal.publisher) missing.push("Directeur·rice de la publication");
  if (!s.legal.host) missing.push("Hébergeur du site");
  if (!s.legal.mediator) missing.push("Médiateur de la consommation");
  if (!s.vatRegime) missing.push("Régime de TVA");
  if (!s.contactEmail) missing.push("E-mail de contact");
  if (!s.notificationEmail) missing.push("E-mail de réception des commandes");
  return missing;
}

/** Mention fiscale affichée sous les prix et sur les documents. */
export function vatMention(s: Pick<ShopSettings, "vatRegime">): string | null {
  if (s.vatRegime === "franchise") return "TVA non applicable, art. 293 B du CGI";
  if (s.vatRegime === "assujetti") return "Prix TTC";
  return null;
}

function parsePalette(value: unknown): CustomPalette | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const ok = (c: unknown): c is string => typeof c === "string" && isHexColor(c);
  return ok(v.primary) && ok(v.secondary) && ok(v.accent) ? { primary: v.primary, secondary: v.secondary, accent: v.accent } : null;
}
