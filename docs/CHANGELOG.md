# CHANGELOG.md & ROADMAP - LỊCH SỬ THAY ĐỔI & LỘ TRÌNH PHÁT TRIỂN
> **Dành cho:** `completeness-auditor`, Main Agent  
> **Quy tắc bắt buộc:** Sau mỗi lần hoàn thành một tính năng mới hoặc bản phát hành, subagent BẮT BUỘC phải ghi nhận lịch sử vào tài liệu này.

---

## 1. LỊCH SỬ PHIÊN BẢN (CHANGELOG)

### [v2.9.2] - 2026-11-10
- **⭐ KHẮC PHỤC TRIỆT ĐỂ LỖI VỠ FORM BẢNG HỌC SINH & GIAO DIỆN QUẢN TRỊ (`Dashboard.tsx`):**
  - **Sửa lỗi crash React khi mở "Điểm Danh & Sổ Bài Học" (`DailyAttendanceModal.tsx`):** Khắc phục lỗi vi phạm quy tắc Hooks của React (gọi `useState(loadingAiKey)` phía sau điều kiện early return `if (!isOpen) return null`), khiến component bị crash khi người dùng bấm mở modal. Đưa toàn bộ React Hooks lên đầu component và bổ sung xử lý dữ liệu an toàn (defensive checks) cho mảng lớp học, giáo viên, học sinh.
  - **Tối ưu độ rộng cột toàn diện (min-w 1240px & Hết hẳn lỗi cắt chữ `...`):** Tăng độ rộng tối thiểu toàn bảng lên `min-w-[1240px]`, loại bỏ các thuộc tính cắt chữ cụt `truncate` cứng nhắc trên cột Tên học sinh, Lớp học, Level/Môn học, Chiết khấu và Học phí. Đảm bảo hiển thị đầy đủ 100% nội dung (như tên lớp `LỚP DƯỚI (PHÒNG 1)`, lý do chiết khấu `Anh em ruột cùng học`...), các nhãn huy hiệu thẳng hàng, không bị chèn ép hoặc nhảy dòng lộn xộn trên mọi độ phân giải màn hình.
  - **Gỡ bỏ nút nổi "Hỏi Trợ Lý AI" ở góc phải dưới:** Nút floating cố định trước đó bị đè trực tiếp lên hàng học sinh cuối bảng, che mất nút Thao tác (`...`) và nút Đối soát học phí. Đã gỡ bỏ nút đè này (Trợ lý AI đã có sẵn trên thanh công cụ và Menu Nghiệp Vụ rất tiện lợi).
  - **Sửa lỗi hiển thị nợ gây hiểu nhầm "Nợ 2m":** Khắc phục lỗi hiển thị nhãn nợ quá hạn ghi `Nợ 2m` (khiến người dùng đọc nhầm thành *Nợ 2 triệu* trong khi học phí thực tế chỉ 950.000đ). Đã sửa thành hiển thị rõ ràng tiếng Việt: `Nợ 2 tháng` (`Nợ {count} tháng`).
  - **Xóa khoảng trắng thừa khổng lồ cuối bảng:** Thay thế `pb-32` (128px khoảng trắng thừa) bằng `pb-6` gọn gàng, vừa mắt.
- **⭐ HỢP NHẤT QUẢN LÝ GIÁO VIÊN VÀO "TÀI KHOẢN & PHÂN QUYỀN" & BẢO MẬT VAI TRÒ CỐ ĐỊNH:**
  - **Chuyển nút "Nhắc Học Phí" vào Menu Nghiệp Vụ Cơ Sở:** Gỡ bỏ nút "Nhắc Học Phí" chiếm diện tích trên thanh công cụ trên cùng (Top Navbar), chuyển thành mục tập trung bên trong "Nghiệp Vụ Cơ Sở" (kèm số lượng học sinh chưa đóng tiền). Giúp thanh tiêu đề thoáng đãng, đồng bộ các nghiệp vụ vào một nơi.
  - **Gọn hóa Menu Nghiệp Vụ (Loại bỏ mục trùng lặp "Đội Ngũ Giáo Viên"):** Vì toàn bộ đội ngũ giáo viên đã được quản lý tập trung và khoa học trong mục "Tài Khoản & Phân Quyền", hệ thống đã tinh gọn menu bằng cách bỏ mục "Đội Ngũ Giáo Viên" trùng lặp.
  - **Tối ưu form thêm giáo viên (Bỏ ô "Sĩ số tối đa của giáo viên"):** Sĩ số tối đa là thuộc tính cấu hình theo từng Lớp học/Phòng học cụ thể, giáo viên chỉ là người phụ trách đứng lớp. Đã loại bỏ ô nhập sĩ số tối đa thừa trong form thêm/sửa giáo viên để form gọn gàng, đúng nghiệp vụ.
  - **Hợp nhất nhân sự 3 Tab trong `StaffManagementModal.tsx`:** Gom toàn bộ việc quản lý nhân sự cơ sở về một nơi duy nhất: Tab 1 *Đội Ngũ Giáo Viên (Cổng /giao-vien)*, Tab 2 *Nhân Viên Quản Trị (/admin)*, Tab 3 *Nhóm Quyền & Vai Trò (RBAC)*. Người dùng chỉ cần vào "Tài Khoản & Phân Quyền" trong Menu Nghiệp Vụ là quản lý được toàn bộ nhân sự.
  - **Vai trò cố định an toàn cho Giáo viên đứng lớp:** Tự động gán và khóa cố định vai trò *Giáo Viên Đứng Lớp (Cố Định)* cho các tài khoản giáo viên. Quyền hạn chỉ giới hạn tại Cổng Giáo Viên (/giao-vien) trên điện thoại (xem lịch dạy, điểm danh, chấm sao, nhận xét và xin nghỉ). Bảo vệ tuyệt đối, giáo viên không thể xem tiền bạc hay doanh thu của cơ sở và không thể bị sửa/xóa nhầm vai trò này.
  - **Rà soát & nạp tri thức toàn diện 100% vào Bộ Não AI (`aiBrain.ts`):** 
    - Nạp toàn bộ cẩm nang chi tiết về mọi tính năng cơ sở cho Admin (học sinh, chuyển trạng thái bảo lưu/nghỉ học, điểm danh hai chiều, giờ bù, duyệt giáo viên xin nghỉ, hàng đợi nhắc nợ Zalo, đối soát SePay, xuất biên lai...).
    - Hướng dẫn chuẩn xác 100% khi được hỏi: *"Làm sao add acc giáo viên?"* (chỉ dẫn vào Tài Khoản & Phân Quyền > tab Đội Ngũ Giáo Viên > thêm Tên + SĐT để đăng nhập /giao-vien).
    - Tách biệt ranh giới phân quyền rõ ràng: Trợ lý AI chỉ giải đáp các nghiệp vụ thuộc cấp cơ sở của Admin/Quản lý, tuyệt đối không nhắc đến cấp kỹ thuật/quản trị hệ thống (`/he-thong`).

