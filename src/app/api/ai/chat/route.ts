/**
 * Route handler - lop chuyen tiep mong.
 * Toan bo nghiep vu & SQL nam trong services.
 */
import { handleAiChatPost } from "@/server/services/ai-chat.service";

export async function POST(req: Request) {
  return handleAiChatPost(req);
}
