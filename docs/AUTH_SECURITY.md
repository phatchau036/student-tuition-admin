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

### 2.1. Localhost Cloaking Guard (`/he-thong` & `/api/system/*`) — ĐÃ HIỆN THỰC
- **Tệp hiện thực:** `src/proxy.ts` (Next.js 16 Proxy — tên mới của `middleware`).
- **Phạm vi bảo vệ:** `/he-thong/*`, `/api/system`, `/api/system/auth`, `/api/system/team`, `/api/system/upgrade`.
  - Riêng `/api/system/upgrade/status` cố ý để công khai để `MaintenanceGuard` của mọi phân hệ đọc được trạng thái bảo trì; tham số `check_git=1` (đọc commit log Git) yêu cầu token Super Admin.
- **Nguyên lý:** đọc `x-forwarded-for` → `x-real-ip` → `cf-connecting-ip` → `host`, chuẩn hóa IPv6 loopback. Nếu không phải loopback (hoặc không nằm trong `HETHONG_ALLOWED_IPS`), phản hồi **404 Not Found** ngụy trang.
- **Bật/tắt:** mặc định BẬT. `HETHONG_GUARD=off` để tắt (dùng khi SSH tunnel), `HETHONG_ALLOWED_IPS="1.2.3.4"` để mở thêm IP.
- **Lưu ý NGINX:** phải cấu hình `proxy_set_header X-Forwarded-For $remote_addr;` và `proxy_set_header Host $host;` để guard thấy IP thật.
- **Xác thực phiên Super Admin:** `getSystemAdminFromRequest()` so khớp `SYSTEM_ADMIN_USERNAME` / `SYSTEM_ADMIN_PASSWORD` trong `.env` (hoặc bản ghi trong bảng `settings`) cùng `SYSTEM_ADMIN_SECRET`, và kiểm tra `pwdHash`.

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
  - Token đã ký HMAC-SHA256: `base64url(payload).hmac` với payload `school_admin:[adminId]:[schoolId]:[pwdHash]:[timestamp]`.
  - Sinh/xác thực tập trung tại `src/lib/sessionToken.ts` (`createSchoolAdminToken`, `decodeSchoolAdminToken`).
  - Token cũ không ký vẫn được chấp nhận để không làm văng phiên đang đăng nhập; đặt `SESSION_STRICT=on` để buộc đăng nhập lại toàn bộ.
  - Mọi thay đổi mật khẩu làm `pwdHash` đổi → token cũ mất hiệu lực tức thì trên mọi thiết bị.
  - **Cô lập đa cơ sở:** `resolveSchoolScopeForAdmin()` chỉ chấp nhận `x-school-id` / `?school_id` khi thuộc cùng tổ chức (`parent_school_id`); mọi giá trị lạ bị bỏ qua và rơi về `admin.school_id`.
  - Hàm `getSchoolIdFromRequest()` (`src/lib/authHelper.ts`) tự động trích xuất ngữ cảnh `schoolId` từ:
    1. Header `x-school-id`.
    2. Header `Authorization: Bearer <token>`.
    3. Cookie `admin_session_token`.
    4. Query parameter `school_id`.
  - Đảm bảo dữ liệu giữa các trường học/cơ sở không bao giờ bị lẫn lộn (Data Isolation).

### 2.4. Xác Thực Passwordless Cho Giáo Viên & Phụ Huynh
- **Cổng Giáo Viên (`/api/teacher`):**
  - Tiếp nhận Số điện thoại + **mật khẩu bắt buộc** qua POST request (không cho phép bỏ trống).
  - Kiểm tra số điện thoại có trong bảng `teachers` với `is_active = 1` hay không; mật khẩu mặc định `123456` nếu chưa đổi.
  - Trả về danh sách lớp học và danh sách học sinh phụ trách của giáo viên đó.
