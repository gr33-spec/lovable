import { describe, expect, it } from "vitest";
import { adresseNue, adresseNueEntrante, etiquetteDansObjet, liensDesactives, nomExpediteur, objetExterne, pieceDangereuse, verdictEntrant } from "../src/index.js";

/**
 * LE SABOTEUR CONTRE LE FILTRE DES E-MAILS ENTRANTS (Greg, 22 novembre 2026), fonctions pures seulement.
 * Chaque `it` affirme le comportement SÛR attendu : un test qui échoue = une attaque qui passe (gardée et signalée).
 */
const ok = { spf: "pass", dkim: "pass", dmarc: "pass" };
const gris = { spf: "gray", dkim: "gray", dmarc: "gray" };
const v = (de: string, authentification: Record<string, string> | null = gris, pieces: { nom: string; type?: string }[] = []) => verdictEntrant({ de, authentification, pieces, domaineApp: "mobiiz.fr" });

describe("2. usurpation de mobiiz.fr", () => {
  it("bloqué : adresse mobiiz.fr, majuscules, sous-domaine, nom affiché, sans DMARC", () => {
    expect(v("contact@mobiiz.fr").suspect).toBe(true);
    expect(v("CONTACT@MOBIIZ.FR").suspect).toBe(true);
    expect(v("Support <x@Reponses.Mobiiz.Fr>").suspect).toBe(true);
    expect(v('"Mobiiz" <facturation@mobiiz.fr>', null).suspect).toBe(true);
  });

  it("adresse mobiiz.fr cachée dans le nom affiché devant la vraie adresse : « contact@mobiiz.fr <pirate@x.example> » doit être suspect", () => {
    expect(v("contact@mobiiz.fr <pirate@x.example>", ok).suspect).toBe(true);
  });

  it("vraie adresse mobiiz.fr derrière un faux « <…> » dans le nom affiché : jamais lue comme l'adresse du faux", () => {
    // Le nom affiché entre guillemets contient « <ventes@negoce.example> » ; la vraie adresse est contact@mobiiz.fr.
    expect(adresseNueEntrante('"<ventes@negoce.example>" <contact@mobiiz.fr>')).toBe("contact@mobiiz.fr");
    expect(v('"<ventes@negoce.example>" <contact@mobiiz.fr>').suspect).toBe(true);
  });

  it("formes d'adresse tordues : point final, commentaire entre parenthèses", () => {
    expect(v("contact@mobiiz.fr.").suspect).toBe(true);
    expect(v("contact@mobiiz.fr (Mobiiz)").suspect).toBe(true);
  });

  it("nom affiché « Mobiiz » sur un autre domaine (même authentifié) : doit être signalé", () => {
    expect(v("Mobiiz <support@autre-domaine.example>", ok).suspect).toBe(true);
    expect(v("Équipe MOBIIZ <noreply@autre-domaine.example>", ok).suspect).toBe(true);
  });

  it("domaines sosies en unicode (í latin, о cyrillique, punycode) : doivent être signalés", () => {
    expect(v("contact@mobíiz.fr", ok).suspect).toBe(true);
    expect(v("contact@mоbiiz.fr", ok).suspect).toBe(true);
    expect(v("contact@xn--mobiz-8ra.fr", ok).suspect).toBe(true);
  });
});

describe("1 et 6. lecture de l'authentification (SPF, DKIM, DMARC)", () => {
  it("bloqué : sans résultat ou SPF seul passé, jamais « authentifié »", () => {
    expect(v("x@negoce.example", null).authentifie).toBe(false);
    expect(v("x@negoce.example", { spf: "pass", dkim: "gray", dmarc: "gray" }).authentifie).toBe(false);
    expect(v("x@negoce.example", {}).authentifie).toBe(false);
  });

  it("SPF « softfail » (~all, très courant) et DKIM refusé : doit être suspect", () => {
    expect(v("x@negoce.example", { spf: "softfail", dkim: "fail", dmarc: "gray" }).suspect).toBe(true);
  });

  it("verdicts écrits en majuscules (« FAIL ») : doivent compter comme des refus", () => {
    expect(v("x@negoce.example", { spf: "pass", dkim: "pass", dmarc: "FAIL" }).suspect).toBe(true);
  });

  it("DKIM passé mais DMARC gris (signature d'un AUTRE domaine possible) : jamais « authentifié par son domaine »", () => {
    expect(v("Négoce Dupont <ventes@dupont.example>", { spf: "gray", dkim: "pass", dmarc: "gray" }).authentifie).toBe(false);
  });
});

