# DEPLOYMENT.md - HƯỚNG DẪN TRIỂN KHAI, VẬN HÀNH & NÂNG CẤP
> **Dành cho:** `security-auditor`, `qa-walkthrough`, Main Agent  
> **Quy tắc bắt buộc:** Đọc file này trước khi triển khai môi trường mới hoặc thực hiện lệnh tự động nâng cấp. Cập nhật nhật ký triển khai ở cuối file.

---

## 1. YÊU CẦU MÔI TRƯỜNG & HẠ TẦNG
- **Node.js:** Phiên bản 18 trở lên (khuyên dùng Node 20 LTS hoặc Node 22).
- **Hệ điều hành hỗ trợ:** Windows 10/11, Ubuntu/Debian Linux, macOS.
- **Phần cứng đề xuất:** Tối thiểu 2GB RAM, 1 Core CPU (hệ thống siêu nhẹ với SQLite).

---

## 2. CÁC PHƯƠNG THỨC TRIỂN KHAI

### 2.1. Triển Khai Máy Chủ Cục Bộ / Mạng LAN (Local/Office Deployment)
Dành cho trường hợp đặt máy chủ ngay tại trung tâm:
```bash
# 1. Cài đặt dependency
npm install

# 2. Build ứng dụng
npm run build

# 3. Chạy máy chủ lắng nghe trên toàn bộ IP nội bộ
npx next start -H 0.0.0.0 -p 3000
```
- Máy tính văn phòng truy cập: `http://localhost:3000/admin`.
- Điện thoại của Giáo viên / Phụ huynh trong cùng mạng Wi-Fi truy cập: `http://[ĐỊA_CHỈ_IP_LAN]:3000`.

### 2.2. Triển Khai VPS / Cloud Server (Linux Systemd / PM2)
Sử dụng `pm2` để tự động khởi chạy lại khi máy chủ khởi động lại:
```bash
npm install -g pm2
pm2 start npm --name "student-tuition-admin" -- run start
pm2 save
pm2 startup
```

---

## 3. CƠ CHẾ TỰ NÂNG CẤP NÓNG (AUTO-UPGRADE SYSTEM)

Hệ thống hỗ trợ cập nhật 1-Click thông qua `scripts/run-upgrade.js`:
1. **Bước 1:** Tạo tệp cờ `.maintenance` báo hiệu hệ thống bảo trì. Component `MaintenanceGuard.tsx` chặn các truy cập của người dùng và chuyển sang trang chờ.
2. **Bước 2:** Kéo mã nguồn mới nhất từ nhánh `main`: `git pull origin main`.
3. **Bước 3:** Cài đặt các gói thư viện mới nếu có: `npm install`.
4. **Bước 4:** Biên dịch lại mã nguồn: `npm run build`.
5. **Bước 5:** Xóa tệp `.maintenance`, ghi log vào `upgrade.log` và khởi động lại dịch vụ máy chủ.

---

## 4. SAO LƯU & KHÔI PHỤC DỮ LIỆU (BACKUP & RESTORE)
- **Sao lưu:** Sao chép nguyên vẹn thư mục `data/` (chứa `admin.db`). Có thể viết cron job sao lưu định kỳ vào Google Drive / NAS mỗi đêm.
- **Khôi phục:** Đặt file `admin.db` đã sao lưu vào thư mục `data/` và khởi động lại ứng dụng.

---

## 5. NHẬT KÝ TRIỂN KHAI (DEPLOYMENT LOG)

| Ngày triển khai | Phiên bản | Môi trường | Trạng thái | Người thực hiện |
|---|---|---|---|---|
| 2026-10-26 | v2.5.0 | LAN / Production | Thành công | Admin |
| 2026-10-29 | v2.6.0 | Local Dev & Test | Ổn định | Main Agent |
