# ARCHITECTURE.md - KIẾN TRÚC TỔNG THỂ HỆ THỐNG
> **Dành cho:** `scope-planner`, `codebase-explorer`, Main Agent  
> **Quy tắc bắt buộc:** Mỗi khi can thiệp cấu trúc hệ thống, subagent phải đọc file này trước và ghi lại trạng thái mới vào phần "Nhật Ký Cập Nhật Trạng Thái" ở cuối file.

---

## 1. TỔNG QUAN KIẾN TRÚC (HIGH-LEVEL ARCHITECTURE)

Hệ thống **Student Tuition Admin** được thiết kế theo kiến trúc **Monolithic Full-stack Hiện Đại** trên nền tảng Next.js 16 (App Router), áp dụng mô hình **Multi-Tenant Cô Lập Ảo (Logical Multi-Tenancy)** phục vụ nhiều cơ sở đào tạo/chi nhánh trên cùng một máy chủ mà không làm phân mảnh cơ sở dữ liệu.

```text
                                  +---------------------------------------+
                                  |         CLIENTS & CONSUMERS           |
                                  +---------------------------------------+
                                      |            |            |
                  +-------------------+            |            +--------------------+
                  |                                |                                 |
                  v                                v                                 v
     [Phụ huynh & Học sinh]               [Giáo viên]                     [Quản trị viên]
     • Mobile Web                         • Mobile-First Web              • Desktop/Tablet Dashboard
     • Tra cứu theo SĐT                   • Đăng nhập theo SĐT             • Phân quyền theo Cơ sở
     • URL: / hoặc /phu-huynh             • URL: /giao-vien               • URL: /admin
                  |                                |                                 |
                  +--------------------------------+---------------------------------+
                                                   |
                                                   v
                            +---------------------------------------------+
                            |         SUPER ADMIN (CHỦ HỆ THỐNG)          |
                            |   • Giới hạn Localhost (127.0.0.1) Only     |
                            |   • URL: /he-thong                          |
                            +---------------------------------------------+
                                                   |
                                                   v
+-------------------------------------------------------------------------------------------------+
|                                    NEXT.JS 16 APP ROUTER CORE                                   |
|                                                                                                 |
|   +-----------------------+   +------------------------+   +--------------------------------+   |
|   |   Presentation Layer  |   |    API Routes Layer    |   |     Business Logic Engine      |   |
|   |   • React 19 Client   |   |   • NextRequest/Resp   |   |   • Tuition Calculation        |   |
|   |   • Tailwind CSS v4   |──>|   • Session/JWT Verify |──>|   • Schedule Conflict & Quota  |   |
|   |   • Glassmorphism UI  |   |   • IP Whitelist Check |   |   • Excel Smart Parser         |   |
|   |   • Theme & i18n Ctx  |   |   • SePay / Zalo Hooks |   |   • Status Tracker Engine      |   |
|   +-----------------------+   +------------------------+   +--------------------------------+   |
|                                                                           |                     |
|                                                                           v                     |
|                                                            +--------------------------------+   |
|                                                            |    Data Access Layer (LibSQL)  |   |
|                                                            |    • SQLite (data/admin.db)    |   |
|                                                            |    • Dynamic In-Code Migration |   |
|                                                            +--------------------------------+   |
+-------------------------------------------------------------------------------------------------+
                                                   |
                   +-------------------------------+-------------------------------+
                   |                                                               |
                   v                                                               v
      [Cổng Ngân Hàng Tự Động]                                          [Nền Tảng Zalo Bot]
      • SePay Webhook                                                   • Zalo Bot Creator API
      • /api/sepay/webhook                                              • /api/zalo-bot
```

---

## 2. BỐN PHÂN HỆ ĐỘC LẬP (THE 4 PORTAL ARCHITECTURE)

Hệ thống phân chia ranh giới vật lý & logic thành 4 cổng riêng biệt:

### 2.1. Cổng Quản Trị Hệ Thống Toàn Cục (`/he-thong` - Super Admin Portal)
- **Đối tượng:** Chủ sở hữu nền tảng phần mềm.
- **Lớp bảo vệ (Guard):** Chặn ở tầng Server Component & Middleware/API:
  - Chỉ chấp nhận request bắt nguồn từ `127.0.0.1` hoặc `::1` (`localhost`).
  - Request đến từ mạng LAN hoặc Internet bị phản hồi ngay mã HTTP `404 Not Found` (ngụy trang không tồn tại).
