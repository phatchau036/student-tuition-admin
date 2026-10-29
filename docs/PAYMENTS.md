# PAYMENTS.md - QUẢN LÝ HỌC PHÍ, ĐỐI SOÁT CÔNG NỢ & TÍCH HỢP SEPAY
> **Dành cho:** `security-auditor`, `test-writer`, `api-db-designer`, Main Agent  
> **Quy tắc bắt buộc:** Mọi tính toán liên quan đến tiền bạc, đối soát chu kỳ gói, nợ quá hạn hoặc xử lý Webhook SePay BẮT BUỘC phải đọc tài liệu này trước. Cập nhật nhật ký ở cuối file.

---

## 1. CÔNG THỨC & CƠ CHẾ TÍNH HỌC PHÍ

### 1.1. Công thức Học Phí Chuẩn
Học phí cơ bản của một học sinh được xác định tại `src/lib/tuition.ts`:

$$\text{Học phí chuẩn} = (\text{Học phí cơ bản} + \text{Phụ thu Level}) \times \left(1 - \frac{\text{Chiết khấu}\%}{100}\right)$$

- **Học phí cơ bản (`base_tuition`):** Mặc định $1.000.000$ VNĐ/tháng (lưu trong `settings`).
- **Phụ thu Level (`level_surcharges`):** Phụ thu tăng dần theo trình độ của học sinh (VD: Level 1: $+0$đ, Level 2: $+100.000$đ, Level 3: $+200.000$đ).
- **Chiết khấu (`discount_percent`):** Áp dụng theo các mốc cài sẵn ($5\%, 10\%, 15\%, 20\%$) hoặc tùy chỉnh, kèm theo trường **Lý do giảm giá (`discount_reason`)** bắt buộc để minh bạch hồ sơ tài chính.

### 1.2. Cơ Chế Ghi Đè Học Phí Tùy Biến (Tuition Override)
- Trong trường hợp đặc biệt (học sinh nhận học bổng riêng, hoàn cảnh khó khăn hoặc tháng có phát sinh thêm môn học), Quản trị viên có thể nhập trực tiếp số tiền học phí riêng cho từng tháng thông qua modal `MonthlyTuitionModal`.
- Dữ liệu được lưu trong bảng `student_monthly_tuitions` và có mức ưu tiên cao nhất khi hiển thị số tiền cần nộp.

---

## 2. QUẢN LÝ GÓI HỌC PHÍ THEO CHU KỲ (TUITION PACKAGES)

Hệ thống quản lý học phí theo danh mục gói (`tuition_packages`):
- **Đơn vị chu kỳ (`cycle_unit`):** Hỗ trợ 2 đơn vị: `month` (tháng) hoặc `week` (tuần).
- **Độ dài chu kỳ (`cycle_value`):** Số lượng chu kỳ (VD: 1 tháng, 3 tháng / 1 quý, 6 tháng, 12 tháng / 1 năm, 24 tuần...).
- **Cơ chế đối soát chu kỳ hiệu lực (`start_period` đến `end_period`):**
  - Khi một học sinh đăng ký gói 3 tháng và thanh toán vào tháng 10/2026:
    - `start_period = "2026-10"`
    - `end_period = "2026-12"`
    - Trạng thái thanh toán: `paid` (Đã đóng).
  - Khi xem bảng công nợ ở các tháng 10, 11, 12 năm 2026, học sinh luôn ở trạng thái **[✅ Đã đóng (2026-10 đến 2026-12)]**.
  - Sang tháng 01/2027 (hết hạn gói), hệ thống tự động đổi trạng thái thành **[⚠️ Cần đóng tiền]**.

---

## 3. CƠ CHẾ TỰ ĐỘNG CỘNG DỒN NỢ QUÁ HẠN (CUMULATIVE OVERDUE DEBT)

- **Nguyên lý phát hiện nợ dồn:**
  - Khi kiểm tra công nợ tháng hiện tại $T$, hệ thống quét ngược lại các tháng trước đó ($T-1, T-2...$).
  - Nếu học sinh ở trạng thái `studying` nhưng chưa có bản ghi thanh toán `paid` cho tháng trước, hệ thống xác định học sinh bị **Nợ Quá Hạn**.
- **Hiển thị & Cảnh báo:**
  - Gắn huy hiệu cảnh báo đỏ nhấp nháy `[⚠️ NỢ X THÁNG]`.
  - Tự động cộng dồn số tiền nợ các tháng trước vào tổng số tiền cần thanh toán trong thông báo nhắc học phí Zalo.

