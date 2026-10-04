/**
 * Ouvrir un document (PDF, photo) DANS BatiClair, jamais dans un onglet sans retour : sur iPhone, l'app posée sur
 * l'écran d'accueil n'a pas de barre Safari, et un PDF ouvert en plein écran laissait l'artisan coincé (retour du
 * fondateur, 2026-10-04). L'afficheur (`FileViewer`, monté une fois dans l'app) garde toujours « Fermer »,
 * « Partager » et « Télécharger ».
 */
export interface OpenFileRequest {
  /** Adresse de l'API (même origine, avec la session de l'artisan). */
  url: string;
  title: string;
  /** Nom du fichier quand on le télécharge ou le partage. */
  fileName: string;
}

export const OPEN_FILE_EVENT = "baticlair:open-file";

export function openFile(request: OpenFileRequest): void {
  window.dispatchEvent(new CustomEvent<OpenFileRequest>(OPEN_FILE_EVENT, { detail: request }));
}

/** Un document du chantier (devis client, devis fournisseur, croquis). */
export async function openDocument(documentId: string, title = "Document", fileName = "document.pdf"): Promise<void> {
  openFile({ url: `/v1/documents/${encodeURIComponent(documentId)}/file`, title, fileName });
}
