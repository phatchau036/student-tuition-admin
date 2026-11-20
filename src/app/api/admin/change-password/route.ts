/**
 * Route handler - lop chuyen tiep mong.
 * Toan bo nghiep vu & SQL nam trong services.
 */
import { handleAdminChangePasswordPost } from "@/server/services/admin-change-password.service";

export async function POST(req: Request) {
  return handleAdminChangePasswordPost(req);
}
