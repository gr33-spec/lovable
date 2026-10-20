/**
 * L'AIDE DANS L'APP (plan du 20 octobre 2026, bloc 10) : un « ? » sur chaque écran, trois lignes au plus, tutoiement,
 * les mots de l'artisan. Pas de page d'aide : ce qui tient en trois lignes se dit ici, le reste se lit sur l'écran.
 */
export type SujetAide = "quantitatif" | "groupe" | "negoces" | "compte" | "chantiers";

export const AIDES: Record<SujetAide, { titre: string; lignes: readonly [string, string?, string?] }> = {
  quantitatif: {
    titre: "Ton chantier",
    lignes: [
      "Cette liste, c'est ce que reçoit ton fournisseur : une ligne par fourniture, dans tes mots.",
      "Une ligne orange attend un geste de toi : tape dessus, réponds ou corrige, elle passe au vert.",
      "Tout vert ? Envoie à tes fournisseurs en bas, ou propose des lignes au groupé.",
    ],
  },
  groupe: {
    titre: "Le groupé",
    lignes: [
      "Tes commandes se regroupent avec celles des artisans de ton département : un seul négoce, un seul prix.",
      "« Chantier signé » t'engage à commander au prix obtenu ; « Devis en attente » ne t'engage pas.",
      "Gratuit pour toi : c'est le négoce retenu qui verse 2 % à BatiClair.",
    ],
  },
  negoces: {
    titre: "Tes négoces",
    lignes: [
      "Ajoute l'e-mail de chaque négoce et ce qu'il vend : il recevra tes demandes de prix groupées.",
      "Ton favori reçoit en premier ; ton numéro de compte chez lui est repris sur tes bons de commande.",
      "Dès trois lettres, la base Sirene te propose les négoces de ton département.",
    ],
  },
  compte: {
    titre: "Ton compte",
    lignes: [
      "Ton entreprise, ton adresse et ton SIRET servent aux demandes de prix et au groupé (SIRET vérifié à l'INSEE).",
      "Tes données se téléchargent ou s'effacent ici, tout de suite, sans rien demander à personne.",
      "Les notifications te préviennent quand une liste est prête ou qu'un lot bouge.",
    ],
  },
  chantiers: {
    titre: "Tes chantiers",
    lignes: ["Un chantier = un devis déposé. Dépose ton PDF ou ta photo, BatiClair sort la liste des fournitures.", "Tape un chantier pour reprendre où tu en étais : questions, liste, envoi, groupé."],
  },
};
