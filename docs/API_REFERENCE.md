# API_REFERENCE.md - DANH MỤC RESTFUL API & ĐẶC TẢ THAM SỐ
> **Dành cho:** `api-db-designer`, `security-auditor`, Main Agent  
> **Quy tắc bắt buộc:** Mỗi khi thêm mới, sửa hoặc xóa API endpoint, subagent BẮT BUỘC phải đọc tài liệu này trước và cập nhật danh mục kèm ví dụ Request/Response.

---

## 1. DANH MỤC CÁC ENDPOINT TOÀN HỆ THỐNG

| Method | Endpoint | Quyền hạn | Mô tả chức năng |
|---|---|---|---|
| `GET/POST` | `/api/settings` | School Admin | Lấy và lưu cài đặt trung tâm (học phí, sĩ số, ngôn ngữ, zalo bot...) |
| `GET/POST` | `/api/students` | School Admin | Danh sách học sinh (kèm công nợ, nợ dồn) và thêm mới học sinh |
| `PUT/DELETE`| `/api/students/[id]` | School Admin | Sửa thông tin hoặc xóa học sinh |
| `PATCH` | `/api/students/[id]` | School Admin | Gỡ học viên khỏi một ca học cụ thể (`action: "remove_slot"`) và đồng bộ lại lịch tuần |
| `POST` | `/api/students/status`| School Admin | Chuyển trạng thái (Bảo lưu, Nghỉ học, Học tiếp) kèm ghi log |
| `POST` | `/api/students/import`| School Admin | Nhập hàng loạt học sinh từ file Excel |
| `POST` | `/api/students/bulk-action`| School Admin | Hành động hàng loạt (xóa nhiều, đổi ca nhiều) |
| `GET` | `/api/status-logs` | School Admin | Lấy lịch sử biến động trạng thái học viên theo tháng |
| `GET/POST` | `/api/packages` | School Admin | Quản lý danh mục gói học phí (tháng, quý, khóa, tuần) |
| `POST` | `/api/payments` | School Admin | Đối soát học phí (đánh dấu Đã đóng / Cần đóng) |
| `POST` | `/api/tuition-override`| School Admin | Ghi đè số tiền học phí riêng cho học sinh trong kỳ |
| `GET/POST` | `/api/makeups` | Admin / Parent | Lấy lịch học bù, gửi báo nghỉ học và xếp lịch học bù |
| `GET` | `/api/classes/occupancy`| Public / Auth | Tính toán sĩ số thời gian thực và kiểm tra ca đầy/đông |
| `GET/POST` | `/api/teachers` | School Admin | Lấy danh sách GV, phân công ca dạy, cấu hình ca riêng |
| `PUT/DELETE`| `/api/teachers/[id]` | School Admin | Sửa thông tin hoặc xóa giáo viên |
| `GET/POST` | `/api/teacher` | Teacher | Đăng nhập giáo viên, xem lịch ca, điểm danh & ghi nhận xét, gửi đơn xin nghỉ dạy |
| `POST` | `/api/parent` | Parent | Đăng nhập phụ huynh theo SĐT, tra cứu học phí, xem sổ theo dõi học tập & bài tập |
| `POST` | `/api/feedbacks/parent`| Parent | Tiếp nhận đánh giá/góp ý từ phụ huynh gửi cơ sở |
| `POST` | `/api/feedbacks/system`| School Admin | Gửi góp ý từ cơ sở đến đội ngũ phát triển TpTeam |
| `POST` | `/api/sepay/webhook` | Webhook | Tiếp nhận biến động số dư SePay, gạch nợ học phí tự động |
| `GET` | `/api/reconciliation/summary`| School Admin | Tổng kết tài chính tháng, đối soát SePay |
| `POST` | `/api/zalo-bot` | School Admin | Gửi tin nhắn tự động qua Zalo Bot Platform |
| `POST` | `/api/admin/auth` | School Admin | Đăng nhập Quản trị viên cơ sở |
| `GET/POST` | `/api/admin/attendance` | School Admin | Điểm danh & Sổ nhận xét bài học hàng ngày toàn trường |
| `GET/POST/DELETE` | `/api/admin/teacher-leaves` | School Admin | Quản lý, phê duyệt đơn xin nghỉ và gán giáo viên dạy thay |
| `GET/POST` | `/api/admin/tuition-reminders` | School Admin | Hàng đợi nhắc học phí Zalo, ghi log nhắc và bắn Zalo Bot |
| `GET/POST/DELETE` | `/api/admin/roles` | School Admin | Quản lý Nhóm Quyền & Vai Trò nhân viên (RBAC) |
| `GET/POST/DELETE` | `/api/admin/staff` | School Admin | Quản lý Tài khoản nhân viên, phân vai trò, khóa/mở khóa |
| `POST` | `/api/admin/change-password`| School Admin | Đổi mật khẩu tài khoản Quản trị cơ sở |
| `GET` | `/api/admin/check-ip`| School Admin | Kiểm tra IP client có nằm trong Whitelist cơ sở |
| `GET/POST` | `/api/system` | Super Admin | Quản trị trường (chỉ localhost), sinh mã tài khoản Admin |
| `POST` | `/api/system/auth` | Super Admin | Đăng nhập Super Admin (chỉ localhost) |
| `POST` | `/api/system/upgrade` | Super Admin | Kích hoạt tự động git pull, build và restart server |
| `GET` | `/api/system/upgrade/status`| Public | Lấy trạng thái cờ bảo trì `.maintenance` |