- **Trách nhiệm:** Quản lý danh sách các trường (`schools`), tự sinh mã tài khoản Quản trị cơ sở theo quy tắc định danh `TT-[Tên]-[Đường]-[Tỉnh]-[CN]-QTVn`, cấp mật khẩu ngẫu nhiên an toàn, cấu hình IP Whitelist cho từng cơ sở.

### 2.2. Cổng Quản Trị Cơ Sở (`/admin` - School Admin Portal)
- **Đối tượng:** Quản lý, Giám đốc học vụ, Thu ngân của từng cơ sở.
- **Xác thực:** Đăng nhập bằng Username + Password của trường. Nếu trường kích hoạt tính năng `ip_restriction_enabled`, server kiểm tra IP client có nằm trong `allowed_ips` hay không (nếu không, trả về `403 Forbidden`).
- **Trách nhiệm:**
  - Quản lý học viên, môn học, trình độ, ca học.
  - Quản lý gói học phí, thu học phí, đối soát công nợ kỳ hiện tại & nợ dồn.
  - Xếp lịch học bù, duyệt báo nghỉ, cảnh báo lớp đông / khóa ca hết chỗ.
  - Điều phối đội ngũ giáo viên, phân ca dạy.
  - Nhắc học phí qua Zalo 1-Click hoặc Bot tự động.

### 2.3. Cổng Giáo Viên (`/giao-vien` - Teacher Portal)
- **Đối tượng:** Giáo viên trực tiếp đứng lớp.
- **Thiết kế:** Chuẩn Mobile-First Web tối ưu cho điện thoại thông minh (giao diện cảm ứng, nút lớn, thanh điều hướng dưới).
- **Xác thực:** Số điện thoại đã được đăng ký trong hồ sơ giáo viên.
- **Trách nhiệm:**
  - Xem danh sách ca dạy trong tuần, sĩ số lớp hiện tại.
  - Xem danh sách học sinh theo từng ca. Tự động nhận diện học sinh học bù qua huy hiệu nổi bật `[HỌC BÙ]`.
  - Nâng Level/Grade môn học cho học sinh ngay tại lớp.
  - Gọi điện hoặc mở chat Zalo trực tiếp với phụ huynh.

### 2.4. Cổng Phụ Huynh / Học Sinh (`/` hoặc `/phu-huynh` - Parent Portal)
- **Đối tượng:** Phụ huynh và học sinh.
- **Thiết kế:** Giao diện thẻ trực quan, tối ưu cho phụ huynh kiểm tra nhanh trên điện thoại.
- **Xác thực:** Nhập đúng Số điện thoại của học sinh đăng ký với trung tâm (phiên làm việc được lưu trong `localStorage`).
- **Trách nhiệm:**
  - Xem thông tin khóa học, giáo viên phụ trách, lịch học cố định hàng tuần.
  - Tra cứu học phí kỳ này, hạn đóng tiền, số tiền cần thanh toán.
  - Báo nghỉ học trực tuyến: Học sinh được tự động cộng +1 suất học bù.
  - Tự đăng ký ca học bù: Kiểm tra chỗ trống thời gian thực, tự động khóa không cho đăng ký ca đã đạt 100% sĩ số.

---

## 3. CÁC TẦNG KIẾN TRÚC & LUỒNG DỮ LIỆU (LAYERS & DATA FLOW)

### 3.1. Presentation Layer (Giao Diện & Tương Tác)
- **Components (`src/components/`):**
  - `Dashboard.tsx`: Bảng điều khiển quản trị trung tâm, gom cụm các chỉ số KPI, thanh công cụ tìm kiếm, bộ lọc trạng thái và bảng học sinh.
  - `ParentPortal.tsx`: Giao diện tra cứu đa năng cho phụ huynh.
  - `ClassroomScheduleMatrix.tsx`: Ma trận phòng học / ca mở cửa trực quan theo dạng lưới 7 ngày.
  - Các Modals chức năng độc lập: `StudentFormModal`, `StudentDetailModal`, `ChangeStatusModal`, `StatusLogModal`, `MakeUpClassesModal`, `MonthlyTuitionModal`, `MonthlySummaryModal`, `SettingsModal`, `SmartExcelImportModal`, `ZaloReminderModal`, `TeacherManagementModal`.