### [v2.9.1] - 2026-11-09
- **⭐ HỆ THỐNG TRỢ LÝ AI ĐA KÊNH CHO ADMIN (CHAT TRỰC TIẾP QUA ZALO BOT & TRÊN WEB DASHBOARD) & HỖ TRỢ GIÁO VIÊN:**
  - **Admin chat trực tiếp với Zalo Bot trên điện thoại (`/api/zalo-bot/webhook` & `aiBrain.ts`):** Admin mở Zalo nhắn hỏi Bot: *"Doanh thu tháng này là bao nhiêu?", "Còn ai chưa đóng tiền?"...* ➔ AI tự động đọc dữ liệu vận hành thời gian thực của cơ sở và trả lời ngay trên Zalo của Admin.
  - **Trợ lý AI cẩm nang sử dụng phần mềm:** Admin hỏi: *"Web đã có chức năng này chưa?", "Làm sao để thêm học sinh?", "Cách phân quyền nhân viên?"...* ➔ AI hướng dẫn chi tiết từng bước trên giao diện phần mềm.
  - **Cửa sổ Trợ Lý AI trên Web Admin (`AdminAiAssistantModal.tsx` & `Dashboard.tsx`):** Nút mở nhanh trên thanh công cụ và nút nổi góc dưới màn hình, tích hợp sẵn các câu hỏi mẫu gợi ý (Doanh thu, tính năng web, soạn thông báo gửi phụ huynh).
  - **Nút "✨ AI Gợi ý" trên Cổng Giáo Viên (`/giao-vien`) & Điểm Danh Admin (`DailyAttendanceModal.tsx`):** Tự động soạn lời nhận xét sư phạm và dặn dò bài tập về nhà dựa trên số sao đánh giá và từ khóa ghi chú.
  - **Quản lý cấu hình AI tập trung trong Quản Trị Hệ Thống (`/he-thong`):** Tab mới *Cấu Hình AI Trợ Lý* cho phép thiết lập Endpoint Base URL (hỗ trợ OpenAI/Gemini proxy), API Key, Model ID, nút kiểm tra kết nối (Test connection) và lưu cấu hình. Tuyệt đối không hardcode API key vào mã nguồn.
- **⭐ SỬA LỖI HIỂN THỊ CA TRỐNG CHẾ ĐỘ XEM "THEO THỨ" (`ClassroomScheduleMatrix.tsx`):**
  - **Khắc phục ca trống vẫn hiện khi bật "Ẩn ca trống":** Trước đó chế độ xem Theo Thứ (`single_day`) lấy danh sách mốc giờ từ `allWeekHours` (tính gộp cả tuần), khiến các ca mà ngày đó không có học sinh nào (như ca 19:00 Thứ 2) vẫn bị hiển thị card *"0 học viên - Chưa có học viên nào"*. Đã tối ưu hóa danh sách `singleDayHours`: Khi bật "Ẩn ca trống", hệ thống chỉ lọc hiển thị các ca thực tế có học sinh trong ngày được chọn.
  - **Bổ sung trạng thái ngày trống hoàn toàn:** Nếu ngày đó không có ca học nào (ví dụ Chủ Nhật khi bật Ẩn ca trống), hệ thống hiển thị thông báo trực quan kèm nút mở nhanh ca trống hoặc thêm học viên mới.
  - **Thống kê chính xác & cảnh báo nợ trên tab thứ:** Bổ sung huy hiệu `{stats.unpaid} nợ` trực tiếp trên các tab chọn thứ (`Thứ 3 1 • 1 nợ`), lọc dữ liệu chính xác theo các dropdown bộ môn, giáo viên và thanh tìm kiếm.
  - **Hiển thị giáo viên đứng lớp:** Bổ sung tên giáo viên phụ trách (`• Thầy/Cô ...`) trong thẻ học viên chi tiết của chế độ xem Theo Thứ.
