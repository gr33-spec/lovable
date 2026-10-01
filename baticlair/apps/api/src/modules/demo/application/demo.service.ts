import { notFound } from "../../../platform/errors/domain-error.js";
import type { DocumentsService } from "../../documents/index.js";
import type { PriceRequestRepository, PriceRequestsService, PriceRequestView } from "../../price-requests/index.js";
import type { ProjectsService } from "../../projects/index.js";
import type { SupplierRepository } from "../../suppliers/index.js";
import { assertCanWrite, type TenantContext } from "../../tenancy/index.js";
import { DEMO_SUPPLIERS, demoClientQuote, demoEmail, demoSupplierQuote, isDemoSupplier } from "./demo-documents.js";

/**
 * Mode démo : de quoi faire tout le parcours seul, sans vrai client ni vrai
 * fournisseur. Les données créées sont ordinaires (l'artisan les supprime
 * ou les archive comme les autres) ; seuls les fournisseurs fictifs, reconnus
 * à leur adresse, savent « répondre » tout seuls.
 */
export class DemoService {
  constructor(
    private readonly projects: ProjectsService,
    private readonly suppliers: SupplierRepository,
    private readonly documents: DocumentsService,
    private readonly requestsRepo: PriceRequestRepository,
    private readonly requests: PriceRequestsService,
  ) {}

  /** Chantier fictif avec son devis client, et les 3 fournisseurs fictifs dans le carnet. */
  async createProject(tenant: TenantContext): Promise<{ projectId: string }> {
    assertCanWrite(tenant);
    for (const s of DEMO_SUPPLIERS) {
      const email = demoEmail(s.key);
      const existing = await this.suppliers.findByEmail(tenant, email);
      if (!existing) {
        await this.suppliers.create(tenant, { name: s.name, email, contactName: s.contactName, phone: null, notes: "Fournisseur fictif : il répond tout seul (mode démo)." });
      } else if (existing.archived) {
        await this.suppliers.update(tenant, existing.id, { archived: false });
      }
    }
    const project = await this.projects.create(tenant, {
      name: "Démo – Toiture Martin",
      clientName: "M. Martin (fictif)",
      address: "12 rue des Tilleuls, Vannes",
    });
    const sender = await this.requestsRepo.sender(tenant, project.id);
    await this.documents.upload(tenant, project.id, {
      purpose: "client_quote",
      fileName: "devis-client-demo.pdf",
      bytes: await demoClientQuote(sender?.companyName ?? "Votre entreprise"),
    });
    return { projectId: project.id };
  }

  /**
   * Simule la réponse d'un fournisseur (test) : un devis PDF établi sur la
   * liste demandée est rangé sur sa ligne. Possible aussi pour un fournisseur
   * réel, pour tester sur un vrai chantier : le devis est alors marqué
   * « fictif » et se retire comme un autre (« Retirer ce devis »).
   */
  async simulateQuote(tenant: TenantContext, recipientId: string): Promise<PriceRequestView> {
    assertCanWrite(tenant);
    const request = await this.requestsRepo.findByRecipient(tenant, recipientId);
    if (!request) throw notFound("Recipient");
    const recipient = request.recipients.find((r) => r.id === recipientId)!;
    const sender = await this.requestsRepo.sender(tenant, request.projectId);
    const bytes = await demoSupplierQuote(request.lines, recipient.supplier.email, recipient.supplier.name, sender?.project.name ?? "Chantier");
    if (recipient.status === "to_send") await this.requests.setStatus(tenant, recipientId, "sent");
    // Un fournisseur réel reçoit un devis clairement marqué « fictif » (titre et nom de fichier).
    const slug = recipient.supplier.email.split("@")[0];
    const fileName = isDemoSupplier(recipient.supplier.email) ? `devis-${slug}-demo.pdf` : `devis-fictif-test-${slug}.pdf`;
    return this.requests.attachQuote(tenant, recipientId, { fileName, bytes });
  }
}
