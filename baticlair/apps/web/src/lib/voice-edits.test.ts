import assert from "node:assert/strict";
import { test } from "node:test";
import { parseEdits, type VoiceItem } from "./voice-edits.ts";

// Une vraie liste de couvreur (désignations du comptoir).
const ITEMS: VoiceItem[] = [
  { key: "ardoises", label: "Ardoises naturelles Espagne 1er choix 32×22", quantity: "3 633 pièces" },
  { key: "crochets", label: "Crochets d'ardoise inox standard, longueur 11 cm", quantity: "3 706 pièces" },
  { key: "liteaux", label: "Liteaux 18×40", quantity: "812 ml" },
  { key: "contre", label: "Contre-liteaux 27×40", quantity: "149 ml" },
  { key: "ecran", label: "Écran HPV, rouleau 1,50 × 50 m", quantity: "2 rouleaux" },
  { key: "gouttiere", label: "Gouttière zinc demi-ronde dév. 33", quantity: "3 longueurs de 4 m" },
];

test("enlever, mettre, oublier : chaque morceau dit devient une modification d'une ligne", () => {
  const edits = parseEdits("Enlève l'écran. Mets 3800 crochets, j'ai oublié 2 cartouches de silicone.", ITEMS);
  assert.deepEqual(
    edits.map((e) => ({ ...e, heard: undefined })),
    [
      { kind: "remove", itemKey: "ecran", label: "Écran HPV, rouleau 1,50 × 50 m", heard: undefined },
      { kind: "set", itemKey: "crochets", label: "Crochets d'ardoise inox standard, longueur 11 cm", from: "3 706 pièces", to: "3800", unit: "pièces", heard: undefined },
      { kind: "add", label: "Silicone", quantity: "2", unit: "cartouches", heard: undefined },
    ],
  );
});

test("« ajoute 10 crochets » quand ils sont dans la liste : la quantité augmente d'autant", () => {
  const [e] = parseEdits("ajoute 10 crochets", ITEMS);
  assert.equal(e!.kind, "set");
  assert.equal((e as { to: string }).to, "3716");
});

test("la ligne la plus proche gagne (« liteaux » : pas les contre-liteaux) ; rien de ressemblant : rien ne bouge", () => {
  const [a] = parseEdits("retire les liteaux", ITEMS);
  assert.deepEqual([a!.kind, (a as { itemKey: string }).itemKey], ["remove", "liteaux"]);
  // Rien qui ressemble à la liste : dit tel quel, jamais deviné.
  const [b] = parseEdits("enlève les tuiles", ITEMS);
  assert.equal(b!.kind, "unknown");
});

test("un nouvel article sans quantité s'ajoute, avec les mots de l'artisan", () => {
  const [e] = parseEdits("il manque une bande de rive", ITEMS);
  assert.deepEqual([e!.kind, (e as { label: string }).label, (e as { quantity: string | null }).quantity], ["add", "Bande de rive", null]);
});

test("des nombres dits en lettres : « mets deux rouleaux d'écran »", () => {
  const [e] = parseEdits("mets trois rouleaux d'écran", ITEMS);
  assert.deepEqual([e!.kind, (e as { itemKey: string }).itemKey, (e as { to: string }).to, (e as { unit: string }).unit], ["set", "ecran", "3", "rouleaux"]);
});

test("deux lignes aussi proches l'une que l'autre : on ne choisit pas à la place de l'artisan", () => {
  const items: VoiceItem[] = [
    { key: "a", label: "Bande zinc égout", quantity: "5 longueurs" },
    { key: "b", label: "Bande zinc rive", quantity: "3 longueurs" },
  ];
  assert.equal(parseEdits("enlève la bande zinc", items)[0]!.kind, "unknown");
});

test("la parole telle qu'elle vient (retour de Greg, 2026-10-06) : le verbe n'importe où, des mots de remplissage, des nombres en lettres", () => {
  const edits = parseEdits(
    "Ok alors les liteaux c'est 500 mètres. On n'a pas besoin de l'écran. Euh, rajoute deux cent cinquante crochets. Et les ardoises, mets-en trois mille huit cents. Ok c'est tout.",
    ITEMS,
  );
  assert.deepEqual(
    edits.map((e) => (e.kind === "set" ? [e.kind, e.itemKey, e.to] : e.kind === "remove" ? [e.kind, e.itemKey] : [e.kind, e.heard])),
    [
      ["set", "liteaux", "500"],
      ["remove", "ecran"],
      ["set", "crochets", "3956"],
      ["set", "ardoises", "3800"],
    ],
  );
});

test("« Ok » seul ne fait rien et ne dit pas « pas compris »", () => {
  assert.deepEqual(parseEdits("Ok", ITEMS), []);
  assert.deepEqual(parseEdits("ok c'est bon merci", ITEMS), []);
});

test("en retirer quelques-uns : « enlève 1 rouleau d'écran », « 6 crochets en moins »", () => {
  const [a, b] = parseEdits("enlève 1 rouleau d'écran, 6 crochets en moins", ITEMS);
  assert.deepEqual([a!.kind, (a as { to: string }).to], ["set", "1"]);
  assert.deepEqual([b!.kind, (b as { to: string }).to], ["set", "3700"]);
});

test("« 3 rouleaux d'écran au lieu de 2 » : la quantité dite en premier", () => {
  const [e] = parseEdits("il faut 3 rouleaux d'écran au lieu de 2", ITEMS);
  assert.deepEqual([e!.kind, (e as { itemKey: string }).itemKey, (e as { to: string }).to], ["set", "ecran", "3"]);
});

test("sans ponctuation (la dictée n'en met pas toujours) : un nouveau verbe, une nouvelle consigne", () => {
  const edits = parseEdits("ok alors enlève l'écran j'ai oublié 2 cartouches de silicone et mets 3800 crochets", ITEMS);
  assert.deepEqual(
    edits.map((e) => e.kind),
    ["remove", "add", "set"],
  );
  assert.equal((edits[1] as { label: string }).label, "Silicone");
});
