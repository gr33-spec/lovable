import type { Building, Guarantor, Tenancy, Unit } from "../types";
import { addMonthsIso } from "../engine/leases";
import { type Block, type DocContext, type LegalDoc, blank, dateLong, euroWords, landlordLine, money, personName, tenantsLabel } from "./doc";
import { leaseReferenceDate, leaseVersionFor, type LegalVersion } from "./versions";

// Bail de location nue à usage de résidence principale, selon la structure
// du contrat type (décret n° 2015-587, annexe 1) et, pour les baux conclus ou
// renouvelés à compter du 1er octobre 2026, dans sa rédaction issue du décret
// n° 2026-596. Les rédactions qui diffèrent d'une version à l'autre sont
// regroupées dans les fonctions `clause…` ci-dessous.

export interface AnnexDef {
  id: string;
  label: string;
  /** Pertinent pour ce logement (sinon affichée comme « sans objet »). */
  applies: (ctx: { unit: Unit; building?: Building; tenancy: Tenancy }) => boolean;
  required: boolean;
}

const BEFORE_1997 = new Set(["avant_1949", "1949_1974", "1975_1989"]);

export const ANNEXES: AnnexDef[] = [
  { id: "notice", label: "Notice d'information relative aux droits et obligations des locataires et des bailleurs", applies: () => true, required: true },
  { id: "edl", label: "État des lieux d'entrée", applies: () => true, required: true },
  { id: "dpe", label: "Diagnostic de performance énergétique", applies: () => true, required: true },
  { id: "erp", label: "État des risques (de moins de six mois)", applies: () => true, required: true },
  { id: "crep", label: "Constat de risque d'exposition au plomb", applies: ({ building }) => building?.constructionPeriod === "avant_1949", required: true },
  { id: "amiante", label: "Informations sur la présence d'amiante (parties privatives)", applies: ({ building }) => !building?.constructionPeriod || BEFORE_1997.has(building.constructionPeriod), required: true },
  { id: "elec", label: "État de l'installation intérieure d'électricité (installation de plus de 15 ans)", applies: () => true, required: false },
  { id: "gaz", label: "État de l'installation intérieure de gaz (installation de plus de 15 ans)", applies: ({ unit }) => /gaz/i.test(`${unit.heatingEnergy ?? ""} ${unit.hotWaterEnergy ?? ""}`), required: false },
  { id: "bruit", label: "Diagnostic bruit (zone d'exposition au bruit d'un aérodrome)", applies: () => false, required: false },
  { id: "copro", label: "Extrait du règlement de copropriété (destination, jouissance des parties privatives et communes, quote-part des charges)", applies: ({ building }) => building?.legalRegime === "copropriete", required: true },
  { id: "caution", label: "Acte de cautionnement", applies: ({ tenancy }) => (tenancy.guarantors ?? []).some((g) => g.kind === "personne"), required: true },
  { id: "vetuste", label: "Grille de vétusté", applies: () => false, required: false },
];

export const CONSTRUCTION_PERIODS = [
  { value: "avant_1949", label: "Avant 1949" },
  { value: "1949_1974", label: "1949 à 1974" },
  { value: "1975_1989", label: "1975 à 1989" },
  { value: "1990_2005", label: "1990 à 2005" },
  { value: "apres_2005", label: "Depuis 2005" },
] as const;

const periodLabel = (p?: string) => CONSTRUCTION_PERIODS.find((x) => x.value === p)?.label;

/** Délai de la clause résolutoire pour impayé (art. 24, rédaction issue de la loi du 27 juillet 2023). */
function resolutoryDelay(refDate: string | undefined): string {
  return refDate && refDate < "2023-07-29" ? "deux mois" : "six semaines";
}

