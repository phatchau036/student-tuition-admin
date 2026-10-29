# INDEX.md - DANH MỤC ĐIỀU HƯỚNG TÀI LIỆU KỸ THUẬT & QUY TẮC ĐỌC/GHI TRẠNG THÁI
> **Vị trí thư mục:** `docs/INDEX.md`  
> **Dành cho:** Tất cả các Subagents và Main AI Agent  
> **QUY TẮC BẤT BIẾN:** Trước khi bắt tay vào làm bất kỳ công việc nào, AI Agent / Subagent **BẮT BUỘC PHẢI ĐỌC TÀI LIỆU TƯƠNG ỨNG TRONG THƯ MỤC `docs/`** và **GHI LẠI TRẠNG THÁI MỚI LIÊN TỤC VÀO BẢNG LOG Ở CUỐI FILE ĐÓ**.

---

## 1. BẢNG TRA CỨU NHANH: "VIỆC NÀO ĐỌC DOC NÀO" CHO CÁC SUBAGENTS

| STT | Loại công việc / Nhiệm vụ | Subagent phụ trách | Tài liệu bắt buộc phải đọc trước khi làm | Ghi log trạng thái vào file |
|---|---|---|---|---|
| 1 | Bắt đầu phiên làm việc / Định hướng chung | Main Agent | [AGENTS.md](../AGENTS.md), [README.md](../README.md) | [docs/INDEX.md](./INDEX.md) |
| 2 | Phân tích phạm vi khi có yêu cầu lớn / nhiều file | `scope-planner` | [docs/ARCHITECTURE.md](./ARCHITECTURE.md), [docs/DECISIONS.md](./DECISIONS.md) | [docs/ARCHITECTURE.md](./ARCHITECTURE.md) |
| 3 | Tìm kiếm code, hiểu kiến trúc component & API | `codebase-explorer`| [docs/ARCHITECTURE.md](./ARCHITECTURE.md), [docs/API_REFERENCE.md](./API_REFERENCE.md) | [docs/ARCHITECTURE.md](./ARCHITECTURE.md) |
| 4 | Điều tra lỗi, crash, hành vi sai, bug logic | `bug-investigator` | [docs/KNOWN_ISSUES.md](./KNOWN_ISSUES.md), [docs/STATE_TRACKER_RESTORE.md](./STATE_TRACKER_RESTORE.md) | [docs/KNOWN_ISSUES.md](./KNOWN_ISSUES.md) |
| 5 | Tối ưu hóa app chậm, giật lag, bundle nặng | `perf-optimizer` | [docs/PERFORMANCE.md](./PERFORMANCE.md), [docs/DATABASE.md](./DATABASE.md) | [docs/PERFORMANCE.md](./PERFORMANCE.md) |
| 6 | Kiểm tra giao diện Mobile (`/giao-vien`, `/phu-huynh`) | `mobile-specialist` | [docs/MOBILE.md](./MOBILE.md), [docs/UI_DESIGN_SYSTEM.md](./UI_DESIGN_SYSTEM.md) | [docs/MOBILE.md](./MOBILE.md) |
| 7 | Xây dựng / chỉnh sửa Component, Modal, Layout | `ui-builder` | [docs/UI_DESIGN_SYSTEM.md](./UI_DESIGN_SYSTEM.md), [docs/CONVENTIONS.md](./CONVENTIONS.md) | [docs/UI_DESIGN_SYSTEM.md](./UI_DESIGN_SYSTEM.md) |
| 8 | Thiết kế Schema, thêm bảng/cột mới, viết API | `api-db-designer` | [docs/DATABASE.md](./DATABASE.md), [docs/API_REFERENCE.md](./API_REFERENCE.md) | [docs/DATABASE.md](./DATABASE.md) |
| 9 | Thiết kế biểu tượng SVG, badge, huy hiệu | `svg-designer` | [docs/UI_DESIGN_SYSTEM.md](./UI_DESIGN_SYSTEM.md) | [docs/UI_DESIGN_SYSTEM.md](./UI_DESIGN_SYSTEM.md) |
| 10 | Viết test kiểm thử, logic học phí, sĩ số | `test-writer` | [docs/TESTING.md](./TESTING.md), [docs/PAYMENTS.md](./PAYMENTS.md) | [docs/TESTING.md](./TESTING.md) |
| 11 | Review code sau khi sửa, kiểm tra quy chuẩn Git | `code-reviewer` | [docs/DEVELOPMENT.md](./DEVELOPMENT.md), [docs/CONVENTIONS.md](./CONVENTIONS.md), [docs/GIT_WORKFLOW_RULES.md](./GIT_WORKFLOW_RULES.md) | [docs/DEVELOPMENT.md](./DEVELOPMENT.md) |
| 12 | Kiểm toán bảo mật, Localhost Guard, IP Whitelist | `security-auditor` | [docs/AUTH_SECURITY.md](./AUTH_SECURITY.md), [docs/ENV_CONFIG.md](./ENV_CONFIG.md) | [docs/AUTH_SECURITY.md](./AUTH_SECURITY.md) |
| 13 | Kiểm thử toàn diện build/lint trước khi xong | `qa-walkthrough` | [docs/TESTING.md](./TESTING.md), [docs/DEPLOYMENT.md](./DEPLOYMENT.md) | [docs/TESTING.md](./TESTING.md) |
| 14 | Đối chiếu yêu cầu gốc vs git diff (Không sót việc) | `completeness-auditor`| [docs/CHANGELOG.md](./CHANGELOG.md), [AGENTS.md](../AGENTS.md) | [docs/CHANGELOG.md](./CHANGELOG.md) |

