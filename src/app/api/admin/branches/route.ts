/**
 * Route handler - lop chuyen tiep mong.
 * Toan bo nghiep vu & SQL nam trong services.
 */
import {
  handleAdminBranchesGet,
  handleAdminBranchesPost,
} from "@/server/services/admin-branches.service";

export async function GET(req: Request) {
  return handleAdminBranchesGet(req);
}

export async function POST(req: Request) {
  return handleAdminBranchesPost(req);
}
