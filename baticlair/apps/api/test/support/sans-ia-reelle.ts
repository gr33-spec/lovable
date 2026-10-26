/**
 * AUCUN TEST N'APPELLE L'API ANTHROPIC RÉELLE (décision de Greg, 25 octobre 2026 : 20 $ partis en CI le 24 octobre).
 * Chargé avant chaque fichier de test : les clés de l'environnement sont retirées, et tout appel réseau vers Anthropic
 * échoue tout de suite. Les lectures viennent des réponses enregistrées (`FakeLectureReader`, lectures du domaine).
 */
delete process.env.BATICLAIR_ANTHROPIC_KEY;
delete process.env.ANTHROPIC_API_KEY;
delete process.env.OPENAI_API_KEY;

const fetchReel = globalThis.fetch;
globalThis.fetch = (async (entree: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
  const url = typeof entree === "string" ? entree : entree instanceof URL ? entree.href : entree.url;
  if (/anthropic\.com|openai\.com/i.test(url)) throw new Error(`Appel réel à un fournisseur d'IA refusé en test : ${url}`);
  return fetchReel(entree, init);
}) as typeof fetch;
