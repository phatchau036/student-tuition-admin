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
  - Ghi log qua `createLogger("api/<endpoint>")` trong `src/lib/logger.ts` — **nghiêm cấm `console.*`**.
  - Phản hồi mã HTTP phù hợp: `400 Bad Request` (thiếu tham số), `401 Unauthorized` (chưa đăng nhập), `403 Forbidden` (sai quyền/IP), `404 Not Found` (không tìm thấy), `500 Internal Server Error`.
  - Định dạng JSON trả về khi lỗi: `{ success: false, message: string }`.
- **Ở Tầng Giao Diện Client:**
  - Bắt lỗi khi gọi API bằng `fetch` và hiển thị thông báo qua `useToast()` (`showToast(msg, 'error')`).
  - Không để màn hình bị đơ hoặc lỗi unhandled promise rejection.

> **Xem thêm:** [CODE_STANDARDS.md](./CODE_STANDARDS.md) — chuẩn bắt buộc về Logging Policy, Zero-Residue Rule, File Size Budget và Type Safety.

---

## 2.1. LOGGING, ZERO-RESIDUE & KÍCH THƯỚC FILE (tóm tắt bắt buộc)

- **Logging:** dùng `log.debug/info/warn/error` từ `src/lib/logger.ts`. `debug`/`info` chỉ hiện ở dev; `warn`/`error` luôn ghi. Logger tự che `password`, `token`, `secret`, `api_key`.
- **Zero-Residue:** cấm `console.*`, `debugger`, `alert()` trong `src/`; cấm code comment-out; cấm hardcode ngày/ID test; test đặt ở `tests/`, script tạm ở `scripts/dev/` và phải xóa ngay sau khi dùng.
- **Kích thước file:** component ≤ 400 dòng, API route ≤ 300 dòng, lib ≤ 500 dòng, mọi file ≤ 800 dòng (vượt phải tách).
- **Type:** cấm `any` (ngoại lệ duy nhất là type `DbRow` ở biên giới SQLite/JSON).
- **Workflow:** `npm run format` → `npm run lint` → `npm run typecheck` → `npm test` → `npm run build` → `git status`.

---

## 3. NHẬT KÝ QUY ƯỚC (CONVENTIONS LOG)

| Ngày | Nội dung quy ước | Người duyệt |
|---|---|---|
| 2026-10-29 | Ban hành chuẩn đặt tên PascalCase/camelCase và cơ chế xử lý lỗi chuẩn REST | `code-reviewer` |
| 2026-11-20 | Cập nhật Logging Policy (bỏ console, dùng logger), Zero-Residue Rule, File Size Budget, Type Safety; liên kết CODE_STANDARDS.md | Main Agent |
