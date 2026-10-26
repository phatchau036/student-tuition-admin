import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const db = getDb();
    const { id } = await params;
    const body = await req.json();

    const { name, phone, email, specialty, color, max_students, assigned_slot_ids, working_shifts_json, is_active } = body;
    const slotJson = JSON.stringify(Array.isArray(assigned_slot_ids) ? assigned_slot_ids : []);
    const shiftJson = typeof working_shifts_json === "string" ? working_shifts_json : JSON.stringify(working_shifts_json || []);

    await db.execute({
      sql: `UPDATE teachers 
            SET name = ?, phone = ?, email = ?, specialty = ?, color = ?, max_students = ?, assigned_slot_ids = ?, working_shifts_json = ?, is_active = ?
            WHERE id = ?`,
      args: [
        name.trim(),
        phone.trim(),
        email?.trim() || "",
        specialty?.trim() || "",
        color || "indigo",
        Number(max_students) || 10,
        slotJson,
        shiftJson,
        is_active ? 1 : 0,
        id,
      ],
    });

    return NextResponse.json({
      success: true,
      message: "Cập nhật thông tin giáo viên thành công!",
    });
  } catch (error: unknown) {
    console.error("Teacher PUT Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const db = getDb();
    const { id } = await params;

    // Unassign teacher from students
    await db.execute({
      sql: "UPDATE students SET teacher_id = NULL WHERE teacher_id = ?",
      args: [id],
    });

    // Delete teacher
    await db.execute({
      sql: "DELETE FROM teachers WHERE id = ?",
      args: [id],
    });

    return NextResponse.json({
      success: true,
      message: "Đã xóa giáo viên khỏi hệ thống!",
    });
  } catch (error: unknown) {
    console.error("Teacher DELETE Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
