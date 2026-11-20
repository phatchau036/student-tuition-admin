/**
 * Route handler - lop chuyen tiep mong.
 * Toan bo nghiep vu & SQL nam trong services.
 */
import { handleSubjectsGet, handleSubjectsPost } from "@/server/services/subjects.service";

export async function GET(req: Request) {
  return handleSubjectsGet(req);
}

export async function POST(req: Request) {
  return handleSubjectsPost(req);
}