- **⭐ HÀNG ĐỢI NHẮC HỌC PHÍ NHANH QUA ZALO CHO DANH SÁCH NỢ (Tuition Reminder Queue):**
  - **Tập trung danh sách công nợ toàn cơ sở (`TuitionReminderQueueModal.tsx`):** Tập hợp toàn bộ học sinh chưa đóng học phí tháng hiện tại hoặc còn nợ dồn các tháng trước vào một giao diện tập trung. Cung cấp 4 thẻ thống kê trực quan: *Tổng học sinh cần thu*, *Chưa nhắc hôm nay*, *Đã nhắc hôm nay*, và *Tổng số tiền nợ*.
  - **Nhắc Zalo siêu tốc chỉ 2 giây:** Tự động tạo mẫu tin nhắn thông báo học phí chuẩn mực, chi tiết (Tên bé, lớp, kỳ học phí, số tiền nợ, thông tin tài khoản ngân hàng, link ảnh quét mã VietQR tự động đúng số tiền và cú pháp). Tự động sao chép vào clipboard và mở thẳng ứng dụng Zalo tới số điện thoại phụ huynh.
  - **Chống nhắc trùng trong ngày:** Sau khi gửi, dòng học sinh chuyển ngay sang trạng thái `[✓ Đã nhắc hôm nay]` kèm mốc thời gian và số lần đã nhắc trong tháng. Các nhân viên lễ tân khác nhau trong ca trực không lo bị nhắn tin trùng một phụ huynh.
  - **Gửi tự động qua Zalo Bot:** Hỗ trợ gửi tin nhắn tự động 1-click hoặc gửi hàng loạt (batch) qua Zalo Bot Platform cho các học sinh đã có mã `zalo_chat_id`.
  - **Cơ sở dữ liệu & API:** Bổ sung bảng `tuition_reminders` trong SQLite lưu vết toàn bộ lịch sử nhắc nợ, kèm API `/api/admin/tuition-reminders`.
  - **Phân quyền RBAC:** Thêm mã quyền `tuition.remind` ("Hàng đợi nhắc học phí Zalo") vào danh mục phân quyền nhân viên.
- **⭐ KÊNH THÔNG BÁO TỰ ĐỘNG VỀ ZALO CHO QUẢN LÝ / ADMIN (Zalo Bot Admin Alerts):**
  - **Thông báo đa sự kiện thời gian thực (`src/lib/zaloBot.ts`):** Zalo Bot tự động gửi tin nhắn báo cáo tức thì về Zalo cá nhân của Admin/Quản lý khi: (1) Tiền học phí chuyển khoản về tài khoản SePay (tự động gạch nợ), (2) Phụ huynh nộp đơn báo nghỉ học, (3) Giáo viên nộp đơn xin nghỉ dạy kèm đề xuất người dạy thay, (4) Phụ huynh gửi góp ý / đánh giá chất lượng.
  - **Kết nối siêu tốc trong 10 giây trên giao diện Cài Đặt:** Nút *Lấy Chat ID gần đây* gọi `getUpdates` để Admin chỉ cần nhắn 1 tin vào Bot là hệ thống tự điền Chat ID; nút *Gửi Thử Tin Nhắn Admin* kiểm tra chuông ting ting trên Zalo điện thoại.
  - **Tùy chọn bật/tắt linh hoạt:** 4 công tắc checkbox trong `SettingsModal.tsx` cho phép chủ cơ sở lựa chọn nhận hoặc bỏ qua từng loại thông báo theo nhu cầu.

