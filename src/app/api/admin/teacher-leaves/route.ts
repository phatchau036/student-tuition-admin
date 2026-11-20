/**
 * Route handler - lop chuyen tiep mong.
 * Toan bo nghiep vu & SQL nam trong services.
 */
import {
  handleAdminTeacherLeavesGet,
  handleAdminTeacherLeavesPost,
} from "@/server/services/admin-teacher-leaves.service";

export async function GET(req: Request) {
  return handleAdminTeacherLeavesGet(req);
}

export async function POST(req: Request) {
  return handleAdminTeacherLeavesPost(req);
}