---

## 2. CẤU TRÚC REQUEST / RESPONSE TIÊU BIỂU

### 2.1. Đăng Nhập Phụ Huynh (`POST /api/parent`)
- **Request Body:**
  ```json
  {
    "phone": "0909123456"
  }
  ```
- **Response Success (200 OK):**
  ```json
  {
    "success": true,
    "students": [
      {
        "id": "stu-1",
        "name": "Nguyễn Văn An",
        "phone": "0909123456",
        "school_name": "Trung Tâm Âm Nhạc Hồng Ân",
        "tuition_amount": 1000000,
        "is_paid": false,
        "makeup_credits": 1,
        "schedule": "Thứ 2, Thứ 4 (18:00 - 19:30)"
      }
    ]
  }
  ```

### 2.2. Kiểm Tra Độ Đầy Sĩ Số (`GET /api/classes/occupancy?date=2026-10-31`)
- **Response Success (200 OK):**
  ```json
  {
    "success": true,
    "slots": [
      {
        "slot_id": "slot-1",
        "slot_name": "Ca Tối 17:00 - 19:00",
        "current_students": 9,
        "max_students": 10,
        "occupancy_rate": 90,
        "is_crowded": true,
        "is_full": false
      },
      {
        "slot_id": "slot-2",
        "slot_name": "Ca Tối 19:00 - 21:00",
        "current_students": 10,
        "max_students": 10,
        "occupancy_rate": 100,
        "is_crowded": true,
        "is_full": true
      }
    ]
  }
  ```

### 2.3. Gỡ Học Viên Khỏi Ca Học (`PATCH /api/students/[id]`)
Dùng cho nút Xóa trên thẻ học viên trong Zoom-in Modal của Sơ đồ lớp. Endpoint chỉ gỡ đúng ca (Thứ + Giờ), **không xóa hồ sơ học viên**; nếu không còn ca nào thì tự động gỡ `class_id` để cập nhật sĩ số lớp.
- **Request Body:**
  ```json
  {
    "action": "remove_slot",
    "day": "Thứ 4",
    "slot_hour": "18:00",
    "start_time": "18:00",
    "end_time": "19:00"
  }
  ```
- **Response Success (200 OK):**
  ```json
  {
    "success": true,
    "message": "Đã gỡ Nguyễn Hoàng Phúc khỏi ca Thứ 4 (18:00 - 19:00).",
    "data": {
      "remaining_sessions": 2,
      "remaining_days": ["Thứ 2", "Thứ 6"],
      "study_time_detail": "Thứ 2: 18:00 - 19:00 | Thứ 6: 18:00 - 19:00",
      "class_id": "cls-123"
    }
  }
  ```
- **Ghi chú:** Nếu không tìm thấy ca tương ứng, trả về `400` với thông báo rõ ràng; nếu ca bị trùng dữ liệu, hệ thống gỡ toàn bộ bản ghi trùng đúng Thứ + giờ bắt đầu.

### 2.4. Học Sinh & Doanh Thu Theo Khoảng Ngày (`GET /api/students?month=2026-11&period_from=2026-11-15&period_to=2026-12-15`)
- `month` vẫn là tháng neo để tính học phí/dự thu/đối soát trạng thái đóng phí (lấy theo tháng của `period_from`).
- `period_from`, `period_to`: khoảng ngày tùy chỉnh (định dạng `YYYY-MM-DD`). Khi có đủ 2 tham số, API trả thêm `period_revenue` — tổng tiền các kỳ thanh toán (`student_payments`) bao phủ **tháng neo** (tháng của `period_from`), khớp với trạng thái đóng phí của danh sách học sinh.
- Chỉ trả `period_revenue` khi tài khoản có quyền `revenue.reports` (hoặc Chủ cơ sở); tài khoản khác nhận `null`.
- **Response bổ sung:**
  ```json
  {
    "success": true,
    "data": {
      "students": [],
      "base_tuition": 1000000,
      "period_revenue": {
        "total": 2500000,
        "paid_students": 3,
        "from": "2026-11-15",
        "to": "2026-12-15"
      }
    }
  }
  ```