### [v2.9.0] - 2026-11-08
- **⭐ HỆ THỐNG ĐIỂM DANH HAI CHIỀU (ADMIN & GIÁO VIÊN) & SỔ LIÊN LẠC ĐIỆN TỬ CHO PHỤ HUYNH:**
  - **Điểm danh ca dạy theo ngày trên Cổng Giáo Viên (`/giao-vien`):** Bổ sung tab *Điểm Danh & Nhận Xét*, hỗ trợ giáo viên chọn ngày dạy, xem các ca dạy trong ngày và đánh dấu trạng thái từng học viên: *Có mặt*, *Vắng có phép*, *Vắng không phép*.
  - **Điểm danh & Sổ bài học trên trang Quản Trị Cơ Sở (`/admin` - `DailyAttendanceModal.tsx`):** Admin hoặc Giáo viên đều có thể điểm danh ca dạy ngày hôm đó. Thẻ học sinh hiển thị rõ nhãn `[✓ Đã điểm danh: Có mặt / Vắng]` và **không khóa nút**, luôn cho phép chỉnh sửa bổ sung nhận xét, dặn dò bài tập bất cứ lúc nào.
  - **Đánh giá sao & Ghi nhận xét buổi học & Giao bài tập về nhà:** Giáo viên/Admin chấm điểm mức độ hoàn thành bài học (1 đến 5 sao), nhập lời nhận xét chi tiết và ghi chú bài tập về nhà dặn dò học viên.
  - **Tự động đồng bộ Quỹ giờ học bù:** Nếu đánh dấu *Vắng có phép*, hệ thống tự động ghi nhận buổi vắng và cộng dồn số phút vào Quỹ giờ học bù; nếu là buổi học bù, hệ thống tự động đánh dấu hoàn thành và khấu trừ số giờ đã bù.
  - **Sổ theo dõi học tập trên Cổng Phụ Huynh (`ParentPortal.tsx` & `/api/parent`):** Bổ sung tab *Sổ Học Tập* hiển thị dòng thời gian các buổi học của con, ngày giờ, giáo viên đứng lớp, trạng thái đi học, đánh giá sao, lời nhận xét và bài tập về nhà.
  - **Xem nhật ký học tập trong hồ sơ học sinh (`StudentDetailModal.tsx`):** Quản trị viên cơ sở có thể tra cứu toàn bộ lịch sử các buổi học, nhận xét của giáo viên và đánh giá sao trực tiếp trong hồ sơ học viên.
- **⭐ TÍNH NĂNG GIÁO VIÊN BÁO NGHỈ & PHÊ DUYỆT / GÁN DẠY THAY:**
  - **Gửi đơn xin nghỉ từ Cổng Giáo Viên (`/giao-vien`):** Giáo viên chọn ngày xin nghỉ, chọn ca dạy cụ thể hoặc xin nghỉ cả ngày, nhập lý do và đề xuất giáo viên dạy thay dự kiến. Theo dõi trạng thái đơn (*Chờ duyệt*, *Đã duyệt*, *Từ chối*) và cho phép hủy đơn nếu đang chờ duyệt.
  - **Quản lý đơn xin nghỉ của giáo viên phía Quản Trị (`TeacherManagementModal.tsx`):** Tab *Đơn Xin Nghỉ Của Giáo Viên* hiển thị số đơn chờ duyệt; Quản trị viên cơ sở có thể phê duyệt (gán giáo viên dạy thay chính thức và ghi chú phản hồi) hoặc từ chối đơn. Bảng `teacher_leaves` lưu vết toàn bộ chứng từ nghỉ dạy.

### [v2.8.6] - 2026-11-07
- **⭐ NÂNG CẤP HIỂN THỊ SĨ SỐ THỰC TẾ & NHẬN DIỆN HỌC VIÊN CA KÉO DÀI TRÊN MA TRẬN LỚP (`ClassroomScheduleMatrix.tsx` & `tuition.ts`):**
  - **Khắc phục triệt để hiểu nhầm sĩ số các khung giờ tiếp theo:** Học viên học các ca kéo dài nhiều tiếng (ví dụ 18:00 - 20:00, 18:30 - 20:00) được tự động phân bổ và hiển thị ở TẤT CẢ các khung giờ mà ca học giao thoa (ví dụ cả khung 18:00 và 19:00).
  - **Huy hiệu sĩ số thông minh:** Tiêu đề mỗi khung giờ thể hiện chính xác tổng số học viên thực tế đang có mặt trong phòng, kèm badge phân loại trực quan (ví dụ: `6 học viên (+4 ca trước)`) để admin nhìn vào là biết ngay khung giờ đó có đông hay vắng.
  - **Gắn nhãn nhận diện học viên học tiếp từ ca trước:** Trên thẻ học viên tại các khung giờ tiếp theo, hệ thống gắn nhãn nổi bật `↳ Từ 18:00` kèm viền ấm phân biệt, hiển thị đầy đủ khung giờ thực tế `18:00 - 20:00`.
  - **Bảo toàn thống kê và lượt học:** Các chỉ số tổng lượt học toàn tuần (`overallStats`) và tổng số học sinh theo ngày (`dayStatsMap`) không bị đếm trùng lặp.
- **⭐ KHẮC PHỤC LỖI TÍNH SĨ SỐ CA THỰC TẾ TRONG FORM SỬA/THÊM HỌC SINH (`StudentFormModal.tsx` & `shiftDetection.ts`):**
  - **Sửa lỗi parse thời gian chứa tiền tố thứ:** Trước đó chuỗi như `"T3, T5, T7 (17h30-18h30)"` bị hàm tách chuỗi cũ cắt nhầm thành `00:00` khiến thuật toán giao thoa thời gian không tìm thấy học sinh trùng ca (`0/7`).
  - **Nâng cấp `extractTimeRangeMinutes` và `normalizeDayOfWeek`:** Chuẩn hóa toàn bộ tên thứ (`T3`, `Thứ 3`, `CN`, `Chủ Nhật`) và trích xuất giờ học chính xác `17:30 - 18:30`.
  - **Hiển thị danh sách học viên trùng giờ trực tiếp:** Thêm danh sách tên các bạn đang học cùng ca ngay trong thẻ từng thứ của popup Kiểm tra sĩ số để admin biết rõ ai đang học cùng ca với bé.

