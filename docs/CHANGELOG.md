# CHANGELOG.md & ROADMAP - LỊCH SỬ THAY ĐỔI & LỘ TRÌNH PHÁT TRIỂN
> **Dành cho:** `completeness-auditor`, Main Agent  
> **Quy tắc bắt buộc:** Sau mỗi lần hoàn thành một tính năng mới hoặc bản phát hành, subagent BẮT BUỘC phải ghi nhận lịch sử vào tài liệu này.

---

## 1. LỊCH SỬ PHIÊN BẢN (CHANGELOG)

### [v2.8.1] - 2026-10-30
- **⭐ TỰ ĐỘNG CỘNG PHỤ THU LEVEL VÀO GÓI HỌC PHÍ & BẢNG KÊ CẤU THÀNH:**
  - Khắc phục triệt để lỗi học phí không tự cộng tiền phụ thu level khi học sinh chọn Gói Học Phí (`tuition_package_id`): Áp dụng chuẩn hóa công thức `Học phí = (Gói học phí + Phụ thu level) × (1 - Chiết khấu %)` trên toàn bộ hệ thống API (`/api/students`, `/api/parent`, `/api/payments`, `/api/reconciliation/summary`).
  - **Bảng kê cấu thành học phí minh bạch (`StudentDetailModal.tsx`):** Hiển thị chi tiết từng khoản cấu thành tiền học: Học phí gói + Phụ thu level - Chiết khấu % + Điều chỉnh tháng + Nợ cũ tích lũy = Tổng thực thu cần đóng.
  - **Diễn giải công thức học phí trên Bảng học sinh (`Dashboard.tsx`):** Cột Học phí hiển thị số tiền chính xác kèm dòng nhãn công thức trực quan (ví dụ `+ 200.000 đ level`), click trực tiếp vào số tiền để mở popup bảng kê chi tiết.
  - **Đồng bộ hóa tin nhắn Zalo & Cổng phụ huynh:** Tự động liệt kê rõ học phí gói, phụ thu level và ưu đãi trong tin nhắn Zalo nhắc phí (`ZaloReminderModal.tsx`) và trên hóa đơn Cổng Phụ Huynh (`ParentPortal.tsx`).

- **⭐ SẮP XẾP THỨ TỰ LEVEL LINH HOẠT & SORT CỘT GIỐNG GOOGLE SHEETS:**
  - **Kéo thả (Drag & Drop) & Nút Lên/Xuống trong Cài Đặt (`SettingsModal.tsx`):** Cho phép admin kéo thả hoặc bấm nút `↑`/`↓` để sắp xếp thứ tự ưu tiên các Level (ví dụ: *Grade 1 trước Grade 3, Grade 7, Cơ bản lên đầu...*), tự động lưu trường `sort_order` vào CSDL.
  - **Sort cột Header chuẩn Google Sheets (`Dashboard.tsx`):** Bấm trực tiếp vào tiêu đề cột `LEVEL & PHỤ THU` để sort danh sách học sinh theo đúng thứ tự level đã thiết lập trong Cài đặt; hỗ trợ sort 2 chiều cho Tên học sinh, Trạng thái, Giáo viên và Mức học phí.

- **⭐ DÁN ẢNH MINH HỌA (CTRL+V) TRONG GÓP Ý TPTEAM:**
  - **Hỗ trợ dán ảnh màn hình `Ctrl + V` trực tiếp (`AppInfoModal.tsx`):** Cho phép chụp màn hình lỗi và ấn `Ctrl + V` ngay trong ô góp ý để đính kèm ảnh (tự động nén canvas lưu dạng `images_json`), kèm nút chọn file từ máy, lưới thumbnail xem trước và Lightbox phóng to ảnh.

- **⭐ SỬA LỖI NHẬP TIỀN LẺ TRONG CHỈNH SỬA HỌC PHÍ RIÊNG:**
  - Chuyển toàn bộ các ô nhập số tiền phụ thu/giảm trừ và học phí cuối cùng sang `step="any"` (`MonthlyTuitionModal.tsx`, `QuickAuditModal.tsx`, `SettingsModal.tsx`), loại bỏ lỗi cảnh báo đỏ của trình duyệt và cho phép nhập tự do mọi số tiền lẻ lẻ (35.000 đ, 9.562 đ...).
  - Xóa bỏ số 0 thừa ở đầu khi bắt đầu gõ số tiền mới.

