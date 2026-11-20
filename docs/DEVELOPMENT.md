# DEVELOPMENT.md - QUY TRÌNH PHÁT TRIỂN & TIÊU CHUẨN MÃ NGUỒN
> **Dành cho:** `code-reviewer`, `test-writer`, Main Agent  
> **Quy tắc bắt buộc:** Mọi lập trình viên và subagent viết mã phải tuân thủ nghiêm ngặt các quy ước trong tài liệu này trước khi tạo commit hoặc báo hoàn thành công việc.

---

## 1. QUY TRÌNH LÀM VIỆC GIT & BẢO TOÀN DỮ LIỆU
Tuân thủ tuyệt đối quy định trong [GIT_WORKFLOW_RULES.md](./GIT_WORKFLOW_RULES.md):
- **Không bao giờ commit file `data/*.db`:** Đã được chặn trong `.gitignore`.
- Kiểm tra danh sách staged files trước khi commit:
  ```bash
  git status
  ```
- Định dạng commit message chuẩn Conventional Commits:
  - `feat: [mô tả tính năng mới]`
  - `fix: [mô tả lỗi đã khắc phục]`
  - `refactor: [tối ưu cấu trúc mã nguồn]`
  - `docs: [cập nhật tài liệu]`

---

## 2. QUY CHUẨN LẬP TRÌNH (CODING STANDARDS)

### 2.1. TypeScript & Type Safety
- Toàn bộ types/interfaces nghiệp vụ phải được đặt trong `src/lib/types.ts`.
- Tuyệt đối không dùng kiểu `any` khi đã có kiểu định nghĩa rõ ràng.
- Xử lý giá trị `null` hoặc `undefined` an toàn bằng Optional Chaining (`?.`) và Nullish Coalescing (`??`).

### 2.2. Next.js 16 App Router & React 19 Conventions
- Client Components: Bắt buộc khai báo `"use client";` ở đầu tệp đối với các component sử dụng React hooks (`useState`, `useEffect`, `useMemo`).
- API Route Handlers: Luôn bọc logic xử lý trong khối `try/catch`, trả về phản hồi chuẩn:
  ```typescript
  return NextResponse.json({ success: true, data: result });
  // Hoặc khi có lỗi:
  return NextResponse.json({ error: "Thông báo lỗi chi tiết" }, { status: 400 });
  ```

---

## 3. CHECKLIST TRƯỚC KHI BÁO HOÀN THÀNH (PR CHECKLIST)
- [ ] Đã chạy `npm run format` (Prettier chuẩn hóa toàn bộ).
- [ ] Chạy `npm run lint` → **0 errors, 0 warnings**.
- [ ] Chạy `npm run typecheck` → không lỗi TypeScript.
- [ ] Chạy `npm test` → unit test pass.
- [ ] Chạy `npm run build` → build thành công.
- [ ] **Zero-Residue:** không còn `console.*`, `debugger`, file test tạm hoặc script debug tạm trong `src/`/`scripts/`.
- [ ] Đã bổ sung migration an toàn trong `src/lib/db.ts` nếu có thêm cột/bảng mới.
- [ ] Giao diện hiển thị đúng trên cả Dark mode và Light mode.
- [ ] Giao diện co giãn tốt trên màn hình điện thoại di động (Responsive).
- [ ] `git status` sạch: không có `data/*.db`, `.env`, file tạm.

> Chi tiết đầy đủ về chuẩn code: [CODE_STANDARDS.md](./CODE_STANDARDS.md).

---

## 4. NHẬT KÝ PHÁT TRIỂN (DEVELOPMENT LOG)

| Ngày | Tác vụ | Người thực hiện | Trạng thái |
|---|---|---|---|
| 2026-10-29 | Thiết lập chuẩn hóa quy trình phát triển và kiểm soát chất lượng | `code-reviewer` / Main | Đã ban hành |
| 2026-11-08 | Dọn dẹp dead code: xóa `/api/wallet`, xóa import unused ReceiptModal, loại bỏ duplicate helper `computeEndMonth`, `timeToMinutes`, `DAYS_OF_WEEK` | Main Agent | Hoàn thành |
| 2026-11-20 | Chuẩn hóa Giai đoạn 1: Prettier + EditorConfig + Husky + lint-staged + GitHub Actions CI; logger có cấp độ thay toàn bộ console; lint 0/0; xóa dead code & hardcode; ban hành CODE_STANDARDS.md | Main Agent | Hoàn thành |
