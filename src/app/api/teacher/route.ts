/**
 * Route handler - lop chuyen tiep mong.
 * Toan bo nghiep vu & SQL nam trong services.
 */
import { handleTeacherGet, handleTeacherPost } from "@/server/services/teacher.service";

export async function GET(req: Request) {
  return handleTeacherGet(req);
}

export async function POST(req: Request) {
  return handleTeacherPost(req);
}
