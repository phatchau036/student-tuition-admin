/**
 * Route handler - lop chuyen tiep mong.
 * Toan bo nghiep vu & SQL nam trong services.
 */
import {
  handleClassesGet,
  handleClassesPost,
  handleClassesDelete,
} from "@/server/services/classes.service";

export async function GET(req: Request) {
  return handleClassesGet(req);
}

export async function POST(req: Request) {
  return handleClassesPost(req);
}

export async function DELETE(req: Request) {
  return handleClassesDelete(req);
}