### [v2.8.5] - 2026-11-06
- **⭐ HỆ THỐNG XUẤT BIÊN LAI ĐIỆN TỬ VÀ LƯU VẾT SỔ BIÊN LAI GIẤY (e-Receipt System):**
  - **Tích hợp mã Biên lai (Giấy):** Thêm trường `receipt_number` vào form Đối soát học phí (`QuickAuditModal`), cho phép lễ tân/admin nhập số biên lai đã viết tay trên sổ để đồng bộ chứng từ với phần mềm.
  - **Biên lai điện tử (e-Receipt Component):** Thiết kế hoàn toàn mới component `ReceiptModal.tsx` lấy cảm hứng từ màn hình biên lai chuyển khoản ngân hàng (Momo/Techcombank) cực kỳ hiện đại. 
  - **Cơ chế tải ảnh thông minh (`html2canvas`):** Admin có thể tải trực tiếp hoá đơn thanh toán dưới dạng Ảnh chất lượng cao (PNG/JPG) chỉ với 1 click để gửi thẳng qua Zalo cho Phụ huynh, không cần chụp ảnh màn hình thủ công.
  - **Tra cứu và tải Biên lai phía Phụ huynh:** Phụ huynh đăng nhập vào `ParentPortal`, truy cập tab Học Phí, đối với các tháng ĐÃ THANH TOÁN sẽ xuất hiện nút xem và tải Biên Lai, đảm bảo tính minh bạch tài chính.

### [v2.8.4] - 2026-11-06
- **⭐ NÂNG CẤP CHỌN GIỜ HỌC BÙ CỤ THỂ & TÍNH TOÁN SĨ SỐ THỜI GIAN THỰC THEO CA (ParentPortal.tsx, /api/classes/occupancy, /api/makeups):**
  - **Khắc phục lỗi sĩ số còn trống không chính xác:** Đồng bộ trường `class_id` trong câu truy vấn SQL học sinh và tích hợp thuật toán so khớp giao thoa thời gian `isTimeOverlap` (`s1 < e2 && s2 < e1`) cho từng ca giảng dạy của giáo viên và từng khoảng thời gian học thực tế của học sinh trong ngày.
  - **Bổ sung bộ chọn giờ học bù cụ thể cho Cổng Phụ Huynh (`ParentPortal.tsx`):**
    - Cho phép phụ huynh chọn nhanh trực tiếp theo các ca dạy của giáo viên trong lớp (ví dụ: Ca Cô Điệp 17:00 - 18:00, Ca Thầy Phonk 18:00 - 20:00).
    - Cung cấp thanh chọn giờ bắt đầu linh hoạt (17:00, 17:30, 18:00, 18:30, 19:00...) và bộ chọn thời lượng học bù (45 phút, 60 phút, 90 phút, 120 phút), tự động tính giờ kết thúc.
    - Hiển thị sĩ số còn trống thực tế tức thì cho khung giờ đã chọn: phản ánh chính xác số lượng học sinh đang học trong khoảng giờ đó và tự động khóa nút khi khung giờ đã đầy chỗ.
    - Tự động nhận diện giáo viên đứng lớp hoặc hiển thị thông báo đổi ca nếu học vắt qua 2 ca của 2 giáo viên.
  - **Kiểm tra sĩ số theo khung giờ bù trong API `/api/makeups`:** Khi phụ huynh hoặc admin gửi yêu cầu xếp lịch bù, hệ thống kiểm tra sĩ số theo đúng khoảng thời gian bù thực tế `[makeup_start_time, makeup_end_time]` và ca giáo viên tương ứng, tránh việc từ chối nhầm học sinh khi lớp còn chỗ ở ca khác.

### [v2.8.3] - 2026-10-31
- **⭐ HỆ THỐNG QUẢN LÝ LỚP HỌC, PHÂN BỔ SĨ SỐ & THỜI KHÓA BIỂU ĐỨNG LỚP:**
  - **Quản lý danh mục Lớp Học (`ClassManagementModal.tsx` & `/api/classes`):** Định nghĩa số lượng lớp học (Lớp Piano K1, Guitar Đệm Hát, Thanh Nhạc Nhóm...), phân bổ Sĩ số tối đa (Max Capacity) cho từng lớp, gán Phòng học và cấu hình Thời khóa biểu các ca trong tuần.
  - **Phân công Giáo viên đứng lớp & Cổng Giáo Viên (`/giao-vien`):** Bổ sung Tab *"Lớp Đứng"* trên giao diện điện thoại của giáo viên, hiển thị rõ ràng từng lớp mình phụ trách, phòng học, sĩ số thực tế/sĩ số tối đa và thời khóa biểu các ca dạy trong tuần.
  - **Tích hợp chọn Lớp vào Hồ sơ Học sinh (`StudentFormModal.tsx`):** Cho phép gán học sinh vào Lớp học, tự động gợi ý giáo viên phụ trách và lịch học tuần của lớp đó.
  - **Bộ lọc Lớp Học & Hiển thị trên Bảng (`Dashboard.tsx` & `ClassroomScheduleMatrix.tsx`):** Bổ sung bộ lọc Lớp Học trên Dashboard và Sơ đồ lớp ma trận, hiển thị huy hiệu Tên Lớp & Phòng học trực quan trên danh sách học viên.

