/**
 * Route handler - lop chuyen tiep mong.
 * Toan bo nghiep vu & SQL nam trong services.
 */
import { handleResolveDomainGet } from "@/server/services/resolve-domain.service";

export async function GET(req: Request) {
  return handleResolveDomainGet(req);
}
