# TÀI LIỆU HƯỚNG DẪN & ĐẶC TẢ TÍNH NĂNG TOÀN DIỆN HỆ THỐNG
## HỆ THỐNG QUẢN TRỊ TRUNG TÂM / TRƯỜNG HỌC & ĐỐI SOÁT HỌC PHÍ THÔNG MINH

Hệ thống được phát triển trên nền tảng **Next.js 16 (App Router)**, **React 19**, **TypeScript**, **Tailwind CSS v4** và cơ sở dữ liệu **SQLite (`@libsql/client`)** lưu trữ bền vững tại file `data/admin.db`.

---

## MỤC LỤC
1. [Kiến Trúc Đa Cổng (Multi-Portal Architecture)](#1-kien-truc-da-cong-multi-portal-architecture)
2. [Cổng Quản Trị Hệ Thống Toàn Cục (`/he-thong`)](#2-cong-quan-tri-he-thong-toan-cuc-he-thong)
3. [Cổng Quản Trị Cơ Sở (`/admin`)](#3-cong-quan-tri-co-so-admin)
   - [3.1. Quản lý học sinh & Hồ sơ học tập](#31-quan-ly-hoc-sinh--ho-so-hoc-tap)
   - [3.2. Cấu hình gói học phí & Đối soát công nợ thanh toán](#32-cau-hinh-goi-hoc-phi--doi-soat-cong-no-thanh-toan)
   - [3.3. Quản lý Trạng thái: Đang học, Bảo lưu, Nghỉ học & Log biến động](#33-quan-ly-trang-thai-dang-hoc-bao-luu-nghi-hoc--log-bien-dong)
   - [3.4. Tích hợp nhắc học phí Zalo (Thủ công / Bot)](#34-tich-hop-nhac-hoc-phi-zalo-thu-cong--bot)
   - [3.5. Báo nghỉ & Xếp lịch học bù thông minh (Kiểm soát sĩ số & Cảnh báo đông)](#35-bao-nghi--xep-lich-hoc-bu-thong-minh-kiem-soat-si-so--canh-bao-dong)
   - [3.6. Quản lý đội ngũ giáo viên](#36-quan-ly-doi-ngu-giao-vien)
   - [3.7. Cài đặt hệ thống nâng cao & Đổi mật khẩu](#37-cai-dat-he-thong-nang-cao--doi-mat-khau)
4. [Cổng Giáo Viên (`/giao-vien`)](#4-cong-giao-vien-giao-vien)
5. [Cổng Phụ Huynh (`/` hoặc `/phu-huynh`)](#5-cong-phu-huynh--hoac-phu-huynh)
6. [Hệ Thống API RESTful Đầy Đủ](#6-he-thong-api-restful-day-du)
7. [Hướng Dẫn Triển Khai & Khởi Chạy](#7-huong-dan-trien-khai--khoi-chay)

---

## 1. Kiến Trúc Đa Cổng (Multi-Portal Architecture)

Hệ thống được thiết kế theo mô hình phân quyền chặt chẽ với 4 phân hệ độc lập:

| Đường dẫn (URL) | Đối tượng sử dụng | Cơ chế xác thực | Quyền hạn chính |
|---|---|---|---|
| **`/he-thong`** | Chủ hệ thống (Super Admin) | Chỉ cho phép truy cập từ `localhost` / `127.0.0.1` + Mật khẩu hệ thống (`.env`) | Tạo/Sửa trường, sinh mã tài khoản Admin thông minh, xem mật khẩu, khóa IP Whitelist |
| **`/admin`** | Quản trị viên cơ sở / trường | Tài khoản + Mật khẩu cấp từ Hệ thống (có kiểm tra IP nếu trường bật khóa IP) | Quản lý học sinh, cấu hình học phí, đối soát công nợ, phân công GV, duyệt học bù, nhắc Zalo |
| **`/giao-vien`** | Giáo viên giảng dạy | Số điện thoại đăng ký của giáo viên | Xem danh sách học sinh phụ trách, lịch dạy, phát hiện học sinh học bù (`[HỌC BÙ]`), đổi Level học sinh |
| **`/` / `/phu-huynh`** | Phụ huynh / Học sinh | Số điện thoại đã ghi danh học sinh | Tra cứu lịch học, xem học phí tháng, báo nghỉ học trực tuyến, tự chọn ca học bù trống chỗ |

---

## 2. Cổng Quản Trị Hệ Thống Toàn Cục (`/he-thong`)

### 2.1. Giới hạn bảo mật truy cập Localhost & Báo 404 từ ngoài mạng
- **Nguyên lý:** Chỉ máy tính nội bộ server (`localhost` hoặc `127.0.0.1`) mới có quyền mở giao diện `/he-thong`.
- Khi người dùng từ mạng ngoài (LAN hoặc Internet) cố tình truy cập vào `/he-thong`, server tự động phản hồi mã lỗi `404 Not Found - Trang web không tồn tại`, không để lộ bất kỳ thông tin nào về sự tồn tại của trang quản trị chủ.
- Bảo vệ bằng tài khoản và mật khẩu định cấu hình trong tệp `.env` (`SYSTEM_ADMIN_USER` & `SYSTEM_ADMIN_PASSWORD`).

### 2.2. Quản lý trường học & Cơ sở đào tạo
- Thêm mới trường học với các thông tin chi tiết:
  - **Loại cơ sở:** Chọn giữa `TT` (Trung tâm) hoặc `TH` (Trường học).
  - **Tên trường / trung tâm:** VD: *Hồng Ân*, *Sáng Tạo*...
  - **Tên đường riêng:** VD: *Hiền Vương*, hệ thống sẽ tự động chuyển thành `HV`.
  - **Tỉnh / Thành phố:** Chọn từ danh mục (TPHCM, Hà Nội, Đà Nẵng, Bình Dương, Đồng Nai, Cần Thơ, Hải Phòng).
  - **Chi nhánh số mấy:** Nhập số chi nhánh (VD: `1` thành `CN1`, `2` thành `CN2`...).
  - **Mã trường:** VD: `TT-HA`, `TT-01`...
  - **Hotline & Địa chỉ đầy đủ.**
- **Đổi tên & cập nhật trường:** Cho phép sửa đổi toàn bộ thông tin cơ sở bất cứ lúc nào.
- **Xóa trường học:** Sử dụng Modal xác nhận tùy chỉnh của React (không bị trình duyệt chặn). Khi xóa, toàn bộ giáo viên, học sinh, khung giờ và công nợ của trường đó sẽ được dọn dẹp sạch sẽ.

### 2.3. Bộ sinh tài khoản & mật khẩu Admin thông minh
- **Quy tắc tạo Username tự động:**
  $$\text{Loại Cơ Sở} - \text{Tên Trung Tâm} - \text{Tên Đường} - \text{Tỉnh Thành} - \text{Chi Nhánh} - \text{QTVn}$$
  *Ví dụ:* `TT-HA-HV-TPHCM-CN1-QTV1` (Quản trị viên 1) hoặc `TT-HA-HV-TPHCM-CN1-QTV2` (Quản trị viên 2).
- **Mật khẩu 10 ký tự mạnh ngẫu nhiên:** Gồm đầy đủ chữ hoa, chữ thường, số và ký tự đặc biệt (VD: `k#7B@9mQx$`).
- **Nút Copy nhanh:** Cho phép sao chép 1 click Username và Password để gửi cho Quản trị viên cơ sở.
- **Xem mật khẩu Admin:** Bên cạnh mỗi tài khoản có nút con mắt (Eye) cho phép Chủ hệ thống xem lại mật khẩu dạng văn bản rõ khi cần hỗ trợ cơ sở.

### 2.4. Cấu hình bảo vệ giới hạn IP Whitelist cho cơ sở
- Chủ hệ thống có thể bật tính năng **Khóa IP (IP Restriction)** cho từng trường.
- Nhập danh sách IP cho phép (phân tách bằng dấu phẩy).
- Khi bật tính năng này, bất kỳ Quản trị viên nào truy cập `/admin` từ một IP không nằm trong danh sách sẽ bị báo lỗi **Web Error • 403 Forbidden** và không thể vào trang đăng nhập.

---

## 3. Cổng Quản Trị Cơ Sở (`/admin`)

Giao diện Quản trị cơ sở được thiết kế theo chuẩn **SaaS hiện đại**, phong cách Glassmorphism với thanh Header bóng mờ, thẻ KPI trực quan, bảng dữ liệu tối ưu hiển thị không bị tràn màn hình.

### 3.1. Quản lý học sinh & Hồ sơ học tập
- **Thêm mới / Chỉnh sửa học sinh:**
  - Nhập họ tên, số điện thoại, link Zalo (hệ thống tự tạo link `https://zalo.me/[SĐT]` nếu để trống), Zalo Chat ID cho bot.
  - **Ngày bắt đầu đăng ký học (`start_date`):** Ô chọn ngày vào học kèm nút **"Hôm nay (Hiện tại ngay)"** 1-click gán nhanh ngày hôm nay.
  - Chọn Giáo viên phụ trách, chọn Level / Trình độ (tự động cộng phụ thu).
  - Chọn **Gói học phí áp dụng** (*Gói Tháng*, *Gói Quý 3 Tháng*, *Khóa 6 Tháng*...).
- **2 Chế độ thời lượng học tập:**
  1. **Hình thức 1 - Học đủ số tiếng / tuần (`by_hours`):**
     - Đặt mục tiêu số tiếng (VD: `3 tiếng / tuần`).
     - Xếp các buổi học trong tuần (VD: Thứ 7 học `09:00 - 10:30` (1.5h) và Chủ Nhật học `09:00 - 10:30` (1.5h) $\rightarrow$ Đạt đủ 3/3 tiếng).
     - **Bộ chọn giờ 24h thông minh:** Chỉ hiển thị các ca mở cửa có sẵn của thứ đã chọn, có nút chọn nhanh 1-click ca mở cửa và tự động kiểm tra chặn không cho xếp giờ ngoài ca mở cửa của trung tâm.
  2. **Hình thức 2 - Cố định số buổi / tuần (`by_sessions`):**
     - Đặt số buổi/tuần (VD: 3 buổi/tuần), giờ học mỗi buổi (VD: `18:00 - 19:00`) và tích chọn các ngày học cố định (Thứ 2, Thứ 4, Thứ 6).
- **Chiết khấu / Giảm giá:** Tích chọn áp dụng giảm giá % theo các mốc cài sẵn (5%, 10%, 15%, 20%...), nhập % tùy chỉnh và **nhập Lý do được giảm học phí** (VD: Anh em ruột, Đăng ký sớm, Hoàn cảnh khó khăn...).
- **Xem hồ sơ chi tiết học sinh (`StudentDetailModal`):**
  - Xem thông tin liên lạc, ngày đăng ký học, lịch học chi tiết hàng tuần.
  - Xem mức chiết khấu và lý do giảm giá áp dụng.
  - Xem gói học phí đang áp dụng và tình trạng đối soát công nợ.
  - Xem toàn bộ lịch sử khi nào nghỉ, khi nào bảo lưu, dự kiến ngày nào học lại và lý do.
- **Xóa học sinh:** Modal xác nhận tùy chỉnh an toàn, không lo bị chặn popup.

---

### 3.2. Cấu hình gói học phí & Đối soát công nợ thanh toán

#### A. Quản lý danh mục Gói học phí (`Settings > Gói Học Phí`)
- Cho phép tạo các gói học phí linh hoạt:
  - **Tên gói:** VD: *Theo tháng*, *Theo quý - 3 tháng*, *Khóa 6 tháng*, *Gói 24 tuần*...
  - **Số tiền:** VNĐ tương ứng với gói.
  - **Chu kỳ thời gian:** Chọn đơn vị là **Tháng** hoặc **Tuần** và nhập số lượng chu kỳ tương ứng (VD: 3 Tháng, 24 Tuần).
- **Hành động:** Admin có thể Tạo mới, Sửa thông tin, Xóa gói hoặc Bật/Tắt trạng thái hoạt động nhanh.

#### B. Logic Đối soát công nợ học sinh (Billing Reconciliation)
- Trên bảng học sinh tại Dashboard, mỗi học sinh có 2 thông tin quan trọng:
  1. **Nhãn gói học phí (Badge):** Hiển thị gói học sinh đang áp dụng (VD: `[Gói Tháng]`, `[Theo quý - 3 tháng]`).
  2. **Nút đối soát phí:** Trạng thái `[✅ Đã đóng]` hoặc `[⚠️ Cần đóng tiền]`.
- **Cơ chế đối soát thủ công thông minh:**
  - Khi Admin click chuyển trạng thái thành **"Đã đóng"**:
    - **Nếu đóng gói theo tháng (1 tháng):** Hệ thống đánh dấu đã hoàn tất học phí cho tháng được chọn. Khi Admin chuyển sang xem tháng tiếp theo, học sinh sẽ tự động hiển thị trạng thái `Cần đóng tiền`.
    - **Nếu đóng gói theo khóa/nhiều tháng (VD: Gói 3 tháng từ 10/2026 đến 12/2026):** Hệ thống ghi nhận trạng thái `Đã đóng` liên tục xuyên suốt tất cả các tháng trong chu kỳ khóa học kèm nhãn `(Đã đóng 2026-10 đến 2026-12)`. Chỉ khi hết hạn chu kỳ (từ tháng 01/2027), trạng thái mới tự động quay về `Cần đóng tiền`.
- **Cài đặt chế độ đối soát (`Settings > Đối Soát Thanh Toán`):**
  - **Chế độ 1 - Thủ công (Manual):** Đang kích hoạt sẵn phục vụ công tác đối soát hàng ngày.
  - **Chế độ 2 - Tự động (Auto Sync):** Hiển thị trạng thái disabled kèm ghi chú *"Sẽ cập nhật ở phiên bản tiếp theo"* (dành cho tính năng tích hợp biến động số dư ngân hàng/VietQR sau này).

---

### 3.3. Quản lý Trạng thái: Đang học, Bảo lưu, Nghỉ học & Log biến động

#### A. Chuyển trạng thái linh hoạt (`ChangeStatusModal`)
Tại mỗi dòng học sinh hoặc trong màn hình chi tiết, Admin có thể chuyển đổi giữa 3 trạng thái:
1. **🟢 Đang học (Studying):** Học sinh theo học bình thường.
2. **🟡 Bảo lưu (Reserved):**
   - Chọn ngày bắt đầu bảo lưu.
   - Nhập **Ngày dự kiến trở lại học tiếp** (để trung tâm theo dõi nhắc nhở).
   - Ghi chú lý do bảo lưu (VD: bận ôn thi, đi công tác gia đình...).
3. **🔴 Nghỉ học (Dropped):** Chọn ngày nghỉ học và ghi rõ lý do.
4. **Học tiếp (Resume):** Khi học sinh bảo lưu hoặc nghỉ muốn học lại, Admin chỉ cần 1 click chọn "Học Tiếp" và điền ngày bắt đầu học lại để kích hoạt lại học sinh.

#### B. Log tổng biến động học sinh (`StatusLogModal`)
- Nút **"Log Biến Động"** đặt ngay trên thanh điều hướng đầu trang.
- Thống kê tổng số lượng học sinh Bảo lưu, Nghỉ học, Trở lại học trong kỳ.
- Bảng nhật ký tổng hợp ghi nhận chính xác đến từng giây:
  - Thời gian thao tác (`YYYY-MM-DD HH:mm:ss`).
  - Học sinh nào, số điện thoại liên lạc.
  - Hành động thực hiện (Bảo lưu / Nghỉ học / Trở lại học).
  - Ngày bắt đầu có hiệu lực và ngày dự kiến trở lại học.
  - Lý do ghi nhận.
- Hỗ trợ lọc theo từng loại hành động và chọn xem theo từng tháng cụ thể hoặc toàn bộ lịch sử.

---

### 3.4. Tích hợp nhắc học phí Zalo (Thủ công & Zalo Bot Platform)

#### A. Cấu hình trong Cài đặt (`Settings > Nhắc Zalo`)
- **Phương thức B - Nhắc học phí thủ công (Manual Assist):** Soạn sẵn nội dung tin nhắn và mở liên kết trực tiếp đến tài khoản chat của phụ huynh.
- **Phương thức A - Tích hợp Zalo Bot Platform:**
  - Nhập **Bot Token** được cấp từ nền tảng Zalo Bot Creator.
  - Nút **"Kiểm tra kết nối Bot"** tự động gọi API `getMe` xác minh tên bot và tính hợp lệ của token.
  - Khi lưu cấu hình, hệ thống sẽ kích hoạt tính năng gửi tin nhắn tự động.

#### B. Hỗ trợ nhắc nợ 1-Click (`ZaloReminderModal`)
- Khi bấm icon Zalo trên dòng học sinh có công nợ `Cần đóng tiền`:
  - Mở popup hiển thị **Mẫu tin nhắn nhắc học phí chuẩn mực, lịch sự**.
  - **Nút "Gửi Tin Nhắn Qua Bot" (1-Click Automated):** Tự động gửi thông báo trực tiếp qua Zalo Bot Platform đến `chat_id` của phụ huynh mà không cần rời khỏi màn hình quản trị.
  - **Nút "Copy tin nhắn":** Sao chép tức thì toàn bộ nội dung vào bộ nhớ tạm.
  - **Nút "Mở Chat Zalo":** Kích hoạt deep-link `https://zalo.me/[SĐT]` chuyển thẳng Admin đến cửa sổ chat Zalo với phụ huynh.

---

### 3.5. Báo nghỉ & Xếp lịch học bù thông minh (Kiểm soát sĩ số & Cảnh báo đông)
- **Nút "Báo Nghỉ & Học Bù"** trên Header kèm badge đếm số suất bù còn tồn cần xếp.
- **Quy trình:**
  1. **Báo nghỉ:** Chọn học sinh, chọn ngày nghỉ và lý do $\rightarrow$ Học sinh được tích lũy **+1 suất học bù**.
  2. **Xếp lịch bù:**
     - Chọn ngày muốn học bù.
     - Hệ thống **tự động tính toán sĩ số thời gian thực** của tất cả các ca mở cửa trong ngày đó (bao gồm học sinh học cố định + học sinh đã xếp bù vào ca đó).
     - **Cảnh báo lớp đông (`is_crowded`):** Nếu sĩ số ca đạt từ ngưỡng cài đặt trở lên (mặc định $\ge 80\%$), ca học sẽ hiển thị huy hiệu màu vàng cảnh báo lớp đông.
     - **Khóa ca khi hết suất (`is_full`):** Nếu sĩ số ca đạt tối đa 100% (VD: 10/10 học sinh), ca học sẽ **bị khóa hoàn toàn viền đỏ**, không cho phép xếp bù thêm để đảm bảo chất lượng lớp học.

---

### 3.6. Quản lý đội ngũ giáo viên & Phân công ca dạy
- Quản lý danh sách giáo viên của cơ sở (Họ tên, SĐT, Email, Môn dạy/Chuyên môn, Màu huy hiệu nhận diện).
- **Phân công ca dạy linh hoạt:** Tích chọn trực tiếp các ca mở cửa trong tuần của trung tâm mà giáo viên phụ trách.
- Hiển thị huy hiệu ca dạy rõ ràng trên danh sách giáo viên của Admin và trên Cổng Giáo Viên (`/giao-vien`).
- Thống kê số lượng học sinh đang được phân công dạy theo từng giáo viên.
- Chức năng thêm mới, chỉnh sửa và xóa giáo viên an toàn.

---

### 3.7. Cài đặt hệ thống nâng cao & Đổi mật khẩu
Cửa sổ **Cài Đặt Hệ Thống Cơ Sở** bao gồm 8 phân hệ chuyên sâu:
1. **Học phí & Thời lượng:**
   - Cài đặt Mức học phí cơ bản tiêu chuẩn (Base Price) toàn cơ sở.
   - Chọn chế độ quản lý mặc định: Hoặc theo tiếng (`by_hours`) hoặc theo buổi (`by_sessions`).
   - Cài đặt Sĩ số tối đa trong một ca (mặc định 10 học sinh).
   - Cài đặt Ngưỡng cảnh báo Lớp Đông (mặc định 80%).
   - **Định dạng hiển thị tháng học phí:** Tùy chọn 1 trong 3 kiểu hiển thị toàn hệ thống:
     - **Tiếng Việt:** VD: `Tháng 10/2026`.
     - **Tiếng Anh (English):** VD: `October 2026`.
     - **Dạng số (MM/YYYY):** VD: `10/2026`.
2. **Gói học phí:** Quản lý danh mục gói tháng/quý/khóa/tuần.
3. **Đối soát thanh toán:** Cài đặt phương thức đối soát công nợ.
4. **Nhắc Zalo:** Cài đặt thông báo học phí (Thủ công / Zalo Bot Platform).
5. **Khung giờ:** Quản lý các ca mở cửa của cơ sở theo từng thứ (từ thứ mấy đến thứ mấy, giờ bắt đầu và kết thúc).
6. **Phụ thu Level:** Danh mục các Level/Grade và mức phí cộng thêm (+VNĐ).
7. **Chiết khấu:** Cấu hình các mốc giảm giá phần trăm (% discount) kèm **Lý do được giảm / Tên mức giảm** (VD: Anh em ruột, Đăng ký sớm, Hộ nghèo...).
8. **Đổi mật khẩu:** Form đổi mật khẩu cho Quản trị viên cơ sở (yêu cầu mật khẩu hiện tại + mật khẩu mới tối thiểu 6 ký tự).

---

## 4. Cổng Giáo Viên (`/giao-vien`)

Giao diện được tối ưu hóa đặc biệt cho thiết bị di động (Mobile Web) giúp giáo viên thao tác mượt mà ngay trên điện thoại:
- **Đăng nhập nhanh:** Xác thực trực tiếp bằng Số điện thoại của giáo viên.
- **Tổng quan ca dạy:** Hiển thị tên trường/cơ sở công tác, tổng số học sinh phụ trách và sĩ số lớp.
- **Danh sách học sinh:**
  - Xem danh sách học sinh theo học kèm lịch học chi tiết.
  - **Phát hiện học sinh học bù thông minh:** Nếu có học sinh từ ca khác chuyển sang học bù trong ca dạy, hệ thống tự động gắn huy hiệu màu vàng nổi bật `[HỌC BÙ]` kèm ngày bù để giáo viên nhận diện và kèm cặp riêng.
  - **Nâng cấp Level trực tiếp:** Giáo viên có thể bấm nâng Level/Grade cho học sinh ngay trên điện thoại khi học sinh hoàn thành chương trình mà không cần nhờ Admin.
  - **Liên hệ nhanh:** Nút bấm gọi điện thoại và nhắn tin Zalo trực tiếp đến phụ huynh học sinh.

---

## 5. Cổng Phụ Huynh (`/` hoặc `/phu-huynh`)

Giao diện thân thiện, bảo mật, tối ưu hoàn hảo cho phụ huynh tra cứu từ điện thoại:
- **Đăng nhập tiện lợi:** Nhập đúng Số điện thoại đã đăng ký với trung tâm là có thể vào xem ngay (tự động ghi nhớ phiên đăng nhập).
- **Hồ sơ học tập của con:**
  - Xem tên trường/trung tâm bé đang theo học.
  - Xem giáo viên phụ trách, trình độ hiện tại, lịch học cố định hàng tuần.
  - **Tra cứu học phí tháng:** Hiển thị số tiền học phí của kỳ hiện tại theo định dạng cơ sở đã cài đặt (Số/Tiếng Anh/Tiếng Việt), hiển thị rõ gói học phí và trạng thái đã điều chỉnh (nếu có).
- **Báo nghỉ học trực tuyến:** Phụ huynh chủ động chọn ngày bé phải nghỉ học và nhập lý do $\rightarrow$ Hệ thống tự động ghi nhận và cộng 1 suất học bù vào tài khoản của bé.
- **Tự chọn ca học bù linh hoạt:**
  - Phụ huynh tự chọn ngày muốn cho con học bù.
  - Hệ thống hiển thị các ca học mở cửa trong ngày đó kèm **tỷ lệ sĩ số thực tế**.
  - Tự động hiển thị cảnh báo khi ca học đông và **tự động khóa không cho chọn các ca đã hết chỗ (100% full)**, bảo vệ quyền lợi và chất lượng học tập của lớp.

---

## 6. Hệ Thống API RESTful Đầy Đủ

| Phương thức | Endpoint | Chức năng chính |
|---|---|---|
| `GET / POST` | `/api/settings` | Lấy và lưu cài đặt hệ thống (Học phí, khung giờ, level, chiết khấu, gói học phí, định dạng tháng) |
| `GET / POST` | `/api/students` | Lấy danh sách học sinh (kèm công nợ, gói phí) và tạo mới học sinh |
| `PUT / DELETE` | `/api/students/[id]` | Cập nhật thông tin hoặc xóa học sinh |
| `POST` | `/api/students/status` | Chuyển trạng thái học sinh (Bảo lưu, Nghỉ học, Học tiếp) và ghi log |
| `GET` | `/api/status-logs` | Lấy lịch sử biến động trạng thái (bảo lưu/nghỉ/học tiếp) theo tháng |
| `GET / POST` | `/api/packages` | Lấy danh sách gói học phí, tạo mới, sửa, xóa, bật/tắt gói |
| `POST` | `/api/payments` | Đối soát học phí (đánh dấu Đã đóng / Chưa đóng theo chu kỳ gói) |
| `POST` | `/api/tuition-override` | Điều chỉnh hoặc đặt lại học phí tùy chỉnh riêng cho từng tháng |
| `GET / POST` | `/api/makeups` | Lấy lịch học bù, báo nghỉ học và xếp lịch học bù |
| `GET` | `/api/classes/occupancy` | Tính toán sĩ số và tỷ lệ lấp đầy thời gian thực của các ca trong ngày |
| `GET / POST` | `/api/teachers` | Lấy danh sách giáo viên và tạo giáo viên mới |
| `PUT / DELETE` | `/api/teachers/[id]` | Cập nhật hoặc xóa giáo viên |
| `POST` | `/api/parent` | Xác thực đăng nhập phụ huynh bằng SĐT và trả về dữ liệu học sinh |
| `POST` | `/api/teacher` | Xác thực đăng nhập giáo viên và cập nhật Level học sinh |
| `POST` | `/api/admin/auth` | Đăng nhập tài khoản Quản trị viên cơ sở |
| `POST` | `/api/admin/change-password` | Đổi mật khẩu tài khoản Admin |
| `GET` | `/api/admin/check-ip` | Kiểm tra IP client đối soát với IP Whitelist của trường |
| `GET / POST` | `/api/system` | Quản trị toàn cục (Tạo/sửa trường, cấp admin thông minh, khóa IP) |
| `POST` | `/api/system/auth` | Đăng nhập Chủ hệ thống (Super Admin) |

---

## 7. Hướng Dẫn Triển Khai & Khởi Chạy

### 7.1. Cấu hình môi trường (`.env`)
Tạo hoặc kiểm tra file `.env` tại thư mục gốc:
```env
PORT=3000
SYSTEM_ADMIN_USER=systemadmin
SYSTEM_ADMIN_PASSWORD=your_secure_password_here
JWT_SECRET=your_secret_jwt_key
```

### 7.2. Cài đặt thư viện & Build hệ thống
```bash
# 1. Cài đặt các gói phụ thuộc
npm install

# 2. Build ứng dụng sản phẩm tối ưu
npm run build

# 3. Khởi chạy máy chủ sản xuất mở mạng LAN (cho điện thoại và máy tính khác truy cập)
npx next start -H 0.0.0.0 -p 3000
```

### 7.3. Truy cập hệ thống
- **Chủ hệ thống:** Truy cập tại máy chủ [http://127.0.0.1:3000/he-thong](http://127.0.0.1:3000/he-thong) (yêu cầu localhost).
- **Quản trị cơ sở:** [http://localhost:3000/admin](http://localhost:3000/admin) hoặc `http://[IP_MÁY_CHỦ]:3000/admin`.
- **Cổng giáo viên:** [http://localhost:3000/giao-vien](http://localhost:3000/giao-vien) hoặc `http://[IP_MÁY_CHỦ]:3000/giao-vien`.
- **Cổng phụ huynh:** [http://localhost:3000](http://localhost:3000) hoặc `http://[IP_MÁY_CHỦ]:3000`.
