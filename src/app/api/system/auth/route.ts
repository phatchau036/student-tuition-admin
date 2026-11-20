/**
 * Route handler - lop chuyen tiep mong.
 * Toan bo nghiep vu & SQL nam trong services.
 */
import {
  handleSystemAuthPost,
  handleSystemAuthPut,
  handleSystemAuthGet,
} from "@/server/services/system-auth.service";

export async function POST(req: Request) {
  return handleSystemAuthPost(req);
}

export async function PUT(req: Request) {
  return handleSystemAuthPut(req);
}

export async function GET(req: Request) {
  return handleSystemAuthGet(req);
}