### [v2.8.2] - 2026-10-30
- **⭐ TÁI CẤU TRÚC: TÍCH HỢP TOÀN BỘ QUỸ GIỜ VÀO MODULE BÁO NGHỈ & HỌC BÙ:**
  - **Xóa bỏ giao diện "Ví Giờ Học" riêng lẻ độc lập:** Gỡ bỏ modal tách biệt, gom toàn bộ logic tích lũy và sử dụng giờ học vào chung module **"Quản Lý Báo Nghỉ & Quỹ Giờ Học Bù"** (`MakeUpClassesModal.tsx`).
  - **Chuyển đổi toàn bộ đơn vị quản lý từ BUỔI HỌC sang SỐ GIỜ HỌC (HOURS/MINUTES):** Không còn quy đổi "+1 buổi bù" chung chung mà định lượng chính xác: `0.5h (30p)`, `1.0h (60p)`, `1.5h (90p)`, `2.0h (120p)`.
  - **Cơ chế Báo Nghỉ (Tích Lũy Giờ Bù):** Ghi nhận rõ Ngày nghỉ, Ca học nghỉ (`absence_start_time` - `absence_end_time`), tự động trích xuất từ lịch học của học sinh để tính thời lượng ca nghỉ và cộng dồn chính xác vào Quỹ giờ học bù (ghi nhận vào sổ cái `hour_ledger`).
  - **Cơ chế Đăng Ký Học Bù (Khấu Trừ Quỹ Giờ):**
    - Hiển thị Quỹ giờ bù khả dụng trước khi xếp bù.
    - Cho phép chọn ca mở cửa và chọn số giờ muốn bù trong ca đó (có các nút chọn nhanh 0.5h, 1.0h, 1.5h, 2.0h).
    - Validation chặt chẽ: Chặn không cho đăng ký vượt quá Quỹ giờ khả dụng và tự động tính trước số giờ còn lại sau khi bù.
    - Tích hợp tab **Biến Động Quỹ Giờ (Sổ cái)** xem lịch sử chi tiết từng lần tích lũy (khi báo nghỉ) và khấu trừ (khi học bù).
  - **Thiết kế lại giao diện Quản Lý Giáo Viên (`TeacherManagementModal.tsx`):** Nâng cấp layout 2 cột hiện đại, bổ sung gợi ý bộ môn 1-click, thanh tìm kiếm tức thì và bộ lọc chuyên môn.

### [v2.8.1] - 2026-10-30
- **⭐ TỰ ĐỘNG CỘNG PHỤ THU LEVEL VÀO GÓI HỌC PHÍ & BẢNG KÊ CẤU THÀNH:**
  - Khắc phục triệt để lỗi học phí không tự cộng tiền phụ thu level khi học sinh chọn Gói Học Phí (`tuition_package_id`): Áp dụng chuẩn hóa công thức `Học phí = (Gói học phí + Phụ thu level) × (1 - Chiết khấu %)` trên toàn bộ hệ thống API (`/api/students`, `/api/parent`, `/api/payments`, `/api/reconciliation/summary`).
  - **Bảng kê cấu thành học phí minh bạch (`StudentDetailModal.tsx`):** Hiển thị chi tiết từng khoản cấu thành tiền học: Học phí gói + Phụ thu level - Chiết khấu % + Điều chỉnh tháng + Nợ cũ tích lũy = Tổng thực thu cần đóng.
  - **Diễn giải công thức học phí trên Bảng học sinh (`Dashboard.tsx`):** Cột Học phí hiển thị số tiền chính xác kèm dòng nhãn công thức trực quan (ví dụ `+ 200.000 đ level`), click trực tiếp vào số tiền để mở popup bảng kê chi tiết.
  - **Đồng bộ hóa tin nhắn Zalo & Cổng phụ huynh:** Tự động liệt kê rõ học phí gói, phụ thu level và ưu đãi trong tin nhắn Zalo nhắc phí (`ZaloReminderModal.tsx`) và trên hóa đơn Cổng Phụ Huynh (`ParentPortal.tsx`).

- **⭐ SẮP XẾP THỨ TỰ LEVEL LINH HOẠT & SORT CỘT GIỐNG GOOGLE SHEETS:**
  - **Kéo thả (Drag & Drop) & Nút Lên/Xuống trong Cài Đặt (`SettingsModal.tsx`):** Cho phép admin kéo thả hoặc bấm nút `↑`/`↓` để sắp xếp thứ tự ưu tiên các Level (ví dụ: *Grade 1 trước Grade 3, Grade 7, Cơ bản lên đầu...*), tự động lưu trường `sort_order` vào CSDL.
  - **Sort cột Header chuẩn Google Sheets (`Dashboard.tsx`):** Bấm trực tiếp vào tiêu đề cột `LEVEL & PHỤ THU` để sort danh sách học sinh theo đúng thứ tự level đã thiết lập trong Cài đặt; hỗ trợ sort 2 chiều cho Tên học sinh, Trạng thái, Giáo viên và Mức học phí.