---

## 2. TOÀN BỘ DANH MỤC TÀI LIỆU KỸ THUẬT CỦA HỆ THỐNG

### Tài liệu điều phối ngoài thư mục gốc (Root):
- **[../AGENTS.md](../AGENTS.md)**: Master Agent Dispatcher điều phối 13 subagents, 5 quy trình pipeline và quy tắc đọc docs.
- **[../README.md](../README.md)**: Giới thiệu tổng quan hệ thống, cài đặt và vận hành nhanh.
- **[../CLAUDE.md](../CLAUDE.md)**: Chỉ dẫn dành cho Claude Code / AI Agent trỏ vào `AGENTS.md` và `docs/INDEX.md`.

### Toàn bộ tài liệu chuyên sâu trong thư mục `docs/`:
| # | Tên tệp trong `docs/` | Trạng thái | Mục đích & Đối tượng sử dụng chính |
|---|---|---|---|
| 1 | [INDEX.md](./INDEX.md) | Đã hoàn thiện | Bản đồ kim chỉ nam điều hướng "việc nào đọc doc nào" và quy tắc cập nhật liên tục |
| 2 | [ARCHITECTURE.md](./ARCHITECTURE.md) | Đã hoàn thiện | Kiến trúc tổng thể 4 phân hệ, luồng dữ liệu cho `scope-planner`, `codebase-explorer` |
| 3 | [DECISIONS.md](./DECISIONS.md) | Đã hoàn thiện | 12 Quyết định kiến trúc đã chốt (ADR) cho `scope-planner`, `code-reviewer` |
| 4 | [DATABASE.md](./DATABASE.md) | Đã hoàn thiện | Schema 14 bảng SQLite, quan hệ và code migration cho `api-db-designer`, `perf-optimizer` |
| 5 | [AUTH_SECURITY.md](./AUTH_SECURITY.md) | Đã hoàn thiện | Localhost Guard 404, IP Whitelist, session cho `security-auditor` |
| 6 | [PAYMENTS.md](./PAYMENTS.md) | Đã hoàn thiện | Công thức học phí, chu kỳ gói, SePay webhook, nợ dồn cho `security-auditor`, `test-writer` |
| 7 | [AI_CHAT.md](./AI_CHAT.md) | Đã hoàn thiện | Tích hợp Zalo Bot Creator, trợ lý AI tư vấn phụ huynh cho `bug-investigator` |
| 8 | [EMBEDDING.md](./EMBEDDING.md) | Đã hoàn thiện | Định hướng tìm kiếm ngữ nghĩa, so khớp lịch học cho `bug-investigator`, `perf-optimizer` |
| 9 | [DEPLOYMENT.md](./DEPLOYMENT.md) | Đã hoàn thiện | Triển khai mạng LAN, VPS, auto-upgrade script cho `security-auditor`, `qa-walkthrough` |
| 10 | [DEVELOPMENT.md](./DEVELOPMENT.md) | Đã hoàn thiện | Quy trình dev, git workflow, checklist PR cho `code-reviewer`, `test-writer` |
| 11 | [STATE_TRACKER_RESTORE.md](./STATE_TRACKER_RESTORE.md) | Đã hoàn thiện | Quản lý biến động Đang học/Bảo lưu/Nghỉ học và khôi phục hồ sơ cho `bug-investigator` |
| 12 | [UI_DESIGN_SYSTEM.md](./UI_DESIGN_SYSTEM.md) | Đã hoàn thiện | Bảng màu, Glassmorphism tokens, Dark mode, đủ 4 trạng thái cho `ui-builder` |
| 13 | [CONVENTIONS.md](./CONVENTIONS.md) | Đã hoàn thiện | Chuẩn đặt tên PascalCase/camelCase, xử lý lỗi REST API cho `code-reviewer` |
| 14 | [MOBILE.md](./MOBILE.md) | Đã hoàn thiện | Tối ưu cảm ứng, bàn phím ảo, Safe Area trên `/giao-vien` và `/phu-huynh` cho `mobile-specialist` |
| 15 | [API_REFERENCE.md](./API_REFERENCE.md) | Đã hoàn thiện | Danh mục toàn bộ API endpoint, tham số request/response cho `api-db-designer` |
| 16 | [ENV_CONFIG.md](./ENV_CONFIG.md) | Đã hoàn thiện | Danh mục biến môi trường `.env` và config third-party trong DB cho `security-auditor` |
| 17 | [TESTING.md](./TESTING.md) | Đã hoàn thiện | 5 Suite kiểm thử trọng yếu và quy trình QA Walkthrough cho `test-writer`, `qa-walkthrough` |
| 18 | [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) | Đã hoàn thiện | Các lỗi đã biết và nợ kỹ thuật SQLite/Proxy cho `bug-investigator` |
| 19 | [PERFORMANCE.md](./PERFORMANCE.md) | Đã hoàn thiện | Chỉ số hiệu năng chấp nhận và biện pháp tối ưu memoize/cache cho `perf-optimizer` |
| 20 | [CHANGELOG.md](./CHANGELOG.md) | Đã hoàn thiện | Lịch sử phiên bản từ v2.3 đến v2.6 và Roadmap tính năng tương lai cho `completeness-auditor` |
| 21 | [GIT_WORKFLOW_RULES.md](./GIT_WORKFLOW_RULES.md) | Đã hoàn thiện | Quy tắc đồng bộ Git và an toàn cơ sở dữ liệu đa máy (A & B) |
| 22 | [DOCUMENTATION.md](./DOCUMENTATION.md) | Đã hoàn thiện | Tài liệu đặc tả kỹ thuật chi tiết toàn diện của hệ thống |

