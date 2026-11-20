/**
 * Route handler - lop chuyen tiep mong.
 * Toan bo nghiep vu & SQL nam trong services.
 */
import { handlePackagesGet, handlePackagesPost } from "@/server/services/packages.service";

export async function GET(req: Request) {
  return handlePackagesGet(req);
}

export async function POST(req: Request) {
  return handlePackagesPost(req);
}
