const echapper = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * La version HTML du même mail (lot final, point 5 : un texte en clair accompagne le HTML) : mêmes mots, la ligne
 * « Répondre en ligne » devient un bouton ; aucun lien raccourci, aucune image distante, quelques kilo-octets.
 */
export function mailEnHtml(texte: string, lien: string | null): string {
  const blocs = texte.split("\n\n").map((b) => {
    if (b.startsWith("--\n")) return `<p style="margin:24px 0 0;color:#99844C;font-size:12px">${echapper(b.slice(3))}</p>`;
    const lignes = b.split("\n").map((l) => {
      const m = lien ? /^(Répondre|Réponds) en ligne, sans inscription : (\S+)$/.exec(l) : null;
      if (m) return `<a href="${echapper(m[2]!)}" style="display:inline-block;margin:6px 0 10px;padding:12px 22px;border-radius:999px;background:#FED206;color:#130901;font-weight:700;text-decoration:none">${m[1]} en ligne</a><br><span style="color:#614822;font-size:13px">Sans inscription.</span>`;
      return echapper(l);
    });
    return `<p style="margin:0 0 14px">${lignes.join("<br>")}</p>`;
  });
  return `<!doctype html><html lang="fr"><body style="margin:0;padding:20px;background:#FBF8F3;color:#130901;font:15px/1.5 -apple-system,Segoe UI,Roboto,Arial,sans-serif"><div style="max-width:560px">${blocs.join("")}</div></body></html>`;
}
