# CONVENTIONS.md - QUY ƯỚC ĐẶT TÊN, CẤU TRÚC & XỬ LÝ LỖI
> **Dành cho:** `code-reviewer`, Main Agent  
> **Quy tắc bắt buộc:** Đọc tài liệu này để kiểm tra tính nhất quán trong đặt tên file, component, hàm xử lý và quy chuẩn bắt lỗi.

---

## 1. QUY ƯỚC ĐẶT TÊN (NAMING CONVENTIONS)

- **File Component:** PascalCase (VD: `StudentDetailModal.tsx`, `Dashboard.tsx`, `ParentPortal.tsx`).
- **File Library / Helper:** camelCase (VD: `authHelper.ts`, `tuition.ts`, `credentialGen.ts`, `ipHelper.ts`).
- **File API Route:** Luôn là `route.ts` đặt trong thư mục chứa tên endpoint (VD: `src/app/api/students/[id]/route.ts`).
- **Interface / Type:** PascalCase (VD: `Student`, `TimeSlot`, `TuitionPackage`, `MonthlyReconciliationSummary`).
- **Hàm xử lý sự kiện:** Bắt đầu bằng tiền tố `handle` (VD: `handleSubmit`, `handleStatusChange`, `handleExportExcel`).
- **Hàm kiểm tra logic Boolean:** Bắt đầu bằng tiền tố `is`, `has`, `can` (VD: `isCrowded`, `isFull`, `hasDebt`).

---

## 2. QUY CHUẨN XỬ LÝ LỖI (ERROR HANDLING)

- **Ở Tầng API Route Handlers:**
  - Luôn sử dụng khối `try/catch`.
  - Log lỗi rõ ràng trên server console với ngữ cảnh endpoint.
  - Phản hồi mã HTTP phù hợp: `400 Bad Request` (thiếu tham số), `401 Unauthorized` (chưa đăng nhập), `403 Forbidden` (sai quyền/IP), `404 Not Found` (không tìm thấy), `500 Internal Server Error`.
  - Định dạng JSON trả về khi lỗi: `{ error: string, details?: any }`.
- **Ở Tầng Giao Diện Client:**
  - Bắt lỗi khi gọi API bằng `fetch` và hiển thị thông báo qua `useToast()` (`showToast(msg, 'error')`).
  - Không để màn hình bị đơ hoặc lỗi unhandled promise rejection.

---

## 3. NHẬT KÝ QUY ƯỚC (CONVENTIONS LOG)

| Ngày | Nội dung quy ước | Người duyệt |
|---|---|---|
| 2026-10-29 | Ban hành chuẩn đặt tên PascalCase/camelCase và cơ chế xử lý lỗi chuẩn REST | `code-reviewer` |
