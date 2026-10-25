# HỆ THỐNG QUẢN TRỊ TRUNG TÂM / TRƯỜNG HỌC & ĐỐI SOÁT HỌC PHÍ THÔNG MINH

Ứng dụng web quản trị giáo dục đa cơ sở (Multi-Tenant Educational Management Platform) được xây dựng trên nền tảng **Next.js 16**, **React 19**, **TypeScript**, **Tailwind CSS v4** và **SQLite (`@libsql/client`)**.

---

## 🚀 CÁC PHÂN HỆ CỦA HỆ THỐNG

1. **Cổng Phụ Huynh (`/` hoặc `/phu-huynh`):**
   - Đăng nhập nhanh bằng số điện thoại.
   - Xem lịch học, gói học phí, mức học phí cần thanh toán.
   - Báo nghỉ học trực tuyến (+1 suất học bù).
   - Tự chọn ca học bù trực tiếp có kiểm tra sĩ số và cảnh báo lớp đông / khóa ca hết chỗ.

2. **Cổng Giáo Viên (`/giao-vien`):**
   - Đăng nhập bằng số điện thoại giáo viên (tối ưu hóa cho điện thoại di động).
   - Xem lịch dạy, danh sách học sinh theo ca.
   - Tự động nhận diện và gắn nhãn `[HỌC BÙ]` cho học sinh học bù.
   - Nâng cấp Level / Grade cho học sinh trực tiếp.

3. **Cổng Quản Trị Cơ Sở (`/admin`):**
   - Bảng điều khiển SaaS chuyên nghiệp, thống kê KPI doanh thu theo tháng.
   - Quản lý học sinh, phân công giáo viên, chọn giờ học chuẩn 24H theo ca mở cửa.
   - Quản lý gói học phí (tháng, quý, khóa, tuần) và đối soát công nợ (`Đã đóng` / `Cần đóng tiền`).
   - Quản lý trạng thái học tập: **Đang học**, **Bảo lưu** (có ngày dự kiến học lại), **Nghỉ học**, và **Học tiếp**.
   - Xem lịch sử biến động tổng hợp (Log biến động học sinh theo tháng và giờ).
   - Tích hợp gửi tin nhắn nhắc học phí Zalo 1-Click (mẫu tin nhắn soạn sẵn + nút Copy + mở chat Zalo).
   - Báo nghỉ và xếp lịch học bù, kiểm soát sức chứa lớp học.

4. **Cổng Quản Trị Hệ Thống Toàn Cục (`/he-thong`):**
   - Giới hạn bảo mật: chỉ cho phép truy cập từ máy chủ nội bộ (`localhost` / `127.0.0.1`), từ mạng ngoài sẽ báo 404 không tồn tại.
   - Quản lý các trường học, trung tâm và chi nhánh.
   - Bộ sinh tài khoản Admin thông minh theo cấu trúc: `TT-[Tên]-[Đường]-[Tỉnh]-[ChiNhánh]-QTVn`.
   - Sinh mật khẩu mạnh ngẫu nhiên 10 ký tự, có tính năng xem lại mật khẩu.
   - Cấu hình khóa IP Whitelist bảo vệ từng cơ sở.

---

## 📖 TÀI LIỆU CHI TIẾT
Vui lòng tham khảo tệp [DOCUMENTATION.md](./DOCUMENTATION.md) để xem chi tiết đầy đủ 100% về:
- Đặc tả nghiệp vụ từng phân hệ.
- Danh sách toàn bộ các API endpoint và tham số.
- Cấu trúc cơ sở dữ liệu SQLite.
- Quy tắc đối soát thanh toán và kiểm soát sĩ số.

---

## 🛠 HƯỚNG DẪN CÀI ĐẶT & CHẠY DỰ ÁN

### 1. Yêu cầu hệ thống
- **Node.js:** phiên bản 18 trở lên (khuyên dùng Node 20+).
- **npm** hoặc **yarn** / **pnpm**.

### 2. Cài đặt các gói phụ thuộc
```bash
npm install
```

### 3. Cấu hình file môi trường `.env`
Đảm bảo file `.env` tồn tại trong thư mục gốc với các thông tin:
```env
PORT=3000
SYSTEM_ADMIN_USER=systemadmin
SYSTEM_ADMIN_PASSWORD=your_secure_password_here
JWT_SECRET=your_jwt_secret_key
```

### 4. Khởi chạy môi trường phát triển (Development)
```bash
npm run dev
```
Truy cập ứng dụng tại [http://localhost:3000](http://localhost:3000).

### 5. Build và khởi chạy môi trường sản xuất (Production)
```bash
# 1. Build ứng dụng
npm run build

# 2. Khởi chạy server mở cho toàn bộ mạng nội bộ (LAN)
npx next start -H 0.0.0.0 -p 3000
```
- Truy cập từ máy tính khác trong mạng LAN: `http://[ĐỊA_CHỈ_IP_MÁY_CHỦ]:3000`.

---

## 📦 CÔNG NGHỆ SỬ DỤNG
- **Framework:** Next.js 16 (App Router) & React 19.
- **Ngôn ngữ:** TypeScript.
- **Styling:** Tailwind CSS v4 & Lucide Icons.
- **Database:** SQLite (`@libsql/client`), lưu trữ tại `data/admin.db`.
- **Triển khai:** Hỗ trợ Docker, VPS, Vercel, Node.js Server.
