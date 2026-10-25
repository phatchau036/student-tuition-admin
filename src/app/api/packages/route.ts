import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

// GET /api/packages - Lấy danh sách gói học phí
export async function GET() {
  try {
    await initDb();
    const db = getDb();
    const res = await db.execute("SELECT * FROM tuition_packages ORDER BY cycle_value ASC, amount ASC");
    const packages = res.rows.map((row) => ({
      id: String(row.id),
      school_id: String(row.school_id || "school-default"),
      name: String(row.name),
      amount: Number(row.amount),
      original_amount: Number(row.original_amount || row.amount),
      cycle_unit: String(row.cycle_unit) as "month" | "week",
      cycle_value: Number(row.cycle_value),
      discount_type: (row.discount_type as "none" | "percent" | "amount") || "none",
      discount_value: Number(row.discount_value || 0),
      benefits: String(row.benefits || ""),
      is_active: Number(row.is_active),
      created_at: String(row.created_at || ""),
    }));

    return NextResponse.json({ success: true, data: packages });
  } catch (error: unknown) {
    console.error("Packages GET Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST /api/packages - Thêm hoặc Cập nhật gói học phí
export async function POST(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const body = await req.json();
    const { action, id, name, amount, original_amount, cycle_unit, cycle_value, discount_type, discount_value, benefits, is_active } = body;

    // 1. Thêm gói mới
    if (action === "create" || !action) {
      if (!name || !name.trim()) {
        return NextResponse.json({ success: false, message: "Vui lòng nhập tên gói học phí!" }, { status: 400 });
      }
      const newId = id || `pkg-${Date.now()}`;
      await db.execute({
        sql: `INSERT INTO tuition_packages (id, name, amount, original_amount, cycle_unit, cycle_value, discount_type, discount_value, benefits, is_active)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          newId,
          name.trim(),
          Number(amount) || 0,
          Number(original_amount || amount) || 0,
          cycle_unit === "week" ? "week" : "month",
          Number(cycle_value) || 1,
          discount_type || "none",
          Number(discount_value) || 0,
          benefits?.trim() || "",
          is_active !== undefined ? (Number(is_active) ? 1 : 0) : 1,
        ],
      });

      return NextResponse.json({ success: true, message: "Thêm gói học phí thành công!", package_id: newId });
    }

    // 2. Cập nhật gói
    if (action === "update") {
      if (!id) {
        return NextResponse.json({ success: false, message: "Thiếu mã gói cần cập nhật!" }, { status: 400 });
      }
      await db.execute({
        sql: `UPDATE tuition_packages 
              SET name = ?, amount = ?, original_amount = ?, cycle_unit = ?, cycle_value = ?, discount_type = ?, discount_value = ?, benefits = ?, is_active = ?
              WHERE id = ?`,
        args: [
          name.trim(),
          Number(amount) || 0,
          Number(original_amount || amount) || 0,
          cycle_unit === "week" ? "week" : "month",
          Number(cycle_value) || 1,
          discount_type || "none",
          Number(discount_value) || 0,
          benefits?.trim() || "",
          is_active !== undefined ? (Number(is_active) ? 1 : 0) : 1,
          id,
        ],
      });

      return NextResponse.json({ success: true, message: "Cập nhật gói học phí thành công!" });
    }

    // 3. Bật/tắt trạng thái hoạt động nhanh
    if (action === "toggle_active") {
      if (!id) {
        return NextResponse.json({ success: false, message: "Thiếu mã gói!" }, { status: 400 });
      }
      await db.execute({
        sql: "UPDATE tuition_packages SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?",
        args: [id],
      });

      return NextResponse.json({ success: true, message: "Đã thay đổi trạng thái gói học phí!" });
    }

    // 4. Xóa gói
    if (action === "delete") {
      if (!id) {
        return NextResponse.json({ success: false, message: "Thiếu mã gói cần xóa!" }, { status: 400 });
      }
      await db.execute({
        sql: "DELETE FROM tuition_packages WHERE id = ?",
        args: [id],
      });

      return NextResponse.json({ success: true, message: "Đã xóa gói học phí thành công!" });
    }

    return NextResponse.json({ success: false, message: "Hành động không hợp lệ!" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Packages POST Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