- **Cổng Phụ Huynh (`/api/parent`):**
  - Tiếp nhận Số điện thoại học sinh đăng ký với trung tâm.
  - Kiểm tra bảng `students`. Nếu có nhiều học sinh trùng SĐT (anh em ruột cùng học trung tâm), hệ thống trả về danh sách các con để phụ huynh chọn hồ sơ cần tra cứu.
  - Phiên làm việc được ghi nhớ tại `localStorage` phía client để không phải nhập lại mỗi lần truy cập.
  - **Không được tự ghi nhận thanh toán:** hành động `confirm_payment` bị chặn (HTTP 403). Việc ghi nhận học phí chỉ do Quản trị cơ sở thực hiện hoặc qua SePay webhook.

### 2.5. Cơ Chế Cô Lập Tên Miền Đa Cơ Sở (Multi-Tenant Domain Isolation)
- **Bảo vệ độc quyền thương hiệu theo Host:**
  - Hàm `resolveSchoolIdByHost(host)` tự động giải mã domain riêng hoặc subdomain từ Request headers (`host`, `x-forwarded-host`).
  - **Khóa chặt đăng nhập Admin (`/api/admin/auth`):** Nếu một quản trị viên của Cơ sở B mở tên miền của Cơ sở A để đăng nhập, hệ thống sẽ từ chối truy cập (403 Forbidden) kèm thông báo rõ ràng: *"Tài khoản này thuộc cơ sở B, không thể đăng nhập trên tên miền của cơ sở này"*.
  - **Khóa chặt Cổng Phụ huynh (`/api/parent`):** Khi phụ huynh mở tên miền riêng của Cơ sở A, câu lệnh truy vấn tự động bổ sung điều kiện `WHERE s.school_id = domainSchoolId`. Số điện thoại của học sinh thuộc cơ sở khác sẽ không hiển thị.
  - **Khóa chặt Cổng Giáo viên (`/api/teacher`):** Khi giáo viên đăng nhập trên tên miền riêng của Cơ sở A, chỉ giáo viên thuộc biên chế của Cơ sở A mới có thể vào ca dạy.
  - **Cổng máy chủ tổng (`localhost` hoặc tên miền chính hệ thống):** Cho phép toàn bộ các cơ sở đăng nhập và quản lý bình thường.

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
| 2026-11-15 | `security-auditor` / Main | Kiểm toán & Kích hoạt cơ chế Cô Lập Tên Miền Đa Cơ Sở (Multi-Tenant Domain Isolation) | Đạt 100% - Khóa chặt đăng nhập Admin, Cổng Phụ Huynh và Cổng Giáo Viên theo tên miền truy cập, ngăn ngừa hoàn toàn việc đăng nhập chéo hoặc lộ thông tin học sinh giữa các trung tâm |
| 2026-11-16 | `security-auditor` / Main | Nâng cấp cơ chế đổi mật khẩu & hủy phiên tức thì (Multi-Session Invalidation) | Đạt 100% - (1) Gắn pwdHash vào token school_admin và bảo vệ toàn bộ API qua getAdminFromRequest; (2) Gắn pwdHash chặt chẽ cho Super Admin và loại bỏ fallback token cũ; (3) Bổ sung polling 20s trên /he-thong; (4) Thêm tính năng đổi pass Admin cơ sở trực tiếp từ /he-thong kèm nút sinh ngẫu nhiên và hủy ngay lập tức các phiên cũ trên mọi thiết bị khác |
| 2026-11-20 | `security-auditor` / Main | ⭐ Vá lỗ hổng bảo mật Giai đoạn 1 | Đạt - (1) Hiện thực **Localhost Guard thật** tại `src/proxy.ts` (404 ngụy trang, env override); (2) Thêm auth guard cho 14 route trước đây công khai (teachers, teachers/[id], classes, subjects, status-logs, makeups admin actions, admin/attendance, admin/teacher-leaves, system/team, system/upgrade, feedbacks, zalo-bot); (3) **Chặn cross-tenant** bằng `resolveSchoolScopeForAdmin()` áp dụng cho students/settings/packages/subjects; (4) **Ký HMAC-SHA256 token** phiên school admin (`src/lib/sessionToken.ts`), tương thích ngược token cũ; (5) Giáo viên **bắt buộc nhập mật khẩu**; (6) Chặn phụ huynh tự đánh dấu đã nộp học phí (`confirm_payment` → 403) |
