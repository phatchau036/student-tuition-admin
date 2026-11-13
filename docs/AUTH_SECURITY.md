# AUTH_SECURITY.md - KIẾN TRÚC XÁC THỰC & BẢO MẬT HỆ THỐNG
> **Dành cho:** `security-auditor`, Main Agent  
> **Quy tắc bắt buộc:** Mỗi khi sửa đổi cơ chế đăng nhập, xử lý session/token, hoặc thay đổi quyền truy cập các API endpoints, subagent BẮT BUỘC phải đọc tài liệu này trước và kiểm tra các lỗ hổng tiềm ẩn. Cập nhật nhật ký kiểm toán ở cuối file.

---

## 1. MÔ HÌNH XÁC THỰC 4 PHÂN HỆ (MULTI-PORTAL AUTH MATRIX)

Hệ thống áp dụng cơ chế xác thực riêng biệt cho từng phân hệ nhằm tối ưu hóa giữa tính an toàn cao và sự tiện lợi cho người dùng:

| Phân hệ | Đường dẫn | Đối tượng | Cơ chế xác thực | Mức độ bảo vệ |
|---|---|---|---|---|
| **Super Admin** | `/he-thong` | Chủ hệ thống | `Localhost Guard` (127.0.0.1) + User/Pass từ `.env` | **Tuyệt mật** (Phản hồi 404 từ ngoài mạng) |
| **School Admin**| `/admin` | Quản trị cơ sở | Username + Password theo trường + `IP Whitelist` | **Rất cao** (Báo lỗi 403 nếu ngoài IP văn phòng) |
| **Teacher Portal**| `/giao-vien` | Giáo viên | Số điện thoại đăng ký (Passwordless) | **Trung bình - Tiện lợi** (Mobile Web) |
| **Parent Portal** | `/` hoặc `/phu-huynh` | Phụ huynh | Số điện thoại học sinh (Passwordless) | **Công khai có kiểm soát** (Tra cứu cá nhân) |

---

## 2. CHI TIẾT CÁC LỚP BẢO VỆ (SECURITY LAYERS)

### 2.1. Localhost Cloaking Guard (`/he-thong` & `/api/system/*`)
- **Nguyên lý bảo vệ:**
  - Hàm `isLocalhost(req)` trong `src/lib/ipHelper.ts` kiểm tra cả header `Host` và địa chỉ IP thực tế của client (`x-forwarded-for`, `x-real-ip`).
  - Nếu request không đến từ `127.0.0.1` hoặc `::1`, server **ngụy trang phản hồi mã lỗi `404 Not Found - Trang web không tồn tại`**.
  - Hacker quét cổng hoặc người dùng mạng ngoài sẽ hoàn toàn không biết sự tồn tại của phân hệ Super Admin.
- **Xác thực phiên:**
  - So khớp `SYSTEM_ADMIN_USER` và `SYSTEM_ADMIN_PASSWORD` từ tệp `.env`.
  - Cấp token phiên `system_admin_token` lưu trong HttpOnly cookie hoặc session storage.

### 2.2. IP Restriction Whitelist Guard (`/admin` & `/api/admin/*`)
- **Cấu hình theo từng cơ sở:**
  - Bảng `schools` lưu `ip_restriction_enabled` (0 hoặc 1) và `allowed_ips` (danh sách IP cách nhau bởi dấu phẩy, chấm phẩy hoặc xuống dòng).
- **Kiểm tra truy cập (`/api/admin/check-ip`):**
  - Hàm `isIpAllowed(clientIp, allowedIpsStr)` chuẩn hóa IPv4/IPv6 để so khớp.
  - Khi bật tính năng này, quản trị viên chỉ có thể mở `/admin` khi máy tính kết nối vào mạng Wi-Fi/IP tĩnh đã được Chủ hệ thống phê duyệt.
  - Nếu IP không hợp lệ, hệ thống hiển thị trang cảnh báo `403 Forbidden` và chặn không cho mở màn hình đăng nhập.

### 2.3. Quản Trị Viên Cơ Sở (School Admin Auth)
- **Quy tắc sinh tài khoản chuẩn hóa:**
  - `credentialGen.ts` tự động sinh username theo cấu trúc: `TT-[Tên]-[Đường]-[Tỉnh]-[ChiNhánh]-QTVn`.
  - Mật khẩu mặc định gồm 10 ký tự kết hợp chữ hoa, chữ thường, chữ số và ký tự đặc biệt ngẫu nhiên.
- **Phiên làm việc (Session Management):**
  - Token phiên định dạng Base64: `school_admin:[adminId]:[schoolId]:[timestamp]`.
  - Hàm `getSchoolIdFromRequest()` (`src/lib/authHelper.ts`) tự động trích xuất ngữ cảnh `schoolId` từ:
    1. Header `x-school-id`.
    2. Header `Authorization: Bearer <token>`.
    3. Cookie `admin_session_token`.
    4. Query parameter `school_id`.
  - Đảm bảo dữ liệu giữa các trường học/cơ sở không bao giờ bị lẫn lộn (Data Isolation).

### 2.4. Xác Thực Passwordless Cho Giáo Viên & Phụ Huynh
- **Cổng Giáo Viên (`/api/teacher`):**
  - Tiếp nhận Số điện thoại qua POST request.
  - Kiểm tra số điện thoại có trong bảng `teachers` với `is_active = 1` hay không.
  - Trả về danh sách lớp học và danh sách học sinh phụ trách của giáo viên đó.
