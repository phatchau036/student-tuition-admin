import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { getSchoolIdFromRequest } from "@/lib/authHelper";

// GET /api/admin/roles - Lấy danh sách các nhóm quyền của cơ sở
export async function GET(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const querySchoolId = searchParams.get("school_id");
    const headerSchoolId = getSchoolIdFromRequest(req);
    const schoolId = querySchoolId || headerSchoolId || "school-default";

    const rolesRes = await db.execute({
      sql: `
        SELECT r.*, COUNT(a.id) as staff_count
        FROM admin_roles r
        LEFT JOIN school_admins a ON a.role_id = r.id
        WHERE r.school_id = ? OR r.school_id = 'school-default' OR ? = 'school-default'
        GROUP BY r.id
        ORDER BY r.created_at ASC
      `,
      args: [schoolId, schoolId],
    });

    const roles = rolesRes.rows.map((row) => {
      let permissions: string[] = [];
      try {
        if (row.permissions_json) {
          const parsed = JSON.parse(String(row.permissions_json));
          if (Array.isArray(parsed)) permissions = parsed;
        }
      } catch {}

      return {
        id: String(row.id),
        school_id: String(row.school_id),
        name: String(row.name),
        description: String(row.description || ""),
        permissions_json: String(row.permissions_json || "[]"),
        permissions,
        staff_count: Number(row.staff_count || 0),
        created_at: String(row.created_at || ""),
      };
    });

    return NextResponse.json({ success: true, data: roles });
  } catch (error: unknown) {
    console.error("Roles GET Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/roles - Tạo mới hoặc Cập nhật nhóm quyền
export async function POST(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const querySchoolId = searchParams.get("school_id");
    const headerSchoolId = getSchoolIdFromRequest(req);

    const body = await req.json();
    const { id, name, description, permissions, permissions_json, school_id } = body;
    const targetSchoolId = school_id || querySchoolId || headerSchoolId || "school-default";

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, message: "Vui lòng nhập tên vai trò / nhóm quyền!" }, { status: 400 });
    }

    const permsJson = typeof permissions_json === "string" 
      ? permissions_json 
      : JSON.stringify(Array.isArray(permissions) ? permissions : []);

    // Cập nhật vai trò cũ
    if (id) {
      await db.execute({
        sql: `UPDATE admin_roles 
              SET name = ?, description = ?, permissions_json = ? 
              WHERE id = ?`,
        args: [name.trim(), description ? description.trim() : "", permsJson, id],
      });

      return NextResponse.json({
        success: true,
        message: `Đã cập nhật nhóm quyền "${name.trim()}" thành công!`,
        id,
      });
    }

    // Tạo vai trò mới
    const newId = `role-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    await db.execute({
      sql: `INSERT INTO admin_roles (id, school_id, name, description, permissions_json)
            VALUES (?, ?, ?, ?, ?)`,
      args: [newId, targetSchoolId, name.trim(), description ? description.trim() : "", permsJson],
    });

    return NextResponse.json({
      success: true,
      message: `Đã tạo nhóm quyền "${name.trim()}" thành công!`,
      id: newId,
    });
  } catch (error: unknown) {
    console.error("Roles POST Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/roles?id=... - Xóa nhóm quyền
export async function DELETE(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, message: "Thiếu ID nhóm quyền cần xóa!" }, { status: 400 });
    }

    // Kiểm tra xem có nhân viên nào đang thuộc vai trò này không
    const checkStaff = await db.execute({
      sql: "SELECT COUNT(*) as count FROM school_admins WHERE role_id = ?",
      args: [id],
    });
    const staffCount = Number(checkStaff.rows[0]?.count || 0);
    if (staffCount > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Không thể xóa nhóm quyền này vì hiện có ${staffCount} tài khoản nhân viên đang sử dụng! Vui lòng chuyển vai trò của nhân viên trước.`,
        },
        { status: 400 }
      );
    }

    await db.execute({
      sql: "DELETE FROM admin_roles WHERE id = ?",
      args: [id],
    });

    return NextResponse.json({
      success: true,
      message: "Đã xóa nhóm quyền thành công!",
    });
  } catch (error: unknown) {
    console.error("Roles DELETE Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
