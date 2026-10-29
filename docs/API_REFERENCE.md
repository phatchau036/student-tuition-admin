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
| `POST` | `/api/teacher` | Teacher | Đăng nhập giáo viên theo SĐT, nâng Level học sinh |
| `POST` | `/api/parent` | Parent | Đăng nhập phụ huynh theo SĐT, lấy danh sách con và học phí |
| `POST` | `/api/feedbacks/parent`| Parent | Tiếp nhận đánh giá/góp ý từ phụ huynh gửi cơ sở |
| `POST` | `/api/feedbacks/system`| School Admin | Gửi góp ý từ cơ sở đến đội ngũ phát triển TpTeam |
| `POST` | `/api/sepay/webhook` | Webhook | Tiếp nhận biến động số dư SePay, gạch nợ học phí tự động |
| `GET` | `/api/reconciliation/summary`| School Admin | Tổng kết tài chính tháng, đối soát SePay |
| `POST` | `/api/zalo-bot` | School Admin | Gửi tin nhắn tự động qua Zalo Bot Platform |
| `POST` | `/api/admin/auth` | School Admin | Đăng nhập Quản trị viên cơ sở |
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

---

## 3. NHẬT KÝ CẬP NHẬT API (API CHANGELOG)

| Ngày | Endpoint | Hành động | Ghi chú |
|---|---|---|---|
| 2026-10-29 | `/api/classes/occupancy` | Chuẩn hóa | Hỗ trợ trả về `is_crowded` ($\ge 80\%$) và `is_full` ($100\%$) |
| 2026-10-29 | `/api/sepay/webhook` | Hoàn thiện | Tự nhận diện cú pháp mã học sinh và số điện thoại |
