import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

// POST/PUT to set or delete an override
export async function POST(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const body = await req.json();

    const { student_id, month, amount, note, action } = body;

    if (!student_id || !month) {
      return NextResponse.json(
        { success: false, message: "Thiếu thông tin học sinh hoặc tháng!" },
        { status: 400 }
      );
    }

    // Action to reset/remove override back to standard
    if (action === "reset") {
      await db.execute({
        sql: "DELETE FROM student_monthly_tuitions WHERE student_id = ? AND month = ?",
        args: [student_id, month],
      });

      return NextResponse.json({
        success: true,
        message: `Đã khôi phục học phí về chuẩn cho tháng ${month}`,
      });
    }

    if (amount === undefined || amount === null || isNaN(Number(amount))) {
      return NextResponse.json(
        { success: false, message: "Số tiền học phí không hợp lệ!" },
        { status: 400 }
      );
    }

    const id = `override-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const parsedAmount = Math.max(0, Math.round(Number(amount)));

    // Upsert into student_monthly_tuitions
    await db.execute({
      sql: `INSERT INTO student_monthly_tuitions (id, student_id, month, amount, note, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(student_id, month) DO UPDATE SET
              amount = excluded.amount,
              note = excluded.note,
              updated_at = CURRENT_TIMESTAMP`,
      args: [id, student_id, month, parsedAmount, note || ""],
    });

    return NextResponse.json({
      success: true,
      message: `Đã cập nhật học phí tùy chỉnh tháng ${month} thành công!`,
    });
  } catch (error: unknown) {
    console.error("Monthly Tuition POST Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