- **⭐ DÁN ẢNH MINH HỌA (CTRL+V) TRONG GÓP Ý TPTEAM:**
  - **Hỗ trợ dán ảnh màn hình `Ctrl + V` trực tiếp (`AppInfoModal.tsx`):** Cho phép chụp màn hình lỗi và ấn `Ctrl + V` ngay trong ô góp ý để đính kèm ảnh (tự động nén canvas lưu dạng `images_json`), kèm nút chọn file từ máy, lưới thumbnail xem trước và Lightbox phóng to ảnh.

- **⭐ SỬA LỖI NHẬP TIỀN LẺ TRONG CHỈNH SỬA HỌC PHÍ RIÊNG:**
  - Chuyển toàn bộ các ô nhập số tiền phụ thu/giảm trừ và học phí cuối cùng sang `step="any"` (`MonthlyTuitionModal.tsx`, `QuickAuditModal.tsx`, `SettingsModal.tsx`), loại bỏ lỗi cảnh báo đỏ của trình duyệt và cho phép nhập tự do mọi số tiền lẻ lẻ (35.000 đ, 9.562 đ...).
  - Xóa bỏ số 0 thừa ở đầu khi bắt đầu gõ số tiền mới.

### [v2.8.0] - 2026-10-30
- **⭐ HỆ THỐNG CÁC KIỂU LỊCH HỌC & MA TRẬN TỰ TÍNH THỜI LƯỢNG (Schedule Presets & Auto Matrix):**
  - **Chuẩn hóa duy nhất 1 hình thức quản lý lịch học:** Loại bỏ hoàn toàn Hình thức 1 (Theo tổng số tiếng / tuần nhập tay mù mờ), chuyển đổi 100% sang hình thức quản lý theo **Kiểu Lịch Học Cơ Sở & Ma Trận Thời Lượng**.
  - **Tự động cộng giờ vào Ví Giờ Học ngay khi Báo Nghỉ:** Khi phụ huynh hoặc admin báo nghỉ 1 buổi học, hệ thống lập tức cộng chính xác số phút của ca học đó (ví dụ: +90 phút = 1h30) vào sổ cái `hour_ledger`. Ví giờ còn lại nhảy số ngay lập tức để phụ huynh thấy số dư khả dụng và chọn lịch bù.
  - **Tự động đồng bộ các buổi báo nghỉ cũ:** Hàm `syncPendingMakeupsToWallet` tự động bù số phút cho toàn bộ các buổi nghỉ trước đó của học sinh chưa có trong sổ cái khi mở Cổng Phụ Huynh hoặc Danh sách học sinh.
  - **Hiển thị trực quan Tên Kiểu Lịch Học (Thứ chẵn, Thứ lẻ, Cuối tuần...) trên bảng Học Sinh:** Cột *Gói & Lịch Học* tại `Dashboard.tsx` có huy hiệu nhận diện kiểu lịch riêng biệt (`[📅 Thứ chẵn (2-4-6)]`, `[📅 Cuối tuần (T7-CN)]`...), kèm hàm nhận diện thông minh `detectStudentPresetName` áp dụng ngay cho cả học sinh cũ và mới.
  - Cho phép cơ sở tạo không giới hạn các "Kiểu Lịch Học" (Preset): tự đặt tên kiểu (ví dụ: *Thứ chẵn 2-4-6*, *Thứ lẻ 3-5-7*, *Cuối tuần T7-CN*), chọn các ngày trong tuần và thời lượng 1 buổi (ví dụ: 1.5 tiếng/buổi).
  - Tích hợp trực tiếp vào `SettingsModal.tsx` với card ma trận tính toán tự động: $\text{Số buổi} \times \text{Số tiếng/buổi} = \text{Tổng tiếng/tuần}$ (và quy đổi phút/tuần).
  - Nâng cấp `StudentFormModal.tsx`: Chọn trực tiếp theo Kiểu Lịch Học từ Cài Đặt (không cần nhập tay thứ hay số tiếng), tự động tính ma trận tuần.
  - Tự động sinh `schedule_details_json` đồng bộ hoàn hảo sang Ma Trận Xếp Lịch `ClassroomScheduleMatrix` và hệ thống Ví Giờ Học.
  - Thêm cột `schedule_preset_name` vào bảng `students` và key `schedule_presets` trong bảng `settings`. Mặc định hệ thống gán `duration_mode = 'by_sessions'`.

### [v2.7.0] - 2026-10-29
- **⭐ VÍ GIỜ HỌC (Hour Wallet System):** Thay đổi nền tảng cơ chế học bù — bỏ đếm "suất bù", chuyển sang số dư phút trong ví:
  - Cấp giờ tự động khi đóng tiền theo công thức chu kỳ tháng (`4 tuần + 2 ngày = 13 buổi × 90 phút`), tự xử lý em vào giữa tháng và ngày nghỉ lễ.
  - Trừ giờ theo **phút học thật** khi điểm danh (không trừ theo buổi). Nghỉ có phép giữ nguyên giờ để bù, chia nhỏ tùy ý (30 phút hôm nay + 30 phút ngày mai).
  - Sổ cái `hour_ledger` là nguồn sự thật duy nhất, idempotent theo `ref_type + ref_id` — chạy lại không bao giờ ghi đôi.
  - **Setting mới:** Admin tự cấu hình "1 buổi học = X phút" (45/60/90/120...) trong Cài đặt → Học phí & Thời lượng.
  - API mới `/api/wallet` (9 actions): cấp giờ, điểm danh, báo nghỉ, xếp bù kiểm soát số dư khả dụng, hủy bù, điều chỉnh tay, xem sổ cái phân trang.
  - Hook tự động cấp giờ tại cả 2 điểm đóng tiền: Dashboard đối soát + SePay Webhook.
  - Dashboard: badge "Nợ X buổi bù" → **"Còn 7h30"** (xanh lá ≥ 3h, vàng < 3h, đỏ nhấp nháy khi âm).
  - Migration an toàn: `node scripts/migrate-hour-wallet.js --dry-run` — chuyển suất bù cũ thành ADJUST, lịch bù cũ thành lessons, cấp bù GRANT cho tháng đã đóng.

