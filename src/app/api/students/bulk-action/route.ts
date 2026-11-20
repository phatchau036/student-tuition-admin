/**
 * Route handler - lop chuyen tiep mong.
 * Toan bo nghiep vu & SQL nam trong services.
 */
import { handleStudentsBulkActionPost } from "@/server/services/students-bulk-action.service";

export async function POST(req: Request) {
  return handleStudentsBulkActionPost(req);
}
