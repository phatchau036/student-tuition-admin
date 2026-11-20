/**
 * Route handler - lop chuyen tiep mong.
 * Toan bo nghiep vu & SQL nam trong services.
 */
import { handleSepayWebhookPost } from "@/server/services/sepay-webhook.service";

export async function POST(req: Request) {
  return handleSepayWebhookPost(req);
}