function clauseResolutoire(version: LegalVersion, t: Tenancy, refDate?: string): Block[] {
  const delay = resolutoryDelay(refDate);
  const blocks: Block[] = [
    {
      t: "p",
      text: `Le présent contrat sera résilié de plein droit à défaut de paiement du loyer ou des charges aux termes convenus, ou à défaut de versement du dépôt de garantie, ${delay} après un commandement de payer demeuré infructueux (article 24 de la loi du 6 juillet 1989).`,
    },
  ];
  if (version.id === "nue-2015") {
    blocks.push({
      t: "p",
      text: "Il sera également résilié de plein droit, un mois après un commandement demeuré infructueux, à défaut pour le locataire de justifier d'une assurance contre les risques locatifs (article 7 g de la loi du 6 juillet 1989).",
    });
    return blocks;
  }
  // Modèle 2026 : clauses résolutoires facultatives.
  const optional: string[] = [];
  if (t.clauseInsurance) {
    optional.push("à défaut pour le locataire de justifier d'une assurance contre les risques locatifs, un mois après un commandement demeuré infructueux (article 7 g de la loi du 6 juillet 1989)");
  }
  if (t.clauseNeighbours) {
    optional.push("en cas de troubles de voisinage constatés par une décision de justice passée en force de chose jugée (article 4 de la loi du 6 juillet 1989)");
  }
  if (t.clauseMainResidence) {
    optional.push("en cas de non-respect de la servitude de résidence principale prévue à l'article L. 151-14-1 du code de l'urbanisme, dans les conditions prévues par ce texte");
  }
  if (optional.length) {
    blocks.push({ t: "p", text: "Le présent contrat sera en outre résilié de plein droit :" });
    blocks.push({ t: "list", items: optional });
  }
  return blocks;
}

