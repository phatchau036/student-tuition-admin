# QUY TẮC ĐỒNG BỘ GIT & QUẢN TRỊ DATABASE ĐA MÁY (A & B)

Tài liệu này hướng dẫn cách làm việc giữa **Máy A (Máy Dev / Code)** và **Máy B (Máy Vận Hành / Chạy Thực Tế)** để đảm bảo **không bao giờ bị mất dữ liệu thật** và **không bao giờ bị lỗi xung đột hoặc thiếu cột/bảng mới**.

---

## 1. NGUYÊN TẮC CỐT LÕI (BẤT BIẾN)

1. **KHÔNG BAO GIỜ đẩy file `data/admin.db` lên GitHub**:
   - File `data/admin.db` là dữ liệu chạy thực tế của máy đó (chứa danh sách học sinh thật, tiền đóng thật, lịch học bù thật).
   - Đã được chặn tự động trong `.gitignore` (`data/*.db`, `data/*.db-wal`, `data/*.db-journal`).
   - Thư mục `data/` được giữ lại trên Git bằng file `data/.gitkeep`.

2. **CẤU TRÚC DATABASE ĐƯỢC QUẢN LÝ BẰNG CODE (`src/lib/db.ts`)**:
   - Khi máy A tạo bảng mới hoặc thêm cột mới, máy A viết code migration trong `src/lib/db.ts`.
   - Máy B chỉ cần `git pull` code mới về. Khi server khởi động hoặc có người truy cập web, hàm `initDb()` sẽ **tự động chạy ngầm**:
     - Tự tạo bảng mới nếu chưa có (`CREATE TABLE IF NOT EXISTS`).
     - Tự thêm cột mới nếu chưa có (`ALTER TABLE ... ADD COLUMN ...`).
     - **Toàn bộ dữ liệu thật của máy B được giữ nguyên vẹn 100%**.

---

## 2. QUY TRÌNH KHI MÁY A (DEV) THÊM TÍNH NĂNG HOẶC THÊM CỘT MỚI

Mỗi khi máy A thêm tính năng mới mà cần lưu thêm thông tin vào database:

### Bước 1: Khai báo cột mới / bảng mới trong `src/lib/db.ts`
- Nếu tạo bảng mới:
  ```typescript
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ten_bang_moi (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  ```
- Nếu thêm cột vào bảng đã có (ví dụ bảng `students`):
  Cuộn xuống cuối hàm `initDb()` trong `src/lib/db.ts` và thêm 1 dòng:
  ```typescript
  try { await db.execute("ALTER TABLE students ADD COLUMN ten_cot_moi TEXT DEFAULT NULL"); } catch {}
  ```
  *(Khối `try { ... } catch {}` đảm bảo nếu cột đã tồn tại thì không báo lỗi, nếu chưa có thì tự động tạo).*

### Bước 2: Commit và Push code lên GitHub
```bash
git add .
git commit -m "feat: mo ta tinh nang moi"
git push origin main
```
*(Yên tâm: `.gitignore` đã chặn file `data/admin.db`, Git sẽ chỉ đẩy code và file `.gitkeep`).*

---

## 3. QUY TRÌNH KHI MÁY B (VẬN HÀNH / PRODUCTION) CẬP NHẬT CODE MỚI

Khi máy A báo đã có bản update mới trên GitHub:

### Bước 1: Kéo code mới về máy B
```bash
git pull origin main
```
- Nếu có cài thêm thư viện mới: chạy `npm install`
- Build lại bản production: `npm run build`
- Chạy server: `npm start` (hoặc `pm2 restart`)

### Bước 2: Kết quả tự động
- Không bị lỗi xung đột file `.db`.
- Không bị mất bất kỳ học sinh hay khoản tiền nào ở máy B.
- Khi người dùng bấm vào web, hàm `initDb()` sẽ ngay lập tức tự thêm các cột mới vào file `admin.db` của máy B.

---

## 4. CHECKLIST PHÒNG TRÁNH LỖI (DÀNH CHO DEV)

- [x] Không bao giờ chạy lệnh `git add -f data/admin.db`.
- [x] Trước khi commit, gõ `git status` để kiểm tra: trong danh sách file commit **chỉ có file code (.ts, .tsx, .json, .md)**, tuyệt đối không có file đuôi `.db`.
- [x] Luôn kiểm tra hàm `initDb()` trong `src/lib/db.ts` đã có lệnh `CREATE TABLE` hoặc `ALTER TABLE` cho các trường dữ liệu mới chưa.
