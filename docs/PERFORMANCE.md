# PERFORMANCE.md - CHỈ SỐ HIỆU NĂNG & TIÊU CHUẨN TỐI ƯU HÓA
> **Dành cho:** `perf-optimizer`, Main Agent  
> **Quy tắc bắt buộc:** Đọc tài liệu này để đối chiếu các chỉ số benchmark hiệu năng và áp dụng các kỹ thuật tối ưu hóa mã nguồn.

---

## 1. TIÊU CHUẨN CHẤP NHẬN HIỆU NĂNG (PERFORMANCE BUDGET)

| Chỉ số / Phân hệ | Mục tiêu tiêu chuẩn | Ngưỡng cảnh báo |
|---|---|---|
| **Thời gian phản hồi API (Latency)** | $< 50\text{ms}$ trên localhost / LAN | $> 150\text{ms}$ |
| **Thời gian load Cổng Phụ huynh / GV (FCP)**| $< 0.8\text{s}$ trên mạng di động 4G | $> 2.0\text{s}$ |
| **Dung lượng Bundle JavaScript Client** | $< 180\text{KB}$ (gzipped) | $> 350\text{KB}$ |
| **Thời gian tính toán công nợ 500 học sinh** | $< 30\text{ms}$ | $> 100\text{ms}$ |

---

## 2. CÁC BIỆN PHÁP TỐI ƯU ĐÃ ÁP DỤNG TRONG CODEBASE

1. **Memoization với React `useMemo` & `useCallback`:**
   - Tại `Dashboard.tsx`, danh sách học sinh sau lọc (`filteredStudents`), tổng kết công nợ và KPI doanh thu được memoize triệt để, ngăn chặn re-render bảng khi người dùng chỉ gõ phím tìm kiếm.
2. **Dynamic In-Memory Caching:**
   - Các cấu hình hệ thống từ bảng `settings` và danh mục `tuition_packages` được nạp 1 lần và tái sử dụng cho các phép tính học phí hàng loạt.
3. **Phân Tách Lazy Loading Modals:**
   - Các modal lớn ít khi mở (như `SettingsModal`, `SmartExcelImportModal`) chỉ render khi có cờ `isOpen = true`, giảm tải DOM tree ban đầu.

---

## 3. NHẬT KÝ THEO DÕI HIỆU NĂNG (PERFORMANCE LOG)

| Ngày đo kiểm | Hạng mục đo kiểm | Kết quả đo được | Đánh giá |
|---|---|---|---|
| 2026-10-29 | Tốc độ lọc danh sách 300 học sinh | $12\text{ms}$ | Xuất sắc (Rất mượt mà) |
| 2026-10-29 | API kiểm tra độ đầy sĩ số `/api/classes/occupancy` | $18\text{ms}$ | Xuất sắc |
