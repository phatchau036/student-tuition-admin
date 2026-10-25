import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { calculateStandardTuition } from "@/lib/tuition";

export async function GET(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") || "";

    // Get Base Tuition
    const baseTuitionRes = await db.execute({
      sql: "SELECT value FROM settings WHERE key = ?",
      args: ["base_tuition"],
    });
    const baseTuition = baseTuitionRes.rows.length > 0 ? Number(baseTuitionRes.rows[0].value) : 0;

    // Get All Students with level, time slot, teacher and package details
    const studentsRes = await db.execute(`
      SELECT 
        s.*,
        l.level_name,
        l.surcharge_amount as level_surcharge,
        t.name as time_slot_name,
        (t.days || ': ' || t.start_time || ' - ' || t.end_time) as time_slot_desc,
        tc.name as teacher_name,
        tc.color as teacher_color,
        pkg.name as tuition_package_name,
        pkg.amount as tuition_package_amount,
        pkg.cycle_unit as tuition_package_cycle_unit,
        pkg.cycle_value as tuition_package_cycle_value
      FROM students s
      LEFT JOIN level_surcharges l ON s.level_id = l.id
      LEFT JOIN time_slots t ON s.time_slot_id = t.id
      LEFT JOIN teachers tc ON s.teacher_id = tc.id
      LEFT JOIN tuition_packages pkg ON s.tuition_package_id = pkg.id
      ORDER BY s.created_at DESC
    `);

    // Fetch overrides for month if provided
    let overridesMap: Record<string, { id: string; amount: number; note: string; month: string }> = {};
    if (month) {
      const overridesRes = await db.execute({
        sql: "SELECT * FROM student_monthly_tuitions WHERE month = ?",
        args: [month],
      });
      for (const row of overridesRes.rows) {
        overridesMap[String(row.student_id)] = {
          id: String(row.id),
          amount: Number(row.amount),
          note: String(row.note || ""),
          month: String(row.month),
        };
      }
    }

    // Fetch payments covering this month for reconciliation check
    // Logic: Nếu có bản ghi payment mà month nằm trong [start_period, end_period] và status = 'paid' => ĐÃ ĐÓNG
    const paymentsMap: Record<string, { id: string; package_name: string; start_period: string; end_period: string; amount: number }> = {};
    if (month) {
      const paymentsRes = await db.execute({
        sql: `SELECT * FROM student_payments 
              WHERE ? >= start_period AND ? <= end_period AND status = 'paid'`,
        args: [month, month],
      });
      for (const row of paymentsRes.rows) {
        paymentsMap[String(row.student_id)] = {
          id: String(row.id),
          package_name: String(row.package_name || ""),
          start_period: String(row.start_period),
          end_period: String(row.end_period),
          amount: Number(row.amount),
        };
      }
    }

    // Fetch pending makeup classes count for each student
    const makeupsRes = await db.execute(`
      SELECT student_id, COUNT(*) as pending_count
      FROM makeup_classes
      WHERE status = 'pending'
      GROUP BY student_id
    `);
    const pendingMakeupsMap: Record<string, number> = {};
    for (const row of makeupsRes.rows) {
      pendingMakeupsMap[String(row.student_id)] = Number(row.pending_count || 0);
    }

    const students = studentsRes.rows.map((row) => {
      const stdTuition = calculateStandardTuition(
        baseTuition,
        Number(row.level_surcharge || 0),
        Number(row.is_discount_enabled || 0),
        Number(row.discount_percent || 0)
      );

      const override = overridesMap[String(row.id)] || null;
      const currentTuition = override ? override.amount : stdTuition;

      // Check payment status for this month
      const paymentInfo = paymentsMap[String(row.id)];
      const paymentStatus = paymentInfo ? "paid" : "unpaid";
      let paymentPeriodDesc = "";
      if (paymentInfo) {
        if (paymentInfo.start_period === paymentInfo.end_period) {
          paymentPeriodDesc = `Đã đóng ${paymentInfo.start_period}`;
        } else {
          paymentPeriodDesc = `Đã đóng (${paymentInfo.start_period} - ${paymentInfo.end_period})`;
        }
      }

      return {
        id: String(row.id),
        name: String(row.name),
        phone: String(row.phone),
        zalo_link: String(row.zalo_link || ""),
        level_id: String(row.level_id),
        level_name: row.level_name ? String(row.level_name) : "Chưa phân loại",
        level_surcharge: Number(row.level_surcharge || 0),
        time_slot_id: String(row.time_slot_id || ""),
        time_slot_name: row.time_slot_name ? String(row.time_slot_name) : "Khung giờ linh hoạt",
        time_slot_desc: row.time_slot_desc ? String(row.time_slot_desc) : "",
        teacher_id: row.teacher_id ? String(row.teacher_id) : undefined,
        teacher_name: row.teacher_name ? String(row.teacher_name) : "Chưa gán GV",
        teacher_color: row.teacher_color ? String(row.teacher_color) : "indigo",
        
        // Trạng thái học sinh: đang học, bảo lưu, nghỉ học
        status: (row.status as "studying" | "reserved" | "dropped") || "studying",
        status_date: row.status_date ? String(row.status_date) : undefined,
        expected_return_date: row.expected_return_date ? String(row.expected_return_date) : undefined,
        status_note: String(row.status_note || ""),

        // Gói học phí
        tuition_package_id: row.tuition_package_id ? String(row.tuition_package_id) : undefined,
        tuition_package_name: row.tuition_package_name ? String(row.tuition_package_name) : undefined,

        // Công nợ đối soát tháng này
        payment_status: paymentStatus,
        payment_period_desc: paymentPeriodDesc,
        payment_id: paymentInfo ? paymentInfo.id : undefined,

        duration_mode: (row.duration_mode as "by_hours" | "by_sessions") || "by_hours",
        sessions_per_week: Number(row.sessions_per_week || 3),
        hours_per_week: Number(row.hours_per_week || 3),
        registered_days: String(row.registered_days || ""),
        study_time_detail: String(row.study_time_detail || ""),
        schedule_details_json: String(row.schedule_details_json || "[]"),
        pending_makeups_count: pendingMakeupsMap[String(row.id)] || 0,
        is_discount_enabled: Number(row.is_discount_enabled || 0),
        discount_percent: Number(row.discount_percent || 0),
        created_at: String(row.created_at || ""),
        standard_tuition: stdTuition,
        current_tuition: currentTuition,
        monthly_override: override,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        students,
        base_tuition: baseTuition,
      },
    });
  } catch (error: unknown) {
    console.error("Students GET Error:", error);
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

    const {
      name,
      phone,
      zalo_link,
      level_id,
      time_slot_id,
      teacher_id,
      tuition_package_id,
      duration_mode,
      sessions_per_week,
      hours_per_week,
      registered_days,
      study_time_detail,
      schedule_details_json,
      is_discount_enabled,
      discount_percent,
    } = body;

    if (!name || !phone || !level_id) {
      return NextResponse.json(
        { success: false, message: "Vui lòng điền đầy đủ tên, số điện thoại và level!" },
        { status: 400 }
      );
    }

    const id = `stu-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const formattedZalo =
      zalo_link && zalo_link.trim() !== ""
        ? zalo_link.startsWith("http")
          ? zalo_link
          : `https://zalo.me/${phone.replace(/\D/g, "")}`
        : `https://zalo.me/${phone.replace(/\D/g, "")}`;

    await db.execute({
      sql: `INSERT INTO students (
              id, name, phone, zalo_link, level_id, time_slot_id, teacher_id, tuition_package_id,
              duration_mode, sessions_per_week, hours_per_week, registered_days, study_time_detail, schedule_details_json,
              is_discount_enabled, discount_percent
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        name.trim(),
        phone.trim(),
        formattedZalo,
        level_id,
        time_slot_id || "",
        teacher_id || null,
        tuition_package_id || null,
        duration_mode || "by_hours",
        Number(sessions_per_week) || 3,
        Number(hours_per_week) || 3,
        registered_days || "",
        study_time_detail || "",
        schedule_details_json || "[]",
        is_discount_enabled ? 1 : 0,
        Number(discount_percent) || 0,
      ],
    });

    return NextResponse.json({
      success: true,
      message: "Thêm học sinh mới thành công!",
      student_id: id,
    });
  } catch (error: unknown) {
    console.error("Students POST Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
