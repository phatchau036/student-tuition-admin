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
        images_json: String(r.images_json || "[]"),
        images: (() => {
          try {
            const arr = JSON.parse(String(r.images_json || "[]"));
            return Array.isArray(arr) ? arr : [];
          } catch {
            return [];
          }
        })(),
        assignee_id: r.assignee_id ? String(r.assignee_id) : undefined,
        assignee_name: r.assignee_name ? String(r.assignee_name) : undefined,
        assigned_at: r.assigned_at ? String(r.assigned_at) : undefined,
        completed_at: r.completed_at ? String(r.completed_at) : undefined,
        completed_by: r.completed_by ? String(r.completed_by) : undefined,
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
      images = [],
      images_json,
    } = body;

    if (!content.trim() || !title.trim()) {
      return NextResponse.json(
        { success: false, message: "Vui lòng nhập tiêu đề và nội dung góp ý!" },
        { status: 400 }
      );
    }

    const finalImagesJson = typeof images_json === "string" 
      ? images_json 
      : JSON.stringify(Array.isArray(images) ? images : []);

    const id = `sfb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await db.execute({
      sql: `INSERT INTO system_feedbacks (
              id, school_id, school_name, school_code,
              sender_name, sender_contact, category, priority,
              title, content, status, images_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
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
        finalImagesJson,
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
    const { 
      id, 
      status, 
      admin_reply, 
      action, 
      assignee_id, 
      assignee_name, 
      completed_by 
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Thiếu mã phản hồi (id)" },
        { status: 400 }
      );
    }

    // 1. Nhận nhiệm vụ (Assign task)
    if (action === "assign") {
      if (!assignee_name || !assignee_name.trim()) {
        return NextResponse.json({ success: false, message: "Vui lòng chọn người nhận việc!" }, { status: 400 });
      }
      const nowStr = new Date().toISOString();
      await db.execute({
        sql: `UPDATE system_feedbacks 
              SET status = 'in_progress',
                  assignee_id = ?,
                  assignee_name = ?,
                  assigned_at = ?
              WHERE id = ?`,
        args: [assignee_id || null, assignee_name.trim(), nowStr, id],
      });
      return NextResponse.json({
        success: true,
        message: `Đã giao nhiệm vụ cho "${assignee_name.trim()}"! Trạng thái: Đang làm.`,
      });
    }

    // 2. Hủy nhận nhiệm vụ (Trả về Chưa làm)
    if (action === "unassign") {
      await db.execute({
        sql: `UPDATE system_feedbacks 
              SET status = 'pending',
                  assignee_id = NULL,
                  assignee_name = NULL,
                  assigned_at = NULL
              WHERE id = ?`,
        args: [id],
      });
      return NextResponse.json({
        success: true,
        message: "Đã hủy nhận nhiệm vụ, đưa về mục Chưa làm!",
      });
    }

    // 3. Đánh dấu làm xong (Complete task)
    if (action === "complete") {
      const nowStr = new Date().toISOString();
      await db.execute({
        sql: `UPDATE system_feedbacks 
              SET status = 'completed',
                  completed_at = ?,
                  completed_by = COALESCE(?, assignee_name),
                  admin_reply = CASE WHEN ? != '' THEN ? ELSE admin_reply END
              WHERE id = ?`,
        args: [nowStr, completed_by || null, admin_reply ? admin_reply.trim() : "", admin_reply ? admin_reply.trim() : "", id],
      });
      return NextResponse.json({
        success: true,
        message: "Tuyệt vời! Đã đánh dấu hoàn thành nhiệm vụ này!",
      });
    }

    // 4. Mở lại nhiệm vụ (Reopen)
    if (action === "reopen") {
      await db.execute({
        sql: `UPDATE system_feedbacks 
              SET status = 'in_progress',
                  completed_at = NULL,
                  completed_by = NULL
              WHERE id = ?`,
        args: [id],
      });
      return NextResponse.json({
        success: true,
        message: "Đã mở lại nhiệm vụ sang trạng thái Đang làm!",
      });
    }

    // 5. Cập nhật thông thường (Status + Reply)
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
