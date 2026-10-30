import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { calculateStudentTuition } from "@/lib/tuition";
import { getSchoolIdFromRequest } from "@/lib/authHelper";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const month = url.searchParams.get("month") || new Date().toISOString().slice(0, 7);

    await initDb();
    const db = getDb();
    const schoolId = getSchoolIdFromRequest(req);

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
          l.surcharge_amount as level_surcharge,
          pkg.name as package_name,
          pkg.amount as package_amount
        FROM students s
        LEFT JOIN level_surcharges l ON s.level_id = l.id
        LEFT JOIN tuition_packages pkg ON s.tuition_package_id = pkg.id
        WHERE s.school_id = ?
      `,
      args: [schoolId],
    });

    // 3. Get Overrides for this month
    const overridesRes = await db.execute({
      sql: "SELECT * FROM student_monthly_tuitions WHERE month = ?",
      args: [month],
    });
    const overridesMap: Record<string, number> = {};
    for (const row of overridesRes.rows) {
      overridesMap[String(row.student_id)] = Number(row.amount);
    }

    // 4. Get Payments covering this month
    const paymentsRes = await db.execute({
      sql: `SELECT * FROM student_payments 
            WHERE ? >= start_period AND ? <= end_period AND status = 'paid'`,
      args: [month, month],
    });
    const paidStudentIds = new Set<string>();
    const paidRecordsMap: Record<string, any> = {};
    for (const row of paymentsRes.rows) {
      paidStudentIds.add(String(row.student_id));
      paidRecordsMap[String(row.student_id)] = row;
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

    // 6. Get SePay Transactions in this month
    const sepayTxRes = await db.execute({
      sql: `SELECT * FROM sepay_transactions 
            WHERE matched_period = ? OR transaction_date LIKE ?
            ORDER BY transaction_date DESC, created_at DESC`,
      args: [month, `${month}%`],
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
  } catch (error: any) {
    if (error?.digest === "NEXT_PRERENDER_INTERRUPTED") {
      throw error;
    }
    console.error("Reconciliation Summary API Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
