import type { AppData, Building, Company, Person, Tenancy, Unit } from "../types";

// Modèle de document neutre (titres, paragraphes, tableaux, signatures) :
// les textes juridiques produisent ce modèle, un seul moteur le met en page
// en PDF. Les rédactions restent ainsi lisibles, testables et versionnées.

export type Block =
  | { t: "h"; text: string }
  | { t: "h2"; text: string }
  | { t: "p"; text: string; small?: boolean; bold?: boolean }
  | { t: "kv"; rows: [string, string][] }
  | { t: "table"; head: string[]; rows: string[][]; widths?: number[]; highlight?: number[]; totalRow?: boolean }
  | { t: "list"; items: string[] }
  | { t: "checks"; items: { label: string; checked: boolean }[] }
  | { t: "box"; title?: string; text: string; lines?: number }
  | { t: "signatures"; place?: string; date?: string; parties: { role: string; name: string; image?: string; mention?: string }[] }
  | { t: "photos"; items: { caption: string; fileId: string }[] }
  | { t: "pagebreak" };

export interface LegalDoc {
  title: string;
  subtitle?: string;
  /** Référence du modèle, imprimée en pied de page. */
  reference: string;
  blocks: Block[];
  fileName: string;
}

// ——— Formats ———

const nf2 = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const money = (n: number | undefined) => (n === undefined || !Number.isFinite(n) ? "____ €" : `${nf2.format(n).replace(/[  ]/g, " ")} €`);

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
export function dateLong(iso: string | undefined): string {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null;
  if (!m) return "____________";
  const d = Number(m[3]);
  return `${d === 1 ? "1er" : d} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}
export function monthLong(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}
export const blank = (v: string | number | undefined | null, width = 12) => (v === undefined || v === null || v === "" ? "_".repeat(width) : String(v));

const UNITS = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize"];
const TENS = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante"];

function below100(n: number): string {
  if (n <= 16) return UNITS[n];
  if (n < 20) return `dix-${UNITS[n - 10]}`;
  if (n < 70) {
    const t = Math.floor(n / 10);
    const u = n % 10;
    return u === 0 ? TENS[t] : u === 1 ? `${TENS[t]} et un` : `${TENS[t]}-${UNITS[u]}`;
  }
  if (n < 80) return n === 71 ? "soixante et onze" : `soixante-${below100(n - 60)}`;
  if (n === 80) return "quatre-vingts";
  return `quatre-vingt-${below100(n - 80)}`;
}

function below1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const head = h === 0 ? "" : h === 1 ? "cent" : `${UNITS[h]} cent${r === 0 ? "s" : ""}`;
  return [head, r ? below100(r) : ""].filter(Boolean).join(" ");
}

/** Nombre entier en toutes lettres (orthographe traditionnelle). */
export function numberToWords(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n === 0) return "zéro";
  const parts: string[] = [];
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  if (millions) parts.push(`${below1000(millions)} million${millions > 1 ? "s" : ""}`);
  if (thousands) parts.push(thousands === 1 ? "mille" : `${below1000(thousands).replace(/cents$/, "cent")} mille`);
  if (rest) parts.push(below1000(rest));
  return parts.join(" ");
}

export function euroWords(amount: number): string {
  const euros = Math.floor(amount);
  const cents = Math.round((amount - euros) * 100);
  return `${numberToWords(euros)} euro${euros > 1 ? "s" : ""}${cents ? ` et ${numberToWords(cents)} centime${cents > 1 ? "s" : ""}` : ""}`;
}

// ——— Contexte commun ———

export interface Landlord {
  name: string;
  isCompany: boolean;
  form?: string;
  address?: string;
  siren?: string;
  representative?: string;
  representativeRole?: string;
  email?: string;
  phone?: string;
  company?: Company;
}

export interface DocContext {
  landlord: Landlord;
  unit: Unit;
  building?: Building;
  tenancy: Tenancy;
  address: string;
}

export function personName(p: Person | undefined): string {
  return [p?.firstName, p?.lastName?.toUpperCase()].filter(Boolean).join(" ");
}

export function tenantsLabel(t: Tenancy): string {
  const names = t.tenants.map(personName).filter(Boolean);
  return names.length ? names.join(" et ") : "____________";
}

export function landlordFor(data: AppData, unit: Unit): Landlord {
  const building = data.buildings.find((b) => b.id === unit.buildingId);
  const company = data.companies.find((c) => c.id === building?.companyId);
  if (!company) {
    return { name: data.settings.ownerName || "", isCompany: false };
  }
  const form = company.kind === "holding" ? undefined : company.kind === "autre" ? undefined : company.kind;
  // Dénomination complète, forme sociale incluse une seule fois (« SCI ARMOR IMMO »).
  const name = form && !company.name.toUpperCase().startsWith(form.toUpperCase()) ? `${form} ${company.name}` : company.name;
  return {
    name,
    isCompany: true,
    form,
    address: company.address,
    siren: company.siren,
    representative: company.representative,
    representativeRole: company.representativeRole || "gérant",
    email: company.email,
    phone: company.phone,
    company,
  };
}

export function unitAddress(unit: Unit, building?: Building): string {
  const street = [building?.address, building?.city].filter(Boolean).join(", ");
  const detail = [unit.floor ? `étage ${unit.floor}` : undefined, unit.door ? `porte ${unit.door}` : undefined, unit.name].filter(Boolean).join(", ");
  return [street, detail].filter(Boolean).join(" — ");
}

export function docContext(data: AppData, tenancy: Tenancy): DocContext | undefined {
  const unit = data.units.find((u) => u.id === tenancy.unitId);
  if (!unit) return undefined;
  const building = data.buildings.find((b) => b.id === unit.buildingId);
  return { landlord: landlordFor(data, unit), unit, building, tenancy, address: unitAddress(unit, building) };
}

export function landlordLine(l: Landlord): string {
  if (!l.isCompany) return `${blank(l.name, 20)}, demeurant ${blank(l.address, 30)}`;
  return [
    l.name,
    `dont le siège est situé ${blank(l.address, 30)}`,
    l.siren ? `immatriculée sous le numéro ${l.siren}` : undefined,
    `représentée par ${blank(l.representative, 20)}${l.representativeRole ? `, en qualité de ${l.representativeRole}` : ""}`,
  ]
    .filter(Boolean)
    .join(", ");
}
