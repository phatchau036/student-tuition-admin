import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { getSchoolIdFromRequest } from "@/lib/authHelper";

export async function POST(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const targetSchoolId = getSchoolIdFromRequest(req);
    const body = await req.json();
    const { students: rawStudents, default_subject_id, default_level_id, school_id } = body;
    const finalSchoolId = school_id || targetSchoolId || "school-default";

    if (!Array.isArray(rawStudents) || rawStudents.length === 0) {
      return NextResponse.json(
        { success: false, message: "Không có dữ liệu học sinh để nhập!" },
        { status: 400 }
      );
    }

    // Get all existing levels & subjects for this school
    const levelsRes = await db.execute({
      sql: "SELECT id, level_name FROM level_surcharges WHERE school_id = ? ORDER BY sort_order ASC",
      args: [finalSchoolId],
    });
    let existingLevels: Array<{ id: string; level_name: string }> = levelsRes.rows.map((r) => ({
      id: String(r.id),
      level_name: String(r.level_name),
    }));

    if (existingLevels.length === 0) {
      const defaultLvlId = `lvl-${Date.now()}-1`;
      await db.execute({
        sql: "INSERT INTO level_surcharges (id, school_id, level_name, surcharge_amount, sort_order) VALUES (?, ?, 'Cơ bản', 0, 1)",
        args: [defaultLvlId, finalSchoolId],
      });
      existingLevels.push({ id: defaultLvlId, level_name: "Cơ bản" });
    }

    const subjectsRes = await db.execute({
      sql: "SELECT id, name FROM subjects WHERE school_id = ? ORDER BY created_at ASC",
      args: [finalSchoolId],
    });
    let existingSubjects: Array<{ id: string; name: string }> = subjectsRes.rows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
    }));

    // Lấy ca học mặc định nếu có
    const slotsRes = await db.execute({
      sql: "SELECT id FROM time_slots WHERE school_id = ? AND is_active = 1 LIMIT 1",
      args: [finalSchoolId],
    });
    const defaultSlotId = slotsRes.rows.length > 0 ? String(slotsRes.rows[0].id) : "";

    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const newLevelsAdded: string[] = [];
    const newSubjectsAdded: string[] = [];

    for (const item of rawStudents) {
      const name = String(item.name || "").trim();
      let phone = String(item.phone || "").trim().replace(/\D/g, "");
      if (phone.length === 9 && !phone.startsWith("0")) {
        phone = "0" + phone;
      }

      if (!name) {
        skippedCount++;
        continue;
      }

      // If phone is missing, generate a unique placeholder phone based on student code/timestamp
      if (!phone) {
        phone = `09${Math.floor(10000000 + Math.random() * 90000000)}`;
      }

      // Match or Auto-create Level (Tự động nhận diện & thêm mới vào Setting nếu chưa có)
      let matchedLevelId = default_level_id || existingLevels[0]?.id || "";
      const rawLevelName = item.level_name ? String(item.level_name).trim() : "";

      if (rawLevelName) {
        const foundLvl = existingLevels.find(
          (l) => l.level_name.toLowerCase().trim() === rawLevelName.toLowerCase()
        );

        if (foundLvl) {
          matchedLevelId = foundLvl.id;
        } else {
          // Level chưa có trong setting -> Tự động tạo Level mới vào level_surcharges của trường này!
          const newLevelId = `lvl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          const nextSort = existingLevels.length + 1;

          await db.execute({
            sql: "INSERT INTO level_surcharges (id, school_id, level_name, surcharge_amount, sort_order) VALUES (?, ?, ?, ?, ?)",
            args: [newLevelId, finalSchoolId, rawLevelName, 0, nextSort],
          });

          existingLevels.push({ id: newLevelId, level_name: rawLevelName });
          matchedLevelId = newLevelId;
          if (!newLevelsAdded.includes(rawLevelName)) {
            newLevelsAdded.push(rawLevelName);
          }
        }
      }

      // Match or Auto-create Subject (Tự động nhận diện & thêm mới vào Setting nếu chưa có)
      let matchedSubjectId = default_subject_id || (existingSubjects[0]?.id || null);
      const rawSubjectName = item.subject_name ? String(item.subject_name).trim() : "";

      if (rawSubjectName) {
        const foundSub = existingSubjects.find(
          (s) => s.name.toLowerCase().trim() === rawSubjectName.toLowerCase()
        );

        if (foundSub) {
          matchedSubjectId = foundSub.id;
        } else {
          // Bộ môn chưa có trong setting -> Tự động tạo Bộ môn mới vào subjects của trường này!
          const newSubId = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          await db.execute({
            sql: "INSERT INTO subjects (id, school_id, name, description, color, is_active) VALUES (?, ?, ?, ?, ?, ?)",
            args: [newSubId, finalSchoolId, rawSubjectName, "Tự động tạo từ danh sách Excel nhập vào", "indigo", 1],
          });

          existingSubjects.push({ id: newSubId, name: rawSubjectName });
          matchedSubjectId = newSubId;
          if (!newSubjectsAdded.includes(rawSubjectName)) {
            newSubjectsAdded.push(rawSubjectName);
          }
        }
      }

      // Format start_date
      let startDateStr = null;
      if (item.start_date) {
        const sd = String(item.start_date).trim();
        // If Excel date serial number (e.g., 46296)
        if (!isNaN(Number(sd)) && Number(sd) > 30000 && Number(sd) < 60000) {
          const jsDate = new Date(Math.round((Number(sd) - 25569) * 86400 * 1000));
          startDateStr = jsDate.toISOString().slice(0, 10);
        } else if (sd.includes("-") || sd.includes("/")) {
          startDateStr = sd.replace(/\//g, "-").slice(0, 10);
        }
      }

      const formattedZalo = `https://zalo.me/${phone}`;
      const studentCode = item.student_code
        ? String(item.student_code).trim()
        : `HS${Math.floor(1000 + Math.random() * 9000)}`;

      // Check if student with same phone already exists in this school
      const existRes = await db.execute({
        sql: "SELECT id FROM students WHERE phone = ? AND school_id = ?",
        args: [phone, finalSchoolId],
      });

      if (existRes.rows.length > 0) {
        // Update existing student
        const existingId = String(existRes.rows[0].id);
        await db.execute({
          sql: `UPDATE students 
                SET name = ?, level_id = COALESCE(?, level_id), subject_id = COALESCE(?, subject_id),
                    study_time_detail = COALESCE(?, study_time_detail), start_date = COALESCE(?, start_date),
                    status_note = CASE WHEN ? != '' THEN ? ELSE status_note END
                WHERE id = ? AND school_id = ?`,
          args: [
            name,
            matchedLevelId || null,
            matchedSubjectId || null,
            item.study_time_detail || null,
            startDateStr || null,
            item.note || "",
            item.note || "",
            existingId,
            finalSchoolId,
          ],
        });
        updatedCount++;
      } else {
        // Insert new student
        const id = `stu-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        await db.execute({
          sql: `INSERT INTO students (
                  id, school_id, student_code, name, phone, zalo_link, level_id, subject_id, time_slot_id,
                  start_date, duration_mode, sessions_per_week, hours_per_week, registered_days,
                  study_time_detail, schedule_details_json, is_discount_enabled, discount_percent,
                  discount_reason, status_note, status
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', ?, 'by_hours', 2, 3, '', ?, '[]', ?, ?, ?, ?, 'studying')`,
          args: [
            id,
            finalSchoolId,
            studentCode,
            name,
            phone,
            formattedZalo,
            matchedLevelId,
            matchedSubjectId,
            startDateStr,
            item.study_time_detail || "",
            item.discount_percent ? 1 : 0,
            Number(item.discount_percent || 0),
            item.discount_reason || "",
            item.note || "",
          ],
        });
        importedCount++;
      }
    }

    let message = `Nhập dữ liệu hoàn tất: Thêm mới ${importedCount} học viên, cập nhật ${updatedCount} học viên!`;
    if (newLevelsAdded.length > 0) {
      message += ` Đã tự động tạo thêm ${newLevelsAdded.length} Level vào Cài đặt: (${newLevelsAdded.join(", ")}).`;
    }
    if (newSubjectsAdded.length > 0) {
      message += ` Đã tự động tạo thêm ${newSubjectsAdded.length} Bộ môn vào Cài đặt: (${newSubjectsAdded.join(", ")}).`;
    }

    return NextResponse.json({
      success: true,
      message,
      imported_count: importedCount,
      updated_count: updatedCount,
      skipped_count: skippedCount,
      new_levels_added: newLevelsAdded,
      new_subjects_added: newSubjectsAdded,
    });
  } catch (error: unknown) {
    console.error("Import API Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
