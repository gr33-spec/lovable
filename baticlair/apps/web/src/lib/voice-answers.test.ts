import assert from "node:assert/strict";
import { test } from "node:test";
import { matchAnswers, type VoiceQuestion } from "./voice-answers.ts";

// Les questions de comptoir d'un vrai devis de couvreur (mots du référentiel).
const Q: VoiceQuestion[] = [
  { key: "engine:param:faconnage", text: "Tu façonnes tes bacs toi-même, ou tu les commandes façonnés ?", options: [{ label: "Je façonne (bobines)", value: "1" }, { label: "Je commande façonné (bacs)", value: "2" }] },
  { key: "engine:param:epaisseur_zinc", text: "Épaisseur du zinc ?", options: [{ label: "0,65 mm", value: "0.65" }, { label: "0,70 mm", value: "0.7" }, { label: "0,80 mm", value: "0.8" }] },
  { key: "engine:param:qualite_ardoise", text: "Quelle ardoise : Espagne 1er choix, ou ardoise NF (type Cupa) ?", options: [{ label: "Espagne 1er choix", value: "1" }, { label: "Ardoise NF (type Cupa)", value: "2" }] },
  { key: "engine:param:pente", text: "Quelle est la pente du toit ?", options: [], unit: "°" },
  { key: "ajout:vis", text: "On ajoute les vis à bois ?", options: [{ label: "Oui", value: "oui" }, { label: "Non", value: "non" }] },
  { key: "ajout:silicone", text: "On ajoute le mastic silicone ?", options: [{ label: "Oui", value: "oui" }, { label: "Non", value: "non" }] },
];

const byKey = (m: ReturnType<typeof matchAnswers>) => Object.fromEntries(m.map((x) => [x.key, x.value]));

test("une phrase dictée d'un trait : chaque morceau va à sa question", () => {
  const m = byKey(matchAnswers("Je façonne moi-même, zinc 0,65, ardoise d'Espagne, pente 35 degrés. Les vis oui, le silicone non.", Q));
  assert.deepEqual(m, {
    "engine:param:faconnage": "1",
    "engine:param:epaisseur_zinc": "0.65",
    "engine:param:qualite_ardoise": "1",
    "engine:param:pente": "35",
    "ajout:vis": "oui",
    "ajout:silicone": "non",
  });
});

test("les mots du comptoir suffisent : « commandé en bacs », « NF », « Cupa »", () => {
  const m = byKey(matchAnswers("je les commande en bacs. de la Cupa", Q));
  assert.equal(m["engine:param:faconnage"], "2");
  assert.equal(m["engine:param:qualite_ardoise"], "2");
});

test("un doute ne coche rien : un « oui » seul, un nombre sans unité ni sujet", () => {
  assert.deepEqual(matchAnswers("oui", Q), []);
  assert.deepEqual(matchAnswers("35", Q), []);
});

test("une réponse dite plus loin remplace la première", () => {
  const m = byKey(matchAnswers("zinc 0,65, non plutôt du 0,70", Q));
  assert.equal(m["engine:param:epaisseur_zinc"], "0.7");
});

test("le texte tapé passe par le même chemin", () => {
  const m = byKey(matchAnswers("pente 30°", Q));
  assert.equal(m["engine:param:pente"], "30");
});
