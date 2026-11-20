/**
 * Route handler - lop chuyen tiep mong.
 * Toan bo nghiep vu & SQL nam trong services.
 */
import { handleSettingsGet, handleSettingsPost } from "@/server/services/settings.service";

export async function GET(req: Request) {
  return handleSettingsGet(req);
}

export async function POST(req: Request) {
  return handleSettingsPost(req);
}
