import "server-only";
import { countryName, formatDate, formatMoney } from "../../format";
import { getTheme, type CustomPalette } from "../../themes";
import type { EmailMessage } from "./provider";

// Modèles d'e-mails. Toute donnée variable est échappée (un nom de produit ou
// une adresse ne peut pas injecter de HTML). Chaque e-mail ne contient QUE
// les données de sa propre commande.

export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface EmailOrder {
  number: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
  items: { name: string; quantity: number; unitPriceCents: number; lineTotalCents: number }[];
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  totalCents: number;
  shippingMethodName: string;
  requiresAddress: boolean;
  address: { line1: string | null; line2: string | null; postalCode: string | null; city: string | null; country: string | null };
  phone: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  refundedCents: number;
  vatMention: string | null;
}

export interface EmailBrand {
  shopName: string;
  themeId: string;
  themeCustom?: CustomPalette | null;
  siteUrl: string;
  contactEmail: string;
  logoUrl: string | null;
}

function layout(brand: EmailBrand, preheader: string, body: string): string {
  const t = getTheme(brand.themeId, brand.themeCustom).tokens;
  const header = brand.logoUrl?.startsWith("https://")
    ? `<img src="${esc(brand.logoUrl)}" alt="${esc(brand.shopName)}" width="96" style="display:block;margin:0 auto;border-radius:50%;max-width:96px">`
    : `<div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;color:${t.text};text-align:center">${esc(brand.shopName)}</div>`;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(brand.shopName)}</title></head>
