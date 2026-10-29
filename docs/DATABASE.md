# DATABASE.md - SCHEMA VÀ QUẢN TRỊ CƠ SỞ DỮ LIỆU SQLITE
> **Dành cho:** `api-db-designer`, `perf-optimizer`, Main Agent  
> **Quy tắc bắt buộc:** Khi chỉnh sửa, thêm bảng hoặc thêm cột mới, subagent BẮT BUỘC phải đọc tài liệu này trước, viết code migration vào `src/lib/db.ts` theo đúng cú pháp quy định, và cập nhật lại file này kèm nhật ký thay đổi.

---

## 1. TỔNG QUAN HỆ CƠ SỞ DỮ LIỆU
- **Công nghệ lưu trữ:** SQLite nhúng thông qua driver `@libsql/client`.
- **Vị trí file dữ liệu:** `data/admin.db` (được bảo vệ bởi `.gitignore`, cấm commit lên Git).
- **Phương thức Migration:** In-Code Dynamic Migration bên trong hàm `initDb()` tại `src/lib/db.ts`.

---

## 2. SƠ ĐỒ THỰC THỂ & MỐI QUAN HỆ (DATA RELATIONSHIPS)

```text
schools (Cơ sở / Trường học)
   ├── school_admins (1-N)
   ├── teachers (1-N)
   ├── time_slots (1-N)
   ├── level_surcharges (1-N)
   ├── discount_presets (1-N)
   ├── tuition_packages (1-N)
   ├── subjects (1-N)
   └── students (1-N)
         ├── makeup_classes (1-N: Lịch báo nghỉ & học bù)
         ├── student_payments (1-N: Lịch sử đóng phí & kỳ chu kỳ)
         ├── student_status_logs (1-N: Nhật ký bảo lưu / nghỉ / học lại)
         └── student_monthly_tuitions (1-N: Override học phí tùy biến)
```

---

## 3. ĐẶC TẢ CHI TIẾT CÁC BẢNG (TABLE SCHEMAS)

### 3.1. Bảng `schools` (Danh sách cơ sở đào tạo / trường học)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | ID định danh cơ sở (VD: `school-default`, UUID) |
| `name` | TEXT | NOT NULL | Tên trường / trung tâm (VD: "Hồng Ân") |
| `code` | TEXT | NOT NULL UNIQUE | Mã trường (VD: "TT-HA", "TT-01") |
| `school_type`| TEXT | DEFAULT 'TT' | Loại cơ sở: `TT` (Trung tâm) hoặc `TH` (Trường học) |
| `street` | TEXT | DEFAULT '' | Tên đường (VD: "Hiền Vương") |
| `city` | TEXT | DEFAULT 'TPHCM'| Tỉnh/Thành phố |
| `branch_num` | TEXT | DEFAULT '1' | Số chi nhánh (VD: '1', '2') |
| `address` | TEXT | NULLABLE | Địa chỉ chi tiết |
| `phone` | TEXT | NULLABLE | Số điện thoại hotline |
| `ip_restriction_enabled` | INTEGER | DEFAULT 0 | 0: Không giới hạn, 1: Bật khóa IP Whitelist |
| `allowed_ips`| TEXT | DEFAULT '' | Danh sách IP cho phép, phân tách bằng dấu phẩy |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Thời gian tạo |

### 3.2. Bảng `school_admins` (Tài khoản quản trị viên cơ sở)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | ID định danh tài khoản |
| `school_id` | TEXT | NOT NULL | Khóa ngoại trỏ đến `schools.id` |
| `username` | TEXT | NOT NULL UNIQUE | Tên đăng nhập (chuẩn hóa `TT-HA-HV-TPHCM-CN1-QTV1`) |
| `password` | TEXT | NOT NULL | Mật khẩu tài khoản (10 ký tự mạnh ngẫu nhiên) |
| `full_name` | TEXT | NOT NULL | Họ và tên người quản trị |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Thời gian tạo |

### 3.3. Bảng `settings` (Cấu hình hệ thống Key-Value)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `key` | TEXT | PRIMARY KEY | Tên cấu hình (VD: `base_tuition`, `duration_mode`, `capacity_mode`...) |
| `value` | TEXT | NOT NULL | Giá trị cấu hình |

