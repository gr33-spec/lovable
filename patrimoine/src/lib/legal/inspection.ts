import type { Inspection, InspectionItem, InspectionRoom, ItemState, KeyItem, MeterReading, Tenancy, Unit } from "../types";

// États des lieux (décret n° 2016-382 du 30 mars 2016). Les pièces et
// éléments sont repris d'un état des lieux à l'autre : à la sortie, l'état
// d'entrée est pré-rempli et seuls les changements sont à signaler ; à
// l'entrée d'un nouveau locataire, l'état constaté à la sortie du précédent
// sert de point de départ.

export const ITEM_STATES: { value: ItemState; label: string; rank: number }[] = [
  { value: "neuf", label: "Neuf", rank: 4 },
  { value: "bon", label: "Bon état", rank: 3 },
  { value: "usage", label: "État d'usage", rank: 2 },
  { value: "mauvais", label: "Mauvais état", rank: 1 },
  { value: "absent", label: "Absent", rank: 0 },
];

export function stateLabel(s: ItemState | undefined): string {
  return ITEM_STATES.find((x) => x.value === s)?.label ?? "Non renseigné";
}

function rank(s: ItemState | undefined): number | undefined {
  return ITEM_STATES.find((x) => x.value === s)?.rank;
}

const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));

const COMMON_ITEMS = ["Sol", "Murs", "Plafond", "Porte(s) et serrure(s)", "Fenêtre(s), vitrage, volets", "Électricité (prises, interrupteurs, éclairage)", "Chauffage (radiateurs)"];
const ROOM_ITEMS: Record<string, string[]> = {
  Entrée: ["Sol", "Murs", "Plafond", "Porte d'entrée et serrure", "Interphone / sonnette", "Électricité (prises, interrupteurs, éclairage)", "Placards"],
  Cuisine: [...COMMON_ITEMS, "Évier et robinetterie", "Plan de travail", "Meubles et placards", "Plaques de cuisson / four", "Hotte / ventilation", "Réfrigérateur (si fourni)"],
  "Salle de bains": [...COMMON_ITEMS, "Baignoire / douche", "Lavabo et robinetterie", "Faïence / joints", "Ventilation (VMC)", "Miroir / accessoires"],
  WC: ["Sol", "Murs", "Plafond", "Porte", "Cuvette, abattant, chasse d'eau", "Lave-mains", "Ventilation", "Électricité (prises, interrupteurs, éclairage)"],
};

export function defaultRoomNames(unit: Pick<Unit, "mainRooms" | "type">): string[] {
  const main = unit.mainRooms ?? ({ studio: 1, T1: 1, T2: 2, T3: 3, T4: 4, "T5+": 5 } as Record<string, number>)[unit.type ?? ""] ?? 2;
  const rooms = ["Entrée", "Séjour"];
  for (let i = 1; i < main; i++) rooms.push(main > 2 ? `Chambre ${i}` : "Chambre");
  rooms.push("Cuisine", "Salle de bains", "WC");
  return rooms;
}

export function itemsFor(room: string): string[] {
  const key = Object.keys(ROOM_ITEMS).find((k) => room.toLowerCase().startsWith(k.toLowerCase()));
  return key ? ROOM_ITEMS[key] : COMMON_ITEMS;
}

export function newRoom(name: string): InspectionRoom {
  return { id: uid(), name, items: itemsFor(name).map((n) => ({ id: uid(), name: n })) };
}

export const DEFAULT_METERS = ["Électricité", "Eau froide", "Eau chaude", "Gaz"];
/** Compteurs proposés selon les équipements connus du logement. */
export function metersFor(unit: Pick<Unit, "heating" | "heatingEnergy" | "hotWater" | "hotWaterEnergy">): string[] {
  const energies = `${unit.heatingEnergy ?? ""} ${unit.hotWaterEnergy ?? ""}`;
  const known = !!(unit.heatingEnergy || unit.hotWaterEnergy);
  return DEFAULT_METERS.filter((m) => {
    if (m === "Gaz") return !known || /gaz/i.test(energies);
    if (m === "Eau chaude") return unit.hotWater !== "individuel";
    return true;
  });
}

export const DEFAULT_KEYS = ["Clés de la porte d'entrée", "Badge / télécommande", "Clé de boîte aux lettres", "Clé de cave / local"];

function copyRooms(rooms: InspectionRoom[], keepStates: boolean): InspectionRoom[] {
  return rooms.map((r) => ({
    id: uid(),
    name: r.name,
    items: r.items.map((i) => ({ id: uid(), name: i.name, state: keepStates ? i.state : undefined, note: keepStates ? i.note : undefined })),
  }));
}

