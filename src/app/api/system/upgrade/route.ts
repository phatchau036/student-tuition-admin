/**
 * Route handler - lop chuyen tiep mong.
 * Toan bo nghiep vu & SQL nam trong services.
 */
import { handleSystemUpgradePost } from "@/server/services/system-upgrade.service";

export async function POST(req: Request) {
  return handleSystemUpgradePost(req);
}
