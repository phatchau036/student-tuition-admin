import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

export async function GET(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("school_id") || "";

    let sql = "SELECT * FROM system_feedbacks";
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
        school_id: String(r.school_id),
        school_name: String(r.school_name || ""),
        school_code: String(r.school_code || ""),
        sender_name: String(r.sender_name || ""),
        sender_contact: String(r.sender_contact || ""),
        category: String(r.category || "feature_request"),
        priority: String(r.priority || "medium"),
        title: String(r.title || ""),
        content: String(r.content || ""),
        status: String(r.status || "pending"),
        admin_reply: String(r.admin_reply || ""),
        created_at: String(r.created_at || ""),
      })),
    });
  } catch (error: unknown) {
    console.error("System Feedback GET Error:", error);
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
      school_id,
      school_name = "",
      school_code = "",
      sender_name = "",
      sender_contact = "",
      category = "feature_request",
      priority = "medium",
      title = "",
      content = "",
    } = body;

    if (!content.trim() || !title.trim()) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập tiêu đề và nội dung góp ý!" },
        { status: 400 }
      );
    }

    const id = `sfb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await db.execute({
      sql: `INSERT INTO system_feedbacks (
              id, school_id, school_name, school_code,
              sender_name, sender_contact, category, priority,
              title, content, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      args: [
        id,
        school_id || "school-default",
        school_name.trim(),
        school_code.trim(),
        sender_name.trim(),
        sender_contact.trim(),
        category,
        priority,
        title.trim(),
        content.trim(),
      ],
    });

    return NextResponse.json({
      success: true,
      message: "Góp ý đã được gửi đến đội ngũ phát triển TpTeam thành công! Chúng tôi sẽ xem xét và phản hồi sớm nhất.",
      data: { id },
    });
  } catch (error: unknown) {
    console.error("System Feedback POST Error:", error);
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
    const { id, status, admin_reply } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Thiếu mã phản hồi (id)" },
        { status: 400 }
      );
    }

    await db.execute({
      sql: `UPDATE system_feedbacks 
            SET status = COALESCE(?, status),
                admin_reply = COALESCE(?, admin_reply)
            WHERE id = ?`,
      args: [status || null, admin_reply !== undefined ? admin_reply : null, id],
    });

    return NextResponse.json({
      success: true,
      message: "Cập nhật trạng thái góp ý cho cơ sở thành công!",
    });
  } catch (error: unknown) {
    console.error("System Feedback PATCH Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Lỗi máy chủ" },
      { status: 500 }
    );
  }
}
