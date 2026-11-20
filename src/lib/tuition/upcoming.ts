/**
 * tuition/upcoming.ts — Sinh lịch sắp tới, nhận diện preset và giáo viên phụ trách.
 */
import type { DbRow } from "@/types/common";
import { parseStudentScheduleSlots, type ParsedStudentSchedule } from "./schedule";

/* =========================================================================
 * BẢNG LỊCH HỌC CÒN LẠI (UPCOMING SCHEDULE GENERATOR)
 * Tự động phân tích lịch học cố định & sinh danh sách các buổi học còn lại
 * từ hôm nay đến N ngày tới (kèm trạng thái đã báo nghỉ / đã bù)
 * ========================================================================= */

export interface UpcomingLessonSession {
  id: string; // unique: "2026-10-31_09:30"
  date: string; // "2026-10-31" (YYYY-MM-DD)
  dayName: string; // "Thứ 7"
  timeRange: string; // "09:30 - 11:00"
  subjectName: string; // "Piano"
  teacherName?: string;
  isToday: boolean;
  isPast: boolean;
  isReported: boolean; // Đã báo nghỉ buổi này chưa
  makeupItem?: StudentMakeupItem;
}

/** Thông tin một buổi báo nghỉ đã ghi nhận của học sinh (dùng cho lịch sắp tới). */
export interface StudentMakeupItem {
  id: string;
  absence_date: string;
  status: string; // 'pending' | 'scheduled' | 'completed'
  makeup_date?: string;
  makeup_time?: string;
  absence_reason?: string;
}

import { VI_WEEKDAYS } from "./constants";

export function generateUpcomingStudentSchedule(
  student: {
    schedule_details_json?: string;
    study_time_detail?: string;
    registered_days?: string;
    sessions_per_week?: number;
    subject_name?: string;
    teacher_name?: string;
    makeups?: Array<{
      id: string;
      absence_date: string;
      status: string;
      makeup_date?: string;
      makeup_time?: string;
      absence_reason?: string;
    }>;
  },
  daysAhead: number = 30,
  availableTeachers: Array<{ id: string; name: string }> = []
): UpcomingLessonSession[] {
  const parsedSlots = parseStudentScheduleSlots(student, availableTeachers);
  if (parsedSlots.length === 0) return [];

  // Gom các slot theo thứ
  const slotsByDay: Record<string, ParsedStudentSchedule[]> = {};
  for (const slot of parsedSlots) {
    if (!slotsByDay[slot.day]) slotsByDay[slot.day] = [];
    slotsByDay[slot.day].push(slot);
  }

  // Map các buổi đã báo nghỉ trước đó theo ngày
  const makeupsMap = new Map<string, StudentMakeupItem>();
  if (Array.isArray(student.makeups)) {
    for (const m of student.makeups) {
      if (m.absence_date && m.status !== "cancelled") {
        makeupsMap.set(m.absence_date, m);
      }
    }
  }

  const results: UpcomingLessonSession[] = [];
  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  for (let i = 0; i < daysAhead; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const dayName = VI_WEEKDAYS[d.getDay()];

    const slots = slotsByDay[dayName];
    if (!slots || slots.length === 0) continue;

    for (const slot of slots) {
      const timeRange =
        slot.timeDetail ||
        (slot.hourSlot ? `${slot.hourSlot.replace("h", "")}:00` : "18:00 - 19:00");
      const subName = slot.subjectName || student.subject_name || "Piano";
      const existingMakeup = makeupsMap.get(iso);

      results.push({
        id: `${iso}_${timeRange.split("-")[0]?.trim() || "00:00"}`,
        date: iso,
        dayName,
        timeRange,
        subjectName: subName,
        teacherName: student.teacher_name,
        isToday: iso === todayIso,
        isPast: iso < todayIso,
        isReported: Boolean(existingMakeup),
        makeupItem: existingMakeup || undefined,
      });
    }
  }

  return results;
}

/* =========================================================================
 * NHẬN DIỆN THÔNG MINH TÊN KIỂU LỊCH HỌC (SCHEDULE PRESET DETECTOR)
 * ========================================================================= */
