/**
 * tuition/schedule.ts — Phân tích lịch học của học sinh.
 */
import type { DbRow } from "@/types/common";

// Model một buổi học đã phân tích của học sinh để hiển thị lên Sơ đồ ma trận lớp
export interface ParsedStudentSchedule {
  day: string; // "Thứ 2", "Thứ 4", "Thứ 6"...
  hourSlot: string; // "17h", "18h", "19h", "09h", "08h"...
  timeDetail: string; // "18h30", "17h30 - 19h", "18h - 19h30" hoặc rỗng nếu đúng giờ chuẩn
  subjectName?: string; // Tên bộ môn nếu có ghi riêng (VD: "Piano", "Guitar")
  detectedTeacherId?: string; // ID giáo viên nếu phát hiện từ chuỗi
  matchedTeacherIds?: string[]; // Danh sách các GV đứng ca tương ứng trong lớp (hỗ trợ nhiều GV cùng giờ)
  startTime?: string; // "18:00"
  endTime?: string; // "20:00"
  durationMinutes?: number; // 120
  coveredHours?: string[]; // ["18h", "19h"] - các khung giờ chuẩn mà ca học này diễn ra
}

/**
 * Tính toán các khung giờ chuẩn 1 tiếng ("17h", "18h", "19h"...) mà một ca học giao thoa
 */
function calculateCoveredHourSlots(
  startH: number,
  startM: number,
  endH: number,
  endM: number
): string[] {
  const sMin = startH * 60 + startM;
  let eMin = endH * 60 + endM;
  if (eMin <= sMin) eMin = sMin + 60;
  const hours: string[] = [];
  for (let h = 0; h < 24; h++) {
    const slotStart = h * 60;
    const slotEnd = (h + 1) * 60;
    if (Math.max(sMin, slotStart) < Math.min(eMin, slotEnd)) {
      hours.push(`${String(h).padStart(2, "0")}h`);
    }
  }
  return hours.length > 0 ? hours : [`${String(startH).padStart(2, "0")}h`];
}

