# TESTING.md - CHIẾN LƯỢC KIỂM THỬ & KIỂM SOÁT CHẤT LƯỢNG
> **Dành cho:** `test-writer`, `qa-walkthrough`, Main Agent  
> **Quy tắc bắt buộc:** Đọc tài liệu này để nắm các kịch bản kiểm thử trọng yếu, phương pháp kiểm tra logic học phí, kiểm soát sĩ số và nghiệm thu tính năng. Cập nhật kết quả kiểm thử ở cuối file.

---

## 1. CÁC KHU VỰC TRỌNG YẾU BẮT BUỘC KIỂM THỬ (CRITICAL TEST SUITES)

1. **Suite 1: Logic Tính Toán Học Phí & Chu Kỳ Gói (`src/lib/tuition.ts`):**
   - Kiểm tra công thức cơ bản: $(\text{Base} + \text{Level Surcharge}) \times (1 - \text{Discount}\%)$.
   - Kiểm tra làm tròn số tiền VNĐ.
   - Kiểm tra chu kỳ gói 3 tháng, 6 tháng, 1 năm: Xác nhận học sinh không bị báo nợ vào các tháng giữa chu kỳ đã đóng.
   - Kiểm tra phát hiện nợ quá hạn cộng dồn (Cumulative Overdue).
2. **Suite 2: Kiểm Soát Sĩ Số & Xếp Lịch Học Bù (`src/app/api/classes/occupancy`):**
   - Đảm bảo tính toán chính xác tổng học sinh = học sinh cố định + học sinh đăng ký bù.
   - Kiểm tra ngưỡng cảnh báo lớp đông: Sĩ số đạt $\ge 80\%$ phải trả về `is_crowded: true`.
   - Kiểm tra khóa cứng ca: Sĩ số đạt $100\%$ phải trả về `is_full: true` và chặn không cho click đăng ký.
3. **Suite 3: Bảo Vệ Cổng Super Admin & Localhost Guard (`src/lib/ipHelper.ts`):**
   - Truy cập từ `127.0.0.1`: Phải cho phép truy cập.
   - Truy cập từ IP mạng ngoài: Phải trả về mã lỗi HTTP `404 Not Found`.
4. **Suite 4: IP Whitelist Cho Cơ Sở (`src/app/api/admin/check-ip`):**
   - Trường bật khóa IP: Client có IP nằm trong danh sách $\rightarrow$ Cho phép; Client có IP lạ $\rightarrow$ Phản hồi `403 Forbidden`.
5. **Suite 5: Phân Tích Thông Minh File Excel (`SmartExcelImportModal.tsx`):**
   - Đọc các định dạng chuỗi giờ học phức tạp (VD: "T2, T4 từ 18:00 - 19:30").
   - Nhận diện đúng các cột tên, SĐT, môn học.

---

## 2. QUY TRÌNH CHẠY KIỂM TOÁN TỔNG THỂ (QA WALKTHROUGH PROCESS)

Trước khi nghiệm thu bất kỳ tính năng hoặc bản nâng cấp nào, `qa-walkthrough` bắt buộc phải chạy quy trình:
```bash
# 1. Kiểm tra Linter cú pháp
npm run lint

# 2. Kiểm tra biên dịch sản phẩm
npm run build

# 3. Kiểm tra tính toàn vẹn cơ sở dữ liệu
git status # Xác nhận không có file data/*.db bị staged
```

---

## 3. BẢNG KẾT QUẢ KIỂM THỬ (TEST EXECUTION LOG)

| Ngày kiểm thử | Kịch bản / Suite | Người thực hiện | Kết quả | Ghi chú |
|---|---|---|---|---|
| 2026-10-29 | Thuật toán tính học phí & nợ dồn | `test-writer` | Đạt (Pass) | Tính toán chính xác theo công thức chuẩn |
| 2026-10-29 | Khóa ca học bù khi đạt 100% sĩ số | `qa-walkthrough`| Đạt (Pass) | Ngăn chặn quá tải lớp học thành công |
| 2026-10-29 | Localhost Cloaking Guard /he-thong | `qa-walkthrough`| Đạt (Pass) | Báo 404 từ mạng ngoài chính xác |
