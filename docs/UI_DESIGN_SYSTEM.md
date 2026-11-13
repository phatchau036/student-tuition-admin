# UI_DESIGN_SYSTEM.md - QUY CHUẨN THIẾT KẾ GIAO DIỆN & COMPONENT
> **Dành cho:** `ui-builder`, `completeness-auditor`, Main Agent  
> **Quy tắc bắt buộc:** Mọi component hoặc modal mới phải đọc tài liệu này trước để áp dụng chính xác màu sắc, font chữ, hiệu ứng Glassmorphism, Dark/Light mode và trạng thái giao diện (loading, empty, error). Cập nhật nhật ký ở cuối file.

---

## 1. PHONG CÁCH THIẾT KẾ CHỦ ĐẠO (DESIGN PHILOSOPHY)
- **Phong cách:** Modern SaaS Glassmorphism kết hợp Flat Design sắc nét.
- **Thư viện Styling:** Tailwind CSS v4 (`@tailwindcss/postcss`, `@tailwindcss/turbopack`).
- **Thư viện Icon:** Lucide React (`lucide-react`) đồng bộ toàn ứng dụng.
- **Typography:** Sans-serif hiện đại, tối ưu độ tương phản, hỗ trợ tốt bảng chữ cái tiếng Việt, tiếng Anh, tiếng Trung và tiếng Nhật.

---

## 2. BẢNG MÀU HỆ THỐNG (COLOR PALETTE & TOKENS)

| Mục đích | Light Mode Tailwind Class | Dark Mode Tailwind Class | Ý nghĩa |
|---|---|---|---|
| **Background chính** | `bg-slate-50` / `bg-gray-100` | `bg-slate-950` / `bg-gray-900` | Nền toàn trang |
| **Card / Modal Container** | `bg-white/80 backdrop-blur-md border border-slate-200/80` | `bg-slate-900/80 backdrop-blur-md border border-slate-800` | Glassmorphism container |
| **Primary Accent** | `bg-indigo-600 hover:bg-indigo-700 text-white` | `bg-indigo-500 hover:bg-indigo-600 text-white` | Nút hành động chính, CTA |
| **Success (Đã đóng / An toàn)** | `bg-emerald-50 text-emerald-700 border-emerald-200` | `bg-emerald-950/40 text-emerald-400 border-emerald-800` | Huy hiệu đã đóng học phí, ca học còn trống |
| **Warning (Lớp đông / Chờ)** | `bg-amber-50 text-amber-700 border-amber-200` | `bg-amber-950/40 text-amber-400 border-amber-800` | Cảnh báo lớp đông $\ge 80\%$, đang bảo lưu |
| **Danger (Cần đóng / Hết chỗ)** | `bg-rose-50 text-rose-700 border-rose-200` | `bg-rose-950/40 text-rose-400 border-rose-800` | Nợ học phí, ca học hết chỗ ($100\%$), học sinh nghỉ học |
| **Text Tiêu Đề** | `text-slate-900 font-bold` | `text-slate-100 font-bold` | Tiêu đề trang, tên học sinh |
| **Text Phụ / Nhãn** | `text-slate-500` | `text-slate-400` | Mô tả phụ, ngày giờ, số điện thoại |

---

## 3. CÁC QUY CHUẨN COMPONENT BẮT BUỘC

### 3.1. Modal Quy Chuẩn (Modal Structure)
Mọi modal phải có cấu trúc chuẩn gồm 3 phần:
1. **Header:** Tiêu đề rõ ràng, icon đại diện, nút đóng $(X)$ có hiệu ứng hover.
2. **Body:** Cuộn được (`max-h-[80vh] overflow-y-auto pr-2`), các trường nhập liệu (`input`, `select`) có nhãn (`label`) rõ ràng, bo góc `rounded-xl`, viền sáng khi focus (`focus:ring-2 focus:ring-indigo-500`).
3. **Footer:** Nút "Hủy / Đóng" dạng outline (`border border-slate-300`) và nút "Xác nhận / Lưu" dạng primary (`bg-indigo-600 text-white font-medium`).

