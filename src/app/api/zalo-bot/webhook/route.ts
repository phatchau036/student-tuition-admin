/**
 * Route handler - lop chuyen tiep mong.
 * Toan bo nghiep vu & SQL nam trong services.
 */
import {
  handleZaloBotWebhookPost,
  handleZaloBotWebhookGet,
} from "@/server/services/zalo-bot-webhook.service";

export async function POST(req: Request) {
  return handleZaloBotWebhookPost(req);
}

export async function GET() {
  return handleZaloBotWebhookGet();
}