*Các key cấu hình mặc định:*
- `base_tuition`: Mức học phí tiêu chuẩn (mặc định: `1000000`).
- `duration_mode`: `by_hours` (theo tiếng) hoặc `by_sessions` (theo buổi).
- `default_hours_per_week`: Số tiếng chuẩn (mặc định: `3`).
- `default_sessions_per_week`: Số buổi chuẩn (mặc định: `3`).
- `default_study_time`: Giờ học mặc định (mặc định: `18:00 - 19:00`).
- `max_students_per_slot`: Sĩ số tối đa mặc định 1 ca (mặc định: `10`).
- `crowded_threshold_percent`: Ngưỡng cảnh báo lớp đông (mặc định: `80`%).
- `capacity_mode`: Chế độ tính sĩ số (`by_slot` hoặc `by_teacher`).
- `schedule_presets`: JSON danh sách các Kiểu Lịch Học mẫu cơ sở (`SchedulePreset[]`), gồm tên kiểu, các ngày thứ trong tuần và số tiếng/buổi để tự tính ma trận thời lượng.
- `app_language`: Ngôn ngữ hiển thị (`vi`, `en`, `zh`, `ja`).
- `reconciliation_mode`: Chế độ đối soát (`manual` hoặc `auto`).
- `sepay_prefix`: Tiền tố gạch nợ ngân hàng (mặc định: `HP`).

### 3.4. Bảng `teachers` (Hồ sơ giáo viên & Phân ca dạy)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | ID định danh giáo viên |
| `school_id` | TEXT | DEFAULT 'school-default' | Cơ sở giảng dạy |
| `name` | TEXT | NOT NULL | Họ tên giáo viên |
| `phone` | TEXT | NOT NULL | Số điện thoại (dùng đăng nhập Cổng Giáo Viên) |
| `email` | TEXT | NULLABLE | Email liên lạc |
| `color` | TEXT | DEFAULT 'indigo'| Màu huy hiệu nhận diện |
| `specialty` | TEXT | NULLABLE | Môn dạy / Chuyên môn chính |
| `assigned_slot_ids`| TEXT | DEFAULT '[]' | JSON mảng ID các ca dạy phân công |
| `working_shifts_json`| TEXT | DEFAULT '[]' | JSON ca làm việc linh hoạt `TeacherShift[]` |
| `max_students`| INTEGER | DEFAULT 10 | Sĩ số tối đa 1 ca của giáo viên |
| `zalo_link` | TEXT | NULLABLE | Link chat Zalo cá nhân |
| `zalo_chat_id`| TEXT | NULLABLE | ID người nhận tin nhắn từ Zalo Bot |
| `is_active` | INTEGER | DEFAULT 1 | 1: Đang dạy, 0: Tạm nghỉ |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Ngày tạo |

### 3.5. Bảng `time_slots` (Khung giờ mở cửa & Ca học)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | ID ca học |
| `school_id` | TEXT | DEFAULT 'school-default' | Cơ sở áp dụng |
| `name` | TEXT | NOT NULL | Tên ca (VD: "Ca Tối Thứ 2 - Thứ 7") |
| `from_day` | TEXT | DEFAULT 'Thứ 2'| Từ thứ mấy |
| `to_day` | TEXT | DEFAULT 'Thứ 7'| Đến thứ mấy |
| `days` | TEXT | NOT NULL | Chuỗi ngày mở cửa (VD: "Thứ 2 – Thứ 7") |
| `start_time` | TEXT | NOT NULL | Giờ bắt đầu (VD: "17:00") |
| `end_time` | TEXT | NOT NULL | Giờ kết thúc (VD: "20:00") |
| `max_students`| INTEGER | DEFAULT 10 | Sức chứa tối đa phòng học trong ca |
| `is_active` | INTEGER | DEFAULT 1 | 1: Mở ca, 0: Đóng |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Ngày tạo |

