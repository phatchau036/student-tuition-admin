# DECISIONS.md - CÁC QUYẾT ĐỊNH KIẾN TRÚC & KỸ THUẬT (ADR)
> **Dành cho:** `scope-planner`, `code-reviewer`, Main Agent  
> **Quy tắc bắt buộc:** Trước khi đề xuất thay đổi kiến trúc hoặc thư viện, subagent phải đọc tài liệu này để không đưa ra giải pháp mâu thuẫn với các quyết định đã chốt. Ghi lại quyết định mới vào bảng cuối file.

---

## MỤC LỤC CÁC QUYẾT ĐỊNH (ARCHITECTURE DECISION RECORDS)

- [ADR-001: Lựa chọn Cơ Sở Dữ Liệu SQLite Nhúng (@libsql/client)](#adr-001-lựa-chọn-cơ-sở-dữ-liệu-sqlite-nhúng-libsqlclient)
- [ADR-002: Quản Lý Migration Bằng Mã Nguồn Trong initDb() Thay Vì ORM Bên Ngoài](#adr-002-quản-lý-migration-bằng-mã-nguồn-trong-initdb-thay-vì-orm-bên-ngoài)
- [ADR-003: Tuyệt Đối Chặn Commit Tệp Database Lên Git (data/*.db)](#adr-003-tuyệt-đối-chặn-commit-tệp-database-lên-git-datadb)
- [ADR-004: Mô Hình 4 Phân Hệ Độc Lập Trên Cùng 1 Next.js App Router](#adr-004-mô-hình-4-phân-hệ-độc-lập-trên-cùng-1-nextjs-app-router)
- [ADR-005: Bảo Vệ Cổng Super Admin /he-thong Bằng Localhost Guard & Báo Giả 404](#adr-005-bảo-vệ-cổng-super-admin-he-thong-bằng-localhost-guard--báo-giả-404)
- [ADR-006: Bảo Vệ Cổng Cơ Sở /admin Bằng IP Whitelist Tùy Chọn](#adr-006-bảo-vệ-cổng-cơ-sở-admin-bằng-ip-whitelist-tùy-chọn)
- [ADR-007: Xác Thực Passwordless Bằng Số Điện Thoại Cho Giáo Viên & Phụ Huynh](#adr-007-xác-thực-passwordless-bằng-số-điện-thoại-cho-giáo-viên--phụ-huynh)
- [ADR-008: Quản Lý Học Phí Theo Gói Chu Kỳ (Tháng / Tuần) Thay Vì Đơn Giá Cố Định](#adr-008-quản-lý-học-phí-theo-gói-chu-kỳ-tháng--tuần-thay-vì-đơn-giá-cố-định)
- [ADR-009: Báo Nghỉ Tự Động Cộng +1 Suất Bù Và Khóa Cứng Ca Học Khi Sĩ Số Đạt 100%](#adr-009-báo-nghỉ-tự-động-cộng-1-suất-bù-và-khóa-cứng-ca-học-khi-sĩ-số-đạt-100)
- [ADR-010: Tự Động Gạch Nợ Học Phí Bằng SePay Webhook Theo Mã Học Sinh](#adr-010-tự-động-gạch-nợ-học-phí-bằng-sepay-webhook-theo-mã-học-sinh)
- [ADR-011: Cơ Chế Tự Nâng Cấp Nóng Qua Git & Cờ Bảo Trì .maintenance](#adr-011-cơ-chế-tự-nâng-cấp-nóng-qua-git--cờ-bảo-trì-maintenance)
- [ADR-012: Hỗ Trợ Đa Ngôn Ngữ Nhẹ Nhàng Bằng Client Context (i18n.tsx)](#adr-012-hỗ-trợ-đa-ngôn-ngữ-nhẹ-nhàng-bằng-client-context-i18ntsx)

---

### ADR-001: Lựa chọn Cơ Sở Dữ Liệu SQLite Nhúng (@libsql/client)
- **Bối cảnh:** Dự án phục vụ các trung tâm/trường học cần triển khai đơn giản, chạy mượt mà trên máy tính để bàn, laptop nội bộ, VPS nhỏ hoặc mạng LAN mà không yêu cầu cài đặt máy chủ DB nặng (MySQL/Postgres).
- **Quyết định:** Sử dụng SQLite nhúng qua thư viện `@libsql/client` (file `data/admin.db`).
- **Hệ quả:**
  - ✅ Ưu điểm: Không cần cài đặt daemon DB riêng, sao lưu chỉ cần copy 1 file, khởi động tức thì, tốc độ đọc cục bộ siêu nhanh.
  - ⚠️ Nhược điểm: Cần lưu ý giới hạn ghi đồng thời (single-writer). Với quy mô trung tâm giáo dục vài nghìn học sinh, SQLite hoàn toàn đáp ứng xuất sắc.

---

### ADR-002: Quản Lý Migration Bằng Mã Nguồn Trong initDb() Thay Vì ORM Bên Ngoài
- **Bối cảnh:** Khi phân phối phần mềm cho nhiều cơ sở (hoặc giữa máy Dev và máy Vận hành), việc chạy các lệnh CLI migration (Prisma migrate, Drizzle kit) phức tạp và dễ gây lỗi thiếu cột nếu người dùng không có kiến thức kỹ thuật.
- **Quyết định:** Viết toàn bộ DDL schema và migration trực tiếp bằng TypeScript trong hàm `initDb()` tại `src/lib/db.ts`. Khi server khởi động hoặc có người truy cập, hệ thống tự động:
  1. `CREATE TABLE IF NOT EXISTS` cho các bảng mới.
  2. `try { await db.execute("ALTER TABLE ... ADD COLUMN ..."); } catch {}` cho các cột mới.
- **Hệ quả:**
  - ✅ Ưu điểm: Tự động 100%, không bao giờ mất dữ liệu cũ, kéo code về là chạy ngay.
  - ⚠️ Nhược điểm: Developer phải nhớ bổ sung lệnh `ALTER TABLE` vào `initDb()` mỗi khi thêm trường mới.

---

### ADR-003: Tuyệt Đối Chặn Commit Tệp Database Lên Git (data/*.db)
- **Bối cảnh:** Máy Dev (A) và Máy Thực Tế (B) đều chạy ứng dụng. Nếu commit file `.db` lên Git, dữ liệu thật của học sinh và công nợ trên máy B sẽ bị ghi đè hoặc gây xung đột Git binary conflict nghiêm trọng.
- **Quyết định:** Đưa `data/*.db`, `data/*.db-wal`, `data/*.db-journal` vào `.gitignore`. Thư mục `data/` chỉ giữ file `data/.gitkeep`.
- **Hệ quả:** Mã nguồn và Dữ liệu kinh doanh được tách biệt 100%.

---

### ADR-004: Mô Hình 4 Phân Hệ Độc Lập Trên Cùng 1 Next.js App Router
- **Bối cảnh:** Hệ thống có 4 đối tượng người dùng hoàn toàn khác biệt: Chủ hệ thống, Quản trị cơ sở, Giáo viên, và Phụ huynh.
- **Quyết định:** Xây dựng 4 phân hệ URL độc lập trên cùng 1 repo Next.js:
  - `/he-thong`: Super Admin
  - `/admin`: School Admin
  - `/giao-vien`: Teacher Portal
  - `/` hoặc `/phu-huynh`: Parent Portal
- **Hệ quả:** Tái sử dụng được toàn bộ backend lib, types và SQLite database mà không cần tách microservices.

---

### ADR-005: Bảo Vệ Cổng Super Admin /he-thong Bằng Localhost Guard & Báo Giả 404
- **Bối cảnh:** Trang quản trị toàn cục chứa thông tin nhạy cảm (tạo trường, xem mật khẩu admin cơ sở). Không được để lộ ra mạng Internet hoặc mạng LAN.
- **Quyết định:**
  - Chỉ cho phép request có IP là `127.0.0.1` hoặc `::1` truy cập `/he-thong`.
  - Mọi request từ IP khác sẽ nhận về mã HTTP `404 Not Found` (ngụy trang như trang web không hề tồn tại).
- **Hệ quả:** Hacker hoặc người dùng mạng ngoài không thể dò tìm hoặc brute-force trang chủ hệ thống.

---

### ADR-006: Bảo Vệ Cổng Cơ Sở /admin Bằng IP Whitelist Tùy Chọn
- **Bối cảnh:** Chủ trường học muốn nhân viên quản trị chỉ được phép vào hệ thống khi đang ngồi tại văn phòng trung tâm (kết nối Wi-Fi cơ sở).
- **Quyết định:** Cho phép bật `ip_restriction_enabled` và cấu hình danh sách `allowed_ips` cho từng trường. Server sẽ trả về `403 Forbidden` nếu truy cập từ IP lạ.
- **Hệ quả:** Tăng cường an ninh, chống rò rỉ dữ liệu học sinh ra ngoài cơ sở.

---

### ADR-007: Xác Thực Passwordless Bằng Số Điện Thoại Cho Giáo Viên & Phụ Huynh
- **Bối cảnh:** Phụ huynh và giáo viên thường xuyên quên mật khẩu phức tạp, gây phiền toái cho trung tâm khi phải cấp lại mật khẩu.
- **Quyết định:**
  - Cổng Phụ huynh và Cổng Giáo viên chỉ yêu cầu nhập **Số điện thoại** đã đăng ký trên hệ thống.
  - Server đối soát SĐT với danh sách học sinh / giáo viên hợp lệ và cấp phiên làm việc.
- **Hệ quả:** Trải nghiệm đăng nhập nhanh chóng, phụ huynh tra cứu lịch học và báo nghỉ trong vòng 5 giây.

---

### ADR-008: Quản Lý Học Phí Theo Gói Chu Kỳ (Tháng / Tuần) Thay Vì Đơn Giá Cố Định
- **Bối cảnh:** Các trung tâm hiện đại không chỉ thu tiền từng tháng mà còn bán các gói: Theo quý (3 tháng), Khóa 6 tháng, Khóa 1 năm, hoặc Gói 24 tuần có chiết khấu và quà tặng kèm.
- **Quyết định:** Triển khai bảng `tuition_packages` với `cycle_unit` ('month' | 'week') và `cycle_value`. Khi đối soát `paid`, hệ thống tự động ghi nhận trạng thái đã đóng xuyên suốt toàn bộ khoảng thời gian từ `start_period` đến `end_period`.
- **Hệ quả:** Tự động hóa tính toán công nợ, học sinh đóng gói 6 tháng sẽ không bị báo nợ vào các tháng giữa khóa.

---

### ADR-009: Báo Nghỉ Tự Động Cộng +1 Suất Bù Và Khóa Cứng Ca Học Khi Sĩ Số Đạt 100%
- **Bối cảnh:** Phụ huynh báo nghỉ cần được học bù, nhưng nếu xếp bù vô tội vạ sẽ làm lớp quá tải, giảm chất lượng giảng dạy.
- **Quyết định:**
  - Báo nghỉ $\rightarrow$ cộng ngay 1 suất bù tồn (`pending`).
  - Khi xếp bù: Tính toán sĩ số thời gian thực của ca học (học sinh cố định + học sinh xếp bù).
  - Đạt $\ge 80\%$ sĩ số: Bật cảnh báo vàng `Lớp đông`.
  - Đạt $100\%$ sĩ số: Khóa cứng viền đỏ `Ca đã đầy`, vô hiệu hóa nút đăng ký.
- **Hệ quả:** Đảm bảo công bằng cho phụ huynh và kiểm soát chất lượng đào tạo tuyệt đối.

---

### ADR-010: Tự Động Gạch Nợ Học Phí Bằng SePay Webhook Theo Mã Học Sinh
- **Bối cảnh:** Kế toán phải mất hàng giờ mỗi ngày để kiểm tra sao kê ngân hàng và đánh dấu thủ công từng học sinh.
- **Quyết định:** Tích hợp SePay Webhook (`/api/sepay/webhook`). Khi phụ huynh chuyển khoản với nội dung `HP [Mã_HS]` hoặc chứa số điện thoại, hệ thống tự động gạch nợ thành `paid` và lưu lịch sử vào `sepay_transactions`.
- **Hệ quả:** Tự động hóa 100% quy trình đối soát học phí ngân hàng không cần can thiệp tay.

---

### ADR-011: Cơ Chế Tự Nâng Cấp Nóng Qua Git & Cờ Bảo Trì .maintenance
- **Bối cảnh:** Người dùng vận hành không biết dùng terminal / Git để cập nhật phiên bản mới.
- **Quyết định:**
  - Cung cấp nút "1-Click Tự Động Cập Nhật" tại `/he-thong` gọi đến `scripts/run-upgrade.js`.
  - Tạo tệp cờ `.maintenance`. Component `MaintenanceGuard.tsx` tự động chuyển hướng toàn bộ người dùng về trang `/maintenance` với đồng hồ đếm ngược.
  - Script tự chạy `git pull`, `npm install`, `npm run build` và khởi động lại dịch vụ.
- **Hệ quả:** Nâng cấp hệ thống an toàn, chuyên nghiệp, người dùng không gặp lỗi màn hình trắng trong lúc đang build.

---

### ADR-012: Hỗ Trợ Đa Ngôn Ngữ Nhẹ Nhàng Bằng Client Context (i18n.tsx)
- **Bối cảnh:** Hệ thống cần hỗ trợ 4 ngôn ngữ (Tiếng Việt, Tiếng Anh, Tiếng Trung, Tiếng Nhật) nhưng tránh dùng các thư viện i18n cồng kềnh làm phình bundle size.
- **Quyết định:** Xây dựng `src/lib/i18n.tsx` dạng React Context với từ điển dịch thuật chuẩn hóa, lưu tùy chọn ngôn ngữ vào `localStorage` và `settings`.
- **Hệ quả:** Tốc độ chuyển đổi tức thì, không gây giật lag và dung lượng bundle cực nhẹ.

---

## BẢNG GHI NHẬN QUYẾT ĐỊNH MỚI (NEW DECISIONS LOG)

| Ngày quyết định | Mã ADR | Tiêu đề quyết định | Trạng thái | Người duyệt / Agent |
|---|---|---|---|---|
| 2026-10-29 | ADR-001 -> ADR-012 | Chuẩn hóa 12 quyết định kiến trúc cốt lõi của hệ thống v2.6 | Đã duyệt & áp dụng | Main Agent / User |