// Phân tích lịch học chi tiết của học sinh từ schedule_details_json, study_time_detail và registered_days
export function parseStudentScheduleSlots(
  student: {
    schedule_details_json?: string;
    study_time_detail?: string;
    registered_days?: string;
    time_slot_name?: string;
    time_slot_desc?: string;
    status_note?: string;
    class_teacher_assignments_json?: string;
    sessions_per_week?: number;
  },
  availableTeachers: Array<{ id: string; name: string }> = []
): ParsedStudentSchedule[] {
  const results: ParsedStudentSchedule[] = [];

  // Đã gỡ khỏi toàn bộ ca học (sessions_per_week = 0): không tạo ca ảo Thứ 2 18:00
  if (student.sessions_per_week !== undefined && Number(student.sessions_per_week) === 0) {
    return [];
  }

  // Helper tìm ID giáo viên khớp với chuỗi văn bản
  const detectTeacher = (text: string): string | undefined => {
    if (!text || availableTeachers.length === 0) return undefined;
    const clean = text.toLowerCase().trim();
    for (const tc of availableTeachers) {
      const tcName = tc.name.toLowerCase().trim();
      if (clean === tcName) return tc.id;
      const words = tcName.split(/\s+/).filter((w) => !["thầy", "cô"].includes(w));
      const mainName = words[words.length - 1]; // Ví dụ: "phong", "điệp", "phát"
      if (tcName.length >= 2 && clean.includes(tcName)) return tc.id;
      if (mainName && mainName.length >= 3 && clean.includes(mainName)) return tc.id;
      // Khớp đặc biệt nếu gõ Phonk/Phong
      if (
        (mainName === "phonk" || mainName === "phong") &&
        (clean.includes("phong") || clean.includes("phonk"))
      ) {
        return tc.id;
      }
    }
    return undefined;
  };

  // Helper tìm tất cả GV trong lớp phụ trách ca/giờ này từ teacher_assignments_json
  const findClassTeachersForSlot = (day: string, startH: number): string[] => {
    if (!student.class_teacher_assignments_json) return [];
    try {
      const assignments = JSON.parse(student.class_teacher_assignments_json);
      if (!Array.isArray(assignments)) return [];
      const matched = assignments.filter((a: DbRow) => {
        const matchDay = !a.day || a.day === "Tất cả các ngày" || a.day.includes(day);
        if (!matchDay) return false;
        if (!a.start_time || !a.end_time) return true;
        const [sh] = a.start_time.split(":").map(Number);
        const [eh] = a.end_time.split(":").map(Number);
        return startH >= sh && startH < eh;
      });
      return matched.map((m: DbRow) => m.teacher_id).filter(Boolean);
    } catch {
      return [];
    }
  };

  const detectedTeacherFromNote = detectTeacher(
    `${student.study_time_detail || ""} ${student.status_note || ""}`
  );

  // Ưu tiên 1: Đọc từ schedule_details_json nếu có dữ liệu hợp lệ
  if (student.schedule_details_json) {
    try {
      const items = JSON.parse(student.schedule_details_json);
      if (Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          if (item.day) {
            // Tách giờ bắt đầu và chuẩn hóa an toàn tuyệt đối, loại bỏ tiền tố thứ để không bị nhầm T2/T3/T4 thành 02:00
            const rawStart = String(item.start_time || "").trim();
            const rawEnd = String(item.end_time || "").trim();
            let startH = 18;
            let startM = 0;
            let endH = 19;
            let endM = 0;
            let timeDetail = "";

            const combined = `${rawStart} - ${rawEnd}`;
            const clean = combined.replace(/(?:Thứ\s*[2-7]|Chủ\s*Nhật|CN|T[2-7]|S7|C7)\b/gi, " ");

            const rangeMatch = clean.match(
              /(\d{1,2})(?:\s*h\s*(\d{2})?|\s*:\s*(\d{2}))?\s*[-–to~]\s*(\d{1,2})(?:\s*h\s*(\d{2})?|\s*:\s*(\d{2}))?/i
            );

            if (rangeMatch) {
              const sH = parseInt(rangeMatch[1], 10);
              const sM = rangeMatch[2] || rangeMatch[3] || "00";
              let eH = parseInt(rangeMatch[4], 10);
              const eM = rangeMatch[5] || rangeMatch[6] || "00";
              if (!isNaN(sH) && sH >= 0 && sH <= 23) {
                if (!isNaN(eH) && eH < sH && eH <= 5) eH += 12;
                const validEH = !isNaN(eH) ? eH : sH + 1;
                startH = sH;
                startM = parseInt(sM, 10) || 0;
                endH = validEH;
                endM = parseInt(eM, 10) || 0;
                timeDetail = `${String(sH).padStart(2, "0")}:${sM} - ${String(validEH).padStart(2, "0")}:${eM}`;
              }
            } else {
              const singleMatch = clean.match(/(\d{1,2})(?:\s*h\s*(\d{2})?|\s*:\s*(\d{2}))/i);
              if (singleMatch) {
                const sH = parseInt(singleMatch[1], 10);
                const sM = singleMatch[2] || singleMatch[3] || "00";
                if (!isNaN(sH) && sH >= 0 && sH <= 23) {
                  startH = sH;
                  startM = parseInt(sM, 10) || 0;
                  endH = sH + 1;
                  endM = startM;
                  timeDetail = `${String(sH).padStart(2, "0")}:${sM} - ${String(sH + 1).padStart(2, "0")}:${sM}`;
                }
              }
            }

            if (!timeDetail) {
              timeDetail = `${String(startH).padStart(2, "0")}:00 - ${String(endH).padStart(2, "0")}:00`;
            }

            const slotHourStr = `${String(startH).padStart(2, "0")}h`;
            const classTeachers = findClassTeachersForSlot(item.day, startH);
            const covered = calculateCoveredHourSlots(startH, startM, endH, endM);
            const durMin = endH * 60 + endM - (startH * 60 + startM);

            results.push({
              day: item.day,
              hourSlot: slotHourStr,
              timeDetail: timeDetail,
              detectedTeacherId: detectedTeacherFromNote || classTeachers[0],
              matchedTeacherIds: classTeachers.length > 0 ? classTeachers : undefined,
              startTime: `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`,
              endTime: `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`,
              durationMinutes: durMin > 0 ? durMin : 60,
              coveredHours: covered,
            });
          }
        }
        if (results.length > 0) return results;
      }
    } catch {
      /* Bỏ qua có chủ đích: lỗi không ảnh hưởng luồng chính. */
    }
  }

  // Ưu tiên 2: Phân tích thông minh chuỗi study_time_detail
  // VD: "T2, T4 (17h - 18h30)", "T2 (17h - 18h), T3, T4 (19h - 20h)", "Thứ 2: 18:00-19:30 | Thứ 4: 18:00-19:30"
  const rawText = (student.study_time_detail || "").trim();
  if (rawText && !rawText.toLowerCase().includes("linh hoạt")) {
    let clauses: string[] = [];
    if (/[|;]/.test(rawText)) {
      clauses = rawText
        .split(/[|;]+/)
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (/\)\s*,\s*(?=[A-Za-zÀ-ỹ0-9])/.test(rawText)) {
      clauses = rawText
        .split(/\)\s*,\s*(?=[A-Za-zÀ-ỹ0-9])/)
        .map((s, idx, arr) => {
          let res = s.trim();
          if (idx < arr.length - 1 && !res.endsWith(")")) res += ")";
          return res;
        })
        .filter(Boolean);
    } else {
      clauses = [rawText.trim()];
    }

    for (const seg of clauses) {
      // 1. Tìm các ngày thứ có trong đoạn (T2, T3, T4, T5, T6, T7, CN, S7, C7)
      const daysFound: string[] = [];

      if (/T2[-_ ]*4[-_ ]*6/i.test(seg) || /T2,?\s*4,?\s*6/i.test(seg)) {
        daysFound.push("Thứ 2", "Thứ 4", "Thứ 6");
      } else if (/T3[-_ ]*5[-_ ]*7/i.test(seg) || /T3,?\s*5,?\s*7/i.test(seg)) {
        daysFound.push("Thứ 3", "Thứ 5", "Thứ 7");
      } else if (/T2[-_ ]*4/i.test(seg) || /T2,?\s*4\b/i.test(seg)) {
        daysFound.push("Thứ 2", "Thứ 4");
      } else if (/T3[-_ ]*5/i.test(seg) || /T3,?\s*5\b/i.test(seg)) {
        daysFound.push("Thứ 3", "Thứ 5");
      } else {
        if (/(?:T2|Thứ\s*2)\b/i.test(seg)) daysFound.push("Thứ 2");
        if (/(?:T3|Thứ\s*3)\b/i.test(seg)) daysFound.push("Thứ 3");
        if (/(?:T4|Thứ\s*4)\b/i.test(seg)) daysFound.push("Thứ 4");
        if (/(?:T5|Thứ\s*5)\b/i.test(seg)) daysFound.push("Thứ 5");
        if (/(?:T6|Thứ\s*6)\b/i.test(seg)) daysFound.push("Thứ 6");
        if (/(?:T7|Thứ\s*7|S7|C7)\b/i.test(seg)) daysFound.push("Thứ 7");
        if (/(?:CN|Chủ\s*Nhật)\b/i.test(seg)) daysFound.push("Chủ Nhật");
      }

      // 2. Tách mốc giờ học chuẩn xác:
      let cleanTime = seg.replace(/T[2-7][-_ ]*[2-7][-_ ]*[2-7]?/gi, " ");
      cleanTime = cleanTime.replace(/(?:Thứ\s*[2-7]|Chủ\s*Nhật|CN|T[2-7]|S7|C7)\s*[:\s-]*/gi, " ");
      cleanTime = cleanTime.replace(/\(\s*\d+(?:\.\d+)?\s*(?:h|tiếng|phút|p)\s*\)/gi, " ");

      let detectedHourSlot = "18h";
      let timeDetail = "";
      let clauseStartH = 18;
      let clauseStartM = 0;
      let clauseEndH = 19;
      let clauseEndM = 0;

      // Khớp khoảng giờ: 18:00-19:30, 18h-19h30, 19-20h, 09:00 - 10:30, 18h30 - 20h
      const rangeMatch = cleanTime.match(
        /(\d{1,2})(?:\s*h\s*(\d{2})?|\s*:\s*(\d{2}))?\s*[-–to~]\s*(\d{1,2})(?:\s*h\s*(\d{2})?|\s*:\s*(\d{2}))?/i
      );

      if (rangeMatch) {
        const startH = parseInt(rangeMatch[1], 10);
        const startM = rangeMatch[2] || rangeMatch[3] || "00";
        const endH = parseInt(rangeMatch[4], 10);
        const endM = rangeMatch[5] || rangeMatch[6] || "00";

        if (!isNaN(startH) && startH >= 0 && startH <= 23) {
          detectedHourSlot = `${String(startH).padStart(2, "0")}h`;
          let endHourNum = !isNaN(endH) ? endH : startH + 1;
          if (endHourNum < startH && endHourNum <= 5) {
            endHourNum += 12;
          }
          clauseStartH = startH;
          clauseStartM = parseInt(startM, 10) || 0;
          clauseEndH = endHourNum;
          clauseEndM = parseInt(endM, 10) || 0;
          const startStr = `${String(startH).padStart(2, "0")}:${startM}`;
          const endStr = `${String(endHourNum).padStart(2, "0")}:${endM}`;
          timeDetail = `${startStr} - ${endStr}`;
        }
      } else {
        // Khớp giờ đơn: 18h30, 18:30, 18h, 9h
        const singleMatch = cleanTime.match(/(\d{1,2})(?:\s*h\s*(\d{2})?|\s*:\s*(\d{2}))/i);
        if (singleMatch) {
          const startH = parseInt(singleMatch[1], 10);
          const startM = singleMatch[2] || singleMatch[3] || "00";
          if (!isNaN(startH) && startH >= 0 && startH <= 23) {
            detectedHourSlot = `${String(startH).padStart(2, "0")}h`;
            const endH = startH + 1;
            clauseStartH = startH;
            clauseStartM = parseInt(startM, 10) || 0;
            clauseEndH = endH;
            clauseEndM = clauseStartM;
            const startStr = `${String(startH).padStart(2, "0")}:${startM}`;
            const endStr = `${String(endH).padStart(2, "0")}:${startM}`;
            timeDetail = `${startStr} - ${endStr}`;
          }
        }
      }

      // 3. Nhận diện tên môn học nếu có ghi trong chuỗi
      let segSubject = "";
      if (/guitar/i.test(seg)) segSubject = "Guitar";
      else if (/piano/i.test(seg)) segSubject = "Piano";
      else if (/organ/i.test(seg)) segSubject = "Organ";
      else if (/thanh nhạc|vocal/i.test(seg)) segSubject = "Thanh nhạc";
      else if (/trống|drum/i.test(seg)) segSubject = "Trống";

      // 4. Nhận diện giáo viên riêng trong đoạn này nếu có
      const teacherInSeg = detectTeacher(seg) || detectedTeacherFromNote;

      const covered = calculateCoveredHourSlots(clauseStartH, clauseStartM, clauseEndH, clauseEndM);
      const durMin = clauseEndH * 60 + clauseEndM - (clauseStartH * 60 + clauseStartM);

      if (daysFound.length > 0) {
        for (const d of daysFound) {
          const startH = parseInt(detectedHourSlot.replace("h", ""), 10) || 18;
          const classTeachers = findClassTeachersForSlot(d, startH);

          results.push({
            day: d,
            hourSlot: detectedHourSlot,
            timeDetail: timeDetail,
            subjectName: segSubject,
            detectedTeacherId: teacherInSeg || classTeachers[0],
            matchedTeacherIds: classTeachers.length > 0 ? classTeachers : undefined,
            startTime: `${String(clauseStartH).padStart(2, "0")}:${String(clauseStartM).padStart(2, "0")}`,
            endTime: `${String(clauseEndH).padStart(2, "0")}:${String(clauseEndM).padStart(2, "0")}`,
            durationMinutes: durMin > 0 ? durMin : 60,
            coveredHours: covered,
          });
        }
      }
    }

    if (results.length > 0) return results;
  }

  // Ưu tiên 3: Phân tích từ registered_days nếu có (VD: "Thứ 2, Thứ 4, Thứ 6" hoặc "Thứ 7, Chủ Nhật")
  const regDays = (student.registered_days || "").trim();
  if (regDays) {
    const daysList = regDays
      .split(/[,|;]+/)
      .map((d) => d.trim())
      .filter(Boolean);
    for (const d of daysList) {
      const isWeekend = d.includes("7") || d.toLowerCase().includes("nhật");
      const defaultStartH = isWeekend ? 9 : 18;
      const slotHour = isWeekend ? "09h" : "18h";
      results.push({
        day: d.startsWith("Thứ") || d === "Chủ Nhật" ? d : `Thứ ${d.replace(/\D/g, "")}`,
        hourSlot: slotHour,
        timeDetail: `${String(defaultStartH).padStart(2, "0")}:00 - ${String(defaultStartH + 1).padStart(2, "0")}:00`,
        detectedTeacherId: detectedTeacherFromNote,
        startTime: `${String(defaultStartH).padStart(2, "0")}:00`,
        endTime: `${String(defaultStartH + 1).padStart(2, "0")}:00`,
        durationMinutes: 60,
        coveredHours: [slotHour],
      });
    }
  }

  // Ưu tiên 4: Fallback Thứ 2 ca 18h
  if (results.length === 0) {
    results.push({
      day: "Thứ 2",
      hourSlot: "18h",
      timeDetail: "18:00 - 19:00",
      detectedTeacherId: detectedTeacherFromNote,
      startTime: "18:00",
      endTime: "19:00",
      durationMinutes: 60,
      coveredHours: ["18h"],
    });
  }

  return results;
}

