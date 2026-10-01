import { Decimal } from "../shared/decimal.js";
import { DIMENSIONLESS, dimLabel, mulDim, sameDim, type Dim } from "./units.js";

/**
 * Formules du référentiel : un petit langage arithmétique, lu par un
 * analyseur écrit ici (jamais d'`eval`). Les variables sont des paramètres
 * de l'ouvrage (« surface », « pureau ») ou des caractéristiques produit
 * (« tuile.largeur_utile »). Chaque valeur porte sa dimension : la formule
 * est contrôlée avant tout calcul.
 *
 *   nombres          12   0,5 n'existe pas (le point : 0.5)
 *   opérations       + - * / et parenthèses
 *   comparaisons     < <= > >=   (dans si(...) uniquement)
 *   fonctions        arrondi_sup(x)  arrondi_inf(x)  min(a, b…)  max(a, b…)
 *                    si(condition, alors, sinon)
 */
export type Expr =
  | { type: "num"; value: string }
  | { type: "var"; name: string }
  | { type: "neg"; arg: Expr }
  | { type: "bin"; op: "+" | "-" | "*" | "/" | "<" | "<=" | ">" | ">="; left: Expr; right: Expr }
  | { type: "call"; fn: Fn; args: Expr[] };

type Fn = "arrondi_sup" | "arrondi_inf" | "min" | "max" | "si";
const FUNCTIONS: readonly Fn[] = ["arrondi_sup", "arrondi_inf", "min", "max", "si"];

export class FormulaError extends Error {
  override name = "FormulaError";
}

type Token = { kind: "num" | "id" | "op"; text: string };

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  const re = /\s*(?:(\d+(?:\.\d+)?)|([a-z_][a-z0-9_]*(?:\.[a-z0-9_]+)*)|(<=|>=|[-+*/(),<>]))/gy;
  let m: RegExpExecArray | null;
  let last = 0;
  while ((m = re.exec(src)) !== null) {
    if (m[0].length === 0) break;
    last = re.lastIndex;
    if (m[1]) tokens.push({ kind: "num", text: m[1] });
    else if (m[2]) tokens.push({ kind: "id", text: m[2] });
    else if (m[3]) tokens.push({ kind: "op", text: m[3] });
  }
  if (src.slice(last).trim() !== "") throw new FormulaError(`Formule illisible près de « ${src.slice(last).trim()} »`);
  return tokens;
}

/** Analyse une formule ; lève FormulaError si elle est mal écrite. */
export function parseFormula(src: string): Expr {
  const tokens = tokenize(src);
  let i = 0;
  const peek = () => tokens[i];
  const take = (text?: string): Token => {
    const t = tokens[i];
    if (!t || (text !== undefined && t.text !== text)) throw new FormulaError(`« ${text ?? "valeur"} » attendu dans « ${src} »`);
    i++;
    return t;
  };

  function primary(): Expr {
    const t = peek();
    if (!t) throw new FormulaError(`Formule incomplète : « ${src} »`);
    if (t.kind === "num") {
      i++;
      return { type: "num", value: t.text };
    }
    if (t.kind === "id") {
      i++;
      if (peek()?.text === "(") {
        if (!FUNCTIONS.includes(t.text as Fn)) throw new FormulaError(`Fonction inconnue : ${t.text}`);
        take("(");
        const args = [comparison()];
        while (peek()?.text === ",") {
          take(",");
          args.push(comparison());
        }
        take(")");
        return { type: "call", fn: t.text as Fn, args };
      }
      return { type: "var", name: t.text };
    }
    if (t.text === "(") {
      take("(");
      const e = comparison();
      take(")");
      return e;
    }
    if (t.text === "-") {
      take("-");
      return { type: "neg", arg: primary() };
    }
    throw new FormulaError(`« ${t.text} » inattendu dans « ${src} »`);
  }
  function product(): Expr {
    let left = primary();
    while (peek()?.text === "*" || peek()?.text === "/") {
      const op = take().text as "*" | "/";
      left = { type: "bin", op, left, right: primary() };
    }
    return left;
  }
  function sum(): Expr {
    let left = product();
    while (peek()?.text === "+" || peek()?.text === "-") {
      const op = take().text as "+" | "-";
      left = { type: "bin", op, left, right: product() };
    }
    return left;
  }
  function comparison(): Expr {
    const left = sum();
    const op = peek()?.text;
    if (op === "<" || op === "<=" || op === ">" || op === ">=") {
      take();
      return { type: "bin", op, left, right: sum() };
    }
    return left;
  }

  const expr = comparison();
  if (i !== tokens.length) throw new FormulaError(`« ${tokens[i]!.text} » en trop dans « ${src} »`);
  return expr;
}

/** Variables citées par la formule (sans doublon, dans l'ordre). */
export function formulaVariables(expr: Expr): string[] {
  const out: string[] = [];
  const walk = (e: Expr) => {
    if (e.type === "var") {
      if (!out.includes(e.name)) out.push(e.name);
    } else if (e.type === "neg") walk(e.arg);
    else if (e.type === "bin") {
      walk(e.left);
      walk(e.right);
    } else if (e.type === "call") e.args.forEach(walk);
  };
  walk(expr);
  return out;
}

