# AI_CHAT.md & EMBEDDING.md - TÍNH NĂNG AI, TƯ VẤN & ZALO BOT THÔNG MINH
> **Dành cho:** `bug-investigator`, `perf-optimizer`, Main Agent  
> **Quy tắc bắt buộc:** Tài liệu này ghi nhận hiện trạng và định hướng kiến trúc tích hợp Trí tuệ nhân tạo (AI Chatbot, Smart Matching, Zalo Notification Bot, Text Embedding) trong hệ thống. Cập nhật nhật ký ở cuối file.

---

## 1. HIỆN TRẠNG TÍNH NĂNG AI & THÔNG MINH HIỆN TẠI (V2.6.0)

### 1.1. Zalo Bot Creator Integration (`/api/zalo-bot`)
- Hệ thống đã tích hợp API chính thức với Zalo Bot Manager (`@Zalo Bot Manager`).
- Cho phép gửi tin nhắn tự động nhắc học phí, thông báo ca học bù, xác nhận đóng tiền tới học sinh/phụ huynh dựa trên `zalo_chat_id`.
- Tự động kiểm tra tính hợp lệ của Token (`getMe` API).

### 1.2. Smart Excel Semantic Parser (`SmartExcelImportModal.tsx`)
- Sử dụng thuật toán so khớp ngữ nghĩa tự nhiên để nhận diện cột dữ liệu từ file Excel người dùng tải lên:
  - Tự động nhận diện cột: "Họ và tên", "Họ tên", "Tên HS" $\rightarrow$ `name`.
  - Nhận diện cột: "Số điện thoại", "SĐT", "Điện thoại phụ huynh" $\rightarrow$ `phone`.
  - Nhận diện cột: "Môn học", "Bộ môn", "Chương trình" $\rightarrow$ `subject`.
  - Phân tích chuỗi lịch học phức tạp: "T2, T4 từ 18h-19h30, T7 9h-10h30" $\rightarrow$ Tự động phân tách thành các bản ghi `ScheduleItem[]` có ngày, giờ bắt đầu, giờ kết thúc và số tiếng chính xác.

### 1.3. Smart Vacancy & Schedule Matching Engine (`ScheduleAvailabilityModal.tsx`)
- Thuật toán so khớp lịch học tự động: Khi phụ huynh hoặc học sinh mới muốn đăng ký, hệ thống tính toán ma trận độ đầy sĩ số thời gian thực, tự động gợi ý các ca học còn trống chỗ phù hợp nhất với giáo viên chuyên môn và bộ môn đã chọn.

---

## 2. ĐỊNH HƯỚNG TÍCH HỢP AI CHAT & EMBEDDING (ROADMAP TRONG TƯƠNG LAI)

### 2.1. Trợ Lý AI Chatbot Cho Phụ Huynh (AI Parent Assistant)
- **Mục tiêu:** Trả lời tự động 24/7 các thắc mắc của phụ huynh tại Cổng Phụ huynh:
  - *"Tháng này con tôi phải nộp bao nhiêu tiền?"*
  - *"Thứ 7 tuần này có ca học bù nào còn trống cho môn Piano không?"*
  - *"Quy định bảo lưu của trung tâm như thế nào?"*
- **Kiến trúc đề xuất:**
  - Sử dụng Vercel AI SDK (`ai`), mô hình gọn nhẹ (Gemini Flash / GPT-4o-mini).
  - Tích hợp Tool Calling kết nối trực tiếp với API `/api/parent`, `/api/classes/occupancy`.

### 2.2. Vector Embedding & Semantic Search Cho Nội Quy / Khóa Học (RAG Engine)
- **Mục tiêu:** Cho phép tìm kiếm ngữ nghĩa nội dung quy chế trung tâm, giáo trình môn học, câu hỏi thường gặp (FAQ).
- **Lưu trữ Vector:** Có thể tích hợp SQLite-vec (nhúng trực tiếp trong SQLite) hoặc in-memory cosine similarity đối với danh mục tài liệu nhỏ (< 1.000 vectors) mà không cần cài đặt thêm vector database phức tạp.

---

## 3. NHẬT KÝ THEO DÕI TÍNH NĂNG AI (AI CHAT & EMBEDDING LOG)

| Ngày ghi nhận | Module | Hiện trạng | Người thực hiện |
|---|---|---|---|
| 2026-10-29 | Zalo Bot Platform Integration | Hoạt động ổn định (v2.6) | Main Agent |
| 2026-10-29 | Smart Excel Schedule Parser | Đã triển khai và tối ưu (v2.6) | Main Agent |
| 2026-10-29 | AI Parent Chatbot & RAG Engine | Lập kế hoạch kiến trúc (Roadmap) | Main Agent |
