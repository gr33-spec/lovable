import type { Inspection } from "../types";
import { type Block, type DocContext, type LegalDoc, blank, dateLong, landlordLine, money, monthLong, personName, tenantsLabel } from "./doc";
import { compareInspections, stateLabel } from "./inspection";
import { slug } from "./lease";
import type { MonthReceipt, RentStatement } from "./receipts";
import { INSPECTION_VERSION, RECEIPT_VERSION, REVISION_LETTER_VERSION } from "./versions";

// États des lieux, quittances, reçus et attestations.

export function inspectionDocument(ctx: DocContext, i: Inspection, entry?: Inspection, photoIds: { caption: string; fileId: string }[] = []): LegalDoc {
  const { landlord, tenancy: t } = ctx;
  const exit = i.kind === "sortie";
  const blocks: Block[] = [];
  blocks.push({
    t: "kv",
    rows: [
      ["Type", exit ? "État des lieux de sortie" : "État des lieux d'entrée"],
      ["Date d'établissement", dateLong(i.date)],
      ["Logement", ctx.address],
      ["Bailleur", landlordLine(landlord)],
      [t.tenants.length > 1 ? "Locataires" : "Locataire", tenantsLabel(t)],
      ...(exit
        ? ([
            ["Nouvelle adresse du locataire", blank(t.tenants.map((p) => p.address).filter(Boolean).join(" ; "), 30)],
            ["Date de l'état des lieux d'entrée", dateLong(entry?.date)],
          ] as [string, string][])
        : []),
    ],
  });
  blocks.push({ t: "p", small: true, text: "État des lieux établi contradictoirement et amiablement par les parties, conformément à l'article 3-2 de la loi n° 89-462 du 6 juillet 1989 et au décret n° 2016-382 du 30 mars 2016." });

  blocks.push({ t: "h", text: "Relevés des compteurs individuels" });
  blocks.push({
    t: "table",
    head: ["Compteur", "N° du compteur", exit ? "Relevé à l'entrée" : "Relevé", ...(exit ? ["Relevé à la sortie"] : [])],
    widths: exit ? [30, 24, 23, 23] : [40, 30, 30],
    rows: i.meters.map((m) => {
      const e = entry?.meters.find((x) => x.kind === m.kind);
      return exit ? [m.kind, m.number || e?.number || "—", e?.value || "—", m.value || "—"] : [m.kind, m.number || "—", m.value || "—"];
    }),
  });

  blocks.push({ t: "h", text: exit ? "Clés restituées" : "Clés remises" });
  blocks.push({
    t: "table",
    head: exit ? ["Clés et accès", "Remis à l'entrée", "Restitués"] : ["Clés et accès", "Nombre"],
    widths: exit ? [60, 20, 20] : [75, 25],
    rows: i.keys.filter((k) => k.count || entry?.keys.some((e) => e.kind === k.kind && e.count)).map((k) => {
      const e = entry?.keys.find((x) => x.kind === k.kind);
      return exit ? [k.kind, String(e?.count ?? "—"), String(k.count ?? 0)] : [k.kind, String(k.count ?? 0)];
    }),
  });

  if (i.heating || i.hotWater) {
    blocks.push({ t: "h", text: "Chauffage et eau chaude" });
    blocks.push({ t: "kv", rows: [["Chauffage", i.heating || "—"], ["Eau chaude sanitaire", i.hotWater || "—"]] });
  }

  const cmp = exit ? compareInspections(entry, i) : undefined;
  for (const room of i.rooms) {
    blocks.push({ t: "h2", text: room.name });
    const er = entry?.rooms.find((r) => r.name === room.name);
    const rows: string[][] = [];
    const highlight: number[] = [];
    room.items.forEach((it, idx) => {
      const ei = er?.items.find((x) => x.name === it.name);
      if (exit) {
        rows.push([it.name, stateLabel(ei?.state), stateLabel(it.state), it.note || ""]);
        if (cmp?.changes.some((c) => c.room === room.name && c.item === it.name && c.worse)) highlight.push(idx);
      } else rows.push([it.name, stateLabel(it.state), it.note || ""]);
    });
    blocks.push({ t: "table", head: exit ? ["Élément", "Entrée", "Sortie", "Observations"] : ["Élément", "État", "Observations"], widths: exit ? [30, 15, 15, 40] : [34, 16, 50], rows, highlight });
    if (room.note) blocks.push({ t: "p", small: true, text: `Observations : ${room.note}` });
  }

  if (cmp) {
    blocks.push({ t: "h", text: "Comparaison avec l'état des lieux d'entrée" });
    const worse = cmp.changes.filter((c) => c.worse);
    if (!entry) blocks.push({ t: "p", text: "L'état des lieux d'entrée n'est pas enregistré dans l'application : comparaison à faire avec l'exemplaire papier." });
    else if (worse.length === 0 && cmp.keysMissing.length === 0) blocks.push({ t: "p", text: "Aucune dégradation constatée par rapport à l'état des lieux d'entrée, sous réserve de l'usure normale." });
    else {
      blocks.push({ t: "list", items: [...worse.map((c) => `${c.room} — ${c.item} : ${stateLabel(c.entry)} → ${stateLabel(c.exit)}${c.note ? ` (${c.note})` : ""}`), ...cmp.keysMissing.map((k) => `${k.kind} : ${k.missing} non restitué(s)`)] });
    }
  }

  if (i.observations) {
    blocks.push({ t: "h", text: "Observations et réserves" });
    blocks.push({ t: "p", text: i.observations });
  }
  if (!exit) {
    blocks.push({
      t: "p",
      small: true,
      text: "Le locataire peut demander au bailleur de compléter le présent état des lieux dans un délai de dix jours à compter de son établissement pour tout élément concernant l'état du logement, et durant le premier mois de la période de chauffe pour les éléments de chauffage (article 3-2 de la loi du 6 juillet 1989).",
    });
  }
  blocks.push({
    t: "signatures",
    date: i.date,
    parties: [
      { role: "Le bailleur", name: landlord.isCompany ? `${landlord.name}${landlord.representative ? `, représentée par ${landlord.representative}` : ""}` : landlord.name, image: i.signatures?.landlord },
      ...t.tenants.map((p, k) => ({ role: t.tenants.length > 1 ? `Locataire ${k + 1}` : "Le locataire", name: personName(p), image: i.signatures?.tenants?.[k] })),
    ],
  });
  if (photoIds.length) {
    blocks.push({ t: "pagebreak" });
    blocks.push({ t: "h", text: "Photographies" });
    blocks.push({ t: "photos", items: photoIds });
  }
  return {
    title: exit ? "État des lieux de sortie" : "État des lieux d'entrée",
    subtitle: ctx.address,
    reference: `${INSPECTION_VERSION.label}`,
    blocks,
    fileName: `edl-${exit ? "sortie" : "entree"}-${slug(ctx.unit.name)}-${i.date ?? ""}.pdf`,
  };
}

