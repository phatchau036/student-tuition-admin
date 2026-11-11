import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { getAdminFromRequest, requireAdminPermission } from "@/lib/authHelper";

// GET /api/admin/branches - Danh sách các chi nhánh cơ sở
export async function GET(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const admin = await getAdminFromRequest(req);

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Phiên đăng nhập không hợp lệ!" },
        { status: 401 }
      );
    }

    const schoolsRes = await db.execute(`
      SELECT s.id, s.name, s.code, s.address, s.phone, s.created_at,
             (SELECT COUNT(*) FROM students st 
              WHERE (st.school_id = s.id OR (s.id = 'school-default' AND (st.school_id IS NULL OR st.school_id = '' OR st.school_id = 'school-default'))) 
                AND (st.status = 'studying' OR st.status IS NULL OR st.status = '')) as active_student_count,
             (SELECT COUNT(*) FROM teachers tc 
              WHERE tc.school_id = s.id OR (s.id = 'school-default' AND (tc.school_id IS NULL OR tc.school_id = '' OR tc.school_id = 'school-default'))) as teacher_count
      FROM schools s
      ORDER BY s.created_at ASC
    `);

    const branches = schoolsRes.rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      code: String(row.code),
      address: String(row.address || ""),
      phone: String(row.phone || ""),
      active_student_count: Number(row.active_student_count || 0),
      teacher_count: Number(row.teacher_count || 0),
      created_at: String(row.created_at || ""),
    }));

    return NextResponse.json({ success: true, data: branches });
  } catch (error: unknown) {
    console.error("Branches GET Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/branches - Tạo chi nhánh mới
export async function POST(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const admin = await getAdminFromRequest(req);

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "Phiên đăng nhập không hợp lệ!" },
        { status: 401 }
      );
    }

    // Chỉ Chủ cơ sở hoặc tài khoản có quyền cấu hình cài đặt mới được tạo chi nhánh
    if (admin.is_owner !== 1 && !admin.permissions.includes("*") && !admin.permissions.includes("settings.manage")) {
      return NextResponse.json(
        { success: false, message: "Chỉ Chủ Cơ Sở mới có quyền tạo thêm chi nhánh mới!" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, code, address, phone } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập tên chi nhánh mới!" },
        { status: 400 }
      );
    }

    const cleanName = name.trim();
    let cleanCode = (code ? code.trim() : "").toUpperCase();

    // Tự động sinh mã chi nhánh nếu người dùng để trống
    if (!cleanCode) {
      const existingSchools = await db.execute("SELECT COUNT(*) as count FROM schools");
      const nextNum = Number(existingSchools.rows[0]?.count || 1) + 1;
      cleanCode = `CN-${nextNum < 10 ? "0" + nextNum : nextNum}`;
    }

    // Kiểm tra trùng mã code
    const checkCode = await db.execute({
      sql: "SELECT id FROM schools WHERE UPPER(code) = ?",
      args: [cleanCode],
    });
    if (checkCode.rows.length > 0) {
      return NextResponse.json(
        { success: false, message: `Mã chi nhánh "${cleanCode}" đã tồn tại! Vui lòng chọn mã khác.` },
        { status: 400 }
      );
    }

    // Kiểm tra trùng tên
    const checkName = await db.execute({
      sql: "SELECT id FROM schools WHERE LOWER(name) = ?",
      args: [cleanName.toLowerCase()],
    });
    if (checkName.rows.length > 0) {
      return NextResponse.json(
        { success: false, message: `Tên chi nhánh "${cleanName}" đã tồn tại! Vui lòng chọn tên khác.` },
        { status: 400 }
      );
    }

    const newSchoolId = `school-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    await db.execute({
      sql: `INSERT INTO schools (id, name, code, address, phone)
            VALUES (?, ?, ?, ?, ?)`,
      args: [newSchoolId, cleanName, cleanCode, address?.trim() || "", phone?.trim() || ""],
    });

    // Khởi tạo các vai trò mẫu cho chi nhánh mới
    const defaultRoles = [
      {
        id: `role-office-${newSchoolId}`,
        name: "Nhân Viên Văn Phòng / Lễ Tân",
        description: "Tiếp đón phụ huynh, thêm/sửa học sinh, xem ma trận lịch, tư vấn ca trống, điểm danh và xếp ca học bù.",
        permissions_json: JSON.stringify([
          "students.view",
          "students.create",
          "students.edit",
          "schedule.matrix",
          "attendance.manage",
          "makeups.manage",
          "schedule.consult",
        ]),
      },
      {
        id: `role-accountant-${newSchoolId}`,
        name: "Kế Toán / Thu Ngân",
        description: "Xem học phí, công nợ, đối soát thu tiền, xuất biên lai điện tử, gửi nhắc nợ Zalo và xem tổng kết doanh thu tháng.",
        permissions_json: JSON.stringify([
          "students.view",
          "tuition.view",
          "tuition.audit",
          "tuition.receipt",
          "tuition.remind",
          "revenue.reports",
        ]),
      },
      {
        id: `role-academic-${newSchoolId}`,
        name: "Quản Lý Đào Tạo / Giáo Vụ",
        description: "Quản lý danh sách học sinh, quản lý lớp học, phân công giáo viên đứng lớp, quản lý bảo lưu/nghỉ học và lịch học bù.",
        permissions_json: JSON.stringify([
          "students.view",
          "students.create",
          "students.edit",
          "students.status",
          "schedule.matrix",
          "attendance.manage",
          "makeups.manage",
          "schedule.consult",
          "classes.manage",
          "teachers.manage",
        ]),
      },
    ];

    for (const r of defaultRoles) {
      try {
        await db.execute({
          sql: "INSERT OR IGNORE INTO admin_roles (id, school_id, name, description, permissions_json) VALUES (?, ?, ?, ?, ?)",
          args: [r.id, newSchoolId, r.name, r.description, r.permissions_json],
        });
      } catch {}
    }

    const newBranch = {
      id: newSchoolId,
      name: cleanName,
      code: cleanCode,
      address: address?.trim() || "",
      phone: phone?.trim() || "",
      active_student_count: 0,
      teacher_count: 0,
    };

    return NextResponse.json({
      success: true,
      message: `Đã tạo chi nhánh mới "${cleanName}" (${cleanCode}) thành công!`,
      branch: newBranch,
    });
  } catch (error: unknown) {
    console.error("Branches POST Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