- **Cổng Phụ Huynh (`/api/parent`):**
  - Tiếp nhận Số điện thoại học sinh đăng ký với trung tâm.
  - Kiểm tra bảng `students`. Nếu có nhiều học sinh trùng SĐT (anh em ruột cùng học trung tâm), hệ thống trả về danh sách các con để phụ huynh chọn hồ sơ cần tra cứu.
  - Phiên làm việc được ghi nhớ tại `localStorage` phía client để không phải nhập lại mỗi lần truy cập.

---

## 3. PHÒNG CHỐNG CÁC LỖ HỔNG BẢO MẬT PHỔ BIẾN

1. **SQL Injection (SQLi):**
   - **Tuyệt đối không dùng cộng chuỗi** (`sql = "SELECT * FROM students WHERE id = '" + id + "'"`).
   - **Bắt buộc dùng Parameterized Query** với driver `@libsql/client`:
     ```typescript
     await db.execute({
       sql: "SELECT * FROM students WHERE id = ? AND school_id = ?",
       args: [studentId, schoolId],
     });
     ```
2. **Cross-Site Scripting (XSS):**
   - React 19 tự động escape toàn bộ biến khi render trong JSX.
   - Không sử dụng `dangerouslySetInnerHTML` với dữ liệu nhập từ người dùng.
3. **Cross-Origin Resource Sharing (CORS) & Webhook Security:**
   - Webhook SePay (`/api/sepay/webhook`): Có hỗ trợ xác thực `API Key` / Secret token từ cấu hình hệ thống `sepay_api_key`.
   - Zalo Bot Webhook (`/api/zalo-bot`): Kiểm tra token Zalo hợp lệ.

---

## 4. NHẬT KÝ KIỂM TOÁN BẢO MẬT (SECURITY AUDIT LOG)

| Ngày kiểm toán | Subagent / Kiểm toán viên | Hạng mục kiểm tra | Kết quả & Biện pháp xử lý |
|---|---|---|---|
| 2026-10-29 | `security-auditor` / Main | Kiểm toán Localhost Guard tại `/he-thong` | Đạt - Ngụy trang 404 chuẩn xác |
| 2026-10-29 | `security-auditor` / Main | Kiểm toán SQL Injection trong `db.ts` & API routes | Đạt - 100% truy vấn dùng parameterized `args` |
| 2026-10-29 | `security-auditor` / Main | Kiểm toán IP Whitelist cho cơ sở tại `/admin` | Đạt - Kiểm tra `x-forwarded-for` và `x-real-ip` đầy đủ |
| 2026-11-08 | `security-auditor` / Main | Triển khai Hệ thống Phân quyền theo vai trò (RBAC) cho `/admin` | Hoàn thành - Tạo `admin_roles`, mở rộng `school_admins` (role_id, phone, is_active, is_owner), modal quản lý nhân viên và kiểm soát ẩn/hiện chức năng theo quyền |
| 2026-11-11 | `security-auditor` / Main | Khắc phục triệt để lỗi leo thang đặc quyền nhân viên (RBAC Enforcement) | Hoàn thành - Khắc phục fallback wildcard `!admin.role_id`, bảo vệ API `/api/admin/staff` và `/api/admin/roles` bằng `staff.manage`, khóa tab 2 & 3 trong `StaffManagementModal`, che số liệu học phí/doanh thu trong `StudentDetailModal`, `StudentFormModal` và `Dashboard`, đồng thời khởi tạo sẵn 3 vai trò chuẩn (Lễ tân, Kế toán, Giáo vụ) |
| 2026-11-13 | `security-auditor` / Main | Kiểm toán lại rò rỉ doanh thu/học phí sau khi đổi phân quyền | Hoàn thành - `GET /api/students` bắt buộc đăng nhập + `students.view`, server tự zero toàn bộ trường tài chính nếu thiếu `tuition.view` và chỉ trả `period_revenue` khi có `revenue.reports`; `/api/payments` yêu cầu `tuition.view` (GET) / `tuition.audit` (POST); `/api/tuition-override` yêu cầu `tuition.override`; `/api/admin/tuition-reminders` kiểm tra `tuition.view/remind`; `/api/ai/chat` bắt buộc auth và không đưa doanh thu/công nợ vào prompt nếu thiếu quyền; Dashboard tự refresh quyền mỗi 30s và khi focus tab; ẩn toàn bộ cột học phí/đối soát/bộ lọc thanh toán + badge thanh toán trên Sơ đồ lớp khi thiếu `tuition.view`; thẻ Dự thu/Đã thu chỉ hiện khi có `revenue.reports`. Bổ sung: `GET /api/settings` bắt buộc đăng nhập, ẩn token/API key trừ khi có `settings.manage`, ẩn giá gói/phụ thu level nếu thiếu `tuition.view`/`settings.manage`; `POST /api/settings` chỉ cho đổi ngôn ngữ với nhân viên thường; `GET /api/teacher` tự loại bỏ `level_surcharge`, chiết khấu và `tuition_package_id` khỏi Cổng Giáo Viên; `/api/students/status`, `/api/students/import`, `/api/students/bulk-action` kiểm tra đúng quyền `students.status/excel/delete` |