### 3.2. Bắt Buộc Đầy Đủ 4 Trạng Thái Giao Diện
Mỗi màn hình dữ liệu hoặc bảng danh sách phải xử lý đủ 4 trạng thái:
1. **Loading State:** Spinner hoặc Skeleton placeholder nhẹ nhàng (`animate-pulse`).
2. **Empty State:** Icon minh họa, thông điệp rõ ràng ("Chưa có học sinh nào trong ca này") kèm nút hành động ("Thêm học sinh mới").
3. **Error State:** Khung viền đỏ, hiển thị thông báo lỗi thân thiện kèm nút "Thử lại".
4. **Success / Active State:** Hiển thị dữ liệu trực quan, phân trang hoặc cuộn mượt mà.

### 3.3. Hỗ Trợ Dark Mode Toàn Diện (`ThemeContext.tsx`)
- Không viết cứng mã màu hex không có tiền tố dark mode.
- Mọi thành phần hiển thị phải có cả cặp class cho light mode và `dark:` cho dark mode (VD: `text-slate-800 dark:text-slate-200`).

---

## 4. NHẬT KÝ THIẾT KẾ UI (DESIGN SYSTEM LOG)

| Ngày | Thành phần | Trạng thái | Người thực hiện |
|---|---|---|---|
| 2026-10-29 | Glassmorphism Card Tokens | Hoàn thiện v2.6.0 | `ui-builder` |
| 2026-10-29 | Bảng màu huy hiệu trạng thái & sĩ số | Chuẩn hóa toàn hệ thống | `ui-builder` |
| 2026-10-29 | Redesign Ma Trận Lưới Xếp Lịch 7 Ngày (`ClassroomScheduleMatrix`) | Lưới 7 cột cố định, hàng thẳng hàng, chip rộng, nút +N học viên, Side Drawer, Header pastel, Thanh công cụ 2 tầng | `ui-builder` |
| 2026-10-29 | Nâng cấp Sáng tạo Thẻ 1 dòng 28px & Hiệu ứng tương tác | Thẻ 28px viền màu bộ môn, vạch thời gian thực Bây giờ, Cross-highlighting học viên toàn tuần, Chế độ Điểm Nóng (Hotspot), sửa badge CN | `ui-builder` |
| 2026-10-30 | ⭐ UI/UX Ví Giờ Học (Hour Wallet) toàn client | `HourWalletModal` (sổ cái phân trang, preview công thức cấp giờ, điều chỉnh tay), badge "Còn 7h30" 3 màu, Duration picker 30/60/90/120, card ví Parent Portal + sổ cái 3 dòng, tab Schedule có card ví | `ui-builder` |
| 2026-10-30 | Redesign Modal Báo Nghỉ Cổng Phụ Huynh | Bỏ date picker mm/dd/yyyy mù mờ → Hiện full danh sách các buổi học sắp tới (30 ngày) kèm Thứ, Ngày, Giờ, Môn học cụ thể để phụ huynh click chọn trực quan. Nút xác nhận tự hiển thị tên buổi đã chọn. Đồng bộ nguồn dữ liệu `generateUpcomingStudentSchedule` cho cả Tab Lịch học & Modal | `ui-builder` |
| 2026-10-30 | Bảng Học Sinh hiển thị đủ 1 màn hình (`Dashboard` table view) | `table-fixed` + width cột theo breakpoint, ẩn dần cột (Chiết khấu/Level &lt;xl, Giáo viên &lt;lg, Đối soát &lt;md), truncate + tooltip hết tràn ngang, hàng gọn py-3→py-2. Kiểm chứng 1920→375px không tràn (mobile cuộn trong `overflow-x-auto`) | Main Agent |
| 2026-10-30 | Tối giản cột Thao tác Bảng Học Sinh | Bỏ nút "Chi tiết" → bấm vào bất kỳ đâu trên hàng để mở `StudentDetailModal` (guard bỏ qua nút/link/checkbox trong hàng, `cursor-pointer`), cột Thao tác chỉ còn nút "⋯" thu hẹp 13%→9% (xl 10%→6%) | Main Agent |
| 2026-10-30 | Sửa tương phản & hệ màu `StudentDetailModal` + `StatusLogModal` | Fix class không tồn tại `dark:bg-slate-850` (5 chỗ) gây panel xám bùn ở dark mode → `dark:bg-slate-950/40–50` tạo phân tầng inset đúng; dịu hóa nút cam/đỏ/xanh lá đặc → chip nền nhạt theo cặp badge design system (đạt 13.5:1); bỏ `animate-pulse` nhiễu; "Chưa phân môn" về màu trung tính hết giả link | Main Agent |
| 2026-11-12 | ⭐ Zoom-in Modal ca học & cột dọc theo Lớp (`ClassroomScheduleMatrix`) | Bấm trực tiếp ô giờ ở **Lưới 7 Ngày** hoặc thẻ ca ở **Theo Thứ** để phóng to. Header: `Thứ` bên trái · chip `Giờ học` nổi bật bên phải · nút X/ESC thu gọn. Body: các cột dọc theo từng Lớp đang hoạt động (màu nhận diện, môn, GV, phòng, sĩ số `n/max` + thanh tiến độ, số chưa đóng/quá hạn). Mỗi thẻ học viên có môn, GV, giờ, trạng thái học phí và nút thùng rác xác nhận inline; cuối mỗi cột có nút `+ Thêm học viên vào [Tên Lớp]` prefill đúng Thứ + Giờ + Lớp. Hỗ trợ Light/Dark và cuộn ngang trên mobile | Main Agent |
| 2026-11-12 | Ẩn gợi ý mật khẩu mặc định ở Cổng Giáo Viên (`/giao-vien`) | Bỏ dòng "Mặc định ban đầu: 123456" cạnh nhãn và đổi placeholder thành "Nhập mật khẩu"; giữ nguyên cơ chế xác thực mật khẩu mặc định phía API | Main Agent |
| 2026-11-13 | Tinh gọn Top Header & gom chức năng vào 2 nhánh menu (`Dashboard`) | Bỏ các nút rời gây tràn header (Tổng Kết Tháng, Trợ Lý AI, Cổng GV/PH, theme, ngôn ngữ, đăng xuất). Gom vào **Nghiệp vụ cơ sở** (AI, Tài khoản & phân quyền, Lớp, Điểm danh, Báo nghỉ, Log, Tổng kết, Nhắc phí, Excel, Cài đặt, Giới thiệu, Cổng truy cập nhanh) và **Menu Tài khoản** (thông tin, Sáng/Tối, 4 ngôn ngữ, Đăng xuất). Header chỉ còn Logo + Chi nhánh · Nghiệp vụ · + Thêm Học Sinh · Tài khoản; responsive icon-only dưới `sm` | Main Agent |
| 2026-11-13 | Kỳ học phí tùy chỉnh Từ ngày - Đến ngày (`Dashboard` card Học phí) | Thêm chế độ **Tùy chọn từ ngày - đến ngày** bên cạnh chọn tháng. Hiển thị `15/11/2026 → 15/12/2026`, tự neo tháng học phí theo ngày bắt đầu, tự động reload danh sách học sinh; card **Dự thu** hiển thị `DỰ THU KỲ 15/11 - 15/12` kèm dòng **Đã thu theo kỳ** (tổng kỳ thanh toán bao phủ tháng neo); cột học phí bảng học sinh đổi theo kỳ | Main Agent |
| 2026-11-13 | Ẩn toàn diện UI học phí/doanh thu theo quyền RBAC | Khi thiếu `tuition.view`: ẩn tab Cần đóng/Đã nộp, cột Chiết khấu, cột Đối soát, nút Nhắc phí Zalo, dòng học phí tùy chỉnh, bộ lọc học phí và toàn bộ badge thanh toán/KPI trên Sơ đồ lớp (Lưới 7 Ngày, Theo Thứ, Zoom modal, Side Drawer, hover popover). Khi thiếu `revenue.reports`: thẻ **Dự thu** và **Đã thu theo kỳ** chỉ hiển thị dấu `••••••••`. Quyền được refresh mỗi 30s và khi focus tab | Main Agent |