### 3.6. Bảng `subjects` (Danh mục bộ môn / chương trình đào tạo)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | ID bộ môn |
| `school_id` | TEXT | DEFAULT 'school-default' | Cơ sở đào tạo |
| `name` | TEXT | NOT NULL | Tên môn (Piano, Guitar, IELTS, Vẽ, Toán...) |
| `description`| TEXT | DEFAULT '' | Mô tả môn học |
| `color` | TEXT | DEFAULT 'indigo'| Màu đại diện môn học |
| `is_active` | INTEGER | DEFAULT 1 | Trạng thái môn |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Ngày tạo |

### 3.7. Bảng `level_surcharges` & `discount_presets`
- **`level_surcharges`**: Cấu hình phụ thu theo Level (`id`, `school_id`, `level_name`, `surcharge_amount`, `sort_order`).
- **`discount_presets`**: Cấu hình mức giảm giá cài sẵn (`id`, `school_id`, `percentage`, `label`).

### 3.8. Bảng `students` (Hồ sơ học viên trung tâm)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | ID học sinh |
| `school_id` | TEXT | DEFAULT 'school-default' | Cơ sở học viên trực thuộc |
| `student_code`| TEXT | NULLABLE | Mã học sinh (dùng gạch nợ SePay, VD: `HS01`) |
| `name` | TEXT | NOT NULL | Họ và tên học sinh |
| `phone` | TEXT | NOT NULL | Số điện thoại phụ huynh (dùng tra cứu) |
| `zalo_link` | TEXT | NULLABLE | Link chat Zalo |
| `zalo_chat_id`| TEXT | NULLABLE | Chat ID Zalo Bot gửi thông báo tự động |
| `start_date` | TEXT | NULLABLE | Ngày bắt đầu vào học |
| `status` | TEXT | DEFAULT 'studying'| Trạng thái: `studying`, `reserved`, `dropped` |
| `status_date`| TEXT | NULLABLE | Ngày bắt đầu có hiệu lực trạng thái |
| `expected_return_date`| TEXT | NULLABLE | Ngày dự kiến quay lại học (nếu bảo lưu) |
| `status_note`| TEXT | DEFAULT '' | Lý do đổi trạng thái |
| `tuition_package_id`| TEXT | NULLABLE | Khóa ngoại trỏ đến `tuition_packages.id` |
| `level_id` | TEXT | NOT NULL | Cấp độ học viên |
| `subject_id` | TEXT | NULLABLE | Khóa ngoại trỏ đến `subjects.id` |
| `time_slot_id`| TEXT | NOT NULL | Khóa ngoại trỏ đến `time_slots.id` |
| `teacher_id` | TEXT | NULLABLE | Giáo viên phụ trách chính |
| `duration_mode`| TEXT | DEFAULT 'by_hours'| Hình thức học (`by_hours` / `by_sessions`) |
| `sessions_per_week`| INTEGER| DEFAULT 3 | Số buổi học mỗi tuần |
| `hours_per_week`| REAL | DEFAULT 3 | Tổng số tiếng học mỗi tuần |
| `registered_days`| TEXT | DEFAULT 'Thứ 2, Thứ 4, Thứ 6'| Các ngày học cố định |
| `study_time_detail`| TEXT | DEFAULT '18:00 - 19:00'| Khung giờ học chi tiết |
| `schedule_details_json`| TEXT| DEFAULT '[]' | JSON danh sách ca học chi tiết `ScheduleItem[]` |
| `is_discount_enabled`| INTEGER| DEFAULT 0 | 1: Có áp dụng giảm giá, 0: Không |
| `discount_percent`| REAL | DEFAULT 0 | Tỷ lệ giảm giá (%) |
| `discount_reason`| TEXT | DEFAULT '' | Lý do được giảm giá (anh em, học bổng...) |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Ngày tạo |

