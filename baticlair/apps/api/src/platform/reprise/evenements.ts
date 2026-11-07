/**
 * WEBHOOKS SANS DOUBLE TRAITEMENT (revue du 26 octobre 2026, point 4) : Stripe et Resend renvoient un événement tant
 * qu'ils n'ont pas reçu de 2xx, et parfois deux fois de suite. Chaque événement est noté (source + identifiant) avant
 * d'être traité : un second passage répond tout de suite « déjà traité ». Si le traitement échoue, la note est retirée,
 * pour que le prochain envoi du prestataire le traite enfin.
 */
interface StoreEvenements {
  evenementTraite: {
    create(a: { data: { source: string; id: string } }): Promise<unknown>;
    delete(a: { where: { source_id: { source: string; id: string } } }): Promise<unknown>;
  };
}

export async function unSeulTraitement<T>(prisma: StoreEvenements, source: string, id: string | undefined, traiter: () => Promise<T>): Promise<T | { dejaTraite: true }> {
  if (!id) return traiter();
  try {
    await prisma.evenementTraite.create({ data: { source, id } });
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") return { dejaTraite: true };
    throw e;
  }
  try {
    return await traiter();
  } catch (e) {
    await prisma.evenementTraite.delete({ where: { source_id: { source, id } } }).catch(() => undefined);
    throw e;
  }
}
