import { MonthFormat } from "./types";

export function formatVND(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null) return "0 đ";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0 đ";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  })
    .format(num)
    .replace("₫", "đ");
}

export function calculateStandardTuition(
  baseTuition: number,
  levelSurcharge: number,
  isDiscountEnabled: boolean | number,
  discountPercent: number
): number {
  const base = Number(baseTuition) || 0;
  const surcharge = Number(levelSurcharge) || 0;
  return applyDiscount(base + surcharge, isDiscountEnabled, discountPercent);
}

export function applyDiscount(
  amount: number,
  isDiscountEnabled: boolean | number,
  discountPercent: number
): number {
  const raw = Number(amount) || 0;
  const hasDiscount = Boolean(Number(isDiscountEnabled));
  const discount = hasDiscount ? Number(discountPercent) || 0 : 0;
  const discountMultiplier = Math.max(0, 1 - discount / 100);
  return Math.round(raw * discountMultiplier);
}

export function getPreviousMonthStr(monthStr: string): string {
  if (!monthStr || !monthStr.includes("-")) return "";
  const [yearStr, monthStrPart] = monthStr.split("-");
  let y = parseInt(yearStr, 10);
  let m = parseInt(monthStrPart, 10);
  m -= 1;
  if (m < 1) {
    m = 12;
    y -= 1;
  }
  return `${y}-${String(m).padStart(2, "0")}`;
}

export function getNextMonthStr(monthStr: string): string {
  if (!monthStr || !monthStr.includes("-")) return "";
  const [yearStr, monthStrPart] = monthStr.split("-");
  let y = parseInt(yearStr, 10);
  let m = parseInt(monthStrPart, 10);
  m += 1;
  if (m > 12) {
    m = 1;
    y += 1;
  }
  return `${y}-${String(m).padStart(2, "0")}`;
}

export function getCurrentMonthStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

const ENGLISH_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function formatMonthDisplay(monthStr: string, format: MonthFormat = "vietnamese"): string {
  if (!monthStr || !monthStr.includes("-")) return monthStr;
  const [year, month] = monthStr.split("-");
  const monthNum = parseInt(month, 10);

  if (format === "english") {
    const monthName = !isNaN(monthNum) && monthNum >= 1 && monthNum <= 12 ? ENGLISH_MONTHS[monthNum - 1] : month;
    return `${monthName} ${year}`;
  }

  if (format === "chinese") {
    return `${year}年${monthNum}月`;
  }

  if (format === "japanese") {
    return `${year}年${monthNum}月度`;
  }

  if (format === "number") {
    return `${month}/${year}`;
  }

  // Mặc định: vietnamese
  return `Tháng ${month}/${year}`;
}

const DAY_ORDER: Record<string, number> = {
  "Thứ 2": 2,
  "Thứ 3": 3,
  "Thứ 4": 4,
  "Thứ 5": 5,
  "Thứ 6": 6,
  "Thứ 7": 7,
  "Chủ Nhật": 8,
};

export function isDayInSlot(day: string, slot: { from_day?: string; to_day?: string; days?: string }): boolean {
  if (!day) return false;
  // If slot specifies exact days string containing this day
  if (slot.days && slot.days.includes(day)) return true;

  const targetOrder = DAY_ORDER[day];
  if (!targetOrder) return false;

  const fromOrder = slot.from_day ? DAY_ORDER[slot.from_day] || 2 : 2;
  const toOrder = slot.to_day ? DAY_ORDER[slot.to_day] || 7 : 7;

  if (fromOrder <= toOrder) {
    return targetOrder >= fromOrder && targetOrder <= toOrder;
  } else {
    // Cross Sunday (e.g. Thứ 7 to Thứ 2)
    return targetOrder >= fromOrder || targetOrder <= toOrder;
  }
}

export function formatTimeSlotLabel(slot: {
  name?: string;
  from_day?: string;
  to_day?: string;
  days?: string;
  start_time?: string;
  end_time?: string;
}): string {
  const time =
    slot.start_time && slot.end_time ? `${slot.start_time} - ${slot.end_time}` : (slot.start_time || slot.end_time || "");
  const days =
    slot.days ||
    (slot.from_day && slot.to_day
      ? slot.from_day === slot.to_day
        ? slot.from_day
        : `${slot.from_day} – ${slot.to_day}`
      : "");

  let rawName = (slot.name || "").trim();
  // Strip redundant text like "Khung giờ mở cửa mới", "Khung giờ mở cửa", "Khung giờ mới"
  let cleanName = rawName
    .replace(/^khung\s*giờ\s*(?:mở\s*cửa)?\s*(?:mới)?\s*/i, "")
    .replace(/\s*\([^)]*\)\s*$/g, "")
    .trim();

  const lower = cleanName.toLowerCase();
  const isGeneric = !cleanName || lower === "mở cửa" || lower.startsWith("ca");

  if (time && days) {
    if (!cleanName || isGeneric) {
      return `${time} (${days})`;
    }
    return `${cleanName} (${time} • ${days})`;
  }
  if (time) {
    return cleanName && !isGeneric ? `${cleanName} (${time})` : time;
  }
  if (days) {
    return cleanName && !isGeneric ? `${cleanName} (${days})` : days;
  }
  return cleanName || rawName || "Ca mở cửa";
}

