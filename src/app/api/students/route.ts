/**
 * Route handler - lop chuyen tiep mong.
 * Toan bo nghiep vu & SQL nam trong services.
 */
import { handleStudentsGet, handleStudentsPost } from "@/server/services/students.service";

export async function GET(req: Request) {
  return handleStudentsGet(req);
}

export async function POST(req: Request) {
  return handleStudentsPost(req);
}