### 2.5. Ma Trận Phân Quyền API Tài Chính (RBAC Enforcement)
Tất cả API đều kiểm tra token Admin (`Authorization: Bearer ...` hoặc cookie `admin_session_token`) trước khi trả dữ liệu.
- **`GET /api/students`:** bắt buộc `students.view`; nếu thiếu `tuition.view`, server tự đưa các trường tiền tệ/công nợ về `0`/`null`/`false` (`current_tuition`, `standard_tuition`, `payment_status`, `is_overdue`, `previous_debt_amount`, `total_tuition_due`, `monthly_override`, chiết khấu, `level_surcharge`...). `base_tuition` cũng về `0`.
- **`POST /api/students`:** `students.create`; **`PUT/PATCH /api/students/[id]`:** `students.edit`; **`DELETE /api/students/[id]`:** `students.delete`.
- **`GET /api/payments`:** `tuition.view`; **`POST /api/payments`** (Đã đóng / Chưa đóng): `tuition.audit`.
- **`POST /api/tuition-override`:** `tuition.override`.
- **`GET /api/admin/tuition-reminders`:** `tuition.view` hoặc `tuition.remind`; **`POST`** (gửi nhắc): `tuition.remind`.
- **`GET /api/reconciliation/summary`:** `revenue.reports`.
- **`POST /api/ai/chat` action `chat`:** bắt buộc đăng nhập Admin; context AI chỉ chứa doanh thu khi có `revenue.reports` và danh sách nợ khi có `tuition.view`; thiếu quyền thì AI từ chối trả lời số liệu.
- **`GET /api/settings`:** bắt buộc đăng nhập; `zalo_bot_token`, `zalo_access_token`, `zalo_oa_secret_key`, `zalo_admin_chat_id`, `sepay_api_key` chỉ trả khi có `settings.manage`; `base_tuition`, giá gói và phụ thu level chỉ trả khi có `tuition.view` hoặc `settings.manage`.
- **`POST /api/settings`:** chỉ nhân viên có `settings.manage` được đổi cấu hình; riêng `app_language` / `month_format` cho phép mọi nhân viên đã đăng nhập tự đổi ngôn ngữ.
- **`GET/POST /api/packages`:** yêu cầu `settings.manage` (quản lý giá gói học phí).
- **`GET /api/teacher`:** tự loại bỏ `level_surcharge`, `is_discount_enabled`, `discount_percent`, `discount_reason`, `tuition_package_id` và `surcharge_amount` khỏi dữ liệu gửi Cổng Giáo Viên.
- Quyền `*` hoặc `is_owner = 1` (Chủ cơ sở) được bỏ qua mọi kiểm tra trên.

---

## 3. NHẬT KÝ CẬP NHẬT API (API CHANGELOG)

| Ngày | Endpoint | Hành động | Ghi chú |
|---|---|---|---|
| 2026-10-29 | `/api/classes/occupancy` | Chuẩn hóa | Hỗ trợ trả về `is_crowded` ($\ge 80\%$) và `is_full` ($100\%$) |
| 2026-10-29 | `/api/sepay/webhook` | Hoàn thiện | Tự nhận diện cú pháp mã học sinh và số điện thoại |
| 2026-11-09 | `/api/admin/tuition-reminders` | Thêm mới | Lấy trạng thái nhắc phí và xử lý gửi Zalo manual / Bot |
| 2026-11-09 | `/api/zalo-bot` | Nâng cấp | Thêm action `get_updates` và `test_admin_message` phục vụ thông báo Zalo cho Admin |
| 2026-11-12 | `/api/students/[id]` | Thêm mới | Bổ sung `PATCH` với `action: "remove_slot"`: gỡ học viên khỏi đúng Thứ + Giờ, đồng bộ `schedule_details_json`, `registered_days`, `study_time_detail`, `sessions_per_week`, `hours_per_week`; tự gỡ `class_id` khi không còn ca học |
| 2026-11-13 | `/api/students` | Nâng cấp | `GET` nhận thêm `period_from` / `period_to`; trả `period_revenue` (tổng tiền các kỳ thanh toán bao phủ tháng neo của ngày bắt đầu, số học sinh đã đóng) cho tài khoản có quyền `revenue.reports` |
| 2026-11-13 | `/api/students`, `/api/students/[id]`, `/api/payments`, `/api/tuition-override`, `/api/admin/tuition-reminders`, `/api/ai/chat` | Siết bảo mật | Bắt buộc đăng nhập và kiểm tra đúng quyền `students.view/create/edit/delete`, `tuition.view/audit/override/remind`, `revenue.reports`; server tự ẩn dữ liệu tài chính nếu thiếu `tuition.view`; AI không nạp số liệu doanh thu/công nợ khi thiếu quyền |
