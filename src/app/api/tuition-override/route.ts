/**
 * Route handler - lop chuyen tiep mong.
 * Toan bo nghiep vu & SQL nam trong services.
 */
import { handleTuitionOverridePost } from "@/server/services/tuition-override.service";

export async function POST(req: Request) {
  return handleTuitionOverridePost(req);
}
