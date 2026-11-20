# CODE_STANDARDS.md - CHUẨN CHẤT LƯỢNG MÃ NGUỒN (PROJECT CODE STANDARDS)

> **Dành cho:** Tất cả các lập trình viên, Main Agent và 13 Subagents.
> **Vị trí:** `docs/CODE_STANDARDS.md` — nguồn sự thật duy nhất về chất lượng mã nguồn.
> **Hiệu lực:** Bắt buộc với mọi thay đổi từ ngày **2026-11-20**. Mọi commit vi phạm sẽ bị `pre-commit hook` chặn.

---

## 0. NGUYÊN TẮC GỐC

1. **Code là tài sản chung:** viết cho người kế tiếp đọc, không chỉ cho máy chạy.
2. **Không để lại dấu vết của quá trình debug:** log tạm, file test tạm, biến thử nghiệm — **xóa ngay sau khi kiểm tra xong**, trong cùng commit/PR.
3. **Không có ngoại lệ ngầm:** mọi ngoại lệ phải có comment giải thích ngay tại dòng code.
4. **Máy kiểm tra thay con người:** Prettier + ESLint + TypeScript + CI chặn lỗi tự động.

---

## 1. ZERO-RESIDUE RULE — QUY TẮC "KHÔNG ĐỂ LẠI RÁC"

### 1.1. Tuyệt đối cấm trong `src/`

| ❌ Cấm | ✅ Thay thế |
|---|---|
| `console.log/warn/info/debug` | `log.debug/warn/info/error` từ `src/lib/logger.ts` |
| `console.error` (trừ `logger.ts`) | `log.error("mô tả ngữ cảnh", { error })` |
| `debugger` | Xóa trước khi commit |
| `alert()` | Toast (`useToast`) hoặc UI state |
| Code bị comment-out | Xóa hẳn — Git đã lưu lịch sử |
| `TODO`/`FIXME` không có owner | `// TODO(ten-nguoi): <việc cụ thể> — <issue/link>` |
| Hardcode ngày test (`2026-10-01`), ID giả, tên/SĐT mẫu | Hằng số trong `src/lib/constants.ts` hoặc helper thời gian |
| File test đặt trong `src/` | `tests/unit/` hoặc `tests/integration/` |
| File debug tạm trong `scripts/` | `scripts/dev/` + **xóa cùng ngày** |

### 1.2. Quy tắc bắt buộc cho script debug tạm

Nếu buộc phải tạo script để kiểm tra dữ liệu:

```js
// ⚠️ TẠM THỜI — XÓA SAU KHI KIỂM TRA.
// Người tạo: <tên> | Ngày: <YYYY-MM-DD> | Mục đích: <...>
```

- Đặt tại `scripts/dev/`.
- **Phải xóa ngay trong cùng commit trước khi báo cáo hoàn thành.**
- Không được push lên `main` nếu còn tồn tại.

### 1.3. Checklist rác trước khi báo hoàn thành

```bash
grep -rn "console\." src/ --include="*.ts" --include="*.tsx"   # phải rỗng
grep -rn "debugger\|alert(" src/                               # phải rỗng
git status                                                     # không có file lạ
```

---

## 2. LOGGING POLICY

Dùng duy nhất `createLogger(scope)` trong `src/lib/logger.ts`:

```ts
import { createLogger } from "@/lib/logger";

const log = createLogger("api/students"); // scope = đường dẫn tương đối

log.debug("cache miss", { key });                  // chỉ dev
log.info("đã xử lý xong", { count });              // chỉ dev
log.warn("cấu hình thiếu, dùng mặc định", { key }); // luôn ghi
log.error("GET /api/students thất bại", { error, schoolId }); // luôn ghi
```

| Cấp | Khi nào dùng | Production |
|---|---|---|
| `debug` | Dữ liệu trung gian, cache, giá trị biến | Ẩn |
| `info` | Mốc xử lý bình thường | Ẩn |
| `warn` | Tình huống bất thường nhưng hệ thống vẫn chạy | Ghi |
| `error` | Thao tác thất bại cần điều tra | Ghi |

**Tự động che dữ liệu nhạy cảm:** logger redact các khóa chứa `password`, `token`, `secret`, `api_key`, `authorization`, `cookie`, `credential`.

---

## 3. ERROR HANDLING POLICY

1. **API route** luôn bọc `try/catch` và trả đúng HTTP status:
   - `400` thiếu/sai tham số — `401` chưa đăng nhập — `403` sai quyền — `404` không tìm thấy — `500` lỗi máy chủ.
2. **`catch {}` chỉ được phép** khi:
   - (a) Migration idempotent (`safeMigration` trong `db.ts`), hoặc
   - (b) Đường dẫn tùy chọn (cache, đọc cấu hình phụ) — **bắt buộc có comment lý do**.
3. Mọi nhánh nghiệp vụ thất bại phải `log.warn` hoặc `log.error` kèm ngữ cảnh.
4. Client: bắt lỗi `fetch`, hiển thị toast tiếng Việt, không để unhandled rejection.

