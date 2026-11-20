/**
 * Route handler - lop chuyen tiep mong.
 * Toan bo nghiep vu & SQL nam trong services.
 */
import { handleTeachersIdPut, handleTeachersIdDelete } from "@/server/services/teachers-id.service";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleTeachersIdPut(req, { params } as never);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleTeachersIdDelete(req, { params } as never);
}