export function leaseDocument(ctx: DocContext): LegalDoc {
  const { landlord, unit, building, tenancy: t } = ctx;
  const refDate = leaseReferenceDate(t);
  const version = leaseVersionFor(refDate);
  const v2026 = version.id === "nue-2026";
  const multi = t.tenants.length > 1;
  const blocks: Block[] = [];

  blocks.push({
    t: "p",
    small: true,
    text: "Le régime de droit commun en matière de baux d'habitation est défini principalement par la loi n° 89-462 du 6 juillet 1989 tendant à améliorer les rapports locatifs. Ses dispositions sont d'ordre public : les parties ne peuvent y déroger. Le présent contrat est établi conformément au contrat type défini par le décret n° 2015-587 du 29 mai 2015" + (v2026 ? ", dans sa rédaction issue du décret n° 2026-596 du 6 juillet 2026." : "."),
  });

  // I. Parties
  blocks.push({ t: "h", text: "I. Désignation des parties" });
  blocks.push({ t: "h2", text: "Le bailleur" });
  const landlordRows: [string, string][] = [["Bailleur", landlordLine(landlord)], ["Qualité", landlord.isCompany ? "Personne morale" : "Personne physique"]];
  if (landlord.email) landlordRows.push(["Adresse électronique", landlord.email]);
  if (v2026 && landlord.phone) landlordRows.push(["Téléphone portable", landlord.phone]);
  blocks.push({ t: "kv", rows: landlordRows });
  blocks.push({ t: "p", small: true, text: "Le contrat est conclu sans l'intervention d'un mandataire." });
  blocks.push({ t: "h2", text: multi ? "Les locataires" : "Le locataire" });
  for (const p of t.tenants) {
    const rows: [string, string][] = [["Nom et prénom", blank(personName(p), 24)]];
    if (p.email) rows.push(["Adresse électronique", p.email]);
    if (v2026 && p.phone) rows.push(["Téléphone portable", p.phone]);
    blocks.push({ t: "kv", rows });
  }

  // II. Objet
  blocks.push({ t: "h", text: "II. Objet du contrat" });
  blocks.push({ t: "p", text: "Le présent contrat a pour objet la location d'un logement ainsi déterminé :" });
  blocks.push({ t: "h2", text: "A. Consistance du logement" });
  blocks.push({
    t: "kv",
    rows: [
      ["Localisation", blank(ctx.address, 30)],
      ["Type d'habitat", unit.habitatType === "individuel" ? "Individuel" : unit.habitatType === "collectif" ? "Immeuble collectif" : blank(undefined)],
      ["Régime juridique de l'immeuble", building?.legalRegime === "copropriete" ? "Copropriété" : building?.legalRegime === "monopropriete" ? "Monopropriété" : blank(undefined)],
      ["Période de construction", periodLabel(building?.constructionPeriod) ?? blank(undefined)],
      ["Surface habitable", unit.surface ? `${String(unit.surface).replace(".", ",")} m²` : blank(undefined)],
      ["Nombre de pièces principales", unit.mainRooms ? String(unit.mainRooms) : blank(undefined, 4)],
      ["Éléments d'équipement du logement", unit.equipments || "Néant"],
      ["Modalité de production de chauffage", unit.heating ? `${unit.heating === "collectif" ? "Collectif" : "Individuel"}${unit.heatingEnergy ? ` — ${unit.heatingEnergy}` : ""}` : blank(undefined)],
      ["Modalité de production d'eau chaude sanitaire", unit.hotWater ? `${unit.hotWater === "collectif" ? "Collective" : "Individuelle"}${unit.hotWaterEnergy ? ` — ${unit.hotWaterEnergy}` : ""}` : blank(undefined)],
      ["Performance énergétique (DPE)", unit.dpeClass ? `Classe ${unit.dpeClass}` : blank(undefined, 4)],
      [
        "Montant estimé des dépenses annuelles d'énergie pour un usage standard",
        unit.energyCostMin || unit.energyCostMax
          ? `Entre ${money(unit.energyCostMin)} et ${money(unit.energyCostMax)} par an${unit.energyCostYear ? ` (prix de référence ${unit.energyCostYear})` : ""}`
          : blank(undefined),
      ],
    ],
  });
  blocks.push({ t: "h2", text: "B. Destination des locaux" });
  blocks.push({
    t: "p",
    text: v2026
      ? "Usage d'habitation. Le logement constitue la résidence principale du locataire, au sens de l'article 2 de la loi du 6 juillet 1989 (logement occupé au moins huit mois par an)."
      : "Usage d'habitation, à titre de résidence principale du locataire.",
  });
  blocks.push({ t: "h2", text: "C. Locaux et équipements accessoires à usage privatif" });
  blocks.push({ t: "p", text: unit.accessories || "Néant." });
  blocks.push({ t: "h2", text: "D. Locaux, parties, équipements et accessoires à usage commun" });
  blocks.push({ t: "p", text: building?.commonFacilities || "Néant." });

  // III. Durée
  blocks.push({ t: "h", text: "III. Date de prise d'effet et durée du contrat" });
  blocks.push({
    t: "kv",
    rows: [
      ["Date de prise d'effet", dateLong(t.startDate)],
      ["Durée du contrat", t.durationYears ? `${t.durationYears} ans` : blank(undefined, 6)],
    ],
  });
  blocks.push({
    t: "p",
    small: true,
    text: "En l'absence de proposition de renouvellement du contrat, celui-ci est, à son terme, reconduit tacitement pour une durée égale (article 10 de la loi du 6 juillet 1989). Le locataire peut mettre fin au bail à tout moment, après avoir donné congé ; le bailleur peut, à l'expiration du bail, y mettre fin en donnant congé pour vendre le logement, pour l'habiter lui-même ou le faire habiter par un proche, ou pour un motif sérieux et légitime, dans les conditions de l'article 15 de la même loi.",
  });

  // IV. Conditions financières
  blocks.push({ t: "h", text: "IV. Conditions financières" });
  blocks.push({ t: "h2", text: "A. Loyer" });
  const rentRows: [string, string][] = [["Montant du loyer mensuel", `${money(t.rent)} (${t.rent ? euroWords(t.rent) : "____"})`]];
  rentRows.push(["Soumis au décret fixant annuellement le montant maximum d'évolution des loyers à la relocation", building?.zoneTendue ? "Oui" : "Non"]);
  if (building?.rentControl) {
    rentRows.push(["Loyer de référence", t.referenceRent ? `${money(t.referenceRent)} / m² / mois` : blank(undefined)]);
    rentRows.push(["Loyer de référence majoré", t.referenceRentMax ? `${money(t.referenceRentMax)} / m² / mois` : blank(undefined)]);
    if (t.rentSupplement) rentRows.push(["Complément de loyer", `${money(t.rentSupplement)} — ${t.rentSupplementReason ?? ""}`]);
  }
  blocks.push({ t: "kv", rows: rentRows });
  blocks.push({
    t: "p",
    text: `Révision du loyer : le loyer est révisé chaque année à la date anniversaire du contrat, en fonction de la variation de l'indice de référence des loyers publié par l'INSEE. Trimestre de référence : ${t.indexLabel ? t.indexLabel : blank(undefined)}${t.indexValue ? ` (valeur ${String(t.indexValue).replace(".", ",")})` : ""}.`,
  });
  if (building?.zoneTendue && t.previousTenantRent) {
    blocks.push({ t: "h2", text: "Informations relatives au loyer du dernier locataire" });
    blocks.push({
      t: "kv",
      rows: [
        ["Montant du dernier loyer acquitté par le précédent locataire", money(t.previousTenantRent)],
        ["Date de versement", dateLong(t.previousTenantRentDate)],
        ["Date de la dernière révision", dateLong(t.previousRevisionDate)],
      ],
    });
  }
  blocks.push({ t: "h2", text: "B. Charges récupérables" });
  blocks.push({
    t: "p",
    text:
      t.chargesMode === "forfait"
        ? `Modalité de règlement : forfait de charges. Montant mensuel : ${money(t.charges)}.`
        : `Modalité de règlement : provisions sur charges avec régularisation annuelle. Montant des provisions mensuelles : ${money(t.charges)}.`,
  });
  blocks.push({ t: "h2", text: "C. Modalités de paiement" });
  const total = (t.rent ?? 0) + (t.charges ?? 0);
  blocks.push({
    t: "kv",
    rows: [
      ["Périodicité", "Mensuelle"],
      ["Paiement", t.paymentTerm === "echu" ? "À terme échu" : "À échoir (d'avance)"],
      ["Date de paiement", t.paymentDay ? `Le ${t.paymentDay === 1 ? "1er" : t.paymentDay} de chaque mois` : blank(undefined)],
      ["Lieu et moyen de paiement", t.paymentMethod || "Virement bancaire"],
      ["Montant total dû pour la première période", `${money(t.rent)} de loyer et ${money(t.charges)} de charges, soit ${money(total)}`],
    ],
  });

  // V. Travaux
  blocks.push({ t: "h", text: "V. Travaux" });
  blocks.push({
    t: "p",
    text: t.worksSinceLastLease
      ? `Travaux d'amélioration ou de mise en conformité réalisés depuis la fin du dernier contrat de location : ${t.worksSinceLastLease}${t.worksAmount ? ` (montant : ${money(t.worksAmount)})` : ""}.`
      : "Aucuns travaux d'amélioration ou de mise en conformité réalisés depuis la fin du dernier contrat de location.",
  });
  if (t.worksPlanned) blocks.push({ t: "p", text: `Travaux convenus : ${t.worksPlanned}.` });

  // VI. Garanties
  blocks.push({ t: "h", text: "VI. Garanties" });
  blocks.push({
    t: "p",
    text: `Montant du dépôt de garantie de l'exécution des obligations du locataire : ${money(t.deposit)}${t.deposit ? ` (${euroWords(t.deposit)})` : ""}, ne pouvant excéder un mois de loyer en principal (article 22 de la loi du 6 juillet 1989). Il est restitué dans un délai d'un mois à compter de la remise des clés lorsque l'état des lieux de sortie est conforme à l'état des lieux d'entrée, de deux mois dans le cas contraire, déduction faite des sommes restant dues au bailleur et dûment justifiées.`,
  });
  const guarantors = (t.guarantors ?? []).filter((g) => g.kind === "personne");
  const visale = (t.guarantors ?? []).find((g) => g.kind === "visale");
  if (guarantors.length) {
    blocks.push({ t: "p", text: `Cautionnement : ${guarantors.map((g) => personName(g)).join(", ")} se porte${guarantors.length > 1 ? "nt" : ""} caution des obligations du locataire, selon l'acte de cautionnement annexé.` });
  }
  if (visale) blocks.push({ t: "p", text: `Garantie Visale${visale.visaNumber ? ` (visa n° ${visale.visaNumber})` : ""}.` });

  // VII. Solidarité
  blocks.push({ t: "h", text: "VII. Clause de solidarité" });
  blocks.push({
    t: "p",
    text: multi
      ? "Les locataires sont tenus solidairement et indivisiblement de l'exécution des obligations du présent contrat."
      : "Sans objet (un seul locataire).",
  });

  // VIII. Clause résolutoire
  blocks.push({ t: "h", text: "VIII. Clause résolutoire" });
  blocks.push(...clauseResolutoire(version, t, refDate));

  // IX. Honoraires
  blocks.push({ t: "h", text: "IX. Honoraires de location" });
  blocks.push({ t: "p", text: "Le présent contrat est conclu directement entre les parties, sans intermédiaire : aucun honoraire n'est dû." });

  // X. Conditions particulières
  blocks.push({ t: "h", text: "X. Autres conditions particulières" });
  blocks.push({ t: "p", text: t.specialConditions || "Néant." });

  // XI. Annexes
  blocks.push({ t: "h", text: "XI. Annexes" });
  const joined = new Set(t.annexes ?? []);
  const applicable = ANNEXES.filter((a) => a.applies({ unit, building, tenancy: t }) || joined.has(a.id));
  blocks.push({ t: "p", text: "Sont annexées et jointes au présent contrat les pièces suivantes :" });
  blocks.push({ t: "checks", items: applicable.map((a) => ({ label: a.label, checked: joined.has(a.id) })) });

  blocks.push({
    t: "signatures",
    place: t.signPlace,
    date: t.signDate,
    parties: [
      { role: "Le bailleur", name: landlord.isCompany ? `${landlord.name}${landlord.representative ? `, représentée par ${landlord.representative}` : ""}` : landlord.name, image: t.signatures?.landlord, mention: "Signature précédée de la mention « Lu et approuvé »" },
      ...t.tenants.map((p, i) => ({ role: multi ? `Locataire ${i + 1}` : "Le locataire", name: personName(p), image: t.signatures?.tenants?.[i], mention: "Signature précédée de la mention « Lu et approuvé »" })),
    ],
  });
  blocks.push({ t: "p", small: true, text: `Fait en ${t.tenants.length + 1} exemplaires originaux, dont un remis à chaque signataire${guarantors.length ? " ; un exemplaire est en outre remis à la caution" : ""}.` });

  return {
    title: "Contrat de location",
    subtitle: "Logement nu à usage de résidence principale",
    reference: `Modèle ${version.id} — ${version.label}`,
    blocks,
    fileName: `bail-${slug(unit.name)}-${slug(tenantsLabel(t))}.pdf`,
  };
}

