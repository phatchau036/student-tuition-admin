# CHANGELOG.md & ROADMAP - LỊCH SỬ THAY ĐỔI & LỘ TRÌNH PHÁT TRIỂN
> **Dành cho:** `completeness-auditor`, Main Agent  
> **Quy tắc bắt buộc:** Sau mỗi lần hoàn thành một tính năng mới hoặc bản phát hành, subagent BẮT BUỘC phải ghi nhận lịch sử vào tài liệu này.

---

## 1. LỊCH SỬ PHIÊN BẢN (CHANGELOG)

### [v2.6.0] - 2026-10-29
- **Tối ưu hóa ma trận xếp lịch:** Hoàn thiện `ClassroomScheduleMatrix.tsx` hỗ trợ lưới ca học động và phát hiện xung đột giờ học của học sinh.
- **Tự động nhận diện giờ học thông minh từ Excel:** Cải tiến thuật toán bóc tách chuỗi thời gian tự do thành các bản ghi `ScheduleItem[]` chuẩn xác.
- **Tích hợp Zalo 1-Click & Modal tư vấn chỗ trống:** Bổ sung `ScheduleAvailabilityModal.tsx` giúp tra cứu nhanh ca còn chỗ trống và copy tin nhắn Zalo gửi phụ huynh chỉ với 1 click.
- **Chuẩn hóa kiến trúc 13 Subagent & Bộ tài liệu điều phối:** Khởi tạo bộ hồ sơ 22 tài liệu kỹ thuật hoàn chỉnh (`AGENTS.md`, `INDEX.md`, `ARCHITECTURE.md`...).

### [v2.5.0] - 2026-10-26
- **Đa ngôn ngữ toàn diện (Full i18n):** Hỗ trợ 4 ngôn ngữ (Tiếng Việt 🇻🇳, English 🇬🇧, Tiếng Trung 🇨🇳, Tiếng Nhật 🇯🇵).
- **1-Click Tự động cập nhật từ GitHub:** Tích hợp `scripts/run-upgrade.js` và cờ bảo trì `.maintenance`.
- **Chế độ bảo trì thông minh (`MaintenanceGuard.tsx`):** Chuyển hướng người dùng tự động khi server đang nâng cấp.
- **Tự động cộng dồn nợ học phí quá 1 tháng:** Phát hiện học sinh nợ liên tiếp từ 2 tháng trở lên, cảnh báo đỏ nhấp nháy.
- **2 Tùy chọn kiểm soát sĩ số ca học:** Hỗ trợ tính theo ca mở cửa cơ sở HOẶC theo giáo viên đứng lớp. Khóa cứng ca học khi hết suất (không cho click).

### [v2.4.0] - 2026-10-25
- **Tích hợp SePay Webhook tự động:** Tự gạch nợ học sinh theo mã học sinh và số điện thoại.
- **Cửa sổ Tổng Kết Tháng (Monthly Summary):** Thống kê dự thu, thực thu, công nợ và nhật ký SePay.
- **Lý do chiết khấu:** Cấu hình tên/lý do mốc chiết khấu trong Cài đặt và tự động điền vào hồ sơ học sinh.
- **Ngày bắt đầu đăng ký học:** Bổ sung trường ngày nhập học kèm nút 1-click "Hôm nay (Hiện tại ngay)".
- **Kênh tiếp nhận góp ý phụ huynh & hệ thống:** Form đánh giá sao của phụ huynh và kênh đề xuất tính năng cho TpTeam.

### [v2.3.0] - 2026-10-24
- **Khởi tạo nền tảng quản trị trung tâm:** Quản lý học sinh, danh sách lớp, gói học phí, phân công giáo viên và cổng phụ huynh tra cứu.
- **Quản lý học bù & sĩ số:** Đăng ký học bù trực tuyến, theo dõi số buổi cần bù của học sinh.

---

## 2. LỘ TRÌNH PHÁT TRIỂN TRONG TƯƠNG LAI (ROADMAP)

### Giai đoạn tiếp theo (v2.7.0)
- [ ] **Mã QR Động VietQR:** Sinh trực tiếp mã QR VietQR trên hóa đơn của phụ huynh với số tiền và nội dung chuyển khoản được nhúng sẵn.
- [ ] **Điểm danh bằng Quét mã QR:** Cho phép giáo viên dùng camera điện thoại quét mã QR trên thẻ học sinh để điểm danh tự động vào lớp.
- [ ] **Trợ lý AI Chatbot Phụ huynh:** Trợ lý ảo trả lời lịch học và học phí tự động 24/7.

---

## 3. NHẬT KÝ THEO DÕI THAY ĐỔI (LOG)

| Ngày | Phiên bản | Tóm tắt thay đổi | Người duyệt |
|---|---|---|---|
| 2026-10-29 | v2.6.0 | Phát hành hệ thống quản lý lịch thông minh và bộ 22 tài liệu điều phối AI | `completeness-auditor` |
