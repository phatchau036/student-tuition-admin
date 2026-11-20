/**
 * Route handler - lop chuyen tiep mong.
 * Toan bo nghiep vu & SQL nam trong services.
 */
import {
  handleAdminStaffGet,
  handleAdminStaffPost,
  handleAdminStaffDelete,
} from "@/server/services/admin-staff.service";

export async function GET(req: Request) {
  return handleAdminStaffGet(req);
}

export async function POST(req: Request) {
  return handleAdminStaffPost(req);
}

export async function DELETE(req: Request) {
  return handleAdminStaffDelete(req);
}