### [v2.6.0] - 2026-10-29
- **Tối ưu hóa ma trận xếp lịch:** Hoàn thiện `ClassroomScheduleMatrix.tsx` hỗ trợ lưới ca học động và phát hiện xung đột giờ học của học sinh.
- **Tự động nhận diện giờ học thông minh từ Excel:** Cải tiến thuật toán bóc tách chuỗi thời gian tự do thành các bản ghi `ScheduleItem[]` chuẩn xác.
- **Tích hợp Zalo 1-Click & Modal tư vấn chỗ trống:** Bổ sung `ScheduleAvailabilityModal.tsx` giúp tra cứu nhanh ca còn chỗ trống và copy tin nhắn Zalo gửi phụ huynh chỉ với 1 click.
- **Chuẩn hóa kiến trúc 13 Subagent & Bộ tài liệu điều phối:** Khởi tạo bộ hồ sơ 22 tài liệu kỹ thuật hoàn chỉnh (`AGENTS.md`, `INDEX.md`, `ARCHITECTURE.md`...).

### [v2.5.0] - 2026-10-26
- **Đa ngôn ngữ toàn diện (Full i18n):** Hỗ trợ 4 ngôn ngữ (Tiếng Việt 🇻🇳, English 🇬🇧, Tiếng Trung 🇨🇳, Tiếng Nhật 🇯🇵).
- **1-Click Tự động cập nhật từ GitHub:** Tích hợp `scripts/run-upgrade.js` và cờ bảo trì `.maintenance`.
- **Chế độ bảo trì thông minh (`MaintenanceGuard.tsx`):** Chuyển hướng người dùng tự động khi server đang nâng cấp.
- **Tự động cộng dồn nợ học phí quá 1 tháng:** Phát hiện học sinh nợ liên tiếp từ 2 tháng trở lên, cảnh báo đỏ nhấp nháy.
- **2 Tùy chọn kiểm soát sĩ số ca học:** Hỗ trợ tính theo ca mở cửa cơ sở HOẶC theo giáo viên đứng lớp. Khóa cứng ca học khi hết suất (không cho click).

### [v2.4.0] - 2026-10-25
- **Tích hợp SePay Webhook tự động:** Tự gạch nợ học sinh theo mã học sinh và số điện thoại.
- **Cửa sổ Tổng Kết Tháng (Monthly Summary):** Thống kê dự thu, thực thu, công nợ và nhật ký SePay.
- **Lý do chiết khấu:** Cấu hình tên/lý do mốc chiết khấu trong Cài đặt và tự động điền vào hồ sơ học sinh.
- **Ngày bắt đầu đăng ký học:** Bổ sung trường ngày nhập học kèm nút 1-click "Hôm nay (Hiện tại ngay)".
- **Kênh tiếp nhận góp ý phụ huynh & hệ thống:** Form đánh giá sao của phụ huynh và kênh đề xuất tính năng cho TpTeam.

### [v2.3.0] - 2026-10-24
- **Khởi tạo nền tảng quản trị trung tâm:** Quản lý học sinh, danh sách lớp, gói học phí, phân công giáo viên và cổng phụ huynh tra cứu.
- **Quản lý học bù & sĩ số:** Đăng ký học bù trực tuyến, theo dõi số buổi cần bù của học sinh.

---

## 2. LỘ TRÌNH PHÁT TRIỂN TRONG TƯƠNG LAI (ROADMAP)

### Giai đoạn tiếp theo (v2.7.0)
- [ ] **Mã QR Động VietQR:** Sinh trực tiếp mã QR VietQR trên hóa đơn của phụ huynh với số tiền và nội dung chuyển khoản được nhúng sẵn.
- [ ] **Điểm danh bằng Quét mã QR:** Cho phép giáo viên dùng camera điện thoại quét mã QR trên thẻ học sinh để điểm danh tự động vào lớp.
- [ ] **Trợ lý AI Chatbot Phụ huynh:** Trợ lý ảo trả lời lịch học và học phí tự động 24/7.

---

## 3. NHẬT KÝ THEO DÕI THAY ĐỔI (LOG)

| Ngày | Phiên bản | Tóm tắt thay đổi | Người duyệt |
|---|---|---|---|
| 2026-10-29 | v2.6.0 | Phát hành hệ thống quản lý lịch thông minh và bộ 22 tài liệu điều phối AI | `completeness-auditor` |