// Convert "HH:MM" to total minutes
export function timeToMinutes(t: string): number {
  if (!t || !t.includes(":")) return 0;
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Convert total minutes to "HH:MM" 24h
export function minutesToTime(m: number): string {
  const h = Math.floor(m / 60) % 24;
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

// Check if a study interval [start_time, end_time] is inside an operating slot
export function isTimeRangeWithinSlot(
  start_time: string,
  end_time: string,
  slot: { start_time: string; end_time: string }
): boolean {
  const s = timeToMinutes(start_time);
  const e = timeToMinutes(end_time);
  const slotS = timeToMinutes(slot.start_time);
  const slotE = timeToMinutes(slot.end_time);

  return s >= slotS && e <= slotE && e > s;
}

// Generate valid 24h intervals for a given day based on active slots that cover this day
export function getSlotsForDay(
  day: string,
  slots: Array<{
    id: string;
    name?: string;
    from_day?: string;
    to_day?: string;
    days?: string;
    start_time: string;
    end_time: string;
    is_active?: number;
  }>
) {
  return slots.filter((slot) => {
    if (slot.is_active === 0) return false;
    return isDayInSlot(day, slot);
  });
}

// Get available start time options (24h) for a specific day based on operating slots
export function getDayStartTimes(
  day: string,
  slots: Array<{
    id: string;
    name?: string;
    from_day?: string;
    to_day?: string;
    days?: string;
    start_time: string;
    end_time: string;
    is_active?: number;
  }>,
  stepMinutes: number = 30
): string[] {
  const daySlots = getSlotsForDay(day, slots);
  if (daySlots.length === 0) {
    // Fallback: 07:00 to 21:00
    const list: string[] = [];
    for (let m = 7 * 60; m <= 21 * 60; m += stepMinutes) list.push(minutesToTime(m));
    return list;
  }
  const times = new Set<string>();
  daySlots.forEach((slot) => {
    const sMin = timeToMinutes(slot.start_time);
    const eMin = timeToMinutes(slot.end_time);
    for (let m = sMin; m < eMin; m += stepMinutes) {
      times.add(minutesToTime(m));
    }
  });
  return Array.from(times).sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
}

// Get available end time options (24h) given a start time and operating slots for that day
export function getDayEndTimes(
  day: string,
  startTime: string,
  slots: Array<{
    id: string;
    name?: string;
    from_day?: string;
    to_day?: string;
    days?: string;
    start_time: string;
    end_time: string;
    is_active?: number;
  }>,
  stepMinutes: number = 30
): string[] {
  const daySlots = getSlotsForDay(day, slots);
  const sMin = timeToMinutes(startTime);
  if (daySlots.length === 0) {
    const list: string[] = [];
    for (let m = sMin + stepMinutes; m <= Math.min(23 * 60, sMin + 4 * 60); m += stepMinutes) {
      list.push(minutesToTime(m));
    }
    return list;
  }
  const covering = daySlots.filter(
    (s) => sMin >= timeToMinutes(s.start_time) && sMin < timeToMinutes(s.end_time)
  );
  const targetSlots = covering.length > 0 ? covering : daySlots;
  const times = new Set<string>();
  targetSlots.forEach((slot) => {
    const end = timeToMinutes(slot.end_time);
    const start = Math.max(sMin + stepMinutes, timeToMinutes(slot.start_time) + stepMinutes);
    for (let m = start; m <= end; m += stepMinutes) {
      times.add(minutesToTime(m));
    }
  });
  return Array.from(times).sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
}

// Model một buổi học đã phân tích của học sinh để hiển thị lên Sơ đồ ma trận lớp
export interface ParsedStudentSchedule {
  day: string;          // "Thứ 2", "Thứ 4", "Thứ 6"...
  hourSlot: string;     // "17h", "18h", "19h", "09h", "08h"...
  timeDetail: string;   // "18h30", "17h30 - 19h", "18h - 19h30" hoặc rỗng nếu đúng giờ chuẩn
  subjectName?: string; // Tên bộ môn nếu có ghi riêng (VD: "Piano", "Guitar")
  detectedTeacherId?: string; // ID giáo viên nếu phát hiện từ chuỗi
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
  },
  availableTeachers: Array<{ id: string; name: string }> = []
): ParsedStudentSchedule[] {
  const results: ParsedStudentSchedule[] = [];

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
      if ((mainName === "phonk" || mainName === "phong") && (clean.includes("phong") || clean.includes("phonk"))) {
        return tc.id;
      }
    }
    return undefined;
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
          if (item.day && item.start_time) {
            const startHour = parseInt(item.start_time.split(":")[0], 10);
            const slotHourStr = `${String(startHour).padStart(2, "0")}h`;
            let timeDetail = "";
            if (item.start_time.endsWith(":30") || (item.end_time && !item.end_time.endsWith(":00"))) {
              timeDetail = `${item.start_time} - ${item.end_time}`;
            }
            results.push({
              day: item.day,
              hourSlot: slotHourStr,
              timeDetail: timeDetail,
              detectedTeacherId: detectedTeacherFromNote,
            });
          }
        }
        if (results.length > 0) return results;
      }
    } catch {}
  }

  // Ưu tiên 2: Phân tích thông minh chuỗi study_time_detail
  // VD: "Thứ 2: 18:00-19:30 (1.5h) | Thứ 4: 18:00-19:30 (1.5h)", "T6 18h-19h30, t7 9h-10h30", "T2-4-6 (17h-18h)"...
  const rawText = (student.study_time_detail || "").trim();
  if (rawText && !rawText.toLowerCase().includes("linh hoạt")) {
    const segments = rawText.split(/[,|;]+/).map((s) => s.trim()).filter(Boolean);

    for (const seg of segments) {
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
      // Loại bỏ dải ngày (T2-4-6) và tiền tố "Thứ 2:", "Thứ 7:" để không bị nuốt số ngày làm số giờ!
      let cleanTime = seg.replace(/T[2-7][-_ ]*[2-7][-_ ]*[2-7]?/gi, " ");
      cleanTime = cleanTime.replace(/(?:Thứ\s*[2-7]|Chủ\s*Nhật|CN|T[2-7]|S7|C7)\s*[:\s-]*/gi, " ");
      cleanTime = cleanTime.replace(/\(\s*\d+(?:\.\d+)?\s*(?:h|tiếng|phút|p)\s*\)/gi, " ");

      let detectedHourSlot = "18h";
      let timeDetail = "";

      // Khớp khoảng giờ: 18:00-19:30, 18h-19h30, 19-20h, 09:00 - 10:30, 18h30 - 20h
      const rangeMatch = cleanTime.match(
        /(\d{1,2})(?:\s*h\s*(\d{2})?|\s*:\s*(\d{2}))?\s*[-–to~]\s*(\d{1,2})(?:\s*h\s*(\d{2})?|\s*:\s*(\d{2}))?/i
      );

      if (rangeMatch) {
        const startH = parseInt(rangeMatch[1], 10);
        const startM = rangeMatch[2] || rangeMatch[3] || "";
        const endH = parseInt(rangeMatch[4], 10);
        const endM = rangeMatch[5] || rangeMatch[6] || "";

        if (startH >= 6 && startH <= 22) {
          detectedHourSlot = `${String(startH).padStart(2, "0")}h`;
          const startStr = `${startH}h${startM && startM !== "00" ? startM : ""}`;
          const endStr = `${endH}h${endM && endM !== "00" ? endM : ""}`;
          timeDetail = `${startStr} - ${endStr}`;
        }
      } else {
        // Khớp giờ đơn: 18h30, 18:30, 18h, 9h
        const singleMatch = cleanTime.match(/(\d{1,2})(?:\s*h\s*(\d{2})?|\s*:\s*(\d{2}))/i);
        if (singleMatch) {
          const startH = parseInt(singleMatch[1], 10);
          const startM = singleMatch[2] || singleMatch[3] || "";
          if (startH >= 6 && startH <= 22) {
            detectedHourSlot = `${String(startH).padStart(2, "0")}h`;
            if (startM && startM !== "00") {
              timeDetail = `${startH}h${startM}`;
            }
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

      if (daysFound.length > 0) {
        for (const d of daysFound) {
          results.push({
            day: d,
            hourSlot: detectedHourSlot,
            timeDetail: timeDetail,
            subjectName: segSubject,
            detectedTeacherId: teacherInSeg,
          });
        }
      }
    }

    if (results.length > 0) return results;
  }

  // Ưu tiên 3: Phân tích từ registered_days nếu có (VD: "Thứ 2, Thứ 4, Thứ 6" hoặc "Thứ 7, Chủ Nhật")
  const regDays = (student.registered_days || "").trim();
  if (regDays) {
    const daysList = regDays.split(/[,|;]+/).map((d) => d.trim()).filter(Boolean);
    for (const d of daysList) {
      const isWeekend = d.includes("7") || d.toLowerCase().includes("nhật");
      results.push({
        day: d.startsWith("Thứ") || d === "Chủ Nhật" ? d : `Thứ ${d.replace(/\D/g, "")}`,
        hourSlot: isWeekend ? "09h" : "18h",
        timeDetail: "",
        detectedTeacherId: detectedTeacherFromNote,
      });
    }
  }

  // Ưu tiên 4: Fallback Thứ 2 ca 18h
  if (results.length === 0) {
    results.push({
      day: "Thứ 2",
      hourSlot: "18h",
      timeDetail: "",
      detectedTeacherId: detectedTeacherFromNote,
    });
  }

  return results;
}

