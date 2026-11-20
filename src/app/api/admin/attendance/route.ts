/**
 * Route handler - lop chuyen tiep mong.
 * Toan bo nghiep vu & SQL nam trong services.
 */
import {
  handleAdminAttendanceGet,
  handleAdminAttendancePost,
} from "@/server/services/admin-attendance.service";

export async function GET(req: Request) {
  return handleAdminAttendanceGet(req);
}

export async function POST(req: Request) {
  return handleAdminAttendancePost(req);
}
