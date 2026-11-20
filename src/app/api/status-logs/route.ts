/**
 * Route handler - lop chuyen tiep mong.
 * Toan bo nghiep vu & SQL nam trong services.
 */
import { handleStatusLogsGet } from "@/server/services/status-logs.service";

export async function GET(req: Request) {
  return handleStatusLogsGet(req);
}