---

## 4. NGÂN SÁCH KÍCH THƯỚC FILE (FILE SIZE BUDGET)

Để tránh tái phát các "file khổng lồ" 3.000+ dòng:

| Loại file | Giới hạn mềm | Hành động khi vượt |
|---|---|---|
| React component | **400 dòng** | Tách sub-component cùng thư mục |
| API route handler | **300 dòng** | Tách service/handler phụ |
| Lib module | **500 dòng** | Tách theo domain |
| Bất kỳ file nào | **800 dòng** | **Bắt buộc** tách trước khi thêm tính năng |

> Hiện trạng các file lớn (Dashboard, he-thong, SettingsModal) là **nợ kỹ thuật đã ghi nhận**, sẽ xử lý ở Giai đoạn 2. Không được làm chúng lớn thêm.

---

## 5. TYPE SAFETY

- `strict: true` trong `tsconfig.json` — không tắt.
- **Cấm `any`** trong `src/`. Ngoại lệ duy nhất: type `DbRow` tại `src/lib/types.ts` (biên giới dữ liệu SQLite/JSON), đã có comment giải thích.
- Mọi giá trị từ DB/JSON phải chuẩn hóa qua `String()`, `Number()`, `Boolean()` hoặc type guard trước khi dùng.
- Không dùng `as` để né kiểu; nếu buộc phải dùng, kèm comment lý do.

---

## 6. QUY ƯỚC IMPORT & MODULE

- Chỉ dùng alias: `@/lib/...`, `@/components/...` — **cấm** `../../` xuyên thư mục.
- Thứ tự: external → internal (`@/`) → relative → types.
- Import type: `import type { X } from "..."` khi chỉ dùng cho kiểu.

---

## 7. REACT 19 / NEXT 16 CONVENTIONS

- Component dùng hook phải có `"use client";` ở dòng đầu.
- Không gọi `setState` đồng bộ trong `useEffect` nếu có thể khởi tạo bằng lazy initializer.
- Với modal đồng bộ props → state: ưu tiên pattern `key` remount; nếu chưa chuyển được, phải có `eslint-disable-next-line` kèm lý do cụ thể (không disable trần).
- Danh sách dài phải có `key` ổn định, không dùng index nếu danh sách thay đổi thứ tự.

---

## 8. WORKFLOW BẮT BUỘC TRƯỚC KHI COMMIT

```bash
npm run format        # Prettier toàn bộ
npm run lint          # 0 errors, 0 warnings
npm run typecheck     # tsc --noEmit
npm test              # unit test
npm run build         # build production
git status            # không có data/*.db, .env, file tạm
```

`pre-commit` hook (Husky + lint-staged) tự động chạy ESLint + Prettier trên file staged. CI GitHub Actions chạy đủ 5 bước trên mỗi push/PR vào `main`.

---

## 9. QUY TẮC GIT & DATABASE (nhắc lại)

- **Tuyệt đối không commit** `data/*.db`, `data/*.db-wal`, `data/*.db-journal`, `.env`, log, `*.bak`, `*.tmp`.
- Migration schema chỉ viết trong `initDb()` (`src/lib/db.ts`) bằng `CREATE TABLE IF NOT EXISTS` hoặc `safeMigration()`.
- Commit message theo Conventional Commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`.

---

## 10. LỘ TRÌNH GIAI ĐOẠN 2 (định hướng, chưa thực thi)

Khi tái cấu trúc sâu, đi theo cấu trúc đích sau để đồng bộ với chuẩn dự án lớn:

```text
src/
├── app/                 # chỉ routing (page.tsx, route.ts mỏng)
├── features/            # theo domain: students, tuition, schedule, teachers, settings, zalo, ai, feedbacks
│   └── <domain>/{components,hooks,services,types.ts}
├── server/              # backend dùng chung
│   ├── db/              # client, schema, migrations
│   ├── auth/            # session, permissions
│   └── services/        # nghiệp vụ tách khỏi route handler
├── components/ui/       # primitives dùng chung (Button, Modal, Input…)
├── lib/                 # tiện ích thuần (format, date, constants, logger, errors)
└── types/               # domain types
```

Mục tiêu Giai đoạn 2:
1. Tách 6 file > 2.000 dòng thành module theo domain.
2. Đưa toàn bộ truy vấn SQL vào `server/services` (route handler chỉ còn validate + gọi service).
3. Chuyển modal prop-sync sang `key` remount.
4. Thống nhất một nguồn cấu hình duy nhất (bỏ song song `settings` global và cột `schools`).

---

## 11. NHẬT KÝ CẬP NHẬT CHUẨN

| Ngày | Nội dung | Người ban hành |
|---|---|---|
| 2026-11-20 | Ban hành chuẩn chất lượng v1.0: Zero-Residue Rule, Logging Policy, Error Handling, File Size Budget, Type Safety, Workflow bắt buộc, lộ trình Giai đoạn 2 | Main Agent |