/** État des lieux d'entrée : repris de la dernière sortie du logement si elle existe. */
export function newEntryInspection(unit: Unit, tenancy: Tenancy, previous?: Inspection, date?: string): Inspection {
  const rooms = previous ? copyRooms(previous.rooms, true) : (unit.rooms?.length ? unit.rooms : defaultRoomNames(unit)).map(newRoom);
  const meters: MeterReading[] = previous?.meters.length
    ? previous.meters.map((m) => ({ id: uid(), kind: m.kind, number: m.number, value: m.value }))
    : metersFor(unit).map((k) => ({ id: uid(), kind: k }));
  const keys: KeyItem[] = previous?.keys.length ? previous.keys.map((k) => ({ id: uid(), kind: k.kind, count: k.count })) : DEFAULT_KEYS.map((k) => ({ id: uid(), kind: k }));
  return {
    id: uid(),
    tenancyId: tenancy.id,
    unitId: unit.id,
    kind: "entree",
    date: date ?? tenancy.startDate,
    rooms,
    meters,
    keys,
    heating: previous?.heating,
    hotWater: previous?.hotWater,
  };
}

/** État des lieux de sortie : l'état d'entrée est pré-rempli, seuls les changements sont à saisir. */
export function newExitInspection(unit: Unit, tenancy: Tenancy, entry?: Inspection, date?: string): Inspection {
  const base = entry ?? newEntryInspection(unit, tenancy);
  return {
    id: uid(),
    tenancyId: tenancy.id,
    unitId: unit.id,
    kind: "sortie",
    date: date ?? tenancy.endDate,
    rooms: copyRooms(base.rooms, !!entry),
    meters: base.meters.map((m) => ({ id: uid(), kind: m.kind, number: m.number })),
    keys: base.keys.map((k) => ({ id: uid(), kind: k.kind, count: k.count })),
    heating: base.heating,
    hotWater: base.hotWater,
    entryId: entry?.id,
  };
}

export interface ItemChange {
  room: string;
  item: string;
  entry?: ItemState;
  exit?: ItemState;
  note?: string;
  worse: boolean;
}

/** Comparaison entrée / sortie, pièce par pièce (rapprochement par nom). */
export function compareInspections(entry: Inspection | undefined, exit: Inspection): { changes: ItemChange[]; keysMissing: { kind: string; missing: number }[]; conform: boolean } {
  const changes: ItemChange[] = [];
  for (const room of exit.rooms) {
    const er = entry?.rooms.find((r) => r.name === room.name);
    for (const item of room.items) {
      const ei: InspectionItem | undefined = er?.items.find((i) => i.name === item.name);
      const a = rank(ei?.state);
      const b = rank(item.state);
      if (ei?.state !== item.state || (item.note && item.note !== ei?.note)) {
        changes.push({ room: room.name, item: item.name, entry: ei?.state, exit: item.state, note: item.note, worse: a !== undefined && b !== undefined && b < a });
      }
    }
  }
  const keysMissing: { kind: string; missing: number }[] = [];
  for (const k of entry?.keys ?? []) {
    const back = exit.keys.find((x) => x.kind === k.kind)?.count ?? 0;
    if ((k.count ?? 0) > back) keysMissing.push({ kind: k.kind, missing: (k.count ?? 0) - back });
  }
  const conform = !!entry && !changes.some((c) => c.worse) && keysMissing.length === 0;
  return { changes, keysMissing, conform };
}

/** Mentions requises par le décret n° 2016-382 encore manquantes. */
export function missingMentions(i: Inspection, ctx: { tenantNames: string[]; landlordName?: string; address?: string; tenantNewAddress?: string }): string[] {
  const out: string[] = [];
  if (!i.date) out.push("Date d'établissement");
  if (!ctx.address) out.push("Localisation du logement");
  if (!ctx.landlordName) out.push("Nom ou dénomination du bailleur");
  if (ctx.tenantNames.length === 0) out.push("Nom du ou des locataires");
  if (i.meters.length === 0 || i.meters.every((m) => !m.value)) out.push("Relevés des compteurs individuels");
  if (i.keys.every((k) => !k.count)) out.push("Détail et destination des clés");
  const unrated = i.rooms.reduce((n, r) => n + r.items.filter((it) => !it.state).length, 0);
  if (unrated > 0) out.push(`État de ${unrated} élément(s) non renseigné`);
  if (i.kind === "sortie" && !ctx.tenantNewAddress) out.push("Nouvelle adresse du locataire");
  return out;
}
