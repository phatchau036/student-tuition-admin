import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const db = getDb();
    const { id } = await params;
    const body = await req.json();

    const {
      name,
      phone,
      zalo_link,
      zalo_chat_id,
      level_id,
      time_slot_id,
      teacher_id,
      tuition_package_id,
      start_date,
      duration_mode,
      sessions_per_week,
      hours_per_week,
      registered_days,
      study_time_detail,
      schedule_details_json,
      is_discount_enabled,
      discount_percent,
      discount_reason,
    } = body;

    const formattedZalo =
      zalo_link && zalo_link.trim() !== ""
        ? zalo_link.startsWith("http")
          ? zalo_link
          : `https://zalo.me/${phone.replace(/\D/g, "")}`
        : `https://zalo.me/${phone?.replace(/\D/g, "")}`;

    await db.execute({
      sql: `UPDATE students 
            SET name = ?, phone = ?, zalo_link = ?, zalo_chat_id = ?, level_id = ?, time_slot_id = ?, teacher_id = ?, tuition_package_id = ?,
                start_date = ?, duration_mode = ?, sessions_per_week = ?, hours_per_week = ?, registered_days = ?, study_time_detail = ?, schedule_details_json = ?,
                is_discount_enabled = ?, discount_percent = ?, discount_reason = ?
            WHERE id = ?`,
      args: [
        name.trim(),
        phone.trim(),
        formattedZalo,
        zalo_chat_id ? String(zalo_chat_id).trim() : null,
        level_id,
        time_slot_id || "",
        teacher_id || null,
        tuition_package_id || null,
        start_date ? String(start_date).trim() : null,
        duration_mode || "by_hours",
        Number(sessions_per_week) || 3,
        Number(hours_per_week) || 3,
        registered_days || "",
        study_time_detail || "",
        schedule_details_json || "[]",
        is_discount_enabled ? 1 : 0,
        Number(discount_percent) || 0,
        discount_reason ? String(discount_reason).trim() : "",
        id,
      ],
    });

    return NextResponse.json({
      success: true,
      message: "Cập nhật thông tin học sinh thành công!",
    });
  } catch (error: unknown) {
    console.error("Student PUT Error:", error);
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

    // Delete overrides first
    await db.execute({
      sql: "DELETE FROM student_monthly_tuitions WHERE student_id = ?",
      args: [id],
    });

    // Delete makeups
    await db.execute({
      sql: "DELETE FROM makeup_classes WHERE student_id = ?",
      args: [id],
    });

    // Delete student
    await db.execute({
      sql: "DELETE FROM students WHERE id = ?",
      args: [id],
    });

    return NextResponse.json({
      success: true,
      message: "Đã xóa học sinh khỏi danh sách!",
    });
  } catch (error: unknown) {
    console.error("Student DELETE Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
