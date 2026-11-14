import type { Page } from "@playwright/test";

/**
 * « Importer un document » (Greg, 1er novembre 2026) : avant toute analyse, une fenêtre dit le type reconnu et son coût.
 * Les parcours qui déposent un document l'acceptent d'office (« Analyser le document ») : un script de la page la valide
 * dès qu'elle paraît, même quand le test attend ensuite l'adresse du chantier. Le test de la fenêtre l'en empêche
 * (`garderFenetreAnalyse`).
 */
export async function confirmerAnalyseDoffice(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const valider = () => {
      try {
        if (sessionStorage.getItem("e2e-garder-fenetre-analyse") === "1") return;
      } catch {
        /* stockage indisponible : on valide */
      }
      const fenetre = document.querySelector('[role="alertdialog"][aria-label="Analyser ce document ?"]');
      const bouton = fenetre ? [...fenetre.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Analyser le document") : undefined;
      bouton?.click();
    };
    new MutationObserver(valider).observe(document, { childList: true, subtree: true });
  });
}

/** Pour le test de la fenêtre : elle reste ouverte, le test la lit et la manipule. */
export async function garderFenetreAnalyse(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem("e2e-garder-fenetre-analyse", "1");
    } catch {
      /* rien */
    }
  });
}
