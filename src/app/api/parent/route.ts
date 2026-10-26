import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { calculateStandardTuition, getPreviousMonthStr } from "@/lib/tuition";

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
                 sc.name as school_name, sc.address as school_address, sc.phone as school_phone,
                 l.level_name, l.surcharge_amount as level_surcharge,
                 tc.name as teacher_name, tc.phone as teacher_phone, tc.color as teacher_color
          FROM students s
          LEFT JOIN schools sc ON s.school_id = sc.id
          LEFT JOIN level_surcharges l ON s.level_id = l.id
          LEFT JOIN teachers tc ON s.teacher_id = tc.id
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

      // Get base tuition & month format
      const settingsRes = await db.execute("SELECT key, value FROM settings WHERE key IN ('base_tuition', 'month_format')");
      let baseTuition = 1000000;
      let monthFormat = "vietnamese";
      for (const row of settingsRes.rows) {
        if (row.key === "base_tuition") baseTuition = Number(row.value) || 1000000;
        if (row.key === "month_format") monthFormat = String(row.value) || "vietnamese";
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

        const stdTuition = calculateStandardTuition(
          baseTuition,
          Number(st.level_surcharge || 0),
          Number(st.is_discount_enabled || 0),
          Number(st.discount_percent || 0)
        );

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
          name: String(st.name),
          phone: String(st.phone),
          zalo_link: String(st.zalo_link || ""),
          school_name: String(st.school_name || "Trung Tâm Đào Tạo"),
          school_address: String(st.school_address || ""),
          school_phone: String(st.school_phone || ""),
          level_name: String(st.level_name || "Chưa phân loại"),
          teacher_name: st.teacher_name ? String(st.teacher_name) : "Chưa phân công",
          teacher_phone: st.teacher_phone ? String(st.teacher_phone) : "",
          teacher_color: String(st.teacher_color || "indigo"),
          duration_mode: String(st.duration_mode || "by_hours"),
          sessions_per_week: Number(st.sessions_per_week || 3),
          hours_per_week: Number(st.hours_per_week || 3),
          registered_days: String(st.registered_days || ""),
          study_time_detail: String(st.study_time_detail || ""),
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
        },
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
