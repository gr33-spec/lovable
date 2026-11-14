/**
 * LA CAPTURE D'ÉCRAN D'UN SIGNALEMENT (Greg, 13 novembre 2026 : « avec capture d'écran et page concernée jointes
 * automatiquement »). Sans bibliothèque : l'écran est recopié dans une image par le navigateur lui-même. Les photos et
 * les polices de la page n'y figurent pas (le navigateur ne les charge pas dans une image), les textes, les couleurs et
 * la mise en page oui : c'est ce qu'il faut pour comprendre un problème. Sur un navigateur qui refuse (certains iPhone),
 * la fonction rend null et l'utilisateur peut joindre sa propre capture. Rien ne quitte l'appareil avant « Envoyer ».
 */
const LARGEUR_MAX = 900;
/** La capture doit tenir dans le corps d'une requête : on baisse la qualité jusqu'à passer. */
const TAILLE_MAX = 850_000;

function reduire(source: CanvasImageSource, largeur: number, hauteur: number): string | null {
  const echelle = Math.min(1, LARGEUR_MAX / largeur);
  const toile = document.createElement("canvas");
  toile.width = Math.max(1, Math.round(largeur * echelle));
  toile.height = Math.max(1, Math.round(hauteur * echelle));
  const ctx = toile.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, toile.width, toile.height);
  ctx.drawImage(source, 0, 0, toile.width, toile.height);
  for (const qualite of [0.7, 0.5, 0.35, 0.2]) {
    const image = toile.toDataURL("image/jpeg", qualite);
    if (image.length <= TAILLE_MAX) return image;
  }
  return null;
}

const charger = (src: string) =>
  new Promise<HTMLImageElement>((ok, ko) => {
    const image = new Image();
    image.onload = () => ok(image);
    image.onerror = () => ko(new Error("image"));
    image.src = src;
  });

/** L'écran tel qu'il est affiché, en JPEG réduit, ou null si le navigateur ne le permet pas. */
export async function capturerEcran(): Promise<string | null> {
  try {
    const largeur = window.innerWidth;
    const hauteur = window.innerHeight;
    const racine = document.documentElement;
    const copie = racine.cloneNode(true) as HTMLElement;
    // Ce que l'utilisateur a tapé : repris champ par champ ; jamais un mot de passe.
    const champs = racine.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select");
    const copies = copie.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select");
    champs.forEach((champ, i) => {
      const c = copies[i];
      if (!c) return;
      const secret = champ instanceof HTMLInputElement && champ.type === "password";
      if (c instanceof HTMLTextAreaElement) c.textContent = champ.value;
      else if (c instanceof HTMLSelectElement) Array.from(c.options).forEach((o, j) => (j === (champ as HTMLSelectElement).selectedIndex ? o.setAttribute("selected", "") : o.removeAttribute("selected")));
      else c.setAttribute("value", secret ? "" : champ.value);
    });
    copie.querySelectorAll("script, noscript, iframe, video, audio, object, embed, link, [data-hors-capture]").forEach((n) => n.remove());
    // Les images de la page ne se chargent pas dans une image : on garde leur place, sans leur adresse.
    copie.querySelectorAll("img").forEach((img) => {
      if (!img.getAttribute("src")?.startsWith("data:")) img.removeAttribute("src");
      img.removeAttribute("srcset");
    });
    // Les styles : ceux que le navigateur applique, recopiés dans la copie.
    let css = "";
    for (const feuille of Array.from(document.styleSheets)) {
      try {
        css += Array.from(feuille.cssRules, (r) => r.cssText).join("\n");
      } catch {
        // Une feuille d'un autre site : illisible, on s'en passe.
      }
    }
    copie.querySelectorAll("style").forEach((n) => n.remove());
    const style = document.createElement("style");
    style.textContent = css.replace(/@font-face\s*{[^}]*}/g, "").replace(/url\((?!["']?data:)[^)]*\)/g, "none");
    (copie.querySelector("head") ?? copie).appendChild(style);
    copie.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
    const html = new XMLSerializer().serializeToString(copie);
    const page = Math.max(hauteur, racine.scrollHeight);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${largeur}" height="${hauteur}"><foreignObject x="0" y="${-window.scrollY}" width="${largeur}" height="${page}">${html}</foreignObject></svg>`;
    const image = await Promise.race([charger(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`), new Promise<never>((_, ko) => setTimeout(() => ko(new Error("lent")), 5000))]);
    return reduire(image, largeur, hauteur);
  } catch {
    return null;
  }
}

/** Une image choisie par l'utilisateur (sa propre capture), réduite de la même façon. */
export async function reduireImage(fichier: File): Promise<string | null> {
  if (!fichier.type.startsWith("image/")) return null;
  const adresse = URL.createObjectURL(fichier);
  try {
    const image = await charger(adresse);
    return reduire(image, image.naturalWidth, image.naturalHeight);
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(adresse);
  }
}