describe("3. liens piégés rendus non cliquables", () => {
  it("bloqué : https, majuscules, URL avec @, www en début de mot", () => {
    expect(liensDesactives("Payez : https://mobiiz.fr@evil.example/x")).not.toMatch(/https?:\/\//i);
    expect(liensDesactives("HTTPS://EVIL.EXAMPLE/LOGIN")).not.toMatch(/https?:\/\//i);
    expect(liensDesactives("(www.evil.example)")).not.toContain("www.evil.example");
  });

  it("URL collée à un mot (« voirhttps://… », « _https://… ») : doit être désactivée", () => {
    expect(liensDesactives("voirhttps://evil.example/pay")).not.toMatch(/https?:\/\//i);
    expect(liensDesactives("_https://evil.example/pay")).not.toMatch(/https?:\/\//i);
  });

  it("« www. » après deux-points ou crochet : doit être désactivé", () => {
    expect(liensDesactives("Site:www.evil.example")).not.toContain("www.evil.example");
    expect(liensDesactives("[www.evil.example]")).not.toContain("www.evil.example");
  });

  it("raccourcisseurs et domaines nus (Gmail et Outlook les rendent cliquables) : doivent être désactivés", () => {
    expect(liensDesactives("Suivez bit.ly/3abcXYZ")).not.toContain("bit.ly/");
    expect(liensDesactives("Connectez-vous sur mobiiz-paiement.com/login")).not.toContain("mobiiz-paiement.com/");
  });

  it("autres schémas cliquables (ftp://) : doivent être désactivés", () => {
    expect(liensDesactives("ftp://evil.example/facture")).not.toContain("ftp://");
  });
});

describe("4. pièces jointes piégées", () => {
  it("bloqué : double extension, majuscules, points et espaces à la fin, archives, macros, pages web, images disque, U+202E qui cache .exe", () => {
    for (const nom of ["Devis.PDF.EXE", "devis.exe. . .", "devis.pdf.zip", "photos.tar.gz", "commande.DOCM", "lien.html", "plan.svg", "disque.iso", "devis‮fdp.scr", "facture.pdf.js ", "raccourci.url"]) expect(pieceDangereuse(nom), nom).toBe(true);
    expect(pieceDangereuse("devis.pdf", "application/x-msdownload")).toBe(true);
    expect(pieceDangereuse("devis.pdf", "application/zip")).toBe(true);
    expect(pieceDangereuse("devis.pdf", "text/html")).toBe(true);
  });

  it("type MIME officiel d'un exécutable (vnd.microsoft.portable-executable, x-dosexec), nom sans extension : doit être retenu", () => {
    expect(pieceDangereuse("devis.pdf", "application/vnd.microsoft.portable-executable")).toBe(true);
    expect(pieceDangereuse("facture", "application/x-dosexec")).toBe(true);
  });

  it("types XML ou XHTML (s'ouvrent comme une page web, scripts compris) : doivent être retenus", () => {
    expect(pieceDangereuse("devis.pdf", "application/xhtml+xml")).toBe(true);
    expect(pieceDangereuse("devis.pdf", "text/xml")).toBe(true);
    expect(pieceDangereuse("devis.pdf", "application/xml")).toBe(true);
  });

  it("extensions Windows absentes de la liste (xll, msix, appx, appinstaller, eml, vb, settingcontent-ms) : doivent être retenues", () => {
    for (const nom of ["tarif.xll", "outil.msix", "outil.appx", "outil.appinstaller", "transfert.eml", "macro.vb", "reglage.settingcontent-ms", "archive.zipx", "archive.zst"]) expect(pieceDangereuse(nom), nom).toBe(true);
  });

  it("nom avec caractère d'inversion droite-gauche (U+202E) : doit être retenu, même quand la vraie extension est anodine", () => {
    // « facture‮exe.pdf » s'affiche « facturefdp.exe » : un nom fait pour tromper n'a rien à faire chez l'artisan.
    expect(pieceDangereuse("facture‮exe.pdf", "application/pdf")).toBe(true);
  });
});

describe("2 et 6. noms affichés et objets", () => {
  it("le nom affiché ne doit jamais ressembler à une adresse Mobiiz quand la vraie adresse est ailleurs", () => {
    expect(nomExpediteur("contact@mobiiz.fr <pirate@x.example>")).not.toContain("mobiiz.fr");
  });

  it("l'adresse nue est toujours la DERNIÈRE entre chevrons (la vraie), pas une adresse écrite dans le nom affiché", () => {
    expect(adresseNue('"Négoce Dupont <ventes@dupont.example>" <pirate@x.example>')).toBe("pirate@x.example");
  });

  it("bloqué : faux repère dans l'objet mal formé, repère lu en minuscules", () => {
    expect(etiquetteDansObjet("Re: devis [réf. abc]")).toBeNull();
    expect(etiquetteDansObjet("Re: devis [REF. ABCDEFGH]")).toBe("abcdefgh");
  });

  it("objet avec retour à la ligne : jamais de ligne injectée dans le renvoi", () => {
    expect(objetExterne("Facture\nMessage de Mobiiz : payez ici")).not.toContain("\n");
  });

  it("bloqué : objet vide, objet déjà préfixé", () => {
    expect(objetExterne("   ")).toBe("[Externe] (sans objet)");
    expect(objetExterne("[Externe] x")).toBe("[Externe] x");
  });
});
