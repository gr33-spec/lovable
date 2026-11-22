import { json } from "@/lib/server/http";
import { healthCheck } from "@/lib/server/maintenance";

// Pour un service de surveillance (UptimeRobot, Better Stack…) : 200 si tout
// va bien, 503 sinon. Aucun détail sensible n'est exposé.
export async function GET() {
  try {
    const h = await healthCheck();
    return json({ status: h.status }, h.status === "ok" ? 200 : 503);
  } catch {
    return json({ status: "down" }, 503);
  }
}
