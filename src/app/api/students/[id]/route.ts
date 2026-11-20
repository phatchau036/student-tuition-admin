/**
 * Route handler - lop chuyen tiep mong.
 * Toan bo nghiep vu & SQL nam trong services.
 */
import {
  handleStudentsIdPut,
  handleStudentsIdPatch,
  handleStudentsIdDelete,
} from "@/server/services/students-id.service";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleStudentsIdPut(req, { params } as never);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleStudentsIdPatch(req, { params } as never);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleStudentsIdDelete(req, { params } as never);
}
