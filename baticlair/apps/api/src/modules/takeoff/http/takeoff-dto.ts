import type { ArtisanView, PurchaseView } from "@baticlair/domain";
import { artisanNotes } from "../../../platform/ai/artisan-notes.js";
import type { ReviewedTakeoff } from "../application/takeoff.service.js";

/**
 * Ce que reçoit l'écran : compteurs, décisions, ouvrages demandés pour leur
 * mesure, et pour chaque élément sa PREUVE (« Voir le calcul ») — critères et
 * origines, calcul détaillé pour un besoin calculé. Aucun pourcentage.
 */
function purchaseDto(p: PurchaseView) {
  return {
    understood: p.understood,
    toBuy: p.toBuy.map((b) => ({ key: b.key, label: b.label, quantity: b.quantity, approx: b.approx, kind: b.kind, needIds: b.needIds, lineIds: b.lineIds, state: b.state, assumptionKeys: b.assumptionKeys, edited: b.edited ?? [] })),
    groups: p.groups.map((g) => ({ key: g.key, label: g.label, measure: g.measure, itemKeys: g.itemKeys })),
    toQuote: p.toQuote.map((q) => ({ key: q.key, label: q.label, measure: q.measure, reason: q.reason, lineIds: q.lineIds })),
    assumptions: p.assumptions.map((a) => ({ key: a.key, label: a.label, value: a.value, unit: a.unit, note: a.note ?? null, choices: a.choices ?? [] })),
    canValidate: p.canValidate,
  };
}

function viewDto(view: ArtisanView) {
  return {
    counts: { verified: view.counts.verified, toConfirm: view.counts.to_confirm, missing: view.counts.missing },
    decisions: view.decisions.map((d) => ({
      key: d.key,
      state: d.state === "to_confirm" ? "to_confirm" : "missing",
      title: d.title,
      text: d.text,
      lineIds: d.lineIds,
      pieceLineIds: d.pieceLineIds ?? [],
      primary: d.primary,
      secondary: d.secondary,
      question: d.question
        ? { key: d.question.key, kind: d.question.kind, unit: d.question.unit ?? null, hint: d.question.hint ?? null, options: d.question.options ?? [], impact: d.question.impact ?? null }
        : null,
    })),
    measures: view.measures,
    // Les trois niveaux, ligne par ligne : lu dans le devis → il faut → à commander.
    ouvrages: view.ouvrages.map((o) => ({
      lineId: o.lineId,
      designation: o.designation,
      role: o.role,
      read: o.read,
      needs: o.needs.map((n) => ({
        slot: n.slot,
        label: n.label,
        origin: n.origin,
        need: n.need,
        needRange: n.needRange,
        order: n.order,
        missing: n.missing,
        provisional: n.provisional,
        usual: n.usual,
        state: n.state,
      })),
      direct: o.direct,
      pending: o.pending,
      state: o.state,
    })),
    items: view.items.map((i) => ({
      kind: i.kind,
      id: i.id,
      label: i.label,
      quantity: i.quantity,
      state: i.state === "to_confirm" ? "to_confirm" : i.state,
      reason: i.reason,
      proof: i.assessment.criteria.map((c) => ({ key: c.key, status: c.status, detail: c.detail, origin: c.origin ?? null, comparisonRisk: c.comparisonRisk ?? false })),
      calculation: i.need
        ? {
            slot: i.need.slot,
            formula: i.need.formula ?? null,
            exclusions: i.need.exclusions ?? null,
            productOrigin: i.need.productOrigin ?? null,
            trace: i.need.trace.map((t) => ({ label: t.label, value: t.shown ?? t.value, unit: t.unit, from: t.from, origin: t.origin ?? null, url: t.url ?? null })),
          }
        : null,
    })),
  };
}

export function takeoffDto({ takeoff, validation, view, roles, purchase }: ReviewedTakeoff) {
  const byId = new Map(validation.lines.map((v) => [v.lineId, v]));
  return {
    id: takeoff.id,
    projectId: takeoff.projectId,
    documentId: takeoff.documentId,
    status: takeoff.status,
    view: viewDto(view),
    purchase: purchaseDto(purchase),
    model: takeoff.model,
    promptVersion: takeoff.promptVersion,
    notes: artisanNotes(takeoff.notes),
    createdAt: takeoff.createdAt.toISOString(),
    validatedAt: takeoff.validatedAt?.toISOString() ?? null,
    counts: validation.counts,
    issues: validation.issues.map((i) => ({ code: i.code, severity: i.severity, message: i.message, lineIds: i.lineIds ?? [] })),
    lines: takeoff.lines.map((l) => {
      const v = byId.get(l.id);
      return {
        id: l.id,
        position: l.position,
        designation: l.designation,
        quantity: l.quantityRaw,
        unit: l.unitRaw,
        reference: l.reference,
        sourceRefs: l.sourceRefs,
        sourcePages: l.sourcePages,
        section: l.section,
        origin: l.origin,
        edited: l.edited,
        aiDoubt: l.aiDoubt,
        confirmed: l.confirmed,
        kind: v?.kind ?? "unknown",
        family: v?.familyLabel ?? null,
        basis: v?.basis ?? "purchase",
        role: roles.get(l.id)?.role ?? null,
        roleWhy: roles.get(l.id)?.why ?? null,
        status: v?.status ?? "to_verify",
        issues: (v?.issues ?? []).map((i) => ({ code: i.code, severity: i.severity, message: i.message })),
      };
    }),
  };
}