/** Engagement de la caution : un loyer charges comprises par mois, pour toute la durée du bail par défaut. */
export function guaranteeTerms(t: Pick<Tenancy, "rent" | "charges" | "durationYears" | "startDate">, g: Pick<Guarantor, "monthlyAmount" | "wholeLease" | "durationYears" | "maxAmount">) {
  const monthly = g.monthlyAmount ?? Math.round(((t.rent ?? 0) + (t.charges ?? 0)) * 100) / 100;
  const years = g.wholeLease === false ? g.durationYears ?? t.durationYears ?? 3 : t.durationYears ?? 3;
  const months = years * 12;
  const max = g.wholeLease === false && g.maxAmount ? g.maxAmount : Math.round(monthly * months * 100) / 100;
  const end = g.wholeLease !== false && t.startDate ? addMonthsIso(t.startDate, months) : undefined;
  return { monthly, months, max, end, years };
}

/** Acte de cautionnement (article 22-1 de la loi du 6 juillet 1989, articles 2288 et suivants du code civil). */
export function guaranteeDocument(ctx: DocContext, index = 0): LegalDoc | undefined {
  const { landlord, tenancy: t } = ctx;
  const g = (t.guarantors ?? []).filter((x) => x.kind === "personne")[index];
  if (!g) return undefined;
  const terms = guaranteeTerms(t, g);
  const blocks: Block[] = [
    { t: "h", text: "Parties" },
    {
      t: "kv",
      rows: [
        ["La caution", `${blank(personName(g), 24)}${g.birthDate ? `, née le ${dateLong(g.birthDate)}` : ""}${g.birthPlace ? ` à ${g.birthPlace}` : ""}, demeurant ${blank(g.address, 30)}`],
        ["Le bailleur (créancier)", landlordLine(landlord)],
        [t.tenants.length > 1 ? "Les locataires (débiteurs)" : "Le locataire (débiteur)", tenantsLabel(t)],
        ["Logement loué", ctx.address],
      ],
    },
    { t: "h", text: "Objet et étendue de l'engagement" },
    {
      t: "p",
      text: `La caution déclare se porter caution des obligations résultant du contrat de location conclu le ${dateLong(t.signDate)} pour le logement désigné ci-dessus, dont elle reconnaît avoir reçu un exemplaire.`,
    },
    {
      t: "kv",
      rows: [
        ["Montant du loyer mensuel", money(t.rent)],
        ["Charges mensuelles", money(t.charges)],
        ["Conditions de révision du loyer", `Révision annuelle à la date anniversaire du contrat selon l'indice de référence des loyers (trimestre de référence : ${t.indexLabel ?? blank(undefined)})`],
        ["Montant garanti", `${money(terms.monthly)} par mois (loyer et charges)`],
        ["Montant maximal garanti (principal et accessoires)", `${money(terms.max)} (${euroWords(terms.max)})`],
        [
          "Durée de l'engagement",
          g.wholeLease === false
            ? `${terms.years} ans à compter du ${dateLong(t.startDate)}`
            : `Pendant toute la durée du bail, soit ${terms.years} ans à compter du ${dateLong(t.startDate)}${terms.end ? ` (jusqu'au ${dateLong(terms.end)})` : ""}`,
        ],
      ],
    },
    {
      t: "box",
      title: "Mention à écrire de la main de la caution (article 2297 du code civil)",
      text: "La caution indique elle-même qu'elle s'engage en qualité de caution à payer au bailleur ce que lui doit le locataire en cas de défaillance de celui-ci, dans la limite d'un montant en principal et accessoires exprimé en toutes lettres et en chiffres, et pour la durée indiquée ci-dessus.",
      lines: 6,
    },
    {
      t: "signatures",
      date: t.signDate,
      place: t.signPlace,
      parties: [
        { role: "La caution", name: personName(g) },
        { role: "Le bailleur", name: landlord.name },
      ],
    },
  ];
  const version = leaseVersionFor(leaseReferenceDate(t));
  return {
    title: "Acte de cautionnement",
    subtitle: "Location nue à usage de résidence principale",
    reference: `Acte de cautionnement — art. 22-1 loi n° 89-462 et art. 2297 C. civ. — bail ${version.id}`,
    blocks,
    fileName: `caution-${slug(personName(g))}.pdf`,
  };
}

/** Échéance de la période initiale du bail. */
export function leaseTermEnd(t: Tenancy): string | undefined {
  if (!t.startDate || !t.durationYears) return undefined;
  return addMonthsIso(t.startDate, t.durationYears * 12);
}

export function slug(s: string): string {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "document"
  );
}