function partiesBlock(ctx: DocContext): Block {
  return {
    t: "kv",
    rows: [
      ["Bailleur", landlordLine(ctx.landlord)],
      [ctx.tenancy.tenants.length > 1 ? "Locataires" : "Locataire", tenantsLabel(ctx.tenancy)],
      ["Logement", ctx.address],
    ],
  };
}

function signatureOf(ctx: DocContext, date: string): Block {
  return { t: "signatures", date, parties: [{ role: "Le bailleur", name: ctx.landlord.isCompany ? `${ctx.landlord.name}${ctx.landlord.representative ? `, ${ctx.landlord.representative}` : ""}` : ctx.landlord.name, image: ctx.tenancy.signatures?.landlord }] };
}

const LEGAL_NOTE = "Document délivré gratuitement, sur demande du locataire (article 21 de la loi n° 89-462 du 6 juillet 1989). Aucuns frais ne peuvent être facturés au locataire pour son établissement ou sa transmission.";

export function receiptDocument(ctx: DocContext, r: Exclude<MonthReceipt, { kind: "aucun" }>, issuedAt: string): LegalDoc {
  const period = monthLong(r.month);
  const blocks: Block[] = [partiesBlock(ctx)];
  if (r.kind === "quittance") {
    blocks.push({
      t: "p",
      text: `Je soussigné(e), bailleur du logement désigné ci-dessus, déclare avoir reçu de ${tenantsLabel(ctx.tenancy)} la somme de ${money(r.total)} au titre du paiement du loyer et des charges pour la période de ${period}${r.paidDate ? `, le ${dateLong(r.paidDate)}` : ""}, et lui en donne quittance, sous réserve de tous mes droits.`,
    });
    blocks.push({
      t: "table",
      head: ["Détail", "Montant"],
      widths: [70, 30],
      rows: [
        [`Loyer hors charges — ${period}${r.prorata ? ` (prorata ${r.prorata.days}/${r.prorata.total} jours)` : ""}`, money(r.rent)],
        [`Provisions sur charges — ${period}`, money(r.charges)],
        ["Total payé", money(r.total)],
      ],
      totalRow: true,
    });
  } else {
    blocks.push({
      t: "p",
      text: `Je soussigné(e), bailleur du logement désigné ci-dessus, déclare avoir reçu de ${tenantsLabel(ctx.tenancy)} la somme de ${money(r.received)}${r.paidDate ? `, le ${dateLong(r.paidDate)}` : ""}, en paiement partiel des sommes dues pour la période de ${period}.`,
    });
    blocks.push({
      t: "table",
      head: ["Détail", "Montant"],
      widths: [70, 30],
      rows: [
        [`Loyer hors charges dû — ${period}`, money(r.rent)],
        [`Provisions sur charges dues — ${period}`, money(r.charges)],
        ["Total dû pour la période", money(r.total)],
        ["Somme reçue", money(r.received)],
        ["Reste dû", money(r.remaining)],
      ],
      totalRow: true,
    });
    blocks.push({ t: "p", small: true, text: "Le présent reçu, délivré en cas de paiement partiel, ne vaut pas quittance." });
  }
  blocks.push({ t: "p", small: true, text: LEGAL_NOTE });
  blocks.push(signatureOf(ctx, issuedAt));
  return {
    title: r.kind === "quittance" ? "Quittance de loyer" : "Reçu de paiement partiel",
    subtitle: `Période : ${period}`,
    reference: RECEIPT_VERSION.label,
    blocks,
    fileName: `${r.kind === "quittance" ? "quittance" : "recu"}-${slug(ctx.unit.name)}-${r.month}.pdf`,
  };
}

