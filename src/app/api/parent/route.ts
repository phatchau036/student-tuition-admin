import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { calculateStudentTuition, getPreviousMonthStr } from "@/lib/tuition";
import { syncPendingMakeupsToWallet } from "@/lib/wallet";
import { resolveSchoolIdByHost } from "@/lib/authHelper";
import { createLogger } from "@/lib/logger";
import { getSchoolSettings } from "@/server/settings/schoolSettings";

const log = createLogger("api/parent");

export async function POST(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const body = await req.json();
    const { action, phone } = body;

    // 1. Phụ huynh / Học sinh đăng nhập bằng Số điện thoại HOẶC Mã học viên (HS01, HS02...)
    if (action === "login") {
      const inputIdentifier = String(phone || "").trim();
      if (!inputIdentifier) {
        return NextResponse.json(
          { success: false, message: "Vui lòng nhập Số điện thoại hoặc Mã học viên!" },
          { status: 400 }
        );
      }

      const cleanPhone = inputIdentifier.replace(/\D/g, "");
      const isStudentCodeCandidate = /^HS[-_]?\d+/i.test(inputIdentifier) || cleanPhone.length < 8;

      // Cô lập tên miền (Domain Isolation): nếu truy cập qua domain riêng / subdomain cơ sở
      const rawHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
      const domainSchoolId = await resolveSchoolIdByHost(rawHost);

      let sql = "";
      let args: (string | number | null)[] = [];

      if (isStudentCodeCandidate && cleanPhone.length < 8) {
        // Tìm chính xác theo Mã Học Viên (student_code)
        sql = `
          SELECT s.*, 
                 COALESCE(sc.name, (SELECT name FROM schools LIMIT 1), 'Trung Tâm Đào Tạo') as school_name,
                 COALESCE(sc.address, (SELECT address FROM schools LIMIT 1), '') as school_address,
                 COALESCE(sc.phone, (SELECT phone FROM schools LIMIT 1), '') as school_phone,
                 l.level_name, l.surcharge_amount as level_surcharge, l.surcharge_type as level_surcharge_type,
                 tc.name as teacher_name, tc.phone as teacher_phone, tc.color as teacher_color,
                 pkg.name as tuition_package_name, pkg.amount as tuition_package_amount
          FROM students s
          LEFT JOIN schools sc ON s.school_id = sc.id
          LEFT JOIN level_surcharges l ON s.level_id = l.id
          LEFT JOIN teachers tc ON s.teacher_id = tc.id
          LEFT JOIN tuition_packages pkg ON s.tuition_package_id = pkg.id
          WHERE (UPPER(s.student_code) = UPPER(?) OR s.id = ?)
            ${domainSchoolId ? "AND (s.school_id = ? OR s.school_id = 'school-default')" : ""}
          ORDER BY s.created_at DESC
        `;
        args = domainSchoolId
          ? [inputIdentifier, inputIdentifier, domainSchoolId]
          : [inputIdentifier, inputIdentifier];
      } else {
        // Tìm theo Số Điện Thoại HOẶC Mã Học Viên
        sql = `
          SELECT s.*, 
                 COALESCE(sc.name, (SELECT name FROM schools LIMIT 1), 'Trung Tâm Đào Tạo') as school_name,
                 COALESCE(sc.address, (SELECT address FROM schools LIMIT 1), '') as school_address,
                 COALESCE(sc.phone, (SELECT phone FROM schools LIMIT 1), '') as school_phone,
                 l.level_name, l.surcharge_amount as level_surcharge, l.surcharge_type as level_surcharge_type,
                 tc.name as teacher_name, tc.phone as teacher_phone, tc.color as teacher_color,
                 pkg.name as tuition_package_name, pkg.amount as tuition_package_amount
          FROM students s
          LEFT JOIN schools sc ON s.school_id = sc.id
          LEFT JOIN level_surcharges l ON s.level_id = l.id
          LEFT JOIN teachers tc ON s.teacher_id = tc.id
          LEFT JOIN tuition_packages pkg ON s.tuition_package_id = pkg.id
          WHERE ((replace(replace(replace(s.phone, ' ', ''), '.', ''), '-', '') LIKE ? AND ? != '')
             OR UPPER(s.student_code) = UPPER(?))
             ${domainSchoolId ? "AND (s.school_id = ? OR s.school_id = 'school-default')" : ""}
          ORDER BY s.created_at DESC
        `;
        args = domainSchoolId
          ? [`%${cleanPhone}%`, cleanPhone, inputIdentifier, domainSchoolId]
          : [`%${cleanPhone}%`, cleanPhone, inputIdentifier];
      }

      // Find students matching this phone or student_code
      const studentsRes = await db.execute({
        sql,
        args,
      });

      if (studentsRes.rows.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Không tìm thấy học sinh nào với số điện thoại hoặc mã học viên này! Vui lòng kiểm tra lại.",
          },
          { status: 404 }
        );
      }

      // Cấu hình theo cơ sở (nguồn sự thật: bảng `schools`) + vài khóa toàn hệ thống.
      const globalRes = await db.execute(
        "SELECT key, value FROM settings WHERE key IN ('month_format', 'reconciliation_mode')"
      );
      let monthFormat = "vietnamese";
      let reconciliationMode = "manual";
      for (const row of globalRes.rows) {
        if (row.key === "month_format") monthFormat = String(row.value) || "vietnamese";
        if (row.key === "reconciliation_mode") reconciliationMode = String(row.value || "manual");
      }

      // Cơ sở của học sinh đầu tiên trong kết quả (mọi học sinh cùng 1 cơ sở khi truy cập bằng domain).
      // Nếu không xác định được, dùng cơ sở mặc định.
      const resolvedSchoolId = String(
        studentsRes.rows[0]?.school_id || domainSchoolId || "school-default"
      );
      const schoolCfg = await getSchoolSettings(resolvedSchoolId);
      const baseTuition = schoolCfg.base_tuition;
      const sepayBankName = schoolCfg.sepay_bank_name;
      const sepayAccountNumber = schoolCfg.sepay_account_number;
      const sepayPrefix = schoolCfg.sepay_prefix;
      const zaloBotName = schoolCfg.zalo_bot_name;
      const isBotConfigured = Boolean(schoolCfg.zalo_bot_token);

      // Trung tâm chỉ bật hiển thị QR chuyển khoản khi có đầy đủ cấu hình SePay tự đối soát
      const isSepayConfigured = Boolean(sepayBankName && sepayAccountNumber);

      // Current month
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      // ⭐ VÍ GIỜ HỌC: Sổ cái ví giờ của các học sinh đăng nhập lần này
      const allStudentIds = studentsRes.rows.map((r) => String(r.id));
      const walletMap: Record<string, number> = {};
      const scheduledMakeupMap: Record<string, number> = {};
      const walletLedgerMap: Record<
        string,
        Array<{ type: string; minutes: number; note: string; created_at: string }>
      > = {};
      if (allStudentIds.length > 0) {
        // Tự động đồng bộ các buổi báo nghỉ chưa được ghi nhận vào sổ cái ví giờ
        await syncPendingMakeupsToWallet(allStudentIds);

        const placeholders = allStudentIds.map(() => "?").join(",");
        const walletRes = await db.execute({
          sql: `SELECT student_id, COALESCE(SUM(minutes), 0) as balance FROM hour_ledger WHERE student_id IN (${placeholders}) GROUP BY student_id`,
          args: allStudentIds,
        });
        for (const row of walletRes.rows) {
          walletMap[String(row.student_id)] = Number(row.balance || 0);
        }

        const schedRes = await db.execute({
          sql: `SELECT student_id, COALESCE(SUM(planned_minutes), 0) as scheduled FROM lessons WHERE student_id IN (${placeholders}) AND kind = 'makeup' AND status = 'scheduled' GROUP BY student_id`,
          args: allStudentIds,
        });
        for (const row of schedRes.rows) {
          scheduledMakeupMap[String(row.student_id)] = Number(row.scheduled || 0);
        }

        const ledgerRes = await db.execute({
          sql: `SELECT student_id, type, minutes, note, created_at FROM hour_ledger
                WHERE student_id IN (${placeholders})
                ORDER BY created_at DESC LIMIT 30`,
          args: allStudentIds,
        });
        for (const row of ledgerRes.rows) {
          const sid = String(row.student_id);
          if (!walletLedgerMap[sid]) walletLedgerMap[sid] = [];
          walletLedgerMap[sid].push({
            type: String(row.type),
            minutes: Number(row.minutes),
            note: String(row.note || ""),
            created_at: String(row.created_at || ""),
          });
        }
      }

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

        // Lấy lịch sử buổi học, điểm danh & nhận xét của thầy cô (30 buổi gần nhất)
        const lessonsHistoryRes = await db.execute({
          sql: `
            SELECT l.*, tc.name as teacher_name, c.name as class_name, sub.name as subject_name
            FROM lessons l
            LEFT JOIN teachers tc ON l.teacher_id = tc.id
            LEFT JOIN classes c ON l.class_id = c.id
            LEFT JOIN subjects sub ON l.subject_id = sub.id
            WHERE l.student_id = ? AND l.status IN ('attended', 'absent_excused', 'absent_unexcused')
            ORDER BY l.date DESC, l.start_time DESC
            LIMIT 30
          `,
          args: [studentId],
        });

        const pkgAmount = Number(st.tuition_package_amount || 0);
        const breakdown = calculateStudentTuition({
          packageAmount: st.tuition_package_id && pkgAmount > 0 ? pkgAmount : null,
          packageName: st.tuition_package_name ? String(st.tuition_package_name) : null,
          baseTuition,
          levelSurcharge: Number(st.level_surcharge || 0),
          levelSurchargeType: (st.level_surcharge_type as "fixed" | "percent") || "fixed",
          levelName: st.level_name ? String(st.level_name) : null,
          isDiscountEnabled: Number(st.is_discount_enabled || 0),
          discountPercent: Number(st.discount_percent || 0),
        });
        const stdTuition = breakdown.finalTuition;

        const override = overrideRes.rows.length > 0 ? overrideRes.rows[0] : null;
        const currentTuition = override ? Number(override.amount) : stdTuition;

        // Check if student has paid for current month
        const curPaymentRes = await db.execute({
          sql: `SELECT * FROM student_payments WHERE student_id = ? AND ? >= start_period AND ? <= end_period AND status = 'paid'`,
          args: [studentId, currentMonth, currentMonth],
        });
        const isPaidThisMonth = curPaymentRes.rows.length > 0;
        const currentPaymentRecord = isPaidThisMonth ? curPaymentRes.rows[0] : null;

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
          school_id: String(st.school_id || ""),
          student_code: st.student_code
            ? String(st.student_code)
            : `HS${studentId.slice(-4).toUpperCase()}`,
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
          sessions_per_week:
            st.sessions_per_week === null || st.sessions_per_week === undefined
              ? 3
              : Number(st.sessions_per_week),
          hours_per_week: Number(st.hours_per_week || 3),
          registered_days: String(st.registered_days || ""),
          study_time_detail: String(st.study_time_detail || ""),
          schedule_details_json: String(st.schedule_details_json || "[]"),
          schedule_preset_name: String(st.schedule_preset_name || ""),
          tuition_package_name: st.tuition_package_name
            ? String(st.tuition_package_name)
            : undefined,
          is_discount_enabled: Number(st.is_discount_enabled || 0),
          discount_percent: Number(st.discount_percent || 0),
          discount_reason: String(st.discount_reason || ""),
          current_month: currentMonth,
          current_tuition: currentTuition,
          standard_tuition: stdTuition,
          tuition_formula_text: breakdown.formulaText,
          tuition_base_amount: breakdown.baseAmount,
          level_surcharge: breakdown.levelSurcharge,
          tuition_discount_amount: breakdown.discountAmount,
          is_paid: isPaidThisMonth,
          is_overdue: isOverdue,
          unpaid_months_count: unpaidCount,
          previous_debt_amount: pastDebt,
          total_tuition_due: totalDue,
          is_override: Boolean(override),
          override_note: override ? String(override.note || "") : "",
          override_items_json: override?.items_json ? String(override.items_json) : "[]",
          // ⭐ VÍ GIỜ HỌC: số dư ví giờ từ sổ cái hour_ledger
          balance_minutes: walletMap[studentId] || 0,
          available_minutes: (walletMap[studentId] || 0) - (scheduledMakeupMap[studentId] || 0),
          wallet_ledger: (walletLedgerMap[studentId] || []).map((l) => ({
            type: String(l.type),
            minutes: Number(l.minutes),
            note: String(l.note || ""),
            created_at: String(l.created_at || ""),
          })),
          makeups: makeupsRes.rows.map((m) => ({
            id: String(m.id),
            absence_date: String(m.absence_date),
            absence_reason: String(m.absence_reason || ""),
            status: String(m.status),
            makeup_date: m.makeup_date ? String(m.makeup_date) : undefined,
            makeup_time: m.makeup_time ? String(m.makeup_time) : undefined,
            note: m.note ? String(m.note) : undefined,
          })),
          lesson_history: lessonsHistoryRes.rows.map((r) => ({
            id: String(r.id),
            date: String(r.date),
            start_time: String(r.start_time),
            actual_minutes: Number(r.actual_minutes || r.planned_minutes || 90),
            status: String(r.status),
            teacher_name: r.teacher_name ? String(r.teacher_name) : "Thầy Cô trung tâm",
            class_name: r.class_name ? String(r.class_name) : "",
            subject_name: r.subject_name ? String(r.subject_name) : "",
            teacher_notes: String(r.teacher_notes || ""),
            homework: String(r.homework || ""),
            rating: Number(r.rating || 5),
          })),
          current_payment_record: currentPaymentRecord,
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
            is_configured: isSepayConfigured,
            reconciliation_mode: reconciliationMode,
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
        return NextResponse.json(
          { success: false, message: "Thiếu mã học sinh!" },
          { status: 400 }
        );
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
      // BẢO MẬT: Phụ huynh KHÔNG được tự đánh dấu đã nộp học phí.
      // Việc ghi nhận thanh toán chỉ do Quản trị cơ sở thực hiện (thủ công hoặc qua SePay webhook).
      return NextResponse.json(
        {
          success: false,
          message:
            "Cổng phụ huynh không thể tự xác nhận thanh toán. Vui lòng chuyển khoản theo thông tin VietQR hoặc liên hệ trung tâm để được ghi nhận học phí.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Hành động không hợp lệ!" },
      { status: 400 }
    );
  } catch (error: unknown) {
    log.error("Parent API Error:", { error: error });
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