- **State & Contexts (`src/lib/`):**
  - `ThemeContext.tsx`: Quản lý giao diện Sáng / Tối (Light / Dark mode).
  - `i18n.tsx`: Quản lý 4 ngôn ngữ (Tiếng Việt, Tiếng Anh, Tiếng Trung, Tiếng Nhật).
  - `Toast.tsx`: Quản lý hệ thống thông báo trạng thái ứng dụng.

### 3.2. Business Logic Layer (Quy Tắc Nghiệp Vụ Cốt Lõi)
- `src/lib/tuition.ts`:
  - Tính học phí chuẩn theo công thức: $\text{Học phí} = (\text{Base} + \text{Phụ thu Level}) \times (1 - \text{Discount}\%)$.
  - Xử lý chu kỳ gói học phí: Đóng theo tháng (1 tháng) hoặc đóng theo gói/khóa (nhiều tháng/tuần).
  - Tính toán nợ quá hạn cộng dồn (Cumulative Overdue Tuition).
- `src/lib/credentialGen.ts`:
  - Quy tắc sinh Username chuẩn hoá: `TT-[Tên]-[Đường]-[Tỉnh]-[CN]-QTVn`.
  - Sinh mật khẩu mạnh 10 ký tự kết hợp hoa, thường, số, ký tự đặc biệt.
- `src/lib/ipHelper.ts`:
  - Trích xuất địa chỉ IP thực tế từ các header `x-forwarded-for`, `x-real-ip`.
  - Kiểm tra đối soát với danh sách `allowed_ips` của trường.

### 3.3. Data Access Layer & Embedded Database
- Thư viện `@libsql/client` kết nối tới tệp cục bộ `data/admin.db`.
- **Cơ chế In-Code Migration:** Không phụ thuộc file `.sql` rời bên ngoài. Toàn bộ DDL nằm trong hàm `initDb()` (`src/lib/db.ts`). Mỗi lần hệ thống nạp hoặc server khởi động, `initDb()` chạy lệnh `CREATE TABLE IF NOT EXISTS` và các lệnh `ALTER TABLE ... ADD COLUMN ...` trong khối `try/catch`.

---

## 4. TÍCH HỢP BÊN NGOÀI (EXTERNAL INTEGRATIONS)

1. **SePay Webhook (`/api/sepay/webhook`):**
   - Nhận tín hiệu biến động số dư chuyển khoản từ SePay theo thời gian thực.
   - Tự động trích xuất nội dung chuyển khoản theo cấu trúc `HP [Mã_HS]` hoặc tìm theo Số điện thoại phụ huynh.
   - Khớp giao dịch vào bảng `sepay_transactions` và cập nhật trạng thái `paid` trong `student_payments`.
2. **Nền Tảng Zalo Bot Creator (`/api/zalo-bot`):**
   - Kết nối với bot token chính thức của Zalo Bot Manager.
   - Gửi tin nhắn thông báo học phí tự động 1-click đến `zalo_chat_id` của phụ huynh.
   - Hỗ trợ deep-link `https://zalo.me/[SĐT]` để trò chuyện thủ công trực tiếp.
3. **Engine Nhập/Xuất Excel (`xlsx`):**
   - Import dữ liệu học sinh hàng loạt với thuật toán tự nhận diện tên cột thông minh (`SmartExcelImportModal.tsx`).
   - Tự động trích xuất và phân tích giờ học tự do thành các slot lịch học chuẩn xác.
   - Export danh sách học sinh và báo cáo công nợ ra file Excel chuẩn định dạng (`src/lib/exportExcel.ts`).

---

## 5. NHẬT KÝ CẬP NHẬT TRẠNG THÁI (STATE CHANGE LOG)

| Thời gian (UTC) | Subagent / Tác giả | Hành động & Thay đổi kiến trúc | Trạng thái hệ thống |
|---|---|---|---|
| 2026-10-29 | Main Agent / `scope-planner` | Khởi tạo tài liệu kiến trúc toàn diện đa cổng, chuẩn hóa luồng dữ liệu 4 portals | Hoàn thiện v2.6.0 |
