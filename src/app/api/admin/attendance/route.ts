import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { getSchoolIdFromRequest } from "@/lib/authHelper";
import { appendLedger } from "@/lib/wallet";
import { formatMinutes } from "@/lib/tuition";

// GET /api/admin/attendance?date=YYYY-MM-DD - Lấy danh sách điểm danh toàn trường trong ngày
export async function GET(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);
    const querySchoolId = searchParams.get("school_id");
    const headerSchoolId = getSchoolIdFromRequest(req);
    const schoolId = querySchoolId || headerSchoolId || "school-default";

    const lessonsRes = await db.execute({
      sql: `
        SELECT l.*, st.name as student_name, st.phone as student_phone, st.student_code,
               c.name as class_name, tc.name as teacher_name
        FROM lessons l
        JOIN students st ON l.student_id = st.id
        LEFT JOIN classes c ON l.class_id = c.id
        LEFT JOIN teachers tc ON l.teacher_id = tc.id
        WHERE l.date = ? AND (st.school_id = ? OR st.school_id = 'school-default' OR ? = 'school-default')
      `,
      args: [date, schoolId, schoolId],
    });

    const lessonsMap: Record<string, any> = {};
    for (const r of lessonsRes.rows) {
      lessonsMap[`${r.student_id}_${r.start_time}`] = {
        id: String(r.id),
        student_id: String(r.student_id),
        student_name: String(r.student_name || ""),
        date: String(r.date),
        start_time: String(r.start_time),
        planned_minutes: Number(r.planned_minutes || 90),
        actual_minutes: Number(r.actual_minutes || 0),
        class_id: r.class_id ? String(r.class_id) : undefined,
        class_name: r.class_name ? String(r.class_name) : undefined,
        teacher_id: r.teacher_id ? String(r.teacher_id) : undefined,
        teacher_name: r.teacher_name ? String(r.teacher_name) : undefined,
        status: String(r.status || "scheduled"),
        teacher_notes: String(r.teacher_notes || ""),
        homework: String(r.homework || ""),
        rating: Number(r.rating || 5),
        created_by: String(r.created_by || ""),
        created_at: String(r.created_at || ""),
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        date,
        lessons_map: lessonsMap,
      },
    });
  } catch (error: unknown) {
    console.error("Admin Attendance GET Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/attendance - Admin lưu hoặc cập nhật điểm danh và sổ nhận xét
export async function POST(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const body = await req.json();
    const { date, records } = body;

    if (!date || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { success: false, message: "Vui lòng chọn ngày và danh sách học sinh cần điểm danh!" },
        { status: 400 }
      );
    }

    for (const rec of records) {
      const { student_id, class_id, teacher_id, start_time, planned_minutes, status, teacher_notes, homework, rating } = rec;
      if (!student_id || !start_time || !status) continue;

      const pMinutes = Number(planned_minutes) || 90;
      const actualMin = status === "attended" ? pMinutes : 0;
      const starRating = Math.min(5, Math.max(1, Number(rating) || 5));
      const lessonId = `les-${student_id.slice(0, 8)}-${date}-${start_time.replace(":", "")}`;

      // Upsert vào bảng lessons
      await db.execute({
        sql: `
          INSERT INTO lessons (
            id, student_id, date, start_time, planned_minutes, actual_minutes,
            class_id, teacher_id, kind, status, teacher_notes, homework, rating, created_by
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'regular', ?, ?, ?, ?, 'admin')
          ON CONFLICT(student_id, date, start_time) DO UPDATE SET
            status = excluded.status,
            actual_minutes = excluded.actual_minutes,
            class_id = COALESCE(excluded.class_id, lessons.class_id),
            teacher_id = COALESCE(excluded.teacher_id, lessons.teacher_id),
            teacher_notes = excluded.teacher_notes,
            homework = excluded.homework,
            rating = excluded.rating
        `,
        args: [
          lessonId,
          student_id,
          date,
          start_time,
          pMinutes,
          actualMin,
          class_id || null,
          teacher_id || null,
          status,
          teacher_notes ? String(teacher_notes).trim() : "",
          homework ? String(homework).trim() : "",
          starRating,
        ],
      });

      // Nếu là buổi học bù và có mặt -> đánh dấu completed trong makeup_classes
      if (status === "attended") {
        const mkCheck = await db.execute({
          sql: `SELECT id, makeup_minutes, absence_minutes FROM makeup_classes
                WHERE student_id = ? AND makeup_date = ? AND status = 'scheduled' LIMIT 1`,
          args: [student_id, date],
        });
        if (mkCheck.rows.length > 0) {
          const mk = mkCheck.rows[0];
          const usedMin = Number(mk.makeup_minutes) || Number(mk.absence_minutes) || pMinutes;
          await db.execute({
            sql: `UPDATE makeup_classes SET status = 'completed' WHERE id = ?`,
            args: [mk.id],
          });
          await appendLedger({
            studentId: student_id,
            type: "CONSUME",
            minutes: -usedMin,
            refType: "makeup_completed",
            refId: String(mk.id),
            note: `Hoàn thành học bù ngày ${date} lúc ${start_time} (-${formatMinutes(usedMin)})`,
            createdBy: "admin_attendance",
          });
        }
      }

      // Tự động tích lũy giờ bù nếu admin đánh dấu vắng có phép
      if (status === "absent_excused") {
        const mkExist = await db.execute({
          sql: `SELECT id FROM makeup_classes WHERE student_id = ? AND absence_date = ? LIMIT 1`,
          args: [student_id, date],
        });
        if (mkExist.rows.length === 0) {
          const mkId = `mk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          await db.execute({
            sql: `INSERT INTO makeup_classes (
                    id, student_id, absence_date, absence_reason,
                    absence_start_time, absence_minutes, status
                  ) VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
            args: [
              mkId,
              student_id,
              date,
              teacher_notes ? `Quản lý ghi nhận: ${teacher_notes}` : "Quản lý điểm danh vắng có phép",
              start_time,
              pMinutes,
            ],
          });
          await appendLedger({
            studentId: student_id,
            type: "REFUND",
            minutes: pMinutes,
            refType: "absence",
            refId: mkId,
            note: `Tích lũy giờ nghỉ ngày ${date} (+${formatMinutes(pMinutes)}) từ điểm danh quản lý`,
            createdBy: "admin_attendance",
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã lưu điểm danh và nhận xét thành công cho ${records.length} học viên!`,
    });
  } catch (error: unknown) {
    console.error("Admin Attendance POST Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
