import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

export async function GET(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("school_id") || "";

    let sql = "SELECT * FROM parent_feedbacks";
    const args: any[] = [];

    if (schoolId) {
      sql += " WHERE school_id = ?";
      args.push(schoolId);
    }
    sql += " ORDER BY created_at DESC";

    const res = await db.execute({ sql, args });
    return NextResponse.json({
      success: true,
      data: res.rows.map((r) => ({
        id: String(r.id),
        school_id: String(r.school_id || "school-default"),
        student_name: String(r.student_name || ""),
        parent_name: String(r.parent_name || ""),
        parent_phone: String(r.parent_phone || ""),
        category: String(r.category || "teaching"),
        rating: Number(r.rating || 5),
        content: String(r.content || ""),
        status: String(r.status || "pending"),
        response_note: String(r.response_note || ""),
        created_at: String(r.created_at || ""),
      })),
    });
  } catch (error: unknown) {
    console.error("Parent Feedback GET Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Lỗi máy chủ" },
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
      school_id = "school-default",
      student_name = "",
      parent_name = "",
      parent_phone = "",
      category = "teaching",
      rating = 5,
      content = "",
    } = body;

    if (!content.trim()) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập nội dung góp ý!" },
        { status: 400 }
      );
    }

    const id = `pfb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await db.execute({
      sql: `INSERT INTO parent_feedbacks (
              id, school_id, student_name, parent_name, parent_phone,
              category, rating, content, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      args: [
        id,
        school_id,
        student_name.trim(),
        parent_name.trim(),
        parent_phone.trim(),
        category,
        Number(rating) || 5,
        content.trim(),
      ],
    });

    return NextResponse.json({
      success: true,
      message: "Cảm ơn quý phụ huynh đã gửi ý kiến đóng góp! Trung tâm sẽ ghi nhận và cải thiện dịch vụ.",
      data: { id },
    });
  } catch (error: unknown) {
    console.error("Parent Feedback POST Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Lỗi máy chủ" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const body = await req.json();
    const { id, status, response_note } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Thiếu mã phản hồi (id)" },
        { status: 400 }
      );
    }

    await db.execute({
      sql: `UPDATE parent_feedbacks 
            SET status = COALESCE(?, status),
                response_note = COALESCE(?, response_note)
            WHERE id = ?`,
      args: [status || null, response_note !== undefined ? response_note : null, id],
    });

    return NextResponse.json({
      success: true,
      message: "Cập nhật trạng thái góp ý thành công!",
    });
  } catch (error: unknown) {
    console.error("Parent Feedback PATCH Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Lỗi máy chủ" },
      { status: 500 }
    );
  }
}
