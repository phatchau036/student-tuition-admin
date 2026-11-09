import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { getSchoolIdFromRequest } from "@/lib/authHelper";

// GET /api/admin/staff - Danh sách tài khoản nhân viên của cơ sở
export async function GET(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const querySchoolId = searchParams.get("school_id");
    const headerSchoolId = getSchoolIdFromRequest(req);
    const schoolId = querySchoolId || headerSchoolId || "school-default";

    const staffRes = await db.execute({
      sql: `
        SELECT a.id, a.school_id, a.username, a.full_name, a.phone, a.role_id,
               a.is_active, a.is_owner, a.created_at,
               r.name as role_name, r.permissions_json
        FROM school_admins a
        LEFT JOIN admin_roles r ON a.role_id = r.id
        WHERE a.school_id = ? OR a.school_id = 'school-default' OR ? = 'school-default'
        ORDER BY a.is_owner DESC, a.created_at ASC
      `,
      args: [schoolId, schoolId],
    });

    const staffList = staffRes.rows.map((row) => {
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
        username: String(row.username),
        full_name: String(row.full_name),
        phone: row.phone ? String(row.phone) : "",
        role_id: row.role_id ? String(row.role_id) : "",
        role_name: row.is_owner === 1 ? "Chủ Cơ Sở (Toàn quyền)" : row.role_name ? String(row.role_name) : "Chưa phân vai trò",
        is_active: Number(row.is_active ?? 1),
        is_owner: Number(row.is_owner ?? 0),
        permissions: row.is_owner === 1 ? ["*"] : permissions,
        created_at: String(row.created_at || ""),
      };
    });

    return NextResponse.json({ success: true, data: staffList });
  } catch (error: unknown) {
    console.error("Staff GET Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/staff - Tạo mới, Cập nhật hoặc Khóa/Mở khóa tài khoản nhân viên
export async function POST(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const querySchoolId = searchParams.get("school_id");
    const headerSchoolId = getSchoolIdFromRequest(req);

    const body = await req.json();
    const { action, id, username, password, full_name, phone, role_id, is_active, school_id } = body;
    const targetSchoolId = school_id || querySchoolId || headerSchoolId || "school-default";

    // 1. Action: Khóa / Mở khóa tài khoản nhân viên (Toggle active)
    if (action === "toggle_active") {
      if (!id) {
        return NextResponse.json({ success: false, message: "Thiếu ID tài khoản!" }, { status: 400 });
      }

      // Không cho phép khóa tài khoản chủ cơ sở
      const checkOwner = await db.execute({
        sql: "SELECT is_owner FROM school_admins WHERE id = ?",
        args: [id],
      });
      if (checkOwner.rows.length > 0 && checkOwner.rows[0].is_owner === 1) {
        return NextResponse.json(
          { success: false, message: "Không thể khóa tài khoản Chủ cơ sở!" },
          { status: 400 }
        );
      }

      const nextState = is_active ? 1 : 0;
      await db.execute({
        sql: "UPDATE school_admins SET is_active = ? WHERE id = ?",
        args: [nextState, id],
      });

      return NextResponse.json({
        success: true,
        message: nextState === 1 ? "Đã mở khóa tài khoản thành công!" : "Đã tạm khóa tài khoản nhân viên!",
        is_active: nextState,
      });
    }

    // 2. Action: Cập nhật tài khoản cũ
    if (id) {
      if (!full_name || !full_name.trim()) {
        return NextResponse.json({ success: false, message: "Vui lòng nhập họ và tên nhân viên!" }, { status: 400 });
      }

      if (password && password.trim()) {
        await db.execute({
          sql: `UPDATE school_admins 
                SET full_name = ?, phone = ?, role_id = ?, password = ?
                WHERE id = ?`,
          args: [full_name.trim(), phone?.trim() || "", role_id || null, password.trim(), id],
        });
      } else {
        await db.execute({
          sql: `UPDATE school_admins 
                SET full_name = ?, phone = ?, role_id = ?
                WHERE id = ?`,
          args: [full_name.trim(), phone?.trim() || "", role_id || null, id],
        });
      }

      return NextResponse.json({
        success: true,
        message: `Đã cập nhật thông tin nhân viên "${full_name.trim()}" thành công!`,
        id,
      });
    }

    // 3. Action: Tạo mới tài khoản nhân viên
    if (!username || !username.trim() || !password || !password.trim() || !full_name || !full_name.trim()) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập đầy đủ tên đăng nhập, mật khẩu và họ tên nhân viên!" },
        { status: 400 }
      );
    }

    const cleanUser = username.trim().toLowerCase();

    // Kiểm tra trùng username
    const checkUser = await db.execute({
      sql: "SELECT id FROM school_admins WHERE LOWER(username) = ?",
      args: [cleanUser],
    });
    if (checkUser.rows.length > 0) {
      return NextResponse.json(
        { success: false, message: `Tên đăng nhập "${cleanUser}" đã tồn tại! Vui lòng chọn tên khác.` },
        { status: 400 }
      );
    }

    const newId = `admin-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    await db.execute({
      sql: `INSERT INTO school_admins (id, school_id, username, password, full_name, phone, role_id, is_active, is_owner)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0)`,
      args: [newId, targetSchoolId, cleanUser, password.trim(), full_name.trim(), phone?.trim() || "", role_id || null],
    });

    return NextResponse.json({
      success: true,
      message: `Đã tạo tài khoản nhân viên "${full_name.trim()}" thành công!`,
      id: newId,
    });
  } catch (error: unknown) {
    console.error("Staff POST Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/staff?id=... - Xóa tài khoản nhân viên
export async function DELETE(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, message: "Thiếu ID tài khoản cần xóa!" }, { status: 400 });
    }

    // Kiểm tra tuyệt đối không cho xóa tài khoản chủ cơ sở
    const checkOwner = await db.execute({
      sql: "SELECT is_owner, full_name FROM school_admins WHERE id = ?",
      args: [id],
    });
    if (checkOwner.rows.length === 0) {
      return NextResponse.json({ success: false, message: "Không tìm thấy tài khoản!" }, { status: 404 });
    }

    if (checkOwner.rows[0].is_owner === 1) {
      return NextResponse.json(
        { success: false, message: "Tuyệt đối không thể xóa tài khoản Chủ cơ sở!" },
        { status: 400 }
      );
    }

    await db.execute({
      sql: "DELETE FROM school_admins WHERE id = ?",
      args: [id],
    });

    return NextResponse.json({
      success: true,
      message: "Đã xóa tài khoản nhân viên thành công!",
    });
  } catch (error: unknown) {
    console.error("Staff DELETE Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