### [v2.8.0] - 2026-10-30
- **⭐ HỆ THỐNG CÁC KIỂU LỊCH HỌC & MA TRẬN TỰ TÍNH THỜI LƯỢNG (Schedule Presets & Auto Matrix):**
  - **Chuẩn hóa duy nhất 1 hình thức quản lý lịch học:** Loại bỏ hoàn toàn Hình thức 1 (Theo tổng số tiếng / tuần nhập tay mù mờ), chuyển đổi 100% sang hình thức quản lý theo **Kiểu Lịch Học Cơ Sở & Ma Trận Thời Lượng**.
  - **Hiển thị trực quan Tên Kiểu Lịch Học (Thứ chẵn, Thứ lẻ, Cuối tuần...) trên bảng Học Sinh:** Cột *Gói & Lịch Học* tại `Dashboard.tsx` có huy hiệu nhận diện kiểu lịch riêng biệt (`[📅 Thứ chẵn (2-4-6)]`, `[📅 Cuối tuần (T7-CN)]`...), kèm hàm nhận diện thông minh `detectStudentPresetName` áp dụng ngay cho cả học sinh cũ và mới.
  - Cho phép cơ sở tạo không giới hạn các "Kiểu Lịch Học" (Preset): tự đặt tên kiểu (ví dụ: *Thứ chẵn 2-4-6*, *Thứ lẻ 3-5-7*, *Cuối tuần T7-CN*), chọn các ngày trong tuần và thời lượng 1 buổi (ví dụ: 1.5 tiếng/buổi).
  - Tích hợp trực tiếp vào `SettingsModal.tsx` với card ma trận tính toán tự động: $\text{Số buổi} \times \text{Số tiếng/buổi} = \text{Tổng tiếng/tuần}$ (và quy đổi phút/tuần).
  - Nâng cấp `StudentFormModal.tsx`: Chọn trực tiếp theo Kiểu Lịch Học từ Cài Đặt (không cần nhập tay thứ hay số tiếng), tự động tính ma trận tuần.
  - Tự động sinh `schedule_details_json` đồng bộ hoàn hảo sang Ma Trận Xếp Lịch `ClassroomScheduleMatrix` và hệ thống Ví Giờ Học.
  - Thêm cột `schedule_preset_name` vào bảng `students` và key `schedule_presets` trong bảng `settings`. Mặc định hệ thống gán `duration_mode = 'by_sessions'`.

### [v2.7.0] - 2026-10-29
- **⭐ VÍ GIỜ HỌC (Hour Wallet System):** Thay đổi nền tảng cơ chế học bù — bỏ đếm "suất bù", chuyển sang số dư phút trong ví:
  - Cấp giờ tự động khi đóng tiền theo công thức chu kỳ tháng (`4 tuần + 2 ngày = 13 buổi × 90 phút`), tự xử lý em vào giữa tháng và ngày nghỉ lễ.
  - Trừ giờ theo **phút học thật** khi điểm danh (không trừ theo buổi). Nghỉ có phép giữ nguyên giờ để bù, chia nhỏ tùy ý (30 phút hôm nay + 30 phút ngày mai).
  - Sổ cái `hour_ledger` là nguồn sự thật duy nhất, idempotent theo `ref_type + ref_id` — chạy lại không bao giờ ghi đôi.
  - **Setting mới:** Admin tự cấu hình "1 buổi học = X phút" (45/60/90/120...) trong Cài đặt → Học phí & Thời lượng.
  - API mới `/api/wallet` (9 actions): cấp giờ, điểm danh, báo nghỉ, xếp bù kiểm soát số dư khả dụng, hủy bù, điều chỉnh tay, xem sổ cái phân trang.
  - Hook tự động cấp giờ tại cả 2 điểm đóng tiền: Dashboard đối soát + SePay Webhook.
  - Dashboard: badge "Nợ X buổi bù" → **"Còn 7h30"** (xanh lá ≥ 3h, vàng < 3h, đỏ nhấp nháy khi âm).
  - Migration an toàn: `node scripts/migrate-hour-wallet.js --dry-run` — chuyển suất bù cũ thành ADJUST, lịch bù cũ thành lessons, cấp bù GRANT cho tháng đã đóng.

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
