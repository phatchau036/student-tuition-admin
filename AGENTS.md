<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# HƯỚNG DẪN ĐIỀU PHỐI AI AGENT & TRUNG TÂM TRA CỨU DOCS (MASTER DISPATCHER)
> **Vị trí tệp:** `AGENTS.md` (Thư mục gốc)  
> **Vai trò:** Bản đồ điều phối cao nhất cho Main AI Agent và 13 Subagents chuyên trách.  
> **QUY TẮC BẤT BIẾN:** Trước khi làm bất kỳ tác vụ nào, AI Agent **BẮT BUỘC PHẢI ĐỌC TÀI LIỆU CHUYÊN BIỆT TRONG THƯ MỤC `docs/`** và **GHI LẠI TRẠNG THÁI MỚI LIÊN TỤC VÀO PHẦN LOG Ở CUỐI FILE ĐÓ**.

---

## 1. TRUNG TÂM ĐIỀU PHỐI TÀI LIỆU (DOCS DISPATCH HUB)

Toàn bộ tài liệu kỹ thuật chi tiết của hệ thống đã được tổ chức gọn gàng trong thư mục **`docs/`**. Tra cứu nhanh bảng dưới đây để mở đúng file:

| Loại công việc / Vấn đề cần xử lý | Subagent phụ trách | File tài liệu bắt buộc đọc trong `docs/` | Ghi log trạng thái vào file |
|---|---|---|---|
| **Định hướng chung & Kim chỉ nam** | Main Agent | [docs/INDEX.md](./docs/INDEX.md) | [docs/INDEX.md](./docs/INDEX.md) |
| **Phân tích phạm vi, thay đổi lớn** | `scope-planner` | [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md), [docs/DECISIONS.md](./docs/DECISIONS.md) | [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) |
| **Tìm vị trí code, phân tích luồng** | `codebase-explorer`| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md), [docs/API_REFERENCE.md](./docs/API_REFERENCE.md) | [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) |
| **Báo lỗi, crash, bug logic, lag** | `bug-investigator` | [docs/KNOWN_ISSUES.md](./docs/KNOWN_ISSUES.md), [docs/STATE_TRACKER_RESTORE.md](./docs/STATE_TRACKER_RESTORE.md) | [docs/KNOWN_ISSUES.md](./docs/KNOWN_ISSUES.md) |
| **Tối ưu tốc độ, truy vấn, bundle** | `perf-optimizer` | [docs/PERFORMANCE.md](./docs/PERFORMANCE.md), [docs/DATABASE.md](./docs/DATABASE.md) | [docs/PERFORMANCE.md](./docs/PERFORMANCE.md) |
| **Giao diện di động (/giao-vien, /phu-huynh)** | `mobile-specialist` | [docs/MOBILE.md](./docs/MOBILE.md), [docs/UI_DESIGN_SYSTEM.md](./docs/UI_DESIGN_SYSTEM.md) | [docs/MOBILE.md](./docs/MOBILE.md) |
| **Dựng Component, Modal, Layout** | `ui-builder` | [docs/UI_DESIGN_SYSTEM.md](./docs/UI_DESIGN_SYSTEM.md), [docs/CONVENTIONS.md](./docs/CONVENTIONS.md) | [docs/UI_DESIGN_SYSTEM.md](./docs/UI_DESIGN_SYSTEM.md) |
| **Sửa Database, viết/sửa API** | `api-db-designer` | [docs/DATABASE.md](./docs/DATABASE.md), [docs/API_REFERENCE.md](./docs/API_REFERENCE.md) | [docs/DATABASE.md](./docs/DATABASE.md) |
| **Thiết kế Icon SVG, huy hiệu** | `svg-designer` | [docs/UI_DESIGN_SYSTEM.md](./docs/UI_DESIGN_SYSTEM.md) | [docs/UI_DESIGN_SYSTEM.md](./docs/UI_DESIGN_SYSTEM.md) |
| **Tính toán học phí, công nợ, SePay** | `security-auditor` / `test-writer` | [docs/PAYMENTS.md](./docs/PAYMENTS.md), [docs/TESTING.md](./docs/TESTING.md) | [docs/PAYMENTS.md](./docs/PAYMENTS.md) |
| **Bảo mật, phân quyền, IP Whitelist** | `security-auditor` | [docs/AUTH_SECURITY.md](./docs/AUTH_SECURITY.md), [docs/ENV_CONFIG.md](./docs/ENV_CONFIG.md) | [docs/AUTH_SECURITY.md](./docs/AUTH_SECURITY.md) |
| **Zalo Bot Creator & Tư vấn AI** | `bug-investigator` | [docs/AI_CHAT.md](./docs/AI_CHAT.md), [docs/EMBEDDING.md](./docs/EMBEDDING.md) | [docs/AI_CHAT.md](./docs/AI_CHAT.md) |
| **Review code, quy chuẩn Git** | `code-reviewer` | [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md), [docs/GIT_WORKFLOW_RULES.md](./docs/GIT_WORKFLOW_RULES.md) | [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) |
| **Kiểm thử lint/build trước khi xong** | `qa-walkthrough` | [docs/TESTING.md](./docs/TESTING.md), [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) | [docs/TESTING.md](./docs/TESTING.md) |
| **Đối chiếu yêu cầu vs Git Diff** | `completeness-auditor`| [docs/CHANGELOG.md](./docs/CHANGELOG.md), [AGENTS.md](./AGENTS.md) | [docs/CHANGELOG.md](./docs/CHANGELOG.md) |

