/**
 * Route handler - lop chuyen tiep mong.
 * Toan bo nghiep vu & SQL nam trong services.
 */
import { handleMakeupsGet, handleMakeupsPost } from "@/server/services/makeups.service";

export async function GET(req: Request) {
  return handleMakeupsGet(req);
}

export async function POST(req: Request) {
  return handleMakeupsPost(req);
}
