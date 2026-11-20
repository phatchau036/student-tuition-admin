/**
 * Route handler - lop chuyen tiep mong.
 * Toan bo nghiep vu & SQL nam trong services.
 */
import {
  handleAdminTuitionRemindersGet,
  handleAdminTuitionRemindersPost,
} from "@/server/services/admin-tuition-reminders.service";

export async function GET(req: Request) {
  return handleAdminTuitionRemindersGet(req);
}

export async function POST(req: Request) {
  return handleAdminTuitionRemindersPost(req);
}
