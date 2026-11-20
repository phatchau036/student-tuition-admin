/**
 * Route handler - lop chuyen tiep mong.
 * Toan bo nghiep vu & SQL nam trong services.
 */
import {
  handleAdminRolesGet,
  handleAdminRolesPost,
  handleAdminRolesDelete,
} from "@/server/services/admin-roles.service";

export async function GET(req: Request) {
  return handleAdminRolesGet(req);
}

export async function POST(req: Request) {
  return handleAdminRolesPost(req);
}

export async function DELETE(req: Request) {
  return handleAdminRolesDelete(req);
}
