/**
 * Route handler - lop chuyen tiep mong.
 * Toan bo nghiep vu & SQL nam trong services.
 */
import { handleSystemUpgradeStatusGet } from "@/server/services/system-upgrade-status.service";

export async function GET(req: Request) {
  return handleSystemUpgradeStatusGet(req);
}
