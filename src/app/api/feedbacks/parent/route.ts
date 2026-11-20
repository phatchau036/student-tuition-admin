/**
 * Route handler - lop chuyen tiep mong.
 * Toan bo nghiep vu & SQL nam trong services.
 */
import {
  handleFeedbacksParentGet,
  handleFeedbacksParentPost,
  handleFeedbacksParentPatch,
} from "@/server/services/feedbacks-parent.service";

export async function GET(req: Request) {
  return handleFeedbacksParentGet(req);
}

export async function POST(req: Request) {
  return handleFeedbacksParentPost(req);
}

export async function PATCH(req: Request) {
  return handleFeedbacksParentPatch(req);
}
