import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { requireAdminPermission } from "@/lib/authHelper";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const authCheck = await requireAdminPermission(req, "students.edit");
    if (!authCheck.authorized) {
      return authCheck.errorResponse!;
    }
    const db = getDb();
    const { id } = await params;
    const body = await req.json();

    const {
      name,
      phone,
      zalo_link,
      zalo_chat_id,
      level_id,
      subject_id,
      class_id,
      time_slot_id,
      teacher_id,
      tuition_package_id,
      start_date,
      duration_mode,
      sessions_per_week,
      hours_per_week,
      registered_days,
      study_time_detail,
      schedule_details_json,
      schedule_preset_name,
      is_discount_enabled,
      discount_percent,
      discount_reason,
    } = body;

    const formattedZalo =
      zalo_link && zalo_link.trim() !== ""
        ? zalo_link.startsWith("http")
          ? zalo_link
          : `https://zalo.me/${phone.replace(/\D/g, "")}`
        : `https://zalo.me/${phone?.replace(/\D/g, "")}`;

    await db.execute({
      sql: `UPDATE students 
            SET name = ?, phone = ?, zalo_link = ?, zalo_chat_id = ?, level_id = ?, subject_id = ?, class_id = ?, time_slot_id = ?, teacher_id = ?, tuition_package_id = ?,
                start_date = ?, duration_mode = ?, sessions_per_week = ?, hours_per_week = ?, registered_days = ?, study_time_detail = ?, schedule_details_json = ?, schedule_preset_name = ?,
                is_discount_enabled = ?, discount_percent = ?, discount_reason = ?
            WHERE id = ?`,
      args: [
        name.trim(),
        phone.trim(),
        formattedZalo,
        zalo_chat_id ? String(zalo_chat_id).trim() : null,
        level_id,
        subject_id || null,
        class_id || null,
        time_slot_id || "",
        teacher_id || null,
        tuition_package_id || null,
        start_date ? String(start_date).trim() : null,
        duration_mode || "by_hours",
        Number(sessions_per_week) || 3,
        Number(hours_per_week) || 3,
        registered_days || "",
        study_time_detail || "",
        schedule_details_json || "[]",
        schedule_preset_name !== undefined ? String(schedule_preset_name).trim() : "",
        is_discount_enabled ? 1 : 0,
        Number(discount_percent) || 0,
        discount_reason ? String(discount_reason).trim() : "",
        id,
      ],
    });

    return NextResponse.json({
      success: true,
      message: "Cập nhật thông tin học sinh thành công!",
    });
  } catch (error: unknown) {
    console.error("Student PUT Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Chuẩn hóa giá trị giờ: "18h", "18:00", "18h30", "18 giờ 30" -> "18:00" / "18:30"
function normalizeTimeValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  if (!text) return "";
  const match = text.match(/(\d{1,2})\s*(?::|h|giờ)\s*(\d{1,2})?/i);
  if (!match) return "";
  const hour = parseInt(match[1], 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;
  if (isNaN(hour) || hour < 0 || hour > 24) return "";
  return `${String(hour).padStart(2, "0")}:${String(isNaN(minute) ? 0 : minute).padStart(2, "0")}`;
}

// Chuẩn hóa tên thứ: "Thứ 4", "T4", "thu 4" -> "t4"; "Chủ Nhật", "CN" -> "cn"
function normalizeDayValue(value: unknown): string {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return "";
  if (text.includes("chủ nhật") || text === "cn" || text === "c7") return "cn";
  const match = text.match(/([2-7])\s*$/);
  return match ? `t${match[1]}` : text;
}

function timeValueToMinutes(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  return (hour || 0) * 60 + (minute || 0);
}

interface ScheduleItemLike {
  day?: string;
  start_time?: string;
  end_time?: string;
  hours?: number | string;
  [key: string]: unknown;
}

/**
 * PATCH /api/students/[id]
 * action = "remove_slot": gỡ học viên khỏi một ca học cụ thể (Thứ + Giờ).
 * - Cập nhật schedule_details_json, registered_days, study_time_detail, sessions_per_week, hours_per_week.
 * - Nếu không còn ca học nào, tự động gỡ học viên khỏi lớp (class_id = NULL).
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const authCheck = await requireAdminPermission(req, "students.edit");
    if (!authCheck.authorized) {
      return authCheck.errorResponse!;
    }
    const db = getDb();
    const { id } = await params;
    const body = await req.json();

    if (body?.action !== "remove_slot") {
      return NextResponse.json(
        { success: false, message: "Hành động không hợp lệ!" },
        { status: 400 }
      );
    }

    const studentRes = await db.execute({
      sql: "SELECT id, name, class_id, schedule_details_json FROM students WHERE id = ?",
      args: [id],
    });
    if (studentRes.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy học viên!" },
        { status: 404 }
      );
    }

    const studentRow = studentRes.rows[0];
    const targetDay = normalizeDayValue(body.day);
    const targetStart = normalizeTimeValue(body.start_time);
    const slotStart = normalizeTimeValue(body.slot_hour);

    if (!targetDay) {
      return NextResponse.json(
        { success: false, message: "Thiếu thông tin Thứ cần gỡ khỏi ca học!" },
        { status: 400 }
      );
    }

    let items: ScheduleItemLike[] = [];
    try {
      const parsed: unknown = JSON.parse(String(studentRow.schedule_details_json || "[]"));
      if (Array.isArray(parsed)) {
        items = parsed.filter(
          (item): item is ScheduleItemLike => Boolean(item) && typeof item === "object"
        );
      }
    } catch {}

    if (items.length === 0) {
      return NextResponse.json(
        { success: false, message: "Học viên chưa có lịch học chi tiết để gỡ khỏi ca!" },
        { status: 400 }
      );
    }

    let removeIndex = -1;
    const sameDayIndexes: number[] = [];

    items.forEach((item, idx) => {
      if (normalizeDayValue(item.day) !== targetDay) return;
      sameDayIndexes.push(idx);
      if (removeIndex !== -1) return;

      const itemStart = normalizeTimeValue(item.start_time);
      if (targetStart && itemStart === targetStart) {
        removeIndex = idx;
      } else if (!targetStart && slotStart && itemStart === slotStart) {
        removeIndex = idx;
      }
    });

    // Fallback 1: khớp theo giờ của khung ca (tránh lệch phút/định dạng)
    if (removeIndex === -1 && slotStart) {
      for (const idx of sameDayIndexes) {
        const itemStart = normalizeTimeValue(items[idx].start_time);
        if (itemStart && itemStart.slice(0, 2) === slotStart.slice(0, 2)) {
          removeIndex = idx;
          break;
        }
      }
    }

    // Fallback 2: ngày đó chỉ có duy nhất 1 ca học
    if (removeIndex === -1 && sameDayIndexes.length === 1) {
      removeIndex = sameDayIndexes[0];
    }

    if (removeIndex === -1) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy ca học tương ứng để gỡ khỏi lịch!" },
        { status: 400 }
      );
    }

    const removedItem = items[removeIndex];
    const removeStart = normalizeTimeValue(removedItem.start_time) || targetStart || slotStart;

    // Gỡ tất cả bản ghi trùng đúng Thứ + giờ bắt đầu (tránh trường hợp dữ liệu bị nhân đôi
    // khiến học viên vẫn còn hiển thị trong ca sau khi xóa)
    const remaining = items.filter((item, idx) => {
      if (idx === removeIndex) return false;
      if (!removeStart) return true;
      return !(
        normalizeDayValue(item.day) === targetDay &&
        normalizeTimeValue(item.start_time) === removeStart
      );
    });

    const dayList: string[] = [];
    let totalHours = 0;

    for (const item of remaining) {
      const day = String(item.day || "").trim();
      if (day && !dayList.includes(day)) dayList.push(day);

      let hours = Number(item.hours);
      if (!hours || isNaN(hours)) {
        const start = normalizeTimeValue(item.start_time);
        const end = normalizeTimeValue(item.end_time);
        hours = start && end ? Math.max(0, (timeValueToMinutes(end) - timeValueToMinutes(start)) / 60) : 1;
      }
      totalHours += hours;
    }
    totalHours = Math.round(totalHours * 10) / 10;

    const uniqueRanges: string[] = [];
    for (const item of remaining) {
      const start = normalizeTimeValue(item.start_time);
      const end = normalizeTimeValue(item.end_time);
      if (!start || !end) continue;
      const range = `${start} - ${end}`;
      if (!uniqueRanges.includes(range)) uniqueRanges.push(range);
    }

    let studyTimeDetail = "";
    if (remaining.length > 0) {
      if (uniqueRanges.length === 1) {
        studyTimeDetail = uniqueRanges[0];
      } else {
        studyTimeDetail = remaining
          .map((item) => {
            const start = normalizeTimeValue(item.start_time);
            const end = normalizeTimeValue(item.end_time);
            const day = String(item.day || "").trim();
            return `${day}: ${start}${end ? ` - ${end}` : ""}`.trim();
          })
          .filter(Boolean)
          .join(" | ");
      }
    }

    // Không còn ca học nào => gỡ học viên khỏi lớp để không còn tính vào sĩ số lớp
    const nextClassId = remaining.length > 0 && studentRow.class_id ? String(studentRow.class_id) : null;

    await db.execute({
      sql: `UPDATE students
            SET schedule_details_json = ?, registered_days = ?, study_time_detail = ?,
                sessions_per_week = ?, hours_per_week = ?, class_id = ?
            WHERE id = ?`,
      args: [
        JSON.stringify(remaining),
        dayList.join(", "),
        studyTimeDetail,
        remaining.length,
        totalHours,
        nextClassId,
        id,
      ],
    });

    const removedStart = normalizeTimeValue(removedItem.start_time) || slotStart;
    const removedEnd = normalizeTimeValue(removedItem.end_time);
    const rangeText = removedStart ? `${removedStart}${removedEnd ? ` - ${removedEnd}` : ""}` : "";
    const studentName = String(studentRow.name || "học viên");
    const removedFromClass = remaining.length === 0 && Boolean(studentRow.class_id);

    return NextResponse.json({
      success: true,
      message:
        remaining.length === 0
          ? `Đã gỡ ${studentName} khỏi ca ${body.day}${rangeText ? ` (${rangeText})` : ""}${
              removedFromClass ? " và gỡ khỏi lớp vì không còn ca học nào" : ""
            }.`
          : `Đã gỡ ${studentName} khỏi ca ${body.day}${rangeText ? ` (${rangeText})` : ""}.`,
      data: {
        remaining_sessions: remaining.length,
        remaining_days: dayList,
        study_time_detail: studyTimeDetail,
        class_id: nextClassId,
      },
    });
  } catch (error: unknown) {
    console.error("Student PATCH Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await initDb();
    const authCheck = await requireAdminPermission(req, "students.delete");
    if (!authCheck.authorized) {
      return authCheck.errorResponse!;
    }
    const db = getDb();
    const { id } = await params;

    // Delete overrides first
    await db.execute({
      sql: "DELETE FROM student_monthly_tuitions WHERE student_id = ?",
      args: [id],
    });

    // Delete makeups
    await db.execute({
      sql: "DELETE FROM makeup_classes WHERE student_id = ?",
      args: [id],
    });

    // Delete student
    await db.execute({
      sql: "DELETE FROM students WHERE id = ?",
      args: [id],
    });

    return NextResponse.json({
      success: true,
      message: "Đã xóa học sinh khỏi danh sách!",
    });
  } catch (error: unknown) {
    console.error("Student DELETE Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
