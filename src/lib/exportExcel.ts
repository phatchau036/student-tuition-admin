import * as XLSX from "xlsx";
import { Student } from "./types";
import { formatVND } from "./tuition";

export function exportStudentsToExcel(students: Student[], month: string, schoolName: string = "Trung Tâm") {
  // Chuẩn bị dữ liệu từng dòng
  const rows = students.map((s, index) => {
    let breakdownStr = "";
    try {
      const items = JSON.parse(s.monthly_override?.items_json || "[]");
      if (Array.isArray(items) && items.length > 0) {
        breakdownStr = items.map((it: any) => `${it.type === "add" ? "+" : "-"}${formatVND(it.amount)} (${it.name})`).join(", ");
      }
    } catch {}

    return {
      "STT": index + 1,
      "Mã Học Viên": s.student_code || "",
      "Họ Và Tên": s.name,
      "Số Điện Thoại": s.phone,
      "Môn Học": s.subject_name || "Chưa phân môn",
      "Trình Độ / Level": s.level_name || "",
      "Phụ Thu Level": s.level_surcharge || 0,
      "Giáo Viên": s.teacher_name || "Chưa gán GV",
      "Lịch Học Tuần": s.study_time_detail || s.registered_days || "",
      "Gói Học Phí": s.tuition_package_name || "Học phí chuẩn",
      "Chiết Khấu (%)": s.discount_percent || 0,
      "Lý Do Giảm": s.discount_reason || "",
      "Học Phí Tháng": s.current_tuition || 0,
      "Phụ Thu / Giảm Trừ Phát Sinh": breakdownStr || s.monthly_override?.note || "",
      "Trạng Thái Đóng Tiền": s.payment_status === "paid" ? "Đã nộp" : (s.is_overdue ? `Nợ ${s.unpaid_months_count} tháng` : "Cần đóng tiền"),
      "Nợ Cũ Tích Lũy": s.previous_debt_amount || 0,
      "Tổng Tiền Cần Thu": s.total_tuition_due || 0,
      "Trạng Thái Học": s.status === "studying" ? "Đang học" : (s.status === "reserved" ? "Bảo lưu" : "Nghỉ học"),
      "Ghi Chú": s.status_note || "",
    };
  });

  // Tạo Worksheet và Workbook
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Căn chỉnh độ rộng các cột tự động
  const colWidths = [
    { wch: 6 },  // STT
    { wch: 14 }, // Mã HV
    { wch: 24 }, // Họ tên
    { wch: 14 }, // SĐT
    { wch: 14 }, // Môn học
    { wch: 16 }, // Level
    { wch: 14 }, // Phụ thu level
    { wch: 18 }, // Giáo viên
    { wch: 30 }, // Lịch học
    { wch: 18 }, // Gói
    { wch: 14 }, // Chiết khấu
    { wch: 22 }, // Lý do giảm
    { wch: 16 }, // Học phí tháng
    { wch: 30 }, // Phát sinh
    { wch: 20 }, // Trạng thái
    { wch: 16 }, // Nợ cũ
    { wch: 18 }, // Tổng cần thu
    { wch: 14 }, // Trạng thái học
    { wch: 25 }, // Ghi chú
  ];
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Tháng ${month}`);

  // Tên file xuất ra: Danh_Sach_Hoc_Vien_Thang_YYYY-MM.xlsx
  const safeSchoolName = schoolName.replace(/[^a-zA-Z0-9]/g, "_");
  const fileName = `Danh_Sach_Hoc_Vien_${safeSchoolName}_${month}.xlsx`;

  XLSX.writeFile(workbook, fileName);
}