// Chuyển đổi thông minh chuỗi "Giờ vào lớp" từ Excel thành cấu trúc lịch học chuẩn của hệ thống
export function parseStudyTimeToSchedule(raw?: string): {
  registered_days: string;
  sessions_per_week: number;
  hours_per_week: number;
  schedule_details_json: string;
} | null {
  if (!raw || typeof raw !== "string") return null;
  const str = raw.trim();
  if (!str || str.toLowerCase().includes("linh hoạt")) return null;

  let rawClauses: string[] = [];
  if (/[|;]/.test(str)) {
    rawClauses = str
      .split(/[|;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  } else if (/\)\s*,\s*(?=[A-Za-zÀ-ỹ0-9])/.test(str)) {
    rawClauses = str
      .split(/\)\s*,\s*(?=[A-Za-zÀ-ỹ0-9])/)
      .map((s, idx, arr) => {
        let res = s.trim();
        if (idx < arr.length - 1 && !res.endsWith(")")) res += ")";
        return res;
      })
      .filter(Boolean);
  } else {
    rawClauses = [str.trim()];
  }

  const scheduleItems: Array<{
    id: string;
    day: string;
    start_time: string;
    end_time: string;
    hours: number;
  }> = [];
  const daysSet = new Set<string>();
  let totalHours = 0;

  for (const seg of rawClauses) {
    const days: string[] = [];
    if (/T2[-_ ]*4[-_ ]*6/i.test(seg) || /T2,?\s*4,?\s*6/i.test(seg)) {
      days.push("Thứ 2", "Thứ 4", "Thứ 6");
    } else if (/T3[-_ ]*5[-_ ]*7/i.test(seg) || /T3,?\s*5,?\s*7/i.test(seg)) {
      days.push("Thứ 3", "Thứ 5", "Thứ 7");
    } else if (/T2[-_ ]*4/i.test(seg) || /T2,?\s*4\b/i.test(seg)) {
      days.push("Thứ 2", "Thứ 4");
    } else if (/T3[-_ ]*5/i.test(seg) || /T3,?\s*5\b/i.test(seg)) {
      days.push("Thứ 3", "Thứ 5");
    } else {
      if (/(?:T2|Thứ\s*2)\b/i.test(seg)) days.push("Thứ 2");
      if (/(?:T3|Thứ\s*3)\b/i.test(seg)) days.push("Thứ 3");
      if (/(?:T4|Thứ\s*4)\b/i.test(seg)) days.push("Thứ 4");
      if (/(?:T5|Thứ\s*5)\b/i.test(seg)) days.push("Thứ 5");
      if (/(?:T6|Thứ\s*6)\b/i.test(seg)) days.push("Thứ 6");
      if (/(?:T7|Thứ\s*7|S7|C7)\b/i.test(seg)) days.push("Thứ 7");
      if (/(?:CN|Chủ\s*Nhật)\b/i.test(seg)) days.push("Chủ Nhật");
    }

    let cleanTime = seg.replace(/T[2-7][-_ ]*[2-7][-_ ]*[2-7]?/gi, " ");
    cleanTime = cleanTime.replace(/(?:Thứ\s*[2-7]|Chủ\s*Nhật|CN|T[2-7]|S7|C7)\s*[:\s-]*/gi, " ");
    cleanTime = cleanTime.replace(/\(\s*\d+(?:\.\d+)?\s*(?:h|tiếng|phút|p)\s*\)/gi, " ");

    let start_time = "18:00";
    let end_time = "19:30";
    let hours = 1.5;

    const rangeMatch = cleanTime.match(
      /(\d{1,2})(?:\s*h\s*(\d{2})?|\s*:\s*(\d{2}))?\s*[-–to~]\s*(\d{1,2})(?:\s*h\s*(\d{2})?|\s*:\s*(\d{2}))?/i
    );

    if (rangeMatch) {
      const startH = parseInt(rangeMatch[1], 10);
      const startM = rangeMatch[2] || rangeMatch[3] || "00";
      const endH = parseInt(rangeMatch[4], 10);
      const endM = rangeMatch[5] || rangeMatch[6] || "00";

      let endHourVal = endH;
      if (endHourVal < startH) {
        if (startH >= 8 && startH <= 11 && endHourVal === 1) {
          endHourVal = 11;
        } else if (endHourVal <= 5) {
          endHourVal += 12;
        }
      }

      start_time = `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`;
      end_time = `${String(endHourVal).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

      const diffMin = endHourVal * 60 + parseInt(endM, 10) - (startH * 60 + parseInt(startM, 10));
      hours = Math.max(0.5, Math.round((diffMin / 60) * 10) / 10);
    } else {
      const singleMatch = cleanTime.match(/(\d{1,2})(?:\s*h\s*(\d{2})?|\s*:\s*(\d{2}))/i);
      if (singleMatch) {
        const startH = parseInt(singleMatch[1], 10);
        const startM = singleMatch[2] || singleMatch[3] || "00";
        const endH = startH + 1;
        start_time = `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`;
        end_time = `${String(endH).padStart(2, "0")}:${String(startM).padStart(2, "0")}`;
        hours = 1;
      }
    }

    for (const d of days) {
      daysSet.add(d);
      scheduleItems.push({
        id: String(scheduleItems.length + 1),
        day: d,
        start_time,
        end_time,
        hours,
      });
      totalHours += hours;
    }
  }

  if (scheduleItems.length === 0) return null;

  return {
    registered_days: Array.from(daysSet).join(", "),
    sessions_per_week: scheduleItems.length,
    hours_per_week: Math.round(totalHours * 10) / 10,
    schedule_details_json: JSON.stringify(scheduleItems),
  };
}
