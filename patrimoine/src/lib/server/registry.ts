import "server-only";

// Recherche dans l'annuaire public des entreprises (API Recherche
// d'entreprises de l'État, gratuite, sans clé). Seules des données publiques
// du registre sont lues ; rien n'est envoyé d'autre que le nom recherché.

const BASE = process.env.ENTREPRISES_API ?? "https://recherche-entreprises.api.gouv.fr";

export interface RegistryCompany {
  siren: string;
  name: string;
  legalForm?: string;
  address?: string;
  creationDate?: string;
  active: boolean;
  directors: { name: string; role?: string; company?: boolean }[];
}

const NATURE: Record<string, string> = {
  "6540": "SCI",
  "6541": "SCI",
  "6599": "Société civile",
  "5499": "SARL",
  "5498": "SARL",
  "5710": "SAS",
  "5720": "SAS",
};

type Raw = {
  siren?: string;
  nom_complet?: string;
  nom_raison_sociale?: string;
  nature_juridique?: string;
  date_creation?: string;
  etat_administratif?: string;
  siege?: { adresse?: string; geo_adresse?: string };
  dirigeants?: { nom?: string; prenoms?: string; qualite?: string; type_dirigeant?: string; denomination?: string }[];
};

function title(s: string): string {
  return s.toLowerCase().replace(/(^|[\s-])\p{L}/gu, (m) => m.toUpperCase());
}

export async function searchRegistry(q: string): Promise<RegistryCompany[]> {
  const url = `${BASE}/search?q=${encodeURIComponent(q)}&per_page=8&page=1`;
  const res = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000), cache: "no-store" });
  if (!res.ok) throw new Error(`Annuaire indisponible (${res.status})`);
  const json = (await res.json()) as { results?: Raw[] };
  return (json.results ?? []).map((r) => ({
    siren: r.siren ?? "",
    name: r.nom_raison_sociale || r.nom_complet || "",
    legalForm: r.nature_juridique ? NATURE[r.nature_juridique] : undefined,
    address: r.siege?.adresse || r.siege?.geo_adresse,
    creationDate: r.date_creation,
    active: r.etat_administratif !== "C",
    directors: (r.dirigeants ?? []).map((d) =>
      d.type_dirigeant === "personne morale"
        ? { name: d.denomination ?? "", role: d.qualite, company: true }
        : { name: [d.prenoms?.split(" ")[0] ? title(d.prenoms.split(" ")[0]) : undefined, d.nom?.toUpperCase()].filter(Boolean).join(" "), role: d.qualite },
    ),
  }));
}
