# MOBILE.md - QUY CHUẨN TỐI ƯU GIAO DIỆN DI ĐỘNG & PWA
> **Dành cho:** `mobile-specialist`, Main Agent  
> **Quy tắc bắt buộc:** Đọc tài liệu này khi chỉnh sửa 2 phân hệ trọng yếu trên di động: Cổng Giáo Viên (`/giao-vien`) và Cổng Phụ Huynh (`/` hoặc `/phu-huynh`).

---

## 1. MỤC TIÊU & ĐẶC ĐIỂM MOBILE-FIRST
- **Cổng Giáo Viên (`/giao-vien`):** Giáo viên sử dụng điện thoại thông minh ngay tại lớp để điểm danh, nhận diện học sinh học bù và nâng Level. Yêu cầu giao diện một tay (One-Handed Navigation), nút bấm to, chữ rõ ràng.
- **Cổng Phụ Huynh (`/` hoặc `/phu-huynh`):** Phụ huynh tra cứu học phí, báo nghỉ và chọn lịch bù. Yêu cầu tải tức thì, không bị tràn màn hình ngang (No Horizontal Scroll).

---

## 2. QUY CHUẨN KỸ THUẬT CHO MOBILE WEB

1. **Touch Targets (Kích thước chạm cảm ứng):**
   - Mọi nút bấm, thẻ chọn ca học bù, icon thao tác phải có kích thước tối thiểu $44 \times 44\text{px}$ để tránh chạm nhầm.
2. **Safe Area & Viewport:**
   - Hỗ trợ tốt vùng tai thỏ / thanh điều hướng dưới đáy màn hình trên iPhone và thiết bị Android tràn viền (`pb-safe`, `viewport-fit=cover`).
3. **Form & Bàn Phím Ảo (Virtual Keyboard):**
   - Ô nhập Số điện thoại: Dùng `type="tel"` và `inputMode="numeric"` để tự động bật bàn phím số to, thuận tiện nhập liệu.
   - Ô nhập Mã học sinh hoặc Tiền: Không dùng spinner tăng giảm nhỏ xíu của trình duyệt.
4. **Không để Tràn Màn Hình Ngang:**
   - Bảng dữ liệu dài phải bọc trong thẻ `overflow-x-auto` hoặc chuyển sang hiển thị dạng Thẻ (Card View) trên màn hình nhỏ `< 768px`.

---

## 3. CHECKLIST KIỂM THỬ TRÊN THIẾT BỊ DI ĐỘNG
- [ ] Giao diện vừa khít chiều rộng màn hình từ iPhone SE (375px) đến iPhone 15 Pro Max / Samsung Galaxy Ultra (430px+).
- [ ] Nút bấm gọi điện thoại (`tel:[SĐT]`) và mở chat Zalo (`https://zalo.me/[SĐT]`) kích hoạt ứng dụng native tức thì.
- [ ] Modal mở full màn hình hoặc dạng Bottom Sheet tiện lợi khi xem trên điện thoại.

---

## 4. NHẬT KÝ KIỂM TRA MOBILE (MOBILE LOG)

| Ngày kiểm tra | Phân hệ kiểm tra | Kết quả | Người thực hiện |
|---|---|---|---|
| 2026-10-29 | Cổng Giáo Viên `/giao-vien` | Tối ưu hiển thị danh sách lớp và nhãn `[HỌC BÙ]` | `mobile-specialist` |
| 2026-10-29 | Cổng Phụ Huynh `/phu-huynh` | Nút chọn ca bù và form báo nghỉ hiển thị chuẩn | `mobile-specialist` |
