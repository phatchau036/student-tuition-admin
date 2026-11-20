/**
 * Route handler - lop chuyen tiep mong.
 * Toan bo nghiep vu & SQL nam trong services.
 */
import { handleAdminAuthPost, handleAdminAuthGet } from "@/server/services/admin-auth.service";

export async function POST(req: Request) {
  return handleAdminAuthPost(req);
}

export async function GET(req: Request) {
  return handleAdminAuthGet(req);
}
