import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

// API quản trị hệ thống: Quản lý các trường & Tài khoản Admin của từng trường
export async function GET(req: Request) {
  try {
    await initDb();
    const db = getDb();

    const schoolsRes = await db.execute(`
      SELECT s.*, 
             COUNT(DISTINCT a.id) as admin_count,
             COUNT(DISTINCT st.id) as student_count,
             COUNT(DISTINCT tc.id) as teacher_count
      FROM schools s
      LEFT JOIN school_admins a ON a.school_id = s.id
      LEFT JOIN students st ON st.school_id = s.id
      LEFT JOIN teachers tc ON tc.school_id = s.id
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `);

    const adminsRes = await db.execute(`
      SELECT a.*, s.name as school_name, s.code as school_code
      FROM school_admins a
      JOIN schools s ON a.school_id = s.id
      ORDER BY a.created_at DESC
    `);

    return NextResponse.json({
      success: true,
      data: {
        schools: schoolsRes.rows,
        admins: adminsRes.rows,
      },
    });
  } catch (error: unknown) {
    console.error("System GET Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const body = await req.json();
    const { action } = body;

    // 1. Tạo trường học mới
    if (action === "create_school") {
      const { name, code, school_type, street, city, branch_num, address, phone } = body;
      if (!name || !code) {
        return NextResponse.json(
          { success: false, message: "Vui lòng nhập tên và mã trường!" },
          { status: 400 }
        );
      }

      // Check unique code
      const checkCode = await db.execute({
        sql: "SELECT id FROM schools WHERE code = ?",
        args: [code.trim().toUpperCase()],
      });
      if (checkCode.rows.length > 0) {
        return NextResponse.json(
          { success: false, message: `Mã trường "${code}" đã tồn tại!` },
          { status: 400 }
        );
      }

      const id = `school-${Date.now()}`;
      await db.execute({
        sql: `INSERT INTO schools (id, name, code, school_type, street, city, branch_num, address, phone) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          name.trim(),
          code.trim().toUpperCase(),
          school_type?.trim() || "TT",
          street?.trim() || "",
          city?.trim() || "TPHCM",
          String(branch_num || "1"),
          address?.trim() || "",
          phone?.trim() || "",
        ],
      });

      // Tự động khởi tạo dữ liệu mẫu (Seed Data) riêng biệt cho trường mới
      // 1. Ca học mở cửa
      await db.execute({
        sql: `INSERT INTO time_slots (id, school_id, name, from_day, to_day, days, start_time, end_time, max_students, is_active)
              VALUES 
              (?, ?, 'Ca Tối (T2 - T7)', 'Thứ 2', 'Thứ 7', 'Thứ 2 – Thứ 7', '17:00', '20:00', 10, 1),
              (?, ?, 'Ca Sáng T7', 'Thứ 7', 'Thứ 7', 'Thứ 7', '09:00', '11:00', 10, 1),
              (?, ?, 'Ca Sáng CN', 'Chủ Nhật', 'Chủ Nhật', 'Chủ Nhật', '08:00', '11:30', 10, 1)`,
        args: [
          `slot-${Date.now()}-1`, id,
          `slot-${Date.now()}-2`, id,
          `slot-${Date.now()}-3`, id,
        ],
      });

      // 2. Mức phụ thu Level
      await db.execute({
        sql: `INSERT INTO level_surcharges (id, school_id, level_name, surcharge_amount, sort_order)
              VALUES 
              (?, ?, 'Grade 1', 0, 1),
              (?, ?, 'Grade 2', 100000, 2)`,
        args: [
          `lvl-${Date.now()}-1`, id,
          `lvl-${Date.now()}-2`, id,
        ],
      });

      // 3. Mức chiết khấu
      await db.execute({
        sql: `INSERT INTO discount_presets (id, school_id, percentage, label)
              VALUES 
              (?, ?, 10, 'Anh em ruột cùng học'),
              (?, ?, 20, 'Đăng ký sớm'),
              (?, ?, 50, 'Học sinh nghèo vượt khó')`,
        args: [
          `disc-${Date.now()}-1`, id,
          `disc-${Date.now()}-2`, id,
          `disc-${Date.now()}-3`, id,
        ],
      });

      // 4. Gói học phí mặc định
      await db.execute({
        sql: `INSERT INTO tuition_packages (id, school_id, name, amount, cycle_unit, cycle_value, is_active)
              VALUES 
              (?, ?, 'Học phí 1 tháng', 1000000, 'month', 1, 1),
              (?, ?, 'Gói Khóa 3 tháng (-5%)', 2850000, 'month', 3, 1)`,
        args: [
          `pkg-${Date.now()}-1`, id,
          `pkg-${Date.now()}-2`, id,
        ],
      });

      // 5. Danh mục bộ môn học mặc định
      await db.execute({
        sql: `INSERT INTO subjects (id, school_id, name, description, color, is_active)
              VALUES 
              (?, ?, 'Piano', 'Bộ môn Piano cơ bản & nâng cao', 'indigo', 1),
              (?, ?, 'Guitar', 'Bộ môn Guitar đệm hát & cổ điển', 'amber', 1)`,
        args: [
          `sub-${Date.now()}-1`, id,
          `sub-${Date.now()}-2`, id,
        ],
      });

      return NextResponse.json({
        success: true,
        message: "Tạo trường mới thành công!",
        school_id: id,
      });
    }

    // 2. Tạo tài khoản Admin cho trường
    if (action === "create_admin") {
      const { school_id, username, password, full_name } = body;
      if (!school_id || !username || !password || !full_name) {
        return NextResponse.json(
          { success: false, message: "Vui lòng nhập đầy đủ thông tin tài khoản admin!" },
          { status: 400 }
        );
      }

      const checkUser = await db.execute({
        sql: "SELECT id FROM school_admins WHERE username = ?",
        args: [username.trim().toLowerCase()],
      });
      if (checkUser.rows.length > 0) {
        return NextResponse.json(
          { success: false, message: `Tên đăng nhập "${username}" đã có người sử dụng!` },
          { status: 400 }
        );
      }

      const id = `admin-${Date.now()}`;
      await db.execute({
        sql: "INSERT INTO school_admins (id, school_id, username, password, full_name) VALUES (?, ?, ?, ?, ?)",
        args: [id, school_id, username.trim().toLowerCase(), password.trim(), full_name.trim()],
      });

      return NextResponse.json({
        success: true,
        message: "Tạo tài khoản quản trị viên cho trường thành công!",
      });
    }

    // 3. Đổi tên & cập nhật thông tin trường
    if (action === "edit_school") {
      const { school_id, name, code, school_type, street, city, branch_num, address, phone } = body;
      if (!school_id || !name || !code) {
        return NextResponse.json(
          { success: false, message: "Vui lòng nhập đầy đủ tên và mã trường!" },
          { status: 400 }
        );
      }

      // Check unique code excluding this school
      const checkCode = await db.execute({
        sql: "SELECT id FROM schools WHERE code = ? AND id != ?",
        args: [code.trim().toUpperCase(), school_id],
      });
      if (checkCode.rows.length > 0) {
        return NextResponse.json(
          { success: false, message: `Mã trường "${code}" đã được sử dụng bởi trường khác!` },
          { status: 400 }
        );
      }

      await db.execute({
        sql: `UPDATE schools 
              SET name = ?, code = ?, school_type = ?, street = ?, city = ?, branch_num = ?, address = ?, phone = ? 
              WHERE id = ?`,
        args: [
          name.trim(),
          code.trim().toUpperCase(),
          school_type?.trim() || "TT",
          street?.trim() || "",
          city?.trim() || "TPHCM",
          String(branch_num || "1"),
          address?.trim() || "",
          phone?.trim() || "",
          school_id,
        ],
      });

      return NextResponse.json({
        success: true,
        message: "Cập nhật thông tin và đổi tên trường thành công!",
      });
    }

    // 4. Xóa trường (xóa toàn bộ dữ liệu thuộc trường này)
    if (action === "delete_school") {
      const { school_id } = body;
      if (!school_id) {
        return NextResponse.json({ success: false, message: "Thiếu mã trường cần xóa!" }, { status: 400 });
      }

      await db.execute({ sql: "DELETE FROM school_admins WHERE school_id = ?", args: [school_id] });
      await db.execute({ sql: "DELETE FROM students WHERE school_id = ?", args: [school_id] });
      await db.execute({ sql: "DELETE FROM teachers WHERE school_id = ?", args: [school_id] });
      await db.execute({ sql: "DELETE FROM time_slots WHERE school_id = ?", args: [school_id] });
      await db.execute({ sql: "DELETE FROM level_surcharges WHERE school_id = ?", args: [school_id] });
      await db.execute({ sql: "DELETE FROM discount_presets WHERE school_id = ?", args: [school_id] });
      await db.execute({ sql: "DELETE FROM schools WHERE id = ?", args: [school_id] });

      return NextResponse.json({
        success: true,
        message: "Đã xóa trường học và toàn bộ dữ liệu liên quan thành công!",
      });
    }

    // 4. Xóa admin
    if (action === "delete_admin") {
      const { admin_id } = body;
      await db.execute({ sql: "DELETE FROM school_admins WHERE id = ?", args: [admin_id] });
      return NextResponse.json({ success: true, message: "Đã xóa tài khoản admin!" });
    }

    // 5. Cấu hình IP Whitelist cho trường (Bật/tắt IP restriction & danh sách IP cho phép)
    if (action === "update_school_ip") {
      const { school_id, ip_restriction_enabled, allowed_ips } = body;
      if (!school_id) {
        return NextResponse.json({ success: false, message: "Thiếu mã trường!" }, { status: 400 });
      }

      await db.execute({
        sql: "UPDATE schools SET ip_restriction_enabled = ?, allowed_ips = ? WHERE id = ?",
        args: [Number(ip_restriction_enabled ? 1 : 0), String(allowed_ips || "").trim(), school_id],
      });

      return NextResponse.json({
        success: true,
        message: "Cập nhật cấu hình IP bảo vệ cho trường thành công!",
      });
    }

    return NextResponse.json({ success: false, message: "Hành động không hợp lệ!" }, { status: 400 });
  } catch (error: unknown) {
    console.error("System POST Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
