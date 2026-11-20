/**
 * Route handler - lop chuyen tiep mong.
 * Toan bo nghiep vu & SQL nam trong services.
 */
import {
  handleFeedbacksSystemGet,
  handleFeedbacksSystemPost,
  handleFeedbacksSystemPatch,
} from "@/server/services/feedbacks-system.service";

export async function GET(req: Request) {
  return handleFeedbacksSystemGet(req);
}

export async function POST(req: Request) {
  return handleFeedbacksSystemPost(req);
}

export async function PATCH(req: Request) {
  return handleFeedbacksSystemPatch(req);
}