<body style="margin:0;padding:0;background:${t.background};color:${t.text};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
<span style="display:none;max-height:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${t.background}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding:0 0 24px">${header}</td></tr>
<tr><td style="background:${t.surface};border:1px solid ${t.border};border-radius:16px;padding:32px 28px;font-size:15px;line-height:1.6">${body}</td></tr>
<tr><td style="padding:24px 8px;text-align:center;font-size:12px;color:${t.textMuted};line-height:1.6">
${esc(brand.shopName)} — bijoux faits main<br>
${brand.contactEmail ? `Une question ? Répondez simplement à cet e-mail ou écrivez à <a href="mailto:${esc(brand.contactEmail)}" style="color:${t.primary}">${esc(brand.contactEmail)}</a><br>` : ""}
<a href="${esc(brand.siteUrl)}" style="color:${t.primary}">${esc(brand.siteUrl.replace(/^https?:\/\//, ""))}</a>
</td></tr></table></td></tr></table></body></html>`;
}

function button(brand: EmailBrand, href: string, label: string): string {
  const t = getTheme(brand.themeId, brand.themeCustom).tokens;
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0"><tr><td style="background:${t.primary};border-radius:999px">
<a href="${esc(href)}" style="display:inline-block;padding:13px 26px;color:${t.onPrimary};text-decoration:none;font-weight:600">${esc(label)}</a></td></tr></table>`;
}

function summary(brand: EmailBrand, o: EmailOrder): string {
  const t = getTheme(brand.themeId, brand.themeCustom).tokens;
  const rows = o.items
    .map(
      (i) => `<tr><td style="padding:8px 0;border-bottom:1px solid ${t.border}">${esc(i.name)}${i.quantity > 1 ? ` <span style="color:${t.textMuted}">× ${i.quantity}</span>` : ""}</td>
<td style="padding:8px 0;border-bottom:1px solid ${t.border};text-align:right;white-space:nowrap">${esc(formatMoney(i.lineTotalCents))}</td></tr>`,
    )
    .join("");
  const line = (label: string, value: string, strong = false) =>
    `<tr><td style="padding:4px 0;${strong ? "font-weight:700;font-size:16px" : `color:${t.textMuted}`}">${esc(label)}</td><td style="padding:4px 0;text-align:right;${strong ? "font-weight:700;font-size:16px" : ""}">${esc(value)}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;font-size:14px">${rows}
${line("Sous-total", formatMoney(o.subtotalCents))}
${line(`Livraison (${o.shippingMethodName})`, o.shippingCents ? formatMoney(o.shippingCents) : "Offerte")}
${o.discountCents ? line("Réduction", `− ${formatMoney(o.discountCents)}`) : ""}
${line("Total payé", formatMoney(o.totalCents), true)}
</table>${o.vatMention ? `<p style="margin:0;font-size:12px;color:${t.textMuted}">${esc(o.vatMention)}</p>` : ""}`;
}

function addressBlock(o: EmailOrder): string {
  if (!o.requiresAddress) return `<p><strong>${esc(o.shippingMethodName)}</strong><br>Nous vous contacterons pour convenir du retrait.</p>`;
  const a = o.address;
  return `<p style="margin:0"><strong>Livraison à</strong><br>${esc(o.firstName)} ${esc(o.lastName)}<br>${esc(a.line1)}${a.line2 ? `<br>${esc(a.line2)}` : ""}<br>${esc(a.postalCode)} ${esc(a.city)}<br>${esc(countryName(a.country))}</p>`;
}

export function orderConfirmationEmail(brand: EmailBrand, o: EmailOrder, orderUrl: string): Omit<EmailMessage, "to"> {
  const body = `<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;margin:0 0 8px">Merci ${esc(o.firstName)} !</h1>
<p style="margin:0 0 8px">Votre commande <strong>${esc(o.number)}</strong> est bien confirmée et votre paiement a été reçu.</p>
<p style="margin:0">Chaque bijou est préparé à la main avec soin. Vous recevrez un e-mail dès l'expédition.</p>
${summary(brand, o)}
${addressBlock(o)}
${button(brand, orderUrl, "Suivre ma commande")}`;
  return {
    subject: `Commande ${o.number} confirmée — ${brand.shopName}`,
    html: layout(brand, `Votre commande ${o.number} est confirmée.`, body),
    text: `Merci ${o.firstName} !\n\nVotre commande ${o.number} est confirmée et votre paiement a été reçu.\n\n${o.items
      .map((i) => `- ${i.name} × ${i.quantity} : ${formatMoney(i.lineTotalCents)}`)
      .join("\n")}\nLivraison : ${o.shippingCents ? formatMoney(o.shippingCents) : "offerte"}\nTotal payé : ${formatMoney(o.totalCents)}\n\nSuivre ma commande : ${orderUrl}\n\n${brand.shopName}`,
  };
}

export function orderShippedEmail(brand: EmailBrand, o: EmailOrder, orderUrl: string): Omit<EmailMessage, "to"> {
  const pickup = !o.requiresAddress;
  const tracking = o.trackingUrl
    ? button(brand, o.trackingUrl, "Suivre mon colis")
    : o.trackingNumber
      ? `<p>Numéro de suivi : <strong>${esc(o.trackingNumber)}</strong></p>`
      : "";
  const body = `<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;margin:0 0 8px">${pickup ? "Votre commande est prête !" : "Votre commande est en route !"}</h1>
<p>Bonne nouvelle ${esc(o.firstName)} : votre commande <strong>${esc(o.number)}</strong> ${pickup ? "est prête à être retirée." : "vient d'être expédiée."}</p>
${tracking}${addressBlock(o)}
${button(brand, orderUrl, "Voir ma commande")}`;
  return {
    subject: pickup ? `Commande ${o.number} prête — ${brand.shopName}` : `Commande ${o.number} expédiée — ${brand.shopName}`,
    html: layout(brand, pickup ? "Votre commande est prête." : "Votre commande est en route.", body),
    text: `Bonjour ${o.firstName},\n\nVotre commande ${o.number} ${pickup ? "est prête à être retirée" : "a été expédiée"}.${
      o.trackingNumber ? `\nNuméro de suivi : ${o.trackingNumber}` : ""
    }${o.trackingUrl ? `\nSuivi : ${o.trackingUrl}` : ""}\n\nVoir ma commande : ${orderUrl}\n\n${brand.shopName}`,
  };
}

export function orderRefundedEmail(brand: EmailBrand, o: EmailOrder, orderUrl: string, cancelled: boolean): Omit<EmailMessage, "to"> {
  const body = `<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;margin:0 0 8px">${cancelled ? "Commande annulée" : "Remboursement effectué"}</h1>
<p>Bonjour ${esc(o.firstName)},</p>
<p>${cancelled ? `Votre commande <strong>${esc(o.number)}</strong> a été annulée.` : `Votre commande <strong>${esc(o.number)}</strong> a été remboursée.`}
Un remboursement de <strong>${esc(formatMoney(o.refundedCents || o.totalCents))}</strong> a été émis sur votre moyen de paiement ; il apparaît généralement sous 5 à 10 jours ouvrés.</p>
${button(brand, orderUrl, "Voir ma commande")}`;
  return {
    subject: `${cancelled ? "Annulation" : "Remboursement"} de la commande ${o.number} — ${brand.shopName}`,
    html: layout(brand, cancelled ? "Votre commande a été annulée et remboursée." : "Votre remboursement a été émis.", body),
    text: `Bonjour ${o.firstName},\n\nVotre commande ${o.number} a été ${cancelled ? "annulée" : "remboursée"}. Remboursement : ${formatMoney(
      o.refundedCents || o.totalCents,
    )}.\n\n${orderUrl}\n\n${brand.shopName}`,
  };
}

export function adminNewOrderEmail(brand: EmailBrand, o: EmailOrder, adminUrl: string): Omit<EmailMessage, "to"> {
  const body = `<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;margin:0 0 8px">Nouvelle commande ✨</h1>
<p><strong>${esc(o.number)}</strong> — ${esc(o.firstName)} ${esc(o.lastName)} — <strong>${esc(formatMoney(o.totalCents))}</strong></p>
${summary(brand, o)}
${addressBlock(o)}
${button(brand, adminUrl, "Ouvrir la commande")}`;
  return {
    subject: `Nouvelle commande ${o.number} — ${formatMoney(o.totalCents)}`,
    html: layout(brand, `Nouvelle commande de ${o.firstName} ${o.lastName}`, body),
    text: `Nouvelle commande ${o.number}\n${o.firstName} ${o.lastName} — ${formatMoney(o.totalCents)}\n\n${o.items
      .map((i) => `- ${i.name} × ${i.quantity}`)
      .join("\n")}\n\n${adminUrl}`,
  };
}

export function adminAlertEmail(brand: EmailBrand, title: string, message: string, adminUrl: string): Omit<EmailMessage, "to"> {
  const body = `<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:22px;margin:0 0 8px">⚠️ ${esc(title)}</h1><p>${esc(message)}</p>${button(brand, adminUrl, "Ouvrir l'administration")}`;
  return { subject: `[Alerte boutique] ${title}`, html: layout(brand, title, body), text: `${title}\n\n${message}\n\n${adminUrl}` };
}

export function passwordResetEmail(brand: EmailBrand, url: string): Omit<EmailMessage, "to"> {
  const body = `<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:22px;margin:0 0 8px">Nouveau mot de passe</h1>
<p>Une demande de réinitialisation du mot de passe de l'administration a été faite. Ce lien est valable 30 minutes et ne fonctionne qu'une fois.</p>
${button(brand, url, "Choisir un nouveau mot de passe")}
<p style="font-size:13px">Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail : rien ne change.</p>`;
  return { subject: `Réinitialisation du mot de passe — ${brand.shopName}`, html: layout(brand, "Réinitialisation du mot de passe", body), text: `Choisir un nouveau mot de passe (valable 30 minutes) : ${url}` };
}

export function formatOrderDate(value: string) {
  return formatDate(value);
}
