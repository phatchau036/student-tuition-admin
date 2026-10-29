# STATE_TRACKER_RESTORE.md - QUẢN LÝ BIẾN ĐỘNG TRẠNG THÁI & KHÔI PHỤC HỒ SƠ
> **Dành cho:** `bug-investigator`, `scope-planner`, `api-db-designer`, Main Agent  
> **Quy tắc bắt buộc:** File này mô tả cơ chế theo dõi lịch sử biến động trạng thái học viên (Đang học, Bảo lưu, Nghỉ học, Học tiếp) và khôi phục hồ sơ khi có sự cố. Cập nhật nhật ký ở cuối file.

---

## 1. MỤC ĐÍCH & Ý NGHĨA NGHIỆP VỤ

Trong một trung tâm đào tạo, học sinh không chỉ đơn thuần là "có học" hay "không học", mà liên tục có sự biến động phức tạp:
1. **Bảo lưu (Reserved):** Học sinh tạm nghỉ ôn thi, đi du lịch, bệnh tật và có ngày hẹn quay lại.
2. **Nghỉ học (Dropped):** Học sinh kết thúc chương trình hoặc dừng học hẳn.
3. **Học tiếp (Resumed):** Học sinh sau thời gian bảo lưu quay trở lại trung tâm.

Nếu chỉ thay đổi trường `status` trên bảng `students`, trung tâm sẽ mất hoàn toàn lịch sử: *Học sinh này bảo lưu từ bao giờ? Tại sao bảo lưu? Đã từng nghỉ mấy lần?* Do đó, hệ thống triển khai cơ chế **State Tracker & Audit Log** lưu vết toàn diện.

---

## 2. CƠ CHẾ GHI LOG BIẾN ĐỘNG (`student_status_logs`)

Mỗi khi Quản trị viên thay đổi trạng thái của một học sinh qua `ChangeStatusModal`:
1. Bảng `students` cập nhật:
   - `status`: `'studying' | 'reserved' | 'dropped'`
   - `status_date`: Ngày bắt đầu có hiệu lực trạng thái mới.
   - `expected_return_date`: Ngày dự kiến quay lại học (nếu bảo lưu).
   - `status_note`: Lý do ghi nhận.
2. Bảng `student_status_logs` tạo một bản ghi mới ghi nhận:
   - `action_type`: `'reserve'` (Bảo lưu), `'drop'` (Nghỉ học), `'resume'` (Trở lại học).
   - `from_status` $\rightarrow$ `to_status`.
   - `effective_date`, `return_date`, `reason`.
   - `month`: Tháng biến động (`YYYY-MM`).
   - `logged_at`: Thời gian chính xác đến từng giây.

---

## 3. MÀN HÌNH NHẬT KÝ BIẾN ĐỘNG (`StatusLogModal.tsx`)
- Hiển thị trên thanh điều hướng đầu trang quản trị bằng nút **"Log Biến Động"**.
- Cung cấp số liệu thống kê tổng quát:
  - Tổng số học sinh bảo lưu trong tháng.
  - Tổng số học sinh nghỉ học trong tháng.
  - Tổng số học sinh quay trở lại học tiếp.
- Hỗ trợ bộ lọc theo loại biến động và xem lịch sử theo từng tháng hoặc toàn bộ thời gian.

---

## 4. QUY TRÌNH KHÔI PHỤC HỒ SƠ & TRẠNG THÁI (ROLLBACK & RESTORE)

Nếu nhân viên bấm nhầm trạng thái "Nghỉ học" cho học sinh:
- **Bước 1:** Mở chi tiết học sinh (`StudentDetailModal`) hoặc bấm vào nút trạng thái.
- **Bước 2:** Chọn hành động **"Học Tiếp" (Resume)**.
- **Bước 3:** Nhập ngày học sinh tiếp tục và lý do "Khôi phục do nhầm lẫn".
- **Hệ quả:** Học sinh lập tức quay lại danh sách "Đang học", hiển thị đầy đủ ca học và học phí kỳ hiện tại mà không mất dữ liệu lịch sử trước đó.

---

## 5. NHẬT KÝ TRẠNG THÁI (STATUS TRACKER LOG)

| Ngày | Module | Trạng thái hoạt động | Ghi chú |
|---|---|---|---|
| 2026-10-29 | State Tracker Engine | Hoạt động chính xác 100% | Tích hợp trong v2.6.0 |