export function statementDocument(ctx: DocContext, s: RentStatement, asOf: string, issuedAt: string): LegalDoc {
  const blocks: Block[] = [partiesBlock(ctx)];
  const range = s.from === s.to ? monthLong(s.from) : `de ${monthLong(s.from)} à ${monthLong(s.to)}`;
  if (s.kind === "attestation") {
    blocks.push({
      t: "p",
      text: `Je soussigné(e), bailleur du logement désigné ci-dessus, atteste que ${tenantsLabel(ctx.tenancy)} s'est acquitté(e) de l'intégralité des loyers et charges dus pour la période ${range}, et se trouve à jour de ses paiements au ${dateLong(asOf)}. La présente attestation vaut quittance pour les sommes ci-dessous.`,
    });
  } else {
    blocks.push({
      t: "p",
      text: `Je soussigné(e), bailleur du logement désigné ci-dessus, déclare avoir reçu de ${tenantsLabel(ctx.tenancy)} les sommes détaillées ci-dessous pour la période ${range}. Le locataire n'est pas à jour de ses paiements au ${dateLong(asOf)} : reste dû ${money(s.remaining)}. Le présent reçu ne vaut pas quittance pour les périodes non intégralement payées.`,
    });
  }
  const STATUS: Record<string, string> = { paye: "Payé", partiel: "Partiel", impaye: "Impayé", non_pointe: "—" };
  blocks.push({
    t: "table",
    head: ["Période", "Loyer", "Charges", "Total dû", "Reçu", "Statut"],
    widths: [22, 15, 15, 16, 16, 16],
    rows: [
      ...s.lines.map((l) => [monthLong(l.month), money(l.rent), money(l.charges), money(l.due), money(l.paid), STATUS[l.status]]),
      ["Total", money(s.lines.reduce((a, l) => a + l.rent, 0)), money(s.lines.reduce((a, l) => a + l.charges, 0)), money(s.totalDue), money(s.totalPaid), s.remaining > 0 ? `Reste ${money(s.remaining)}` : "À jour"],
    ],
    totalRow: true,
  });
  blocks.push({ t: "p", small: true, text: LEGAL_NOTE });
  blocks.push(signatureOf(ctx, issuedAt));
  return {
    title: s.kind === "attestation" ? "Attestation de loyers à jour" : "Reçu des sommes versées",
    subtitle: `Situation au ${dateLong(asOf)}`,
    reference: RECEIPT_VERSION.label,
    blocks,
    fileName: `${s.kind === "attestation" ? "attestation" : "recu"}-${slug(ctx.unit.name)}-${asOf}.pdf`,
  };
}

