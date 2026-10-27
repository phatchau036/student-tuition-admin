import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { calculateStandardTuition, applyDiscount, getPreviousMonthStr } from "@/lib/tuition";

export async function POST(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const body = await req.json();
    const { action, phone } = body;

    // 1. Phụ huynh đăng nhập bằng Số điện thoại
    if (action === "login") {
      if (!phone || !phone.trim()) {
        return NextResponse.json(
          { success: false, message: "Vui lòng nhập số điện thoại lúc đăng ký!" },
          { status: 400 }
        );
      }

      const cleanPhone = phone.trim().replace(/\D/g, "");

      // Find students matching this phone
      const studentsRes = await db.execute({
        sql: `
          SELECT s.*, 
                 COALESCE(sc.name, (SELECT name FROM schools LIMIT 1), 'Trung Tâm Đào Tạo') as school_name,
                 COALESCE(sc.address, (SELECT address FROM schools LIMIT 1), '') as school_address,
                 COALESCE(sc.phone, (SELECT phone FROM schools LIMIT 1), '') as school_phone,
                 l.level_name, l.surcharge_amount as level_surcharge,
                 tc.name as teacher_name, tc.phone as teacher_phone, tc.color as teacher_color,
                 pkg.name as tuition_package_name, pkg.amount as tuition_package_amount
          FROM students s
          LEFT JOIN schools sc ON s.school_id = sc.id
          LEFT JOIN level_surcharges l ON s.level_id = l.id
          LEFT JOIN teachers tc ON s.teacher_id = tc.id
          LEFT JOIN tuition_packages pkg ON s.tuition_package_id = pkg.id
          WHERE replace(replace(replace(s.phone, ' ', ''), '.', ''), '-', '') LIKE ?
          ORDER BY s.created_at DESC
        `,
        args: [`%${cleanPhone}%`],
      });

      if (studentsRes.rows.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: "Không tìm thấy học sinh nào với số điện thoại này! Vui lòng kiểm tra lại số đã đăng ký với trung tâm.",
          },
          { status: 404 }
        );
      }

      // Get base tuition, month format & bank settings for VietQR
      const settingsRes = await db.execute("SELECT key, value FROM settings WHERE key IN ('base_tuition', 'month_format', 'sepay_bank_name', 'sepay_account_number', 'sepay_prefix', 'zalo_bot_name', 'zalo_bot_token')");
      let baseTuition = 1000000;
      let monthFormat = "vietnamese";
      let sepayBankName = "";
      let sepayAccountNumber = "";
      let sepayPrefix = "HP";
      let zaloBotName = "";
      let isBotConfigured = false;
      for (const row of settingsRes.rows) {
        if (row.key === "base_tuition") baseTuition = Number(row.value) || 1000000;
        if (row.key === "month_format") monthFormat = String(row.value) || "vietnamese";
        if (row.key === "sepay_bank_name") sepayBankName = String(row.value || "");
        if (row.key === "sepay_account_number") sepayAccountNumber = String(row.value || "");
        if (row.key === "sepay_prefix") sepayPrefix = String(row.value || "HP");
        if (row.key === "zalo_bot_name") zaloBotName = String(row.value || "");
        if (row.key === "zalo_bot_token" && row.value) isBotConfigured = true;
      }

      // Current month
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      const studentsData = [];

      for (const st of studentsRes.rows) {
        const studentId = String(st.id);

        // Fetch makeups for this student
        const makeupsRes = await db.execute({
          sql: "SELECT * FROM makeup_classes WHERE student_id = ? ORDER BY absence_date DESC, created_at DESC",
          args: [studentId],
        });

        // Fetch monthly override
        const overrideRes = await db.execute({
          sql: "SELECT * FROM student_monthly_tuitions WHERE student_id = ? AND month = ?",
          args: [studentId, currentMonth],
        });

        const pkgAmount = Number(st.tuition_package_amount || 0);
        let stdTuition = 0;
        if (st.tuition_package_id && pkgAmount > 0) {
          stdTuition = applyDiscount(
            pkgAmount,
            Number(st.is_discount_enabled || 0),
            Number(st.discount_percent || 0)
          );
        } else {
          stdTuition = calculateStandardTuition(
            baseTuition,
            Number(st.level_surcharge || 0),
            Number(st.is_discount_enabled || 0),
            Number(st.discount_percent || 0)
          );
        }

        const override = overrideRes.rows.length > 0 ? overrideRes.rows[0] : null;
        const currentTuition = override ? Number(override.amount) : stdTuition;

        // Check if student has paid for current month
        const curPaymentRes = await db.execute({
          sql: `SELECT * FROM student_payments WHERE student_id = ? AND ? >= start_period AND ? <= end_period AND status = 'paid'`,
          args: [studentId, currentMonth, currentMonth],
        });
        const isPaidThisMonth = curPaymentRes.rows.length > 0;

        // Check historical unpaid months & overdue debt
        let unpaidCount = isPaidThisMonth ? 0 : 1;
        let pastDebt = 0;
        const stStart = st.start_date ? String(st.start_date).slice(0, 7) : "";
        let cursor = getPreviousMonthStr(currentMonth);
        let lookback = 0;

        while (cursor && lookback < 6) {
          if (stStart && cursor < stStart) break;

          const pastPayCheck = await db.execute({
            sql: `SELECT * FROM student_payments WHERE student_id = ? AND ? >= start_period AND ? <= end_period AND status = 'paid'`,
            args: [studentId, cursor, cursor],
          });

          if (pastPayCheck.rows.length === 0) {
            unpaidCount += 1;
            const pastOvr = await db.execute({
              sql: "SELECT amount FROM student_monthly_tuitions WHERE student_id = ? AND month = ?",
              args: [studentId, cursor],
            });
            pastDebt += pastOvr.rows.length > 0 ? Number(pastOvr.rows[0].amount) : stdTuition;
          } else {
            break;
          }

          cursor = getPreviousMonthStr(cursor);
          lookback++;
        }

        const isOverdue = unpaidCount > 1;
        const totalDue = isPaidThisMonth ? 0 : currentTuition + pastDebt;

        studentsData.push({
          id: studentId,
          student_code: st.student_code ? String(st.student_code) : `HS${studentId.slice(-4).toUpperCase()}`,
          name: String(st.name),
          phone: String(st.phone),
          zalo_link: String(st.zalo_link || ""),
          zalo_chat_id: st.zalo_chat_id ? String(st.zalo_chat_id) : undefined,
          school_name: String(st.school_name || "Trung Tâm Đào Tạo"),
          school_address: String(st.school_address || ""),
          school_phone: String(st.school_phone || "0909123456"),
          level_name: String(st.level_name || "Chưa phân loại"),
          teacher_name: st.teacher_name ? String(st.teacher_name) : "Chưa phân công",
          teacher_phone: st.teacher_phone ? String(st.teacher_phone) : "",
          teacher_color: String(st.teacher_color || "indigo"),
          duration_mode: String(st.duration_mode || "by_hours"),
          sessions_per_week: Number(st.sessions_per_week || 3),
          hours_per_week: Number(st.hours_per_week || 3),
          registered_days: String(st.registered_days || ""),
          study_time_detail: String(st.study_time_detail || ""),
          tuition_package_name: st.tuition_package_name ? String(st.tuition_package_name) : undefined,
          is_discount_enabled: Number(st.is_discount_enabled || 0),
          discount_percent: Number(st.discount_percent || 0),
          discount_reason: String(st.discount_reason || ""),
          current_month: currentMonth,
          current_tuition: currentTuition,
          standard_tuition: stdTuition,
          is_paid: isPaidThisMonth,
          is_overdue: isOverdue,
          unpaid_months_count: unpaidCount,
          previous_debt_amount: pastDebt,
          total_tuition_due: totalDue,
          is_override: Boolean(override),
          override_note: override ? String(override.note || "") : "",
          override_items_json: override?.items_json ? String(override.items_json) : "[]",
          makeups: makeupsRes.rows.map((m) => ({
            id: String(m.id),
            absence_date: String(m.absence_date),
            absence_reason: String(m.absence_reason || ""),
            status: String(m.status),
            makeup_date: m.makeup_date ? String(m.makeup_date) : undefined,
            makeup_time: m.makeup_time ? String(m.makeup_time) : undefined,
            note: m.note ? String(m.note) : undefined,
          })),
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          students: studentsData,
          month_format: monthFormat,
          bank_info: {
            bank_name: sepayBankName,
            account_number: sepayAccountNumber,
            prefix: sepayPrefix,
          },
          zalo_bot: {
            name: zaloBotName,
            is_configured: isBotConfigured,
          },
        },
      });
    }

    // 2. Cập nhật Zalo Chat ID cho học sinh từ Cổng Phụ Huynh
    if (action === "update_student_zalo_chat_id") {
      const { student_id, zalo_chat_id } = body;
      if (!student_id) {
        return NextResponse.json({ success: false, message: "Thiếu mã học sinh!" }, { status: 400 });
      }
      const val = zalo_chat_id ? String(zalo_chat_id).trim() : null;
      await db.execute({
        sql: "UPDATE students SET zalo_chat_id = ? WHERE id = ?",
        args: [val, student_id],
      });
      return NextResponse.json({
        success: true,
        message: val ? "Kết nối Zalo thành công!" : "Đã hủy kết nối Zalo!",
        zalo_chat_id: val,
      });
    }

    // 3. Phụ huynh xác nhận đã chuyển khoản / nộp học phí
    if (action === "confirm_payment") {
      const { student_id, month, amount, note } = body;
      if (!student_id || !month) {
        return NextResponse.json({ success: false, message: "Thiếu thông tin thanh toán!" }, { status: 400 });
      }

      // Lấy thông tin học sinh & gói học phí
      const stRes = await db.execute({
        sql: `SELECT s.*, p.name as package_name, p.amount as package_amount, p.cycle_unit, p.cycle_value
              FROM students s
              LEFT JOIN tuition_packages p ON s.tuition_package_id = p.id
              WHERE s.id = ?`,
        args: [student_id],
      });

      if (stRes.rows.length === 0) {
        return NextResponse.json({ success: false, message: "Không tìm thấy học sinh!" }, { status: 404 });
      }

      const st = stRes.rows[0];
      const todayStr = new Date().toISOString().slice(0, 10);
      const paymentId = `pay-parent-${Date.now()}`;
      const packageName = String(st.package_name || "Học phí chuẩn");
      const targetPackageId = st.tuition_package_id ? String(st.tuition_package_id) : null;
      const paymentAmount = Number(amount) || 0;

      // Xóa bản ghi thanh toán cùng kỳ nếu có để cập nhật mới
      await db.execute({
        sql: "DELETE FROM student_payments WHERE student_id = ? AND start_period = ?",
        args: [student_id, month],
      });

      // Tạo bản ghi thanh toán với trạng thái 'paid'
      await db.execute({
        sql: `INSERT INTO student_payments (
                id, student_id, package_id, package_name, amount, paid_date, start_period, end_period, status, note
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?)`,
        args: [
          paymentId,
          student_id,
          targetPackageId,
          packageName,
          paymentAmount,
          todayStr,
          month,
          month,
          note || "Phụ huynh xác nhận chuyển khoản nộp học phí qua Cổng phụ huynh",
        ],
      });

      return NextResponse.json({
        success: true,
        message: `Đã ghi nhận thanh toán học phí thành công cho tháng ${month}!`,
        payment_id: paymentId,
      });
    }

    return NextResponse.json({ success: false, message: "Hành động không hợp lệ!" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Parent API Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
