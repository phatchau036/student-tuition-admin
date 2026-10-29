# KNOWN_ISSUES.md - CÁC VẤN ĐỀ ĐÃ BIẾT & NỢ KỸ THUẬT (TECHNICAL DEBT)
> **Dành cho:** `bug-investigator`, Main Agent  
> **Quy tắc bắt buộc:** Khi điều tra lỗi, subagent phải tra cứu file này trước để xem sự cố đã từng được ghi nhận hay chưa. Cập nhật nhật ký khi phát hiện vấn đề mới.

---

## 1. DANH SÁCH CÁC VẤN ĐỀ ĐÃ BIẾT (KNOWN ISSUES)

### KI-001: Môi Trường Chưa Cài Đặt Sẵn `node_modules` Trên Một Số Máy Khách
- **Mô tả:** Lệnh `npm run lint` hoặc `npm run build` có thể báo lỗi `'eslint' is not recognized` nếu thư mục `node_modules` chưa được giải nén hoặc người dùng mới clone git mà chưa chạy `npm install`.
- **Cách khắc phục:** Chạy `npm install` một lần đầu tiên sau khi kéo repo về.

### KI-002: Header `Host` Thay Đổi Khi Đi Qua Reverse Proxy NGINX
- **Mô tả:** Nếu triển khai sau NGINX mà không cấu hình `proxy_set_header X-Forwarded-For $remote_addr;` và `proxy_set_header Host $host;`, hàm `getClientIp()` có thể chỉ nhìn thấy IP của proxy (`127.0.0.1`), dẫn đến cơ chế IP Whitelist nhận diện sai IP người dùng thật.
- **Cách khắc phục:** Cấu hình đúng file `nginx.conf` với đầy đủ các header `X-Forwarded-For` và `X-Real-IP` như hướng dẫn trong [DEPLOYMENT.md](./DEPLOYMENT.md).

### KI-003: SQLite Single-Writer Lock Khi Có Quá Nhiều Thao Tác Ghi Đồng Thời
- **Mô tả:** SQLite chỉ cho phép 1 transaction ghi tại 1 thời điểm. Nếu hàng chục người cùng lúc nhập Excel lớn hoặc nhiều webhook SePay gọi cùng giây, có thể phát sinh `SQLITE_BUSY`.
- **Cách khắc phục:** Driver `@libsql/client` đã có cơ chế tự động retry. Với các import lớn, chia thành batch nhỏ 20-50 dòng mỗi đợt.

### KI-004: Mất Giờ Học Trong Side Drawer Và Khi Thêm Học Viên Ca Tròn Giờ (ĐÃ KHẮC PHỤC)
- **Mô tả:** Khi mở Side Drawer ở các ca có học sinh học giờ tròn (VD: 09:00 - 10:00, 18:00 - 19:00), cột giờ hiển thị của học sinh bị bỏ trống. Khi thêm học sinh mới vào ca này, giờ học cũng bị mất tương tự.
- **Nguyên nhân:** Hàm `parseStudentScheduleSlots` lọc sai điều kiện `timeDetail` cho các giờ chẵn kết thúc bằng `:00` và bắt đầu không có `:30`, đồng thời lỗi gõ `01:00` thay vì `11:00` hoặc `13:00` chưa được tự động chuẩn hóa.
- **Cách khắc phục:** Đã chuẩn hóa `parseStudentScheduleSlots` luôn gán `timeDetail` đầy đủ (`start_time - end_time`), tự động chuyển đổi giờ 12h sang 24h và bổ sung fallback an toàn trong `ClassroomScheduleMatrix.tsx`.

### KI-005: Không Thêm Được Giáo Viên Và Danh Sách Hiển Thị 0 Giáo Viên (ĐÃ KHẮC PHỤC)
- **Mô tả:** Khi mở modal Quản lý Đội ngũ Giáo viên trên màn hình laptop, người dùng không nhìn thấy nút thêm/lưu giáo viên do form bị tràn. Thêm vào đó, danh sách hiển thị `Danh sách giáo viên (0)` dù trong DB đã có giáo viên.
- **Nguyên nhân:**
  1. Giao diện: Cột form bên trái không có cuộn riêng, nút submit bị trôi khỏi màn hình dưới chân trang, trong khi footer chỉ có nút "Đóng".
  2. Dữ liệu: `TeacherManagementModal` không nhận `schoolId` từ `Dashboard`, không gửi `x-school-id` và `Authorization` header, dẫn đến giáo viên bị lưu nhầm vào `school-default` trong khi Dashboard query theo ID trường riêng.
- **Cách khắc phục:** 
  1. Thêm thanh cuộn riêng cho form bên trái, đưa nút Lưu/Thêm Giáo Viên vào thẳng thanh Footer cạnh nút Đóng.
  2. Bổ sung `schoolId` prop, gửi đầy đủ token và headers.
  3. API hỗ trợ fallback `WHERE school_id = ? OR school_id = 'school-default'`, cùng cơ chế retry an toàn khi chèn dữ liệu.

---

## 2. NỢ KỸ THUẬT CẦN TỐI ƯU TRONG TƯƠNG LAI (TECHNICAL DEBT)
- [ ] Bổ sung cơ chế Rate Limiting cho API đăng nhập `/api/parent` và `/api/teacher` chống brute-force quét SĐT.
- [ ] Thêm chỉ mục (Index) SQLite cho cột `phone` và `student_code` trong bảng `students` để tăng tốc độ truy vấn khi danh sách vượt quá 10.000 học sinh.

---

## 3. NHẬT KÝ THEO DÕI VẤN ĐỀ (KNOWN ISSUES LOG)

| Mã lỗi | Mô tả | Trạng thái | Ngày ghi nhận |
|---|---|---|---|
| KI-001 | Thiếu `node_modules` khi chạy `npm run lint` | Đã có hướng dẫn `npm install` | 2026-10-29 |
| KI-002 | Trích xuất IP qua Reverse Proxy | Đã xử lý trong `ipHelper.ts` | 2026-10-29 |
| KI-003 | SQLite Busy lock khi ghi đồng thời | Đã có cơ chế retry của LibSQL | 2026-10-29 |
| KI-004 | Mất giờ học sinh trong Drawer và khi thêm mới | Đã xử lý triệt để (Fixed) | 2026-10-29 |
| KI-005 | Không thêm được giáo viên và danh sách hiển thị 0 | Đã xử lý triệt để (Fixed) | 2026-10-29 |
