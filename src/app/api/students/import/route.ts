import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { getSchoolIdFromRequest } from "@/lib/authHelper";
import { parseStudyTimeToSchedule } from "@/lib/tuition";

export async function POST(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const targetSchoolId = getSchoolIdFromRequest(req);
    const body = await req.json();
    const { students: rawStudents, default_subject_id, default_level_id, default_teacher_id, school_id } = body;
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

    // Get all existing teachers for this school
    const teachersRes = await db.execute({
      sql: "SELECT id, name FROM teachers WHERE school_id = ? OR school_id = 'school-default'",
      args: [finalSchoolId],
    });
    const existingTeachers: Array<{ id: string; name: string }> = teachersRes.rows.map((r) => ({
      id: String(r.id),
      name: String(r.name),
    }));

    // Lấy ca học mặc định nếu có
    const slotsRes = await db.execute({
      sql: "SELECT id FROM time_slots WHERE school_id = ? AND is_active = 1 LIMIT 1",
      args: [finalSchoolId],
    });
    const defaultSlotId = slotsRes.rows.length > 0 ? String(slotsRes.rows[0].id) : "";

    // Lấy gói học phí mặc định (Theo tháng) nếu có
    const defaultPkgRes = await db.execute({
      sql: "SELECT id FROM tuition_packages WHERE (school_id = ? OR school_id = 'school-default') AND cycle_unit = 'month' AND cycle_value = 1 LIMIT 1",
      args: [finalSchoolId],
    });
    const defaultPackageId = defaultPkgRes.rows.length > 0 ? String(defaultPkgRes.rows[0].id) : null;

    // Lấy danh sách tất cả student_code hiện có trong trường để tính toán mã tự tăng chuẩn (HS01, HS02...)
    const allCodesRes = await db.execute({
      sql: "SELECT student_code FROM students WHERE school_id = ? OR school_id = 'school-default'",
      args: [finalSchoolId],
    });
    let maxStudentCodeNum = 0;
    for (const row of allCodesRes.rows) {
      if (!row.student_code) continue;
      const m = String(row.student_code).trim().match(/^HS[-_]?0*(\d+)$/i);
      if (m) {
        const num = parseInt(m[1], 10);
        if (num > maxStudentCodeNum) maxStudentCodeNum = num;
      }
    }

    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const newLevelsAdded: string[] = [];
    const newSubjectsAdded: string[] = [];

    // Helper khớp giáo viên từ tên
    const matchTeacherId = (rawTeacherName: string): string | null => {
      if (!rawTeacherName) return default_teacher_id || null;
      const clean = rawTeacherName.toLowerCase().trim();
      for (const tc of existingTeachers) {
        const tcName = tc.name.toLowerCase().trim();
        if (clean === tcName) return tc.id;
        const words = tcName.split(/\s+/).filter((w) => !["thầy", "cô"].includes(w));
        const mainName = words[words.length - 1];
        if (tcName.length >= 2 && clean.includes(tcName)) return tc.id;
        if (mainName && mainName.length >= 3 && clean.includes(mainName)) return tc.id;
        if ((mainName === "phonk" || mainName === "phong") && (clean.includes("phong") || clean.includes("phonk"))) return tc.id;
      }
      return default_teacher_id || null;
    };

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

      // Khớp giáo viên phụ trách từ cột teacher hoặc từ ghi chú
      const matchedTeacherId = matchTeacherId(item.teacher_name || item.note || item.study_time_detail || "");

      // Tự động phân tích chuỗi giờ học sang cấu trúc lịch học chuẩn của hệ thống
      const parsedSchedule = parseStudyTimeToSchedule(item.study_time_detail);
      const regDays = parsedSchedule?.registered_days || "";
      const sessionsPerWeek = parsedSchedule?.sessions_per_week || 2;
      const hoursPerWeek = parsedSchedule?.hours_per_week || 3;
      const scheduleDetailsJson = parsedSchedule?.schedule_details_json || "[]";

      const formattedZalo = phone ? `https://zalo.me/${phone}` : "";
      const inputCode = item.student_code ? String(item.student_code).trim() : "";

      // ⭐ CƠ CHẾ ĐỊNH DANH THEO MÃ HỌC VIÊN:
      // 1. Nếu dòng Excel CÓ mã học viên -> Kiểm tra xem mã đó đã tồn tại trong DB chưa để UPDATE
      let existingStudentId: string | null = null;
      if (inputCode) {
        const existByCode = await db.execute({
          sql: "SELECT id FROM students WHERE UPPER(student_code) = UPPER(?) AND (school_id = ? OR school_id = 'school-default')",
          args: [inputCode, finalSchoolId],
        });
        if (existByCode.rows.length > 0) {
          existingStudentId = String(existByCode.rows[0].id);
        }
      }

      if (existingStudentId) {
        // CẬP NHẬT HỌC VIÊN CŨ THEO MÃ HỌC VIÊN (Bổ sung SĐT, đổi giờ học, đổi môn...)
        await db.execute({
          sql: `UPDATE students 
                SET name = ?,
                    phone = CASE WHEN ? != '' THEN ? ELSE phone END,
                    zalo_link = CASE WHEN ? != '' THEN ? ELSE zalo_link END,
                    level_id = COALESCE(?, level_id), 
                    subject_id = COALESCE(?, subject_id),
                    teacher_id = COALESCE(?, teacher_id),
                    study_time_detail = COALESCE(?, study_time_detail), 
                    start_date = COALESCE(?, start_date),
                    registered_days = CASE WHEN ? != '' THEN ? ELSE registered_days END,
                    sessions_per_week = CASE WHEN ? > 0 THEN ? ELSE sessions_per_week END,
                    hours_per_week = CASE WHEN ? > 0 THEN ? ELSE hours_per_week END,
                    schedule_details_json = CASE WHEN ? != '[]' THEN ? ELSE schedule_details_json END,
                    status_note = CASE WHEN ? != '' THEN ? ELSE status_note END
                WHERE id = ?`,
          args: [
            name,
            phone,
            phone,
            formattedZalo,
            formattedZalo,
            matchedLevelId || null,
            matchedSubjectId || null,
            matchedTeacherId || null,
            item.study_time_detail || null,
            startDateStr || null,
            regDays,
            regDays,
            sessionsPerWeek,
            sessionsPerWeek,
            hoursPerWeek,
            hoursPerWeek,
            scheduleDetailsJson,
            scheduleDetailsJson,
            item.note || "",
            item.note || "",
            existingStudentId,
          ],
        });
        updatedCount++;
      } else {
        // TẠO HỌC VIÊN MỚI HOÀN TOÀN (Ai chưa có mã hoặc mã mới chưa có trong hệ thống)
        // Cấp mã duy nhất tự tăng HS01, HS02... (hoặc giữ mã người dùng chỉ định nếu chưa tồn tại)
        let finalCode = inputCode;
        if (!finalCode) {
          maxStudentCodeNum += 1;
          finalCode = `HS${String(maxStudentCodeNum).padStart(2, "0")}`;
        }

        const id = `stu-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        await db.execute({
          sql: `INSERT INTO students (
                  id, school_id, student_code, name, phone, zalo_link, level_id, subject_id, teacher_id, time_slot_id, tuition_package_id,
                  start_date, duration_mode, sessions_per_week, hours_per_week, registered_days,
                  study_time_detail, schedule_details_json, is_discount_enabled, discount_percent,
                  discount_reason, status_note, status
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, 'by_hours', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'studying')`,
          args: [
            id,
            finalSchoolId,
            finalCode,
            name,
            phone,
            formattedZalo,
            matchedLevelId,
            matchedSubjectId,
            matchedTeacherId || null,
            defaultPackageId,
            startDateStr,
            sessionsPerWeek,
            hoursPerWeek,
            regDays,
            item.study_time_detail || "",
            scheduleDetailsJson,
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