---

## 2. QUY TRÌNH 3 BƯỚC BẮT BUỘC KHI XỬ LÝ MỌI NHIỆM VỤ

```text
[Nhận yêu cầu từ người dùng]
            │
            ▼
┌────────────────────────────────────────────────────────┐
│ BƯỚC 1: ĐỌC TÀI LIỆU TRONG docs/                       │
│ • Tra cứu bảng trên để mở đúng file doc liên quan      │
│ • Nắm vững các quyết định kiến trúc đã chốt            │
└────────────────────────────────────────────────────────┘
            │
            ▼
┌────────────────────────────────────────────────────────┐
│ BƯỚC 2: THỰC THI CHUẨN XÁC THEO QUY CHUẨN              │
│ • Viết code tuân thủ quy chuẩn của file doc đó        │
│ • Tuyệt đối không commit file data/*.db                │
│ • Migration database phải nằm trong initDb()           │
└────────────────────────────────────────────────────────┘
            │
            ▼
┌────────────────────────────────────────────────────────┐
│ BƯỚC 3: GHI LOG TRẠNG THÁI MỚI LIÊN TỤC                │
│ • Mở bảng nhật ký ở CUỐI FILE DOC vừa làm việc         │
│ • Thêm 1 dòng ghi nhận: Ngày, Tác vụ, Trạng thái, Tên  │
│ • Cập nhật tổng thể vào docs/INDEX.md                  │
└────────────────────────────────────────────────────────┘
```

---

## 3. THÔNG TIN DỰ ÁN & LỆNH THỰC THI NHANH

- **Tên dự án:** Student Tuition Admin (`student-tuition-admin`) - Nền tảng SaaS quản trị giáo dục đa cơ sở.
- **Tech Stack:** Next.js 16.4.3 (App Router), React 19.3.0, TypeScript 5, Tailwind CSS v4, SQLite nhúng (`@libsql/client` lưu tại `data/admin.db`).
- **Lệnh thực thi:**
  - `npm run dev`: Chạy môi trường phát triển.
  - `npm run lint`: Kiểm tra lỗi cú pháp và linter.
  - `npm run build`: Build bản sản xuất tối ưu.
  - `npm start` hoặc `npx next start -H 0.0.0.0 -p 3000`: Chạy production cho toàn mạng LAN.
  - `node scripts/run-upgrade.js`: Kịch bản tự nâng cấp nóng từ Git.

---

## 4. 3 NGUYÊN TẮC BẤT BIẾN CỦA DỰ ÁN

1. **BẢO TOÀN DỮ LIỆU & QUY CHUẨN GIT ([docs/GIT_WORKFLOW_RULES.md](./docs/GIT_WORKFLOW_RULES.md)):**
   - **TUYỆT ĐỐI KHÔNG BAO GIỜ commit file `data/admin.db` hoặc bất kỳ file đuôi `.db` nào lên Git**.
   - Thư mục `data/` chỉ commit file `data/.gitkeep`. Dữ liệu kinh doanh thật luôn được bảo vệ 100%.
2. **DATABASE MIGRATION BẰNG CODE TRONG `src/lib/db.ts` ([docs/DATABASE.md](./docs/DATABASE.md)):**
   - Bảng mới: dùng `CREATE TABLE IF NOT EXISTS`.
   - Cột mới: luôn bọc trong `try { await db.execute("ALTER TABLE ten_bang ADD COLUMN ten_cot KIEU_DU_LIEU DEFAULT ..."); } catch {}` trong hàm `initDb()`.
3. **PHÂN QUYỀN 4 PHÂN HỆ ĐỘC LẬP ([docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)):**
   - `/he-thong` (Super Admin): Chỉ cho phép máy nội bộ `127.0.0.1` truy cập, ngoài mạng trả về mã HTTP 404 (giả không tồn tại).
   - `/admin` (Quản trị Cơ sở): Quản lý học sinh, giáo viên, gói phí, ca học, Zalo bot, đối soát SePay. Có kiểm tra IP Whitelist nếu cơ sở bật.
   - `/giao-vien` (Cổng Giáo viên): Mobile-first, đăng nhập bằng số điện thoại, xem ca dạy, danh sách học sinh, nhãn `[HỌC BÙ]`, nâng level.
   - `/` hoặc `/phu-huynh` (Cổng Phụ huynh): Tra cứu bằng số điện thoại, xem học phí, báo nghỉ trực tuyến (+1 suất bù), tự chọn ca học bù trống chỗ.

---

## 5. PHÂN NHÓM 13 SUBAGENT & MA TRẬN QUYỀN HẠN

