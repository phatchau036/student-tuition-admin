import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { calculateStudentTuition } from "@/lib/tuition";
import { getSchoolIdFromRequest, requireAdminPermission } from "@/lib/authHelper";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/reconciliation/summary");

export async function GET(req: Request) {
  try {
    await initDb();
    const authCheck = await requireAdminPermission(req, "revenue.reports");
    if (!authCheck.authorized) {
      return authCheck.errorResponse!;
    }

    const url = new URL(req.url);
    const month = url.searchParams.get("month") || new Date().toISOString().slice(0, 7);

    const db = getDb();
    const schoolId = url.searchParams.get("school_id") || getSchoolIdFromRequest(req) || "school-default";

    // 1. Get Base Tuition (Nếu <= 0 thì tự động lấy từ gói tháng 1m hoặc 1.000.000đ)
    const baseTuitionRes = await db.execute({
      sql: "SELECT value FROM settings WHERE key = ?",
      args: ["base_tuition"],
    });
    let baseTuition = baseTuitionRes.rows.length > 0 ? Number(baseTuitionRes.rows[0].value) : 0;
    if (baseTuition <= 0) {
      const defaultPkgRes = await db.execute("SELECT amount FROM tuition_packages WHERE cycle_unit = 'month' AND cycle_value = 1 LIMIT 1");
      baseTuition = defaultPkgRes.rows.length > 0 ? Number(defaultPkgRes.rows[0].amount) : 1000000;
    }

    // 2. Get All Students for this school
    const studentsRes = await db.execute({
      sql: `
        SELECT 
          s.*,
          l.level_name,
          l.surcharge_amount as level_surcharge,
          l.surcharge_type as level_surcharge_type,
          pkg.name as package_name,
          pkg.amount as package_amount
        FROM students s
        LEFT JOIN level_surcharges l ON s.level_id = l.id
        LEFT JOIN tuition_packages pkg ON s.tuition_package_id = pkg.id
        WHERE s.school_id = ?
      `,
      args: [schoolId],
    });

    // 3. Get Overrides for this month (scoped to current school)
    const overridesRes = await db.execute({
      sql: `SELECT o.* FROM student_monthly_tuitions o
            JOIN students s ON o.student_id = s.id
            WHERE o.month = ? AND s.school_id = ?`,
      args: [month, schoolId],
    });
    const overridesMap: Record<string, number> = {};
    for (const row of overridesRes.rows) {
      overridesMap[String(row.student_id)] = Number(row.amount);
    }

    // 4. Get Payments covering this month (scoped to current school)
    const paymentsRes = await db.execute({
      sql: `SELECT p.* FROM student_payments p
            JOIN students s ON p.student_id = s.id
            WHERE ? >= p.start_period AND ? <= p.end_period AND p.status = 'paid' AND s.school_id = ?`,
      args: [month, month, schoolId],
    });
    const paidStudentIds = new Set<string>();
    const paidRecordsMap: Record<string, Record<string, unknown>> = {};
    for (const row of paymentsRes.rows) {
      paidStudentIds.add(String(row.student_id));
      paidRecordsMap[String(row.student_id)] = row as unknown as Record<string, unknown>;
    }

    // 5. Calculate statistics
    let totalExpectedRevenue = 0;
    let totalActualRevenue = 0;
    let totalUnpaidRevenue = 0;
    let paidCount = 0;
    let unpaidCount = 0;
    let studyingCount = 0;
    let reservedCount = 0;
    let droppedCount = 0;

    const detailedStudents = [];

    for (const row of studentsRes.rows) {
      const studentId = String(row.id);
      const status = String(row.status || "studying");

      if (status === "studying") studyingCount++;
      else if (status === "reserved") reservedCount++;
      else if (status === "dropped") droppedCount++;

      // Tiền học phí phải đóng của tháng (tính theo gói hoặc học phí chuẩn, kèm chiết khấu nếu có)
      const pkgAmount = Number(row.package_amount || 0);
      const breakdown = calculateStudentTuition({
        packageAmount: row.tuition_package_id && pkgAmount > 0 ? pkgAmount : null,
        packageName: row.package_name ? String(row.package_name) : null,
        baseTuition,
        levelSurcharge: Number(row.level_surcharge || 0),
        levelSurchargeType: (row.level_surcharge_type as "fixed" | "percent") || "fixed",
        levelName: row.level_name ? String(row.level_name) : null,
        isDiscountEnabled: Number(row.is_discount_enabled || 0),
        discountPercent: Number(row.discount_percent || 0),
      });
      const stdTuition = breakdown.finalTuition;
      const studentFee = overridesMap[studentId] !== undefined ? overridesMap[studentId] : stdTuition;

      // Học sinh nghỉ học hoặc bảo lưu có thể không tính dự thu nếu muốn, nhưng ở đây tính cho các học sinh đang học
      if (status === "studying") {
        totalExpectedRevenue += studentFee;
      }

      const isPaid = paidStudentIds.has(studentId);
      if (isPaid) {
        paidCount++;
        const payRecord = paidRecordsMap[studentId];
        const actualPaid = payRecord?.amount ? Number(payRecord.amount) : studentFee;
        totalActualRevenue += actualPaid;
      } else {
        if (status === "studying") {
          unpaidCount++;
          totalUnpaidRevenue += studentFee;
        }
      }

      detailedStudents.push({
        id: studentId,
        student_code: row.student_code || `HS${studentId.slice(-4).toUpperCase()}`,
        name: String(row.name),
        phone: String(row.phone),
        status,
        package_name: row.package_name || "Gói Tháng",
        fee: studentFee,
        is_paid: isPaid,
        payment_info: paidRecordsMap[studentId] || null,
      });
    }

    // 6. Get SePay Transactions in this month (scoped to current school)
    const sepayTxRes = await db.execute({
      sql: `SELECT tx.* FROM sepay_transactions tx
            LEFT JOIN students s ON tx.student_id = s.id
            WHERE (tx.matched_period = ? OR tx.transaction_date LIKE ?)
              AND COALESCE(NULLIF(s.school_id, ''), NULLIF(tx.school_id, ''), 'school-default') = ?
            ORDER BY tx.transaction_date DESC, tx.created_at DESC`,
      args: [month, `${month}%`, schoolId],
    });

    let sepayMatchedCount = 0;
    let sepayMatchedRevenue = 0;
    for (const tx of sepayTxRes.rows) {
      if (tx.status === "matched") {
        sepayMatchedCount++;
        sepayMatchedRevenue += Number(tx.transfer_amount || 0);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          month,
          total_students: studentsRes.rows.length,
          studying_students: studyingCount,
          reserved_students: reservedCount,
          dropped_students: droppedCount,
          paid_count: paidCount,
          unpaid_count: unpaidCount,
          total_expected_revenue: totalExpectedRevenue,
          total_actual_revenue: totalActualRevenue,
          total_unpaid_revenue: totalUnpaidRevenue,
          sepay_matched_count: sepayMatchedCount,
          sepay_matched_revenue: sepayMatchedRevenue,
        },
        students: detailedStudents,
        sepay_transactions: sepayTxRes.rows,
      },
    });
  } catch (error: unknown) {
    if ((error as { digest?: string })?.digest === "NEXT_PRERENDER_INTERRUPTED") {
      throw error;
    }
    log.error("Reconciliation Summary API Error:", { error: error });
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
