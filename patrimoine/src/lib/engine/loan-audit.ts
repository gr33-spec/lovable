import type { AppData, Building, Loan } from "../types";
import { reliableInitial, reliableStart, scheduleStart } from "../schedule";
import { annuityPayment } from "./loan";
import { monthLabel, parseMonth } from "./dates";
import type { Snapshot } from "./snapshot";

// Vérification croisée des crédits : chaque chiffre est confronté aux autres
// (montant, taux, durée, mensualité, dates, restant dû, doublons). Rien n'est
// corrigé ici : les contradictions sont signalées, avec ce qu'il faut vérifier.

export interface LoanFinding {
  loanId: string;
  /** « critical » : un montant du dossier serait faux ; « advice » : information manquante ou douteuse. */
  severity: "critical" | "advice";
  /** Texte complet (écran « Avant d'envoyer »). */
  text: string;
  /** Mention courte reprise sous la ligne du crédit dans le PDF. */
  short: string;
}

const eur = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;
const month = (key: string) => {
  const m = parseMonth(key);
  return m === undefined ? key : monthLabel(m);
};
const norm = (s?: string) => (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const close = (a: number, b: number, rel = 0.01, abs = 2) => Math.abs(a - b) <= Math.max(abs, Math.abs(b) * rel);

export function auditLoans(data: AppData, snap: Snapshot): LoanFinding[] {
  const out: LoanFinding[] = [];
  const active = data.loans.filter((l) => {
    const r = snap.resolvedLoans.get(l.id);
    return r && !r.finished;
  });
  for (const l of active) {
    const r = snap.resolvedLoans.get(l.id)!;
    const push = (severity: LoanFinding["severity"], text: string, short = text) => out.push({ loanId: l.id, severity, text, short });
    const initial = reliableInitial(l);
    const balance = r.fromMonth > snap.nowMonth ? r.balance : snap.byLoan.get(l.id)?.balance;

    // Montant emprunté : jamais le capital d'un tableau commencé en cours de prêt.
    if (initial.partialFrom) {
      push("advice", `Montant emprunté inconnu : le tableau d'amortissement commence en ${month(initial.partialFrom)}, en cours de prêt. Saisissez le montant de l'offre de prêt (Détails du prêt).`, "Montant emprunté non communiqué (tableau commencé en cours de prêt).");
    }
    if (initial.value !== undefined && balance !== undefined && balance > initial.value * 1.01 + 1) {
      push("critical", `Restant dû (${eur(balance)}) supérieur au montant emprunté (${eur(initial.value)}) : l'un des deux est faux.`, "Incohérence : restant dû supérieur au montant emprunté.");
    }

    // Taux et mensualité improbables (fautes de frappe).
    if (l.ratePct !== undefined && (l.ratePct < 0 || l.ratePct > 12)) push("critical", `Taux de ${l.ratePct.toLocaleString("fr-FR")} % improbable : faute de frappe ?`, "Taux improbable, à vérifier.");
    if (l.monthlyPayment !== undefined && balance !== undefined && balance > 0 && l.monthlyPayment > balance) {
      push("critical", `Mensualité (${eur(l.monthlyPayment)}) supérieure au restant dû (${eur(balance)}) : faute de frappe ?`, "Mensualité supérieure au restant dû, à vérifier.");
    }

    // Saisie manuelle : montant, taux, durée et mensualité doivent se correspondre.
    if (!l.schedule && (l.kind ?? "amortissable") === "amortissable") {
      const start = parseMonth(l.startDate);
      const end = parseMonth(l.endDate);
      const n = l.durationMonths ?? (start !== undefined && end !== undefined ? end - start : undefined);
      if (initial.value && l.ratePct !== undefined && l.ratePct > 0 && n && n > 0 && l.monthlyPayment) {
        const calc = annuityPayment(initial.value, l.ratePct / 1200, n);
        if (!close(calc, l.monthlyPayment, 0.03, 20)) {
          const withInsurance = l.insuranceMonthly && close(calc, l.monthlyPayment - l.insuranceMonthly, 0.03, 20);
          if (withInsurance) push("advice", `Mensualité saisie (${eur(l.monthlyPayment)}) assurance comprise, alors que le champ est hors assurance : l'assurance serait comptée deux fois.`, "Mensualité saisie assurance comprise ?");
          else push("critical", `Mensualité saisie (${eur(l.monthlyPayment)}) différente de celle du montant, du taux et de la durée (${eur(calc)}) : l'une de ces valeurs est fausse.`, `Mensualité incohérente avec montant, taux et durée (calcul : ${eur(calc)}).`);
        }
      }
      if (start !== undefined && end !== undefined && l.durationMonths && Math.abs(start + l.durationMonths - end) > 1) {
        push("advice", `Début (${month(l.startDate!)}) + durée (${l.durationMonths} mois) ne tombent pas sur la fin (${month(l.endDate!)}).`, "Dates et durée incohérentes.");
      }
      const known = parseMonth(l.remainingDate);
      if (l.remaining !== undefined && known !== undefined && snap.nowMonth - known > 24) {
        push("advice", `Capital restant dû saisi en ${month(l.remainingDate!)} : à actualiser (ou importer le tableau).`, `Restant dû connu en ${month(l.remainingDate!)}, projeté depuis.`);
      }
    }

    if (!l.bank && !l.schedule?.meta?.bank) push("advice", "Banque non renseignée.", "Banque non renseignée.");
    // Numéro de prêt noté en commentaire mais pas dans son champ (qui sert à identifier le crédit).
    const inNotes = !l.reference && !l.schedule?.meta?.reference ? l.notes?.match(/pr[êe]t\s*n[°o.]?\s*:?\s*([A-Z0-9][A-Z0-9 -]{4,}[A-Z0-9])/i)?.[1] : undefined;
    if (inNotes) push("advice", `Numéro de prêt « ${inNotes.trim()} » présent dans les notes : à reporter dans le champ « N° de prêt ».`, "Numéro de prêt à reporter depuis les notes.");
  }

  // Doublons : même tableau, ou même nom et mêmes montants.
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];
      const sameFile = !!a.schedule?.fileId && a.schedule.fileId === b.schedule?.fileId;
      const ba = snap.byLoan.get(a.id)?.balance;
      const bb = snap.byLoan.get(b.id)?.balance;
      const sameAmounts = (a.initialAmount !== undefined && a.initialAmount === b.initialAmount) || (ba !== undefined && bb !== undefined && ba > 0 && close(ba, bb, 0.001, 1));
      // Le numéro de prêt de la banque identifie un crédit : deux numéros différents ne sont jamais un doublon.
      const refA = norm(a.reference ?? a.schedule?.meta?.reference);
      const refB = norm(b.reference ?? b.schedule?.meta?.reference);
      const sameRef = refA !== "" && refA === refB && norm(a.bank) === norm(b.bank);
      const differentRefs = refA !== "" && refB !== "" && refA !== refB;
      if (!differentRefs && (sameRef || sameFile || (norm(a.name) !== "" && norm(a.name) === norm(b.name) && sameAmounts))) {
        const why = sameRef ? "même banque, même numéro de prêt" : sameFile ? "même tableau d'amortissement" : "même nom, mêmes montants";
        for (const [x, y] of [[a, b], [b, a]]) {
          if (out.some((f) => f.loanId === x.id && f.short.startsWith("Doublon"))) continue;
          out.push({ loanId: x.id, severity: "critical", text: `Doublon probable avec un autre « ${y.name || y.bank || "Crédit"} » (${why}) : compté deux fois dans les totaux.`, short: "Doublon probable : compté deux fois." });
        }
      }
    }
  }
  return out;
}

/** Date d'acquisition recopiée d'un tableau commencé en cours de prêt (ancienne déduction) : non fiable. */
export function suspectAcquisition(data: AppData, b: Building): boolean {
  if (!b.acquisitionDate) return false;
  return data.loans.some((l: Loan) => {
    if (l.buildingId !== b.id || !l.schedule || scheduleStart(l.schedule.rows, l.schedule.meta) === "first") return false;
    return !!l.startDate && reliableStart(l) === undefined && l.startDate.slice(0, 7) === b.acquisitionDate!.slice(0, 7);
  });
}
