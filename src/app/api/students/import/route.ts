/**
 * Route handler - lop chuyen tiep mong.
 * Toan bo nghiep vu & SQL nam trong services.
 */
import { handleStudentsImportPost } from "@/server/services/students-import.service";

export async function POST(req: Request) {
  return handleStudentsImportPost(req);
}
