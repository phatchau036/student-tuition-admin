/**
 * Route handler - lop chuyen tiep mong.
 * Toan bo nghiep vu & SQL nam trong services.
 */
import { handleClassesOccupancyGet } from "@/server/services/classes-occupancy.service";

export async function GET(req: Request) {
  return handleClassesOccupancyGet(req);
}