export function detectStudentPresetName(
  student: {
    schedule_preset_name?: string;
    registered_days?: string;
    study_time_detail?: string;
    schedule_details_json?: string;
  },
  presets: Array<{ id: string; name: string; days?: string[] }> = []
): string {
  if (student.schedule_preset_name && student.schedule_preset_name.trim()) {
    return student.schedule_preset_name.trim();
  }

  // Thu thập danh sách ngày học từ registered_days hoặc schedule_details_json
  let days: string[] = [];
  if (student.registered_days && student.registered_days.trim()) {
    days = student.registered_days
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
  }
  if (days.length === 0 && student.schedule_details_json) {
    try {
      const items = JSON.parse(student.schedule_details_json);
      if (Array.isArray(items)) {
        days = Array.from(new Set(items.map((i: DbRow) => String(i.day || "")).filter(Boolean)));
      }
    } catch {
      /* Bỏ qua có chủ đích: lỗi không ảnh hưởng luồng chính. */
    }
  }

  // So khớp với danh sách presets đã cấu hình trong Cài Đặt
  if (presets.length > 0 && days.length > 0) {
    const matched = presets.find((p) => {
      const pDays = Array.isArray(p.days) ? p.days : [];
      if (pDays.length !== days.length) return false;
      return pDays.every((pd) => days.some((d) => d.toLowerCase() === pd.toLowerCase()));
    });
    if (matched) return matched.name;
  }

  // Phân tích văn bản từ study_time_detail & registered_days
  const combined =
    `${student.registered_days || ""} ${student.study_time_detail || ""}`.toLowerCase();

  if (
    /t2[-_ ]*4[-_ ]*6/i.test(combined) ||
    (combined.includes("thứ 2") && combined.includes("thứ 4") && combined.includes("thứ 6"))
  ) {
    const evenPreset = presets.find(
      (p) => p.name.toLowerCase().includes("chẵn") || p.name.includes("2-4-6")
    );
    return evenPreset ? evenPreset.name : "Thứ chẵn (2-4-6)";
  }

  if (
    /t3[-_ ]*5[-_ ]*7/i.test(combined) ||
    (combined.includes("thứ 3") && combined.includes("thứ 5") && combined.includes("thứ 7"))
  ) {
    const oddPreset = presets.find(
      (p) => p.name.toLowerCase().includes("lẻ") || p.name.includes("3-5-7")
    );
    return oddPreset ? oddPreset.name : "Thứ lẻ (3-5-7)";
  }

  if (
    (combined.includes("thứ 7") || combined.includes("t7")) &&
    (combined.includes("chủ nhật") || combined.includes("cn"))
  ) {
    const weekendPreset = presets.find(
      (p) => p.name.toLowerCase().includes("cuối tuần") || p.name.includes("t7-cn")
    );
    return weekendPreset ? weekendPreset.name : "Cuối tuần (T7-CN)";
  }

  if (combined.includes("linh hoạt")) {
    return "Linh hoạt";
  }

  if (days.length > 0) {
    return days.map((d) => d.replace("Thứ ", "T").replace("Chủ Nhật", "CN")).join("-");
  }

  return "";
}

// Helper giải quyết danh sách giáo viên phụ trách học sinh dựa trên Lớp học & Khung giờ học thực tế
export function resolveStudentTeachers(
  student: {
    teacher_id?: string;
    teacher_name?: string;
    class_id?: string;
    class_teacher_assignments_json?: string;
    study_time_detail?: string;
    schedule_details_json?: string;
    registered_days?: string;
  },
  availableTeachers: Array<{ id: string; name: string }> = []
): {
  primaryTeacherId?: string;
  primaryTeacherName: string;
  allTeacherNames: string[];
  teacherDisplay: string;
} {
  const teacherMap = new Map(availableTeachers.map((t) => [t.id, t.name]));

  // 1. Nếu có teacher_assignments_json từ lớp học
  if (student.class_teacher_assignments_json) {
    try {
      const assignments = JSON.parse(student.class_teacher_assignments_json);
      if (Array.isArray(assignments) && assignments.length > 0) {
        // Tách giờ bắt đầu/kết thúc học sinh đang học
        let stStartH = 18;
        if (student.schedule_details_json) {
          try {
            const items = JSON.parse(student.schedule_details_json);
            if (Array.isArray(items) && items.length > 0 && items[0].start_time) {
              stStartH = parseInt(items[0].start_time.split(":")[0], 10);
            }
          } catch {
            /* Bỏ qua có chủ đích: lỗi không ảnh hưởng luồng chính. */
          }
        } else if (student.study_time_detail) {
          const match = student.study_time_detail.match(/(\d{1,2})(?::(\d{2})|h)/);
          if (match) stStartH = parseInt(match[1], 10);
        }

        // Lọc các giáo viên đứng ca trùng với giờ của học sinh
        const matched = assignments.filter((a: DbRow) => {
          if (!a.start_time || !a.end_time) return true;
          const [sh] = a.start_time.split(":").map(Number);
          const [eh] = a.end_time.split(":").map(Number);
          return stStartH >= sh && stStartH < eh;
        });

        const targetList = matched.length > 0 ? matched : assignments;
        const names = Array.from(
          new Set(
            targetList
              .map((a: DbRow) => a.teacher_name || teacherMap.get(a.teacher_id))
              .filter(Boolean)
          )
        ) as string[];

        if (names.length > 0) {
          return {
            primaryTeacherId: targetList[0].teacher_id,
            primaryTeacherName: names[0],
            allTeacherNames: names,
            teacherDisplay: names.join(" & "),
          };
        }
      }
    } catch {
      /* Bỏ qua có chủ đích: lỗi không ảnh hưởng luồng chính. */
    }
  }

  // 2. Fallback qua teacher_name / teacher_id cá nhân
  if (student.teacher_name && student.teacher_name !== "Chưa gán GV") {
    return {
      primaryTeacherId: student.teacher_id,
      primaryTeacherName: student.teacher_name,
      allTeacherNames: [student.teacher_name],
      teacherDisplay: student.teacher_name,
    };
  }

  if (student.teacher_id && teacherMap.has(student.teacher_id)) {
    const tName = teacherMap.get(student.teacher_id)!;
    return {
      primaryTeacherId: student.teacher_id,
      primaryTeacherName: tName,
      allTeacherNames: [tName],
      teacherDisplay: tName,
    };
  }

  return {
    primaryTeacherId: undefined,
    primaryTeacherName: "Chưa gán GV",
    allTeacherNames: [],
    teacherDisplay: "Chưa gán GV",
  };
}