---

## 4. TÍCH HỢP SEPAY WEBHOOK (TỰ ĐỘNG GẠCH NỢ NGÂN HÀNG)

### 4.1. Luồng Hoạt Động (SePay Realtime Flow)
```text
Phụ huynh chuyển khoản ngân hàng (VietQR / Chuyển khoản nhanh 24/7)
                │ (Cú pháp: HP HS01 T10 hoặc chứa SĐT)
                ▼
Ngân hàng thông báo biến động số dư tới SePay Gateway
                │
                ▼ (Gửi Webhook POST)
Endpoint: /api/sepay/webhook
                │
                ├── 1. Xác thực API Key (sepay_api_key)
                ├── 2. Trích xuất Mã học sinh (student_code) hoặc Số điện thoại
                ├── 3. Kiểm tra số tiền chuyển khớp với học phí cần nộp
                ├── 4. Ghi nhận giao dịch vào bảng sepay_transactions
                └── 5. Tự động tạo/cập nhật student_payments thành 'paid'
```

### 4.2. Cấu Trúc Payload Webhook Mẫu
```json
{
  "id": 123456,
  "gateway": "Vietcombank",
  "transactionDate": "2026-10-29 14:30:00",
  "accountNumber": "0123456789",
  "subAccount": null,
  "code": null,
  "content": "HP HS05 dong hoc phi thang 10",
  "transferType": "in",
  "transferAmount": 1000000,
  "accumulated": 15000000,
  "referenceCode": "FT261029123456"
}
```

### 4.3. Quy Tắc Đối Soát & Nhận Diện Học Sinh
1. **Tìm theo Mã Học Sinh:** Quét chuỗi nội dung tìm mẫu `[PREFIX] [MÃ_HỌC_SINH]` (VD: `HP HS05` hoặc `HP-HS05`).
2. **Tìm theo Số Điện Thoại:** Quét chuỗi 10 chữ số bắt đầu bằng `03, 05, 07, 08, 09`.
3. **Trạng thái giao dịch (`sepay_transactions.status`):**
   - `matched`: Nhận diện đúng học sinh và gạch nợ thành công.
   - `unmatched`: Không tìm thấy học sinh tương ứng với nội dung chuyển khoản. Kế toán sẽ vào modal Tổng Kết Tháng (`MonthlySummaryModal`) để gán thủ công bằng 1-click.
   - `ignored`: Giao dịch chuyển tiền đi (`transferType === 'out'`) hoặc số tiền không hợp lệ.

---

## 5. NHẮC HỌC PHÍ ZALO 1-CLICK & ZALO BOT CREATOR

1. **Phương Thức Thủ Công (Manual Assist):**
   - Tạo mẫu tin nhắn chuẩn hóa chứa: Tên học sinh, tháng học phí, chi tiết học phí, số tài khoản nhận tiền và cú pháp chuyển khoản.
   - Nút **Copy 1-Click** sao chép vào Clipboard.
   - Nút **Mở Zalo** mở deep-link `https://zalo.me/[SĐT]` chuyển thẳng vào khung chat với phụ huynh.
2. **Phương Thức Tự Động (Zalo Bot Creator API):**
   - Cấu hình Bot Token từ Zalo Bot Manager (`@Zalo Bot Manager`).
   - Bấm nút gửi trực tiếp từ popup quản trị: Server gửi tin nhắn tự động qua Zalo Bot tới `zalo_chat_id` của phụ huynh mà không cần rời màn hình.

---

## 6. NHẬT KÝ THỬ NGHIỆM & KIỂM TOÁN TÀI CHÍNH (PAYMENTS LOG)

| Ngày ghi nhận | Hạng mục kiểm tra | Người thực hiện | Kết quả |
|---|---|---|---|
| 2026-10-29 | Thuật toán tính học phí chuẩn & chiết khấu | `test-writer` / Main | Đạt - Làm tròn VNĐ chính xác |
| 2026-10-29 | Cơ chế chu kỳ gói 3 tháng, 6 tháng | `api-db-designer` | Đạt - Start/End period tự nhảy chính xác |
| 2026-10-29 | Webhook SePay gạch nợ tự động | `security-auditor` | Đạt - Bắt mã học sinh và SĐT chuẩn |
