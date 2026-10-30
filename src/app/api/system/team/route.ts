import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

// GET /api/system/team - Lấy danh sách thành viên đội ngũ TpTeam
export async function GET() {
  try {
    await initDb();
    const db = getDb();
    const res = await db.execute("SELECT * FROM system_team_members ORDER BY created_at ASC");
    return NextResponse.json({
      success: true,
      data: res.rows.map((r) => ({
        id: String(r.id),
        name: String(r.name),
        role: String(r.role || "developer"),
        phone: String(r.phone || ""),
        avatar_color: String(r.avatar_color || "purple"),
        is_active: Number(r.is_active ?? 1),
        created_at: String(r.created_at || ""),
      })),
    });
  } catch (error: unknown) {
    console.error("System Team GET Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Lỗi máy chủ" },
      { status: 500 }
    );
  }
}

// POST /api/system/team - Thêm / Cập nhật / Xóa thành viên đội ngũ
export async function POST(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const body = await req.json();
    const { action, id, name, role = "developer", phone = "", avatar_color = "purple" } = body;

    // 1. Thêm thành viên mới
    if (action === "create" || !action) {
      if (!name || !name.trim()) {
        return NextResponse.json(
          { success: false, message: "Vui lòng nhập tên thành viên!" },
          { status: 400 }
        );
      }
      const newId = id || `mem-${Date.now()}`;
      await db.execute({
        sql: `INSERT INTO system_team_members (id, name, role, phone, avatar_color, is_active)
              VALUES (?, ?, ?, ?, ?, 1)`,
        args: [newId, name.trim(), role, phone.trim(), avatar_color],
      });
      return NextResponse.json({
        success: true,
        message: `Đã thêm thành viên "${name.trim()}" vào đội ngũ!`,
        data: { id: newId },
      });
    }

    // 2. Xóa thành viên
    if (action === "delete") {
      if (!id) {
        return NextResponse.json({ success: false, message: "Thiếu ID thành viên" }, { status: 400 });
      }
      await db.execute({
        sql: "DELETE FROM system_team_members WHERE id = ?",
        args: [id],
      });
      return NextResponse.json({
        success: true,
        message: "Đã xóa thành viên khỏi đội ngũ!",
      });
    }

    // 3. Cập nhật thành viên
    if (action === "update") {
      if (!id) {
        return NextResponse.json({ success: false, message: "Thiếu ID thành viên" }, { status: 400 });
      }
      await db.execute({
        sql: `UPDATE system_team_members 
              SET name = COALESCE(?, name),
                  role = COALESCE(?, role),
                  phone = COALESCE(?, phone),
                  avatar_color = COALESCE(?, avatar_color)
              WHERE id = ?`,
        args: [name ? name.trim() : null, role || null, phone !== undefined ? phone.trim() : null, avatar_color || null, id],
      });
      return NextResponse.json({
        success: true,
        message: "Đã cập nhật thông tin thành viên!",
      });
    }

    return NextResponse.json({ success: false, message: "Hành động không hợp lệ" }, { status: 400 });
  } catch (error: unknown) {
    console.error("System Team POST Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Lỗi máy chủ" },
      { status: 500 }
    );
  }
}
