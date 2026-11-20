/**
 * Route handler - lop chuyen tiep mong.
 * Toan bo nghiep vu & SQL nam trong services.
 */
import { handlePaymentsGet, handlePaymentsPost } from "@/server/services/payments.service";

export async function GET(req: Request) {
  return handlePaymentsGet(req);
}

export async function POST(req: Request) {
  return handlePaymentsPost(req);
}
