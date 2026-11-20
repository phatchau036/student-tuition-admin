/**
 * Route handler - lop chuyen tiep mong.
 * Toan bo nghiep vu & SQL nam trong services.
 */
import { handleStudentsStatusPost } from "@/server/services/students-status.service";

export async function POST(req: Request) {
  return handleStudentsStatusPost(req);
}
