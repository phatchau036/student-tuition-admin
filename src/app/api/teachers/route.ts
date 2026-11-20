/**
 * Route handler - lop chuyen tiep mong.
 * Toan bo nghiep vu & SQL nam trong services.
 */
import { handleTeachersGet, handleTeachersPost } from "@/server/services/teachers.service";

export async function GET(req: Request) {
  return handleTeachersGet(req);
}

export async function POST(req: Request) {
  return handleTeachersPost(req);
}