### 3.9. Bảng `tuition_packages` (Danh mục gói học phí theo chu kỳ)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | ID gói học phí |
| `school_id` | TEXT | DEFAULT 'school-default' | Cơ sở áp dụng |
| `name` | TEXT | NOT NULL | Tên gói (VD: "Theo tháng", "Khóa 6 tháng", "24 tuần") |
| `amount` | INTEGER | NOT NULL DEFAULT 1000000 | Số tiền thực thu của gói |
| `original_amount`| INTEGER| DEFAULT 1000000 | Giá gốc trước ưu đãi |
| `cycle_unit` | TEXT | NOT NULL DEFAULT 'month' | Đơn vị chu kỳ: `month` hoặc `week` |
| `cycle_value`| INTEGER | NOT NULL DEFAULT 1 | Số lượng chu kỳ (1, 3, 6, 12, 24...) |
| `discount_type`| TEXT | DEFAULT 'none' | `none`, `percent` hoặc `amount` |
| `discount_value`| INTEGER| DEFAULT 0 | Giá trị chiết khấu |
| `benefits` | TEXT | DEFAULT '' | Quà tặng / quyền lợi kèm theo gói |
| `is_active` | INTEGER | DEFAULT 1 | 1: Đang mở bán, 0: Tạm tắt |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Ngày tạo |

### 3.10. Bảng `student_payments` (Lịch sử thanh toán & Chu kỳ công nợ)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | ID giao dịch thu phí |
| `student_id` | TEXT | NOT NULL | ID học sinh |
| `package_id` | TEXT | NULLABLE | ID gói học phí đã áp dụng |
| `package_name`| TEXT | NULLABLE | Tên gói tại thời điểm thanh toán |
| `amount` | INTEGER | NOT NULL | Số tiền thanh toán (VNĐ) |
| `paid_date` | TEXT | NOT NULL | Ngày nộp tiền (`YYYY-MM-DD`) |
| `start_period`| TEXT | NOT NULL | Tháng bắt đầu chu kỳ (`YYYY-MM`) |
| `end_period` | TEXT | NOT NULL | Tháng kết thúc chu kỳ (`YYYY-MM`) |
| `status` | TEXT | DEFAULT 'paid' | Trạng thái: `paid` (đã đóng) hoặc `unpaid` |
| `note` | TEXT | NULLABLE | Ghi chú thanh toán |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Ngày tạo |

### 3.11. Bảng `makeup_classes` (Quản lý báo nghỉ và học bù)
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | TEXT | PRIMARY KEY | ID phiếu học bù |
| `student_id` | TEXT | NOT NULL | ID học sinh báo nghỉ |
| `absence_date`| TEXT | NOT NULL | Ngày học sinh vắng mặt |
| `absence_reason`| TEXT | NULLABLE | Lý do vắng mặt |
| `status` | TEXT | DEFAULT 'pending' | `pending` (chưa xếp bù), `completed` (đã bù) |
| `makeup_date`| TEXT | NULLABLE | Ngày được xếp học bù |
| `makeup_time`| TEXT | NULLABLE | Giờ học bù |
| `makeup_slot_id`| TEXT | NULLABLE | Ca học được xếp bù |
| `makeup_teacher_id`| TEXT | NULLABLE | Giáo viên phụ trách ca bù |
| `note` | TEXT | NULLABLE | Ghi chú |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Ngày tạo |

### 3.12. Bảng `student_status_logs` (Nhật ký biến động trạng thái học sinh)
- `id`, `student_id`, `action_type` (`reserve` | `drop` | `resume`), `from_status`, `to_status`, `effective_date`, `return_date`, `reason`, `month` (`YYYY-MM`), `logged_at`.

### 3.13. Bảng `sepay_transactions` (Lịch sử giao dịch ngân hàng tự động)
- `id`, `gateway`, `transaction_date`, `account_number`, `code`, `content`, `transfer_type`, `transfer_amount`, `reference_code`, `student_id`, `student_name`, `matched_period`, `status` (`matched` | `unmatched` | `ignored`), `raw_payload`.

### 3.14. Bảng `parent_feedbacks` & `system_feedbacks`
- **`parent_feedbacks`**: Góp ý từ phụ huynh gửi cơ sở (`school_id`, `student_name`, `parent_name`, `category`, `rating`, `content`, `status`, `response_note`).
- **`system_feedbacks`**: Góp ý từ cơ sở gửi đội ngũ TpTeam (`school_id`, `category`, `priority`, `title`, `content`, `status`, `admin_reply`).

