/**
 * subjects.service.ts - Tang nghiep vu & truy cap du lieu cho endpoint tuong ung.
 *
 * Toan bo truy van SQL cua endpoint nam tai day. Cac file route handler
 * chi con lop chuyen tiep mong (nhan Request -> goi handler -> tra Response).
 *
 * Tu dong tach tu route handler trong Giai doan 2.
 */
import { NextResponse } from "next/server";
import { ok } from "@/server/http/response";
import { getDb, initDb } from "@/lib/db";
import { requireAdminPermission, resolveSchoolScopeForAdmin } from "@/lib/authHelper";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/subjects");

// GET /api/subjects - Lấy danh sách Bộ Môn
export async function handleSubjectsGet(req: Request) {
  try {
    await initDb();
    const auth = await requireAdminPermission(req, "settings.manage");
    if (!auth.authorized) return auth.errorResponse!;
    const db = getDb();
    const schoolId = await resolveSchoolScopeForAdmin(req, auth.admin!);

    const res = await db.execute({
      sql: "SELECT * FROM subjects WHERE school_id = ? ORDER BY created_at ASC",
      args: [schoolId],
    });

    const subjects = res.rows.map((row) => ({
      id: String(row.id),
      school_id: String(row.school_id || "school-default"),
      name: String(row.name),
      description: String(row.description || ""),
      color: String(row.color || "indigo"),
      is_active: Number(row.is_active),
      created_at: String(row.created_at || ""),
    }));

    return ok({ data: subjects });
  } catch (error: unknown) {
    log.error("Subjects GET Error:", { error: error });
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST /api/subjects - Thêm, Sửa, Bật/Tắt, Xóa Bộ Môn
export async function handleSubjectsPost(req: Request) {
  try {
    await initDb();
    const auth = await requireAdminPermission(req, "settings.manage");
    if (!auth.authorized) return auth.errorResponse!;
    const db = getDb();
    const schoolId = await resolveSchoolScopeForAdmin(req, auth.admin!);
    const body = await req.json();
    const { action, id, school_id, name, description, color, is_active } = body;
    // Chỉ cho phép ghi trong phạm vi tổ chức của tài khoản đang đăng nhập.
    const targetSchoolId = school_id
      ? await resolveSchoolScopeForAdmin(req, auth.admin!)
      : schoolId;

    // 1. Thêm bộ môn mới
    if (action === "create" || !action) {
      if (!name || !name.trim()) {
        return NextResponse.json(
          { success: false, message: "Vui lòng nhập tên môn học!" },
          { status: 400 }
        );
      }

      const newId = id || `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await db.execute({
        sql: `INSERT INTO subjects (id, school_id, name, description, color, is_active)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [
          newId,
          targetSchoolId,
          name.trim(),
          description?.trim() || "",
          color || "indigo",
          is_active !== undefined ? (Number(is_active) ? 1 : 0) : 1,
        ],
      });

      return NextResponse.json({
        success: true,
        message: `Đã thêm môn học: ${name.trim()}!`,
        subject_id: newId,
      });
    }

    // 2. Cập nhật bộ môn
    if (action === "update") {
      if (!id || !name || !name.trim()) {
        return NextResponse.json(
          { success: false, message: "Thiếu mã môn hoặc tên môn học!" },
          { status: 400 }
        );
      }

      await db.execute({
        sql: `UPDATE subjects 
              SET name = ?, description = ?, color = ?, is_active = ?
              WHERE id = ?`,
        args: [
          name.trim(),
          description?.trim() || "",
          color || "indigo",
          is_active !== undefined ? (Number(is_active) ? 1 : 0) : 1,
          id,
        ],
      });

      return NextResponse.json({ success: true, message: "Cập nhật môn học thành công!" });
    }

    // 3. Xóa bộ môn
    if (action === "delete") {
      if (!id) {
        return NextResponse.json(
          { success: false, message: "Thiếu mã môn cần xóa!" },
          { status: 400 }
        );
      }

      await db.execute({
        sql: "DELETE FROM subjects WHERE id = ?",
        args: [id],
      });

      return NextResponse.json({ success: true, message: "Đã xóa môn học thành công!" });
    }

    return NextResponse.json(
      { success: false, message: "Hành động không hợp lệ!" },
      { status: 400 }
    );
  } catch (error: unknown) {
    log.error("Subjects POST Error:", { error: error });
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