---

## 3. QUY TRÌNH 3 BƯỚC THỰC HIỆN BẮT BUỘC KHI CÓ NHIỆM VỤ MỚI

Mỗi khi Main Agent hoặc Subagent nhận được yêu cầu từ người dùng:

1. **BƯỚC 1 - ĐỌC TRƯỚC (READ FIRST):**
   - Tra cứu bảng ở Mục 1 để xác định tài liệu liên quan trong `docs/`.
   - Đọc kỹ tài liệu đó để nắm vững quy chuẩn, quyết định đã chốt và cấu trúc sẵn có.
2. **BƯỚC 2 - THỰC HIỆN THEO QUY CHUẨN (EXECUTE COMPLIANTLY):**
   - Viết mã hoặc cấu hình tuân thủ tuyệt đối các quy định trong tài liệu.
   - Không vi phạm các quyết định kiến trúc trong `docs/DECISIONS.md`.
   - Không commit các file database `data/*.db` theo `docs/GIT_WORKFLOW_RULES.md`.
3. **BƯỚC 3 - GHI TRẠNG THÁI MỚI (UPDATE LOG CONTINUOUSLY):**
   - Mở tài liệu kỹ thuật liên quan trong `docs/` (ví dụ: `docs/DATABASE.md` nếu sửa DB, `docs/API_REFERENCE.md` nếu sửa API, `docs/CHANGELOG.md` nếu thêm tính năng mới).
   - Thêm 1 dòng mới vào bảng nhật ký ở cuối file ghi rõ: Ngày tháng, hành động đã thực hiện, trạng thái và tác giả/subagent.
   - Ghi nhận trạng thái tổng thể vào bảng nhật ký của `docs/INDEX.md`.

---

## 4. NHẬT KÝ THEO DÕI TỔNG THỂ HỆ THỐNG (MASTER SYSTEM LOG)

| Thời gian (UTC) | Tác vụ tổng thể | Subagent thực hiện | Trạng thái hệ thống |
|---|---|---|---|
| 2026-10-29 | Khởi tạo và gom toàn bộ tài liệu kỹ thuật vào thư mục `docs/` | Main Agent | Hoàn thành cấu trúc gọn gàng, đồng bộ chuẩn xác v2.6.0 |
| 2026-10-29 | Nâng cấp toàn diện ma trận xếp lịch `ClassroomScheduleMatrix` | `ui-builder` | Hoàn thành lưới 7 cột đồng bộ, chip rộng, Side Drawer, thanh công cụ 2 tầng |
| 2026-10-29 | Tối ưu đóng Side Drawer khi click bên ngoài backdrop hoặc phím ESC | `ui-builder` | Đã triển khai và push GitHub |
