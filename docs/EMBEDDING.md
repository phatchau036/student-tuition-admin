# EMBEDDING.md - ĐỊNH HƯỚNG VECTOR EMBEDDING & TÌM KIẾM NGỮ NGHĨA
> **Dành cho:** `bug-investigator`, `perf-optimizer`, Main Agent  
> **Quy tắc bắt buộc:** Đọc file này khi nghiên cứu hoặc triển khai tìm kiếm ngữ nghĩa, so khớp học viên thông minh, hoặc RAG. Cập nhật nhật ký ở cuối file.

---

## 1. TỔNG QUAN VỀ EMBEDDING TRONG DỰ ÁN

Hiện tại, hệ thống giải quyết bài toán so khớp văn bản và lịch học bằng các thuật toán thông minh không dùng vector nặng:
1. **Rule-based & Regex Tokenizer (`SmartExcelImportModal.tsx`):**
   - Phân tích giờ học, chuẩn hóa chuỗi ngày trong tuần (T2, T3, T4, Thứ Hai, Thứ Ba...).
   - Nhận diện cột file Excel dựa trên từ khóa tương đồng (Synonym Dictionary Matching).
2. **Realtime Availability Matrix Search (`src/app/api/classes/occupancy/route.ts`):**
   - Tính toán trực tiếp trên dữ liệu SQLite dựa trên giờ mở cửa và số học sinh thực tế đang đăng ký.

---

## 2. KẾ HOẠCH TÍCH HỢP VECTOR EMBEDDING (KHI CÓ YÊU CẦU)

Khi hệ thống mở rộng tính năng hỏi đáp tự động quy chế và tài liệu học:
- **Mô hình Embedding:** `text-embedding-3-small` hoặc HuggingFace Xenova Transformers (chạy trực tiếp trong Node.js/Wasm không tốn phí API).
- **Lưu trữ:**
  - Lựa chọn 1: Bảng SQLite nhúng `document_embeddings (id, doc_id, chunk_text, vector_blob)`.
  - Lựa chọn 2: Sử dụng SQLite-vec extension.
- **Tiêu chuẩn hiệu năng:** Độ trễ tìm kiếm tương đồng vector cosine similarity phải $< 50\text{ms}$ trên máy chủ nội bộ.

---

## 3. NHẬT KÝ THEO DÕI EMBEDDING

| Ngày | Trạng thái | Ghi chú |
|---|---|---|
| 2026-10-29 | Khởi tạo tài liệu định hướng | Hệ thống v2.6.0 đang dùng Regex/Semantic matching tối ưu cực nhẹ |
