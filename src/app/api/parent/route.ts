/**
 * Route handler - lop chuyen tiep mong.
 * Toan bo nghiep vu & SQL nam trong services.
 */
import { handleParentPost } from "@/server/services/parent.service";

export async function POST(req: Request) {
  return handleParentPost(req);
}
