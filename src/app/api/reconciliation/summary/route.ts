/**
 * Route handler - lop chuyen tiep mong.
 * Toan bo nghiep vu & SQL nam trong services.
 */
import { handleReconciliationSummaryGet } from "@/server/services/reconciliation-summary.service";

export async function GET(req: Request) {
  return handleReconciliationSummaryGet(req);
}
