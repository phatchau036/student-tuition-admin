import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

// Helper: tính toán tháng kết thúc từ tháng bắt đầu và số tháng chu kỳ
// Ví dụ: addMonthsToPeriod("2026-10", 3) => "2026-12" (10, 11, 12 là 3 tháng)
function computeEndMonth(startMonth: string, cycleMonths: number): string {
  if (!startMonth || !startMonth.includes("-")) return startMonth;
  const [yearStr, monthStr] = startMonth.split("-");
  let y = parseInt(yearStr, 10);
  let m = parseInt(monthStr, 10);

  // Cộng thêm (cycleMonths - 1) tháng
  const totalMonths = m + (cycleMonths - 1);
  m = ((totalMonths - 1) % 12) + 1;
  y += Math.floor((totalMonths - 1) / 12);

  return `${y}-${String(m).padStart(2, "0")}`;
}

export async function POST(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const body = await req.json();
    const { action, student_id, month, package_id, amount, note } = body;

    if (!student_id) {
      return NextResponse.json({ success: false, message: "Thiếu thông tin học sinh!" }, { status: 400 });
    }

    const currentMonth = month || new Date().toISOString().slice(0, 7);

    // 1. ĐỐI SOÁT: ĐÁNH DẤU ĐÃ ĐÓNG (Paid)
    if (action === "mark_paid") {
      let cycleMonths = 1;
      let packageName = "Gói 1 Tháng (Chuẩn)";
      let paymentAmount = Number(amount) || 1000000;
      let targetPackageId = package_id || null;

      // Nếu có chọn gói học phí cụ thể
      if (package_id) {
        const pkgRes = await db.execute({
          sql: "SELECT * FROM tuition_packages WHERE id = ?",
          args: [package_id],
        });
        if (pkgRes.rows.length > 0) {
          const pkg = pkgRes.rows[0];
          packageName = String(pkg.name);
          targetPackageId = String(pkg.id);
          paymentAmount = amount !== undefined ? Number(amount) : Number(pkg.amount);

          if (pkg.cycle_unit === "week") {
            // Quy đổi tuần sang tháng: 4 tuần ~ 1 tháng
            cycleMonths = Math.max(1, Math.round(Number(pkg.cycle_value) / 4));
          } else {
            cycleMonths = Math.max(1, Number(pkg.cycle_value));
          }
        }
      } else {
        // Kiểm tra xem học sinh có được gán gói mặc định không
        const stRes = await db.execute({
          sql: `SELECT s.tuition_package_id, p.name as package_name, p.amount as package_amount, p.cycle_unit, p.cycle_value 
                FROM students s 
                LEFT JOIN tuition_packages p ON s.tuition_package_id = p.id 
                WHERE s.id = ?`,
          args: [student_id],
        });
        if (stRes.rows.length > 0 && stRes.rows[0].tuition_package_id) {
          const stPkg = stRes.rows[0];
          targetPackageId = String(stPkg.tuition_package_id);
          packageName = String(stPkg.package_name || "Gói học phí");
          paymentAmount = amount !== undefined ? Number(amount) : Number(stPkg.package_amount);
          if (stPkg.cycle_unit === "week") {
            cycleMonths = Math.max(1, Math.round(Number(stPkg.cycle_value) / 4));
          } else {
            cycleMonths = Math.max(1, Number(stPkg.cycle_value));
          }
        }
      }

      const startPeriod = currentMonth;
      const endPeriod = computeEndMonth(startPeriod, cycleMonths);
      const todayStr = new Date().toISOString().slice(0, 10);
      const paymentId = `pay-${Date.now()}`;

      // Xóa các thanh toán trùng kỳ nếu có
      await db.execute({
        sql: `DELETE FROM student_payments 
              WHERE student_id = ? AND start_period = ?`,
        args: [student_id, startPeriod],
      });

      // Ghi nhận bản ghi thanh toán mới
      await db.execute({
        sql: `INSERT INTO student_payments (id, student_id, package_id, package_name, amount, paid_date, start_period, end_period, status, note)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?)`,
        args: [paymentId, student_id, targetPackageId, packageName, paymentAmount, todayStr, startPeriod, endPeriod, note || ""],
      });

      const periodDesc = cycleMonths > 1 ? `${startPeriod} đến ${endPeriod}` : `Tháng ${startPeriod}`;
      return NextResponse.json({
        success: true,
        message: `Đã xác nhận thanh toán thành công cho ${periodDesc}!`,
        data: {
          payment_id: paymentId,
          start_period: startPeriod,
          end_period: endPeriod,
          package_name: packageName,
        },
      });
    }

    // 2. ĐỐI SOÁT: ĐÁNH DẤU CHƯA ĐÓNG / HỦY ĐỐI SOÁT (Unpaid)
    if (action === "mark_unpaid") {
      // Xóa hoặc chuyển trạng thái các payment đang bao phủ tháng này
      await db.execute({
        sql: `DELETE FROM student_payments 
              WHERE student_id = ? AND ? >= start_period AND ? <= end_period`,
        args: [student_id, currentMonth, currentMonth],
      });

      return NextResponse.json({
        success: true,
        message: `Đã chuyển trạng thái học sinh thành "Cần đóng tiền" cho tháng ${currentMonth}!`,
      });
    }

    return NextResponse.json({ success: false, message: "Hành động không hợp lệ!" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Payments API Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
