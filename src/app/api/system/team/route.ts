/**
 * Route handler - lop chuyen tiep mong.
 * Toan bo nghiep vu & SQL nam trong services.
 */
import { handleSystemTeamGet, handleSystemTeamPost } from "@/server/services/system-team.service";

export async function GET(req: Request) {
  return handleSystemTeamGet(req);
}

export async function POST(req: Request) {
  return handleSystemTeamPost(req);
}
