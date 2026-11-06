import { LIBELLES_FAMILLES, famillesActives, libelleMetier, type FamilleConfiguree } from "@baticlair/domain";
import type { PrismaService } from "../database/prisma.service.js";

/**
 * LES FAMILLES CONFIGURABLES (lot 6, prompt maître point 6 : « la taxonomie des familles doit être configurable et non
 * dispersée dans l'interface sous forme de valeurs codées en dur »). Tant que la table est vide, la configuration
 * (`FAMILLES_GROUPABLES`) fait foi, comme avant ; l'admin la recopie en base à sa première ouverture, puis la règle.
 * Lecture synchrone depuis un cache (rafraîchi au plus toutes les 30 s, et tout de suite après un changement de l'admin).
 */
export class FamillesConfigurees {
  private cache: FamilleConfiguree[] | null = null;
  private lu = 0;
  private enCours: Promise<void> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly parDefaut: readonly string[],
  ) {}

  /** Les familles de la configuration, sous la forme de la table (pour la première ouverture de l'admin). */
  defaut(): FamilleConfiguree[] {
    const codes = [...new Set([...Object.keys(LIBELLES_FAMILLES), ...this.parDefaut])];
    return codes.map((code, i) => ({ code, libelle: libelleDefaut(code), ordre: i + 1, active: this.parDefaut.includes(code) }));
  }

  async rafraichir(force = false): Promise<void> {
    if (!force && this.cache && Date.now() - this.lu < 30_000) return;
    this.enCours ??= (async () => {
      try {
        const rows = await this.prisma.familleMateriau.findMany();
        this.cache = rows.length ? rows.map((r) => ({ code: r.code, libelle: r.libelle, ordre: r.ordre, active: r.active })) : null;
        this.lu = Date.now();
      } catch {
        // Base indisponible : on garde ce qu'on avait (ou la configuration).
      } finally {
        this.enCours = null;
      }
    })();
    await this.enCours;
  }

  /** Les codes des familles proposées dans les achats groupés (synchrone ; lance un rafraîchissement si besoin). */
  codes(): string[] {
    if (!this.cache || Date.now() - this.lu > 30_000) void this.rafraichir();
    return this.cache ? famillesActives(this.cache).codes : [...this.parDefaut];
  }

  libelle(code: string): string {
    return this.cache?.find((f) => f.code === code)?.libelle ?? libelleDefaut(code);
  }

  libelles(codes: readonly string[]): Record<string, string> {
    return Object.fromEntries(codes.map((c) => [c, this.libelle(c)]));
  }
}

const libelleDefaut = (code: string) => (code in LIBELLES_FAMILLES ? LIBELLES_FAMILLES[code as keyof typeof LIBELLES_FAMILLES] : libelleMetier(code));

/** Une seule instance par base (l'admin et les achats groupés partagent le même cache). */
const instances = new WeakMap<PrismaService, FamillesConfigurees>();
export function famillesConfigurees(prisma: PrismaService, parDefaut: readonly string[]): FamillesConfigurees {
  let f = instances.get(prisma);
  if (!f) instances.set(prisma, (f = new FamillesConfigurees(prisma, parDefaut)));
  return f;
}