---

## 4. QUY TẮC VIẾT MIGRATION MỚI TRONG `src/lib/db.ts`

Mọi thay đổi database bắt buộc phải tuân theo 2 quy tắc sau:

1. **Thêm Bảng Mới:**
   ```typescript
   await db.execute(`
     CREATE TABLE IF NOT EXISTS new_table_name (
       id TEXT PRIMARY KEY,
       school_id TEXT DEFAULT 'school-default',
       -- các cột dữ liệu
       created_at DATETIME DEFAULT CURRENT_TIMESTAMP
     );
   `);
   ```
2. **Thêm Cột Mới Vào Bảng Đã Có:**
   ```typescript
   // Luôn đặt ở khối try/catch cuối hàm initDb()
   try { 
     await db.execute("ALTER TABLE table_name ADD COLUMN new_column_name TYPE DEFAULT default_value"); 
   } catch {}
   ```

---

## 5. NHẬT KÝ THAY ĐỔI SCHEMA (SCHEMA CHANGELOG)

| Phiên bản | Ngày cập nhật | Thay đổi Schema |
|---|---|---|
| v2.3.0 | 2026-10-24 | Khởi tạo các bảng `schools`, `teachers`, `time_slots`, `students`, `settings`, `makeup_classes` |
| v2.4.0 | 2026-10-25 | Bổ sung `sepay_transactions`, `tuition_packages`, `student_payments`, `parent_feedbacks`, `system_feedbacks` |
| v2.5.0 | 2026-10-26 | Bổ sung `student_status_logs`, thêm `working_shifts_json` vào `teachers`, `ip_restriction_enabled` vào `schools` |
| v2.6.0 | 2026-10-29 | Bổ sung `subjects`, hoàn thiện `schedule_details_json` và tối ưu `initDb()` |
| v2.7.0 | 2026-10-29 | ⭐ **VÍ GIỜ HỌC (Hour Wallet):** Bổ sung 4 bảng `student_plans` (thứ học + phút/buổi), `billing_cycles` (chu kỳ cấp giờ UNIQUE theo tháng), `hour_ledger` (sổ cái — nguồn sự thật số dư, idempotent theo ref_type+ref_id), `lessons` (buổi học thực tế, UNIQUE theo student+date+time). Settings mới: `default_minutes_per_session` (90), `deduct_unexcused` (true), `min_chunk_minutes` (30), `carry_over_expire_days` (rỗng) |

### 5.1. Chi tiết hệ thống Ví Giờ Học (v2.7.0)

**Nguyên tắc:** Số dư = `SUM(minutes)` từ `hour_ledger`. Mọi thay đổi = 1 dòng sổ cái mới (GRANT +, CONSUME −, ADJUST ±, EXPIRE −). Không bao giờ UPDATE số dư trực tiếp. Mọi ghi sổ idempotent theo cặp `ref_type + ref_id` (UNIQUE index).

**Công thức cấp giờ:** `calcCycleGrant(start, endExclusive, weekdays, minutesPerSession, closedDates)` — tuần đủ × số buổi + ngày lẻ trùng thứ học − ngày nghỉ lễ. Unit test: `node scripts/test-hour-wallet.js` (10/10 PASS).

**Điểm hook cấp giờ:** `POST /api/payments` (action `mark_paid`, `set_months_status`) + SePay webhook → gọi `grantHoursForPeriod` cho từng tháng trong khoảng đã đóng.

**API mới:** `/api/wallet` — `preview_cycle`, `grant_cycle`, `mark_attendance`, `report_absence` (không trừ giờ), `schedule_makeup` (trừ số dư khả dụng, check sĩ số + trùng giờ + bội 30 phút), `cancel_makeup` (không hoàn giờ), `adjust_hours`, `report_unexcused` (trừ giờ theo config), `get_wallet` (sổ cái phân trang).

**Migration:** `node scripts/migrate-hour-wallet.js --dry-run` (xem trước) → bỏ `--dry-run` để thực thi. Idempotent chạy lại an toàn. Chuyển suất bù cũ → ADJUST, lịch bù cũ → lessons.