// ——— Courrier de révision annuelle du loyer ———

export interface RevisionLetter {
  /** Date de révision prévue au bail (anniversaire). */
  due: string;
  /** Date d'effet du nouveau loyer. */
  effective: string;
  rent: number;
  newRent: number;
  charges?: number;
  referenceLabel: string;
  referenceValue: number;
  indexLabel: string;
  indexValue: number;
}

const idx = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function revisionDocument(ctx: DocContext, r: RevisionLetter, issuedAt: string): LegalDoc {
  const late = r.effective > r.due;
  const blocks: Block[] = [partiesBlock(ctx)];
  blocks.push({ t: "p", bold: true, text: "Objet : révision annuelle du loyer" });
  blocks.push({ t: "p", text: "Madame, Monsieur," });
  blocks.push({
    t: "p",
    text: `Conformément à la clause de révision de votre bail et à l'article 17-1 de la loi n° 89-462 du 6 juillet 1989, le loyer de votre logement est révisé chaque année en fonction de la variation de l'indice de référence des loyers (IRL) publié par l'INSEE. Le nouveau loyer est calculé comme suit :`,
  });
  const total = r.newRent + (r.charges ?? 0);
  blocks.push({
    t: "table",
    head: ["Détail", "Montant"],
    widths: [70, 30],
    rows: [
      ["Loyer mensuel actuel, hors charges", money(r.rent)],
      [`Indice de référence : ${r.referenceLabel}`, idx(r.referenceValue)],
      [`Nouvel indice : ${r.indexLabel}`, idx(r.indexValue)],
      [`Calcul : ${money(r.rent)} × ${idx(r.indexValue)} ÷ ${idx(r.referenceValue)}`, money(r.newRent)],
      ...(r.charges ? ([["Provisions sur charges (inchangées)", money(r.charges)]] as string[][]) : []),
      ["Nouveau montant mensuel", money(total)],
    ],
    totalRow: true,
  });
  blocks.push({
    t: "p",
    text: late
      ? `La date de révision prévue était le ${dateLong(r.due)}. Conformément à l'article 17-1 de la loi du 6 juillet 1989, la révision prend effet à la date de la présente demande, soit le ${dateLong(r.effective)}, sans effet rétroactif.`
      : `Ce nouveau loyer s'applique à compter du ${dateLong(r.effective)}, date anniversaire de votre bail.`,
  });
  blocks.push({ t: "p", text: `Le montant de votre loyer passe ainsi de ${money(r.rent)} à ${money(r.newRent)} hors charges, soit ${money(total)} par mois charges comprises. Si vous réglez par virement permanent, nous vous remercions de bien vouloir le modifier en conséquence.` });
  blocks.push({ t: "p", text: "Nous vous prions d'agréer, Madame, Monsieur, l'expression de nos salutations distinguées." });
  blocks.push(signatureOf(ctx, issuedAt));
  return {
    title: "Révision du loyer",
    subtitle: `À compter du ${dateLong(r.effective)}`,
    reference: REVISION_LETTER_VERSION.label,
    blocks,
    fileName: `revision-loyer-${slug(ctx.unit.name)}-${r.effective.slice(0, 7)}.pdf`,
  };
}
