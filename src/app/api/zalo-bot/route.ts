/**
 * Route handler - lop chuyen tiep mong.
 * Toan bo nghiep vu & SQL nam trong services.
 */
import { handleZaloBotPost } from "@/server/services/zalo-bot.service";

export async function POST(req: Request) {
  return handleZaloBotPost(req);
}
