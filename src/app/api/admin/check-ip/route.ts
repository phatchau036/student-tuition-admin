/**
 * Route handler - lop chuyen tiep mong.
 * Toan bo nghiep vu & SQL nam trong services.
 */
import { handleAdminCheckIpGet } from "@/server/services/admin-check-ip.service";

export async function GET(req: Request) {
  return handleAdminCheckIpGet(req);
}
