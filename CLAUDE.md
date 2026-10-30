# CLAUDE.md - HƯỚNG DẪN DÀNH CHO CLAUDE CODE & AI ASSISTANTS

> **Lưu ý cốt lõi:**  
> - Bảng điều phối Subagents và Quy trình phát triển: 👉 **[AGENTS.md](./AGENTS.md)**  
> - Danh mục toàn bộ 22 tài liệu kỹ thuật chuyên sâu nằm trong thư mục: 👉 **[docs/INDEX.md](./docs/INDEX.md)**

---

## QUY TẮC BẤT BIẾN KHI LÀM VIỆC:
1. **Đọc trước khi làm:** Mở `docs/INDEX.md` hoặc bảng tra cứu tại `AGENTS.md` để mở đúng tài liệu chuyên môn trong `docs/`.
2. **Không commit Database:** TUYỆT ĐỐI KHÔNG commit `data/admin.db` hoặc bất kỳ tệp `.db` nào lên Git (`docs/GIT_WORKFLOW_RULES.md`). Chỉ giữ file `data/.gitkeep`.
3. **Database Migration bằng Code:** Mọi bảng/cột mới phải được khai báo trong hàm `initDb()` tại `src/lib/db.ts` (`docs/DATABASE.md`).
4. **Bảo mật nội bộ TpTeam (Strict Backoffice):** Toàn bộ quy trình, tính năng và đường dẫn liên quan đến `/he-thong` (phân công task 3 giai đoạn Chưa làm/Đang làm/Đã làm, thành viên TpTeam...) là nội bộ đội ngũ phát triển, **TUYỆT ĐỐI KHÔNG HIỂN THỊ HOẶC VIẾT VÀO CHANGELOG CHO ADMIN CƠ SỞ**.
5. **Ghi log liên tục:** Sau mỗi lần chỉnh sửa hoặc thêm tính năng, BẮT BUỘC ghi lại trạng thái mới vào bảng nhật ký ở cuối tài liệu tương ứng trong `docs/`.

---

## LỆNH VẬN HÀNH DỰ ÁN:
```bash
npm run dev      # Môi trường phát triển
npm run lint     # Kiểm tra lỗi linter
npm run build    # Build bản sản xuất
npm start        # Chạy máy chủ (mở toàn mạng LAN)
```
