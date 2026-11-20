/**
 * Route handler - lop chuyen tiep mong.
 * Toan bo nghiep vu & SQL nam trong services.
 */
import { handleSystemGet, handleSystemPost } from "@/server/services/system.service";

export async function GET(req: Request) {
  return handleSystemGet(req);
}

export async function POST(req: Request) {
  return handleSystemPost(req);
}
