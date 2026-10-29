# ENV_CONFIG.md - DANH MỤC BIẾN MÔI TRƯỜNG & DỊCH VỤ BÊN THỨ BA
> **Dành cho:** `security-auditor`, Main Agent  
> **Quy tắc bắt buộc:** File này chỉ liệt kê tên biến, mục đích và giá trị mẫu an toàn. TUYỆT ĐỐI KHÔNG GHI GIÁ TRỊ THẬT, SECRET HAY TOKEN THỰC TẾ VÀO FILE NÀY! Cập nhật nhật ký ở cuối file.

---

## 1. TỆP MÔI TRƯỜNG `.env` (ĐẶT TẠI THƯ MỤC GỐC)

Hệ thống yêu cầu các biến môi trường sau trong tệp `.env`:

```env
# 1. Cổng lắng nghe của máy chủ Web (Mặc định: 3000)
PORT=3000

# 2. Tài khoản Super Admin (Cổng /he-thong - Chỉ truy cập từ localhost)
SYSTEM_ADMIN_USER=systemadmin

# 3. Mật khẩu Super Admin (Khuyên dùng chuỗi ngẫu nhiên mạnh > 12 ký tự)
SYSTEM_ADMIN_PASSWORD=your_super_secret_system_password_here

# 4. Khóa bí mật dùng ký và xác thực mã hóa JWT / Token
JWT_SECRET=your_jwt_secret_encryption_key_here

# 5. Môi trường thực thi (development | production)
NODE_ENV=production
```

---

## 2. CẤU HÌNH DỊCH VỤ BÊN THỨ BA (LƯU TRONG BẢNG `settings`)

Các cấu hình tích hợp dịch vụ bên ngoài được quản lý linh hoạt trong bảng `settings` thông qua giao diện `SettingsModal.tsx` thay vì ghi cứng trong `.env`, giúp trung tâm có thể thay đổi ngay trên giao diện mà không cần restart server:

| Tên cấu hình (Key) | Mục đích | Nguồn cấp |
|---|---|---|
| `sepay_api_key` | Khóa bí mật xác thực Webhook SePay | SePay Developer Portal |
| `sepay_account_number` | Số tài khoản ngân hàng nhận tiền học phí | Ngân hàng của trung tâm |
| `sepay_bank_name` | Tên ngân hàng nhận (Vietcombank, MB, Techcombank...) | Ngân hàng |
| `sepay_prefix` | Tiền tố nhận diện chuyển khoản (mặc định: `HP`) | Cài đặt trung tâm |
| `zalo_bot_token` | Token kết nối Zalo Bot chính thức | Zalo Bot Creator (@Zalo Bot Manager) |
| `zalo_bot_name` | Tên hiển thị của Zalo Bot (bắt đầu bằng tiền tố `Bot...`)| Zalo Bot Manager |

---

## 3. CHECKLIST AN TOÀN BẢO MẬT BIẾN MÔI TRƯỜNG
- [ ] Tệp `.env` đã được khai báo trong `.gitignore` (không bao giờ đẩy lên Git).
- [ ] Mật khẩu `SYSTEM_ADMIN_PASSWORD` có độ dài $\ge 10$ ký tự, chứa chữ hoa, số và ký tự đặc biệt.
- [ ] `JWT_SECRET` là chuỗi entropy cao, không dùng chuỗi mặc định dễ đoán.

---

## 4. NHẬT KÝ CẤU HÌNH (ENV LOG)

| Ngày | Biến môi trường | Trạng thái |
|---|---|---|
| 2026-10-29 | Khởi tạo tài liệu quy chuẩn biến môi trường và tách biệt an toàn | `security-auditor` |