export interface DimValue {
  /** En unités de base (m, kg, pièces). */
  value: Decimal;
  dim: Dim;
}

function requireSame(a: Dim, b: Dim, what: string): void {
  if (!sameDim(a, b)) throw new FormulaError(`${what} : ${dimLabel(a)} et ${dimLabel(b)} ne se combinent pas`);
}

function combine(op: Extract<Expr, { type: "bin" }>["op"], a: Dim, b: Dim): Dim {
  switch (op) {
    case "+":
    case "-":
      requireSame(a, b, `« ${op} »`);
      return a;
    case "*":
      return mulDim(a, b);
    case "/":
      return mulDim(a, b, -1);
    default:
      requireSame(a, b, `Comparaison « ${op} »`);
      return DIMENSIONLESS;
  }
}

function callDim(fn: Fn, dims: Dim[]): Dim {
  switch (fn) {
    case "arrondi_sup":
    case "arrondi_inf":
      if (dims.length !== 1) throw new FormulaError(`${fn} prend une seule valeur`);
      // On n'arrondit que des pièces : arrondir des mètres dépend de l'unité, donc on le refuse.
      requireSame(dims[0]!, DIMENSIONLESS, fn);
      return DIMENSIONLESS;
    case "min":
    case "max":
      if (dims.length < 2) throw new FormulaError(`${fn} prend au moins deux valeurs`);
      dims.slice(1).forEach((d) => requireSame(dims[0]!, d, fn));
      return dims[0]!;
    case "si":
      if (dims.length !== 3) throw new FormulaError("si(condition, alors, sinon)");
      requireSame(dims[1]!, dims[2]!, "si");
      return dims[1]!;
  }
}

/** Dimension du résultat, sans rien calculer (contrôle au chargement du référentiel). */
export function inferDim(expr: Expr, dimOf: (name: string) => Dim): Dim {
  switch (expr.type) {
    case "num":
      return DIMENSIONLESS;
    case "var":
      return dimOf(expr.name);
    case "neg":
      return inferDim(expr.arg, dimOf);
    case "bin":
      return combine(expr.op, inferDim(expr.left, dimOf), inferDim(expr.right, dimOf));
    case "call":
      return callDim(
        expr.fn,
        expr.args.map((a) => inferDim(a, dimOf)),
      );
  }
}

/** Calcul exact (décimaux), dimensions vérifiées à chaque étape. */
export function evaluate(expr: Expr, valueOf: (name: string) => DimValue): DimValue {
  switch (expr.type) {
    case "num":
      return { value: new Decimal(expr.value), dim: DIMENSIONLESS };
    case "var":
      return valueOf(expr.name);
    case "neg": {
      const v = evaluate(expr.arg, valueOf);
      return { value: v.value.negated(), dim: v.dim };
    }
    case "bin": {
      const a = evaluate(expr.left, valueOf);
      const b = evaluate(expr.right, valueOf);
      const dim = combine(expr.op, a.dim, b.dim);
      const one = new Decimal(1);
      const zero = new Decimal(0);
      switch (expr.op) {
        case "+":
          return { value: a.value.plus(b.value), dim };
        case "-":
          return { value: a.value.minus(b.value), dim };
        case "*":
          return { value: a.value.times(b.value), dim };
        case "/":
          if (b.value.isZero()) throw new FormulaError("Division par zéro");
          return { value: a.value.dividedBy(b.value), dim };
        case "<":
          return { value: a.value.lessThan(b.value) ? one : zero, dim };
        case "<=":
          return { value: a.value.lessThanOrEqualTo(b.value) ? one : zero, dim };
        case ">":
          return { value: a.value.greaterThan(b.value) ? one : zero, dim };
        case ">=":
          return { value: a.value.greaterThanOrEqualTo(b.value) ? one : zero, dim };
      }
      break;
    }
    case "call": {
      if (expr.fn === "si") {
        const cond = evaluate(expr.args[0]!, valueOf);
        const yes = evaluate(expr.args[1]!, valueOf);
        const no = evaluate(expr.args[2]!, valueOf);
        callDim("si", [cond.dim, yes.dim, no.dim]);
        return cond.value.isZero() ? no : yes;
      }
      const args = expr.args.map((a) => evaluate(a, valueOf));
      const dim = callDim(
        expr.fn,
        args.map((a) => a.dim),
      );
      const values = args.map((a) => a.value);
      switch (expr.fn) {
        case "arrondi_sup":
          return { value: values[0]!.ceil(), dim };
        case "arrondi_inf":
          return { value: values[0]!.floor(), dim };
        case "min":
          return { value: Decimal.min(...values), dim };
        case "max":
          return { value: Decimal.max(...values), dim };
      }
    }
  }
  throw new FormulaError("Formule invalide");
}