| STT | Tên Subagent | Phân nhóm | Quyền hạn | Vai trò & Trách nhiệm chính |
|---|---|---|---|---|
| 1 | `codebase-explorer` | Khám phá | **Chỉ đọc (Read-only)** | Tìm kiếm vị trí code, phân tích kiến trúc, truy vết hàm gọi, tóm tắt mã nguồn. |
| 2 | `scope-planner` | Lập kế hoạch | **Chỉ đọc (Read-only)** | Phân tích tác động khi có thay đổi lớn, quét toàn bộ màn hình, modal, API bị ảnh hưởng. |
| 3 | `bug-investigator` | Điều tra | **Chỉ đọc (Read-only)** | Điều tra nguyên nhân gốc rễ (root cause) khi có bug, crash, hành vi sai hoặc lỗi giao diện. |
| 4 | `perf-optimizer` | Điều tra | **Chỉ đọc (Read-only)** | Phân tích điểm nghẽn hiệu năng: query chậm, re-render thừa, bundle size nặng. |
| 5 | `mobile-specialist` | Điều tra | **Chỉ đọc (Read-only)** | Chuyên gia kiểm tra layout di động, Safe Area, bàn phím ảo, responsive trên `/giao-vien` và `/phu-huynh`. |
| 6 | `ui-builder` | Xây dựng | **Được ghi code (Write)** | Dựng và tinh chỉnh component, modal, trang theo chuẩn Tailwind v4, Glassmorphism, Dark/Light mode. |
| 7 | `api-db-designer` | Xây dựng | **Được ghi code (Write)** | Thiết kế API route trong `src/app/api`, cập nhật schema database và migration trong `src/lib/db.ts`. |
| 8 | `svg-designer` | Xây dựng | **Được ghi code (Write)** | Thiết kế mã SVG inline hoặc file SVG: icon trực quan, huy hiệu môn học, sơ đồ phòng học. |
| 9 | `test-writer` | Xây dựng | **Được ghi code (Write)** | Viết kịch bản kiểm thử (unit test, integration test, logic học phí, sĩ số). |
| 10 | `code-reviewer` | Kiểm tra | **Chỉ đọc (Read-only)** | Rà soát mã nguồn ngay sau khi viết: tìm lỗi logic, edge case, vi phạm quy tắc Git, convention. |
| 11 | `security-auditor` | Kiểm tra | **Chỉ đọc (Read-only)** | Rà soát bảo mật: kiểm tra lộ secret/token, SQL Injection, XSS, Localhost Guard, IP Whitelist. |
| 12 | `qa-walkthrough` | Kiểm tra | **Chỉ đọc (Read-only)** | Kiểm thử tổng thể: chạy build (`npm run build`), linting (`npm run lint`), typecheck, và rà soát luồng người dùng. |
| 13 | `completeness-auditor` | Kiểm tra | **Chỉ đọc (Read-only)** | Đối chiếu yêu cầu ban đầu của người dùng với git diff thực tế, đảm bảo không bỏ sót việc. |

> **LƯU Ý:** Các subagent **Chỉ đọc** TUYỆT ĐỐI KHÔNG tự sửa file. Chỉ trả về báo cáo để Main Agent hoặc subagent **Xây dựng (Write)** thực hiện.

---

## 6. 5 LUỒNG QUY TRÌNH ĐIỀU PHỐI (WORKFLOW PIPELINES)

1. **Luồng Tính Năng Mới:** `scope-planner` ➔ `api-db-designer` ➔ `ui-builder` ➔ `code-reviewer` ➔ `completeness-auditor` ➔ `qa-walkthrough`.
2. **Luồng Sửa Lỗi (Bug Fix):** `bug-investigator` (kết hợp `mobile-specialist` nếu trên mobile) ➔ Main Agent sửa mã ➔ `code-reviewer` ➔ `qa-walkthrough`.
3. **Luồng Tối Ưu Hiệu Năng:** `perf-optimizer` ➔ Main Agent tối ưu mã nguồn ➔ `qa-walkthrough`.
4. **Luồng Triển Khai & Kiểm Toán An Toàn:** `security-auditor` ➔ Kiểm tra an toàn Git (`data/*.db`) ➔ `qa-walkthrough`.
5. **Luồng Việc Nhỏ / Tweak Nhanh (< 10 dòng, sửa typo, chỉnh text/màu):** Main Agent thực hiện trực tiếp, **KHÔNG CẦN GỌI SUBAGENT** để tiết kiệm tài nguyên.

---

## 7. ĐỊNH NGHĨA HOÀN THÀNH (DEFINITION OF DONE - DoD)

Một yêu cầu chỉ được coi là hoàn thành ("Xong") khi đáp ứng đủ checklist:
- [ ] Đã qua đối chiếu của `completeness-auditor` xác nhận không sót việc.
- [ ] Chạy `npm run lint` và `npm run build` không có lỗi.
- [ ] `git status` xác nhận không có file `data/*.db` nào bị staged. Mọi cột mới có migration trong `src/lib/db.ts`.
- [ ] Đã hiển thị chuẩn trên cả Dark/Light mode và màn hình di động.
- [ ] **Đã cập nhật dòng ghi chú trạng thái mới vào bảng log ở cuối tài liệu tương ứng trong `docs/`**.
