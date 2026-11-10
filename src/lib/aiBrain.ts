import { getDb, initDb } from "@/lib/db";
import { formatVND, formatMonthDisplay } from "@/lib/tuition";

export interface AiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  isActive: boolean;
}

/**
 * Đọc cấu hình AI từ bảng settings trong SQLite
 */
export async function getAiConfig(): Promise<AiConfig> {
  await initDb();
  const db = getDb();

  const res = await db.execute(`
    SELECT key, value FROM settings 
    WHERE key IN ('ai_base_url', 'ai_api_key', 'ai_model', 'ai_is_active')
  `);

  let baseUrl = "";
  let apiKey = "";
  let model = "";
  let isActive = true;

  for (const r of res.rows) {
    const k = String(r.key);
    const v = String(r.value || "").trim();
    if (k === "ai_base_url") baseUrl = v;
    if (k === "ai_api_key") apiKey = v;
    if (k === "ai_model") model = v;
    if (k === "ai_is_active") isActive = v !== "0";
  }

  if (baseUrl.endsWith("/")) {
    baseUrl = baseUrl.slice(0, -1);
  }

  return { baseUrl, apiKey, model, isActive };
}

/**
 * CẨM NANG TOÀN BỘ CHỨC NĂNG CỦA PHẦN MỀM QUẢN LÝ CƠ SỞ (DÀNH CHO ADMIN)
 * TUYỆT ĐỐI KHÔNG CHỨA BẤT KỲ THÔNG TIN NÀO VỀ CẤP QUẢN TRỊ HỆ THỐNG (/he-thong).
 */
const SYSTEM_FEATURE_KNOWLEDGE_BASE = `
# CẨM NANG HƯỚNG DẪN 100% TÍNH NĂNG VẬN HÀNH CƠ SỞ CHO ADMIN & QUẢN LÝ:

1. QUẢN LÝ NHÂN SỰ & PHÂN QUYỀN (Menu Nghiệp Vụ > "Tài Khoản & Phân Quyền"):
   - Có 3 Tab tập trung:
	     • Tab 1: "Đội Ngũ Giáo Viên": 
	       - Quản lý danh sách giáo viên đứng lớp (Họ tên, SĐT, Bộ môn, Màu thẻ nhận diện. Sĩ số tối đa được quản lý chuẩn xác theo từng Lớp học).
	       - Thêm giáo viên mới: Bấm "+ Thêm Giáo Viên Mới", nhập Họ tên và SĐT (đây chính là tài khoản đăng nhập).
       - Cơ chế bảo mật cố định: Giáo viên được gán vai trò cố định "Giáo viên đứng lớp". Thầy cô đăng nhập Cổng Giáo Viên (/giao-vien) bằng Số điện thoại để xem ca dạy, điểm danh, chấm sao, nhận xét và báo nghỉ. Giáo viên KHÔNG THỂ thay đổi quyền hạn và KHÔNG THỂ xem tiền bạc hay doanh thu của cơ sở.
       - Nút "Gửi Zalo": Tự động copy mẫu tin nhắn hướng dẫn đăng nhập gửi cho giáo viên qua Zalo.
     • Tab 2: "Nhân Viên Quản Trị":
       - Quản lý nhân viên văn phòng (Lễ tân, Kế toán...) đăng nhập vào trang quản trị /admin bằng Tên đăng nhập (Username) và Mật khẩu.
       - Bấm "+ Tạo Tài Khoản Nhân Viên", nhập họ tên, username, mật khẩu (có nút Tự sinh mã) và chọn Nhóm quyền.
       - Có thể đổi mật khẩu, tạm khóa (Lock) hoặc xóa tài khoản nhân viên.
     • Tab 3: "Nhóm Quyền & Vai Trò":
       - Danh sách các vai trò phân quyền. Vai trò "Giáo Viên Đứng Lớp (Cố Định)" được ghim ở đầu và khóa cứng để bảo vệ dữ liệu.
       - Quản lý có thể bấm "+ Tạo Nhóm Quyền Mới" (ví dụ: Nhân viên Lễ tân, Kế toán) và tick chọn trong 19 quyền hạn chi tiết (chia làm 5 nhóm: Quản lý học sinh, Học phí & Doanh thu, Lịch học & Điểm danh, Lớp học & Giáo viên, Cài đặt cơ sở). Nhân viên không có quyền xem học phí sẽ bị che số tiền thành dấu ••••••.

2. QUẢN LÝ HỌC SINH (Student Management):
   - Thêm học sinh: Trên Dashboard, bấm nút "+ Thêm học sinh" (màu xanh). Nhập Họ tên, Số điện thoại phụ huynh, chọn Bộ môn, Lớp học, Trình độ/Level.
   - Chọn lịch học & thời lượng: Có thể chọn nhanh theo Kiểu lịch mẫu (Thứ chẵn 2-4-6, Thứ lẻ 3-5-7, Cuối tuần T7-CN) hoặc tự chọn từng thứ trong tuần kèm giờ học cụ thể (ví dụ 18:00 - 19:30). Hệ thống tự động tính ra số tiếng/tuần và số phút 1 buổi.
   - Sửa thông tin: Bấm trực tiếp vào dòng học sinh hoặc bấm nút 3 chấm góc phải chọn "Chỉnh sửa".
   - Chuyển trạng thái: Bấm nút 3 chấm chọn "Chuyển trạng thái" để cho học sinh:
     • Đang học (studying).
     • Bảo lưu (reserved): Nhập ngày bắt đầu bảo lưu, lý do và ngày dự kiến quay lại học. Học sinh bảo lưu sẽ không bị tính học phí kỳ sau.
     • Nghỉ học (dropped): Đánh dấu nghỉ hẳn.
   - Lịch sử biến động học sinh: Mở Menu Nghiệp vụ > "Nhật Ký Biến Động" để xem báo cáo theo tháng danh sách ai bảo lưu, ai nghỉ học, ai quay lại học.
   - Hồ sơ học sinh chi tiết: Bấm vào tên học sinh để xem chi tiết: công nợ, lịch sử thanh toán, và tab "Nhật Ký Học Tập" xem toàn bộ các buổi học đã điểm danh, nhận xét của giáo viên.
   - Nhập/Xuất Excel: Mở Menu Nghiệp vụ > "Nhập Excel Thông Minh" để import danh sách học sinh từ file Excel tự động.

3. THỜI KHÓA BIỂU & MA TRẬN PHÒNG HỌC 7 CỘT (ClassroomScheduleMatrix):
   - Có 3 chế độ xem:
     • "Lưới 7 Ngày": Hiển thị toàn bộ lịch học từ Thứ 2 đến Chủ Nhật, thẳng hàng theo từng khung giờ. Có vạch đỏ "Bây giờ" theo thời gian thực.
     • "Theo Thứ": Chọn từng thứ trong tuần để xem chi tiết các ca học và danh sách học viên trong ca. Có nút "+ Thêm học viên vào ca" trực tiếp.
     • "Theo Giáo Viên": Xem danh sách ca dạy và tổng số học sinh của từng giáo viên.
   - Nhận diện ca kéo dài: Học sinh học ca dài (ví dụ 18:00 - 20:00) được hiển thị ở cả 2 khung giờ 18:00 và 19:00 kèm nhãn nổi bật "↳ Từ 18:00".
   - Bộ lọc thông minh: Lọc theo Bộ môn, Lớp học, Giáo viên, Trạng thái học phí (Đã đóng / Chưa đóng), ô tìm kiếm tên học sinh.
   - Ô tick "[✓] Ẩn ca trống": Khi bật, ma trận tự động thu gọn chỉ hiện các khung giờ thực tế có học sinh học.
   - Nút "Điểm Nóng": Bấm vào để lọc ngay các học sinh chưa được phân công giáo viên hoặc đang bị nợ học phí quá hạn.
   - Nút "Tư Vấn Ca Trống": Mở cửa sổ phân tích các khung giờ còn trống chỗ trong tuần để tư vấn cho phụ huynh mới đăng ký.

4. ĐIỂM DANH CA DẠY & SỔ LIÊN LẠC ĐIỆN TỬ:
   - Điểm danh phía Quản lý / Admin: Mở Menu Nghiệp vụ > "Điểm Danh & Sổ Bài Học" (DailyAttendanceModal). Chọn ngày cần điểm danh, hệ thống liệt kê các ca dạy toàn trường. Admin có thể tích: Có mặt, Vắng có phép, Vắng không phép; chấm sao (1-5 sao), viết nhận xét và dặn dò bài tập về nhà. Thẻ học viên hiển thị rõ [✓ Đã điểm danh] và KHÔNG KHÓA NÚT, luôn cho phép chỉnh sửa bổ sung.
   - Điểm danh phía Giáo viên: Giáo viên đăng nhập Cổng Giáo Viên (/giao-vien) bằng SĐT, vào tab "Điểm Danh & Nhận Xét". Thầy cô cũng có đầy đủ tính năng điểm danh theo ca, chấm sao và viết nhận xét.
   - Nút "✨ AI Gợi ý": Ở cả hai nơi, cạnh ô nhận xét đều có nút AI Gợi ý giúp tự động tạo nhận xét sư phạm và dặn dò bài tập chỉ trong 1 giây.
   - Sổ học tập phía Phụ huynh: Phụ huynh đăng nhập Cổng Phụ Huynh (/phu-huynh) bằng SĐT, mở tab "Sổ Học Tập" để xem chi tiết từng buổi học của con (ngày giờ, thầy cô đứng lớp, số sao, lời nhận xét và bài tập về nhà).

5. BÁO NGHỈ & XẾP LỊCH HỌC BÙ (VÍ GIỜ HỌC - HOUR WALLET):
   - Phụ huynh báo nghỉ: Phụ huynh vào /phu-huynh bấm "Báo nghỉ học", chọn ngày nghỉ và lý do. Hệ thống tự động cộng dồn số phút của buổi học vào Quỹ giờ học bù (Ví giờ).
   - Đặt lịch học bù: Phụ huynh hoặc Admin chọn ngày và ca học bù còn trống chỗ. Khi buổi bù hoàn thành, hệ thống tự động trừ giờ trong ví.
   - Sổ cái giờ học (hour_ledger): Quản lý số dư giờ học minh bạch, tự động hoàn giờ khi nghỉ có phép và trừ giờ khi đã học bù.

6. GIÁO VIÊN BÁO NGHỈ & DUYỆT PHÂN CÔNG DẠY THAY:
   - Giáo viên xin nghỉ: Giáo viên vào /giao-vien > tab "Báo Nghỉ", chọn ngày nghỉ, ca nghỉ, lý do và đề xuất giáo viên dạy thay dự kiến (nếu có).
   - Admin duyệt đơn: Mở Menu Nghiệp vụ > "Đội Ngũ Giáo Viên" (hoặc Tài Khoản & Phân Quyền), bấm tab "Đơn Xin Nghỉ Của Giáo Viên". Quản lý có thể bấm "Duyệt đơn" (phân công giáo viên dạy thay chính thức) hoặc "Từ chối đơn".

7. HÀNG ĐỢI NHẮC HỌC PHÍ NHANH QUA ZALO:
   - Trên Dashboard, bấm nút "Nhắc Học Phí" (màu xanh dương).
   - Hệ thống gom toàn bộ học sinh chưa đóng kỳ này và học sinh còn nợ dồn thành 1 danh sách tập trung kèm 4 thẻ thống kê: Tổng cần thu, Chưa nhắc hôm nay, Đã nhắc hôm nay, Tổng tiền nợ.
   - Nút "Gửi Zalo" 2 giây: Tự động copy mẫu tin nhắn thông báo học phí chuẩn (kèm số tiền, thông tin ngân hàng và link ảnh mã QR VietQR đúng số tiền), mở thẳng ứng dụng Zalo tới phụ huynh. Lễ tân chỉ cần dán (Ctrl+V) gửi đi.
   - Chống nhắc trùng: Dòng học sinh sau khi gửi sẽ tự động gắn nhãn [✓ Đã nhắc hôm nay] kèm mốc giờ cụ thể để ca trực khác không nhắn tin trùng.
   - Có hỗ trợ gửi tự động qua Zalo Bot nếu học sinh có Zalo Chat ID.

8. HỌC PHÍ, CHU KỲ & ĐỐI SOÁT SEPAY TỰ ĐỘNG:
   - Gói học phí: Cài đặt trong mục Cài Đặt > Gói Học Phí (theo tháng, quý 3 tháng, khóa 6 tháng, theo tuần).
   - Thu tiền / Đối soát: Bấm trực tiếp vào huy hiệu học phí của học sinh trên bảng để đánh dấu Đã đóng / Chưa đóng, hoặc tick từng tháng cụ thể.
   - Điều chỉnh học phí tháng: Cho phép thêm bớt các khoản riêng (tiền giáo trình, áo đồng phục, giảm trừ cá nhân).
   - Đối soát tự động SePay: Khi phụ huynh chuyển khoản đúng cú pháp (HP {MãHS}), hệ thống tự động gạch nợ học phí và cấp giờ học vào ví ngay lập tức.
   - Xuất biên lai điện tử (e-Receipt): Tải ảnh biên lai thanh toán đẹp mắt để gửi Zalo cho phụ huynh và hỗ trợ lưu số biên lai giấy viết tay.
   - Tổng kết doanh thu tháng: Mở nút "Tổng Kết Tháng" trên Dashboard để xem báo cáo doanh thu đã thu, còn nợ và danh sách giao dịch SePay.

9. THÔNG BÁO TỰ ĐỘNG VỀ ZALO ADMIN QUA ZALO BOT:
   - Cài đặt trong Cài Đặt > Nhắc Zalo Bot.
   - Khi phụ huynh đóng học phí SePay thành công, học sinh nộp đơn báo nghỉ, giáo viên nộp đơn xin nghỉ dạy, hoặc phụ huynh gửi góp ý ➔ Zalo Bot sẽ tự động gửi tin nhắn báo cáo tức thì về Zalo cá nhân của Admin.
   - Admin có thể nhắn tin trực tiếp cho con Bot trên điện thoại để hỏi: "Doanh thu tháng này là bao nhiêu?", "Còn ai chưa đóng tiền?", "Hôm nay ai học?", "Làm sao thêm học sinh?"... Bot sẽ tự động trả lời chính xác.
`;

/**
 * Thu thập số liệu vận hành của cơ sở trong tháng hiện tại
 */
export async function getSchoolOperationalContext(schoolId: string, monthParam?: string): Promise<string> {
  try {
    await initDb();
    const db = getDb();
    const currentMonth = monthParam || new Date().toISOString().slice(0, 7);

    // 1. Thông tin trường
    const schoolRes = await db.execute({
      sql: "SELECT name, code, phone, address FROM schools WHERE id = ? OR id = 'school-default' LIMIT 1",
      args: [schoolId],
    });
    const schoolName = schoolRes.rows[0]?.name ? String(schoolRes.rows[0].name) : "Trung tâm đào tạo";

    // 2. Thống kê học sinh
    const studentsRes = await db.execute({
      sql: `SELECT id, name, phone, student_code, status, level_id, tuition_package_id FROM students WHERE school_id = ? OR school_id = 'school-default'`,
      args: [schoolId],
    });

    let studyingCount = 0;
    let reservedCount = 0;
    let droppedCount = 0;

    for (const s of studentsRes.rows) {
      const st = String(s.status || "studying");
      if (st === "studying") studyingCount++;
      else if (st === "reserved") reservedCount++;
      else if (st === "dropped") droppedCount++;
    }

    // 3. Thống kê thanh toán tháng này
    const paymentsRes = await db.execute({
      sql: `SELECT student_id, amount FROM student_payments WHERE ? >= start_period AND ? <= end_period AND status = 'paid'`,
      args: [currentMonth, currentMonth],
    });
    const paidStudentIds = new Set(paymentsRes.rows.map((p) => String(p.student_id)));
    let totalRevenue = 0;
    for (const p of paymentsRes.rows) {
      totalRevenue += Number(p.amount || 0);
    }

    // 4. Danh sách học sinh chưa đóng tiền kỳ này
    const unpaidList: Array<{ name: string; phone: string; code?: string }> = [];
    for (const s of studentsRes.rows) {
      if (String(s.status || "studying") === "studying" && !paidStudentIds.has(String(s.id))) {
        unpaidList.push({
          name: String(s.name),
          phone: String(s.phone || ""),
          code: s.student_code ? String(s.student_code) : undefined,
        });
      }
    }

    // 5. Thống kê giáo viên và lớp học
    const teachersRes = await db.execute({
      sql: "SELECT COUNT(*) as count FROM teachers WHERE school_id = ? OR school_id = 'school-default'",
      args: [schoolId],
    });
    const classesRes = await db.execute({
      sql: "SELECT COUNT(*) as count FROM classes WHERE school_id = ? OR school_id = 'school-default'",
      args: [schoolId],
    });

    const teacherCount = Number(teachersRes.rows[0]?.count || 0);
    const classCount = Number(classesRes.rows[0]?.count || 0);

    return `
DỮ LIỆU VẬN HÀNH THỜI GIAN THỰC CỦA CƠ SỞ (KỲ ${currentMonth}):
- Tên cơ sở: ${schoolName}
- Tổng số học sinh: ${studentsRes.rows.length} em (Đang học: ${studyingCount}, Bảo lưu: ${reservedCount}, Nghỉ hẳn: ${droppedCount})
- Đội ngũ: ${teacherCount} giáo viên, ${classCount} lớp học
- Tình hình học phí kỳ ${currentMonth}:
  • Doanh thu đã thu được: ${formatVND(totalRevenue)} (${paidStudentIds.size} học sinh đã đóng)
  • Số học sinh chưa đóng tiền: ${unpaidList.length} em
  • Danh sách các em chưa đóng tiền: ${unpaidList.slice(0, 15).map((u) => `${u.name} (${u.phone || u.code || "chưa có SĐT"})`).join(", ")}${unpaidList.length > 15 ? ` và ${unpaidList.length - 15} em khác...` : ""}
`;
  } catch (err) {
    console.error("getSchoolOperationalContext error:", err);
    return "Không thể tải dữ liệu thời gian thực của cơ sở.";
  }
}

/**
 * Trả lời câu hỏi của Admin (qua Web Chat hoặc qua Zalo Bot)
 */
export async function askAiAssistant(params: {
  userMessage: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  schoolId?: string;
  senderName?: string;
  isZalo?: boolean;
}): Promise<string> {
  const { userMessage, history = [], schoolId = "school-default", senderName = "Admin", isZalo = false } = params;

  const config = await getAiConfig();
  if (!config.baseUrl || !config.apiKey || !config.isActive) {
    return "Tính năng này hiện chưa được hỗ trợ.";
  }

  // Thu thập dữ liệu vận hành thời gian thực của cơ sở
  const operationalContext = await getSchoolOperationalContext(schoolId);

  const systemPrompt = `
Bạn là "Trợ Lý AI Quản Trị Cơ Sở" của ${senderName}.
Bạn am hiểu sâu sắc số liệu vận hành, nghiệp vụ giáo dục, lịch học, học phí và toàn bộ các tính năng của phần mềm cơ sở.

${operationalContext}

${SYSTEM_FEATURE_KNOWLEDGE_BASE}

QUY TẮC PHẢN HỒI QUAN TRỌNG:
1. Phạm vi kiến thức: Bạn là trợ lý cấp cơ sở dành cho Admin/Quản lý. Bạn giải đáp toàn bộ thông tin về học sinh, giáo viên, phụ huynh, lớp học, học phí, doanh thu và các tính năng vận hành. TUYỆT ĐỐI KHÔNG đề cập hay nhắc đến cấp quản trị hệ thống, mã nguồn hoặc các vấn đề máy chủ kỹ thuật.
2. Khi người dùng hỏi về SỐ LIỆU (Doanh thu tháng này, còn ai chưa đóng tiền, sĩ số học sinh...):
   - Trả lời CHÍNH XÁC dựa trên số liệu thực tế được cung cấp ở trên.
   - Nêu rõ số tiền, số lượng học sinh và liệt kê danh sách học sinh cụ thể.
3. Khi người dùng hỏi về CÁCH DÙNG WEB (Làm sao thêm giáo viên? Làm sao thêm học sinh? Điểm danh thế nào?):
   - Trả lời RÕ RÀNG là web ĐÃ CÓ tính năng đó.
   - Hướng dẫn TỪNG BƯỚC cụ thể:
     • Thêm giáo viên: Vào Menu Nghiệp vụ > "Tài Khoản & Phân Quyền" (hoặc "Đội Ngũ Giáo Viên") > chọn tab "Đội Ngũ Giáo Viên" > bấm "+ Thêm Giáo Viên Mới". Giáo viên đăng nhập Cổng Giáo Viên (/giao-vien) bằng SĐT với vai trò cố định, không xem được doanh thu hay học phí cơ sở.
     • Thêm học sinh: Trên Dashboard bấm nút "+ Thêm học sinh", chọn lớp, kiểu lịch...
     • Nhắc học phí: Bấm nút "Nhắc Học Phí", bấm "Gửi Zalo" 2 giây.
     • Điểm danh: Vào "Điểm Danh & Sổ Bài Học" (DailyAttendanceModal).
4. Văn phong & Định dạng:
   - Xưng hô "Em" và "Anh/Chị" (hoặc "Thầy/Cô"), lịch sự, chu đáo, súc tích.
   ${isZalo ? "- Vì đang gửi qua Zalo, câu trả lời cần ngắn gọn, dùng gạch đầu dòng rõ ràng." : "- Trình bày đẹp mắt bằng định dạng Markdown, dùng icon sinh động."}
5. Bảo mật: Tuyệt đối không bịa đặt số liệu không có trong báo cáo, không bao giờ tiết lộ API key hay mật khẩu cơ sở.
`;

  const messagesPayload = [
    { role: "system", content: systemPrompt },
    ...history.slice(-6).map((h) => ({ role: h.role, content: h.content })),
    { role: "user", content: userMessage },
  ];

  try {
    const url = `${config.baseUrl}/chat/completions`;
    const modelToUse = config.model || "gemini-3.8-flash";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: messagesPayload,
        temperature: 0.5,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI API Error response:", response.status, errText);
      return "Tính năng này hiện chưa được hỗ trợ.";
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || "Tính năng này hiện chưa được hỗ trợ.";
    return answer.trim();
  } catch (error: any) {
    console.error("askAiAssistant error:", error);
    return "Tính năng này hiện chưa được hỗ trợ.";
  }
}

/**
 * Gợi ý nhận xét buổi học & dặn dò bài tập về nhà cho Giáo viên
 */
export async function generateLessonReview(params: {
  studentName: string;
  subjectName?: string;
  rating: number;
  keywords?: string;
  className?: string;
}): Promise<{
  success: boolean;
  teacher_notes: string;
  homework: string;
  message?: string;
}> {
  const { studentName, subjectName = "Piano", rating = 5, keywords = "", className = "" } = params;

  const config = await getAiConfig();
  if (!config.baseUrl || !config.apiKey || !config.isActive) {
    return {
      success: false,
      teacher_notes: "",
      homework: "",
      message: "Tính năng này hiện chưa được hỗ trợ",
    };
  }

  const prompt = `
Bạn là giáo viên giàu kinh nghiệm môn ${subjectName}.
Hãy soạn lời nhận xét buổi học và bài tập về nhà gửi phụ huynh cho học sinh sau:
- Tên học sinh: ${studentName}
- Bộ môn / Lớp: ${subjectName} ${className ? `(${className})` : ""}
- Đánh giá sao: ${rating}/5 sao
- Từ khóa giáo viên ghi chú nhanh: "${keywords || "chăm chỉ, tiếp thu bài tốt"}"

YÊU CẦU ĐẦU RA BẮT BUỘC DƯỚI ĐỊNH DẠNG JSON DUY NHẤT:
{
  "teacher_notes": "1-2 câu nhận xét tiến bộ ấm áp, chuẩn mực sư phạm, khích lệ bé và nêu điểm cần chú ý nếu có",
  "homework": "1 câu dặn dò bài tập về nhà cụ thể (bài số mấy, luyện bao nhiêu phút)"
}
Chỉ trả về JSON hợp lệ, không kèm văn bản giải thích.
`;

  try {
    const url = `${config.baseUrl}/chat/completions`;
    const modelToUse = config.model || "gemini-3.8-flash";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.6,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        teacher_notes: "",
        homework: "",
        message: "Tính năng này hiện chưa được hỗ trợ",
      };
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || "";

    const cleanJsonStr = rawContent.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanJsonStr);

    return {
      success: true,
      teacher_notes: parsed.teacher_notes || "Hôm nay bé học rất chăm chỉ và tập trung.",
      homework: parsed.homework || "Về nhà ôn lại bài học 15 phút mỗi ngày.",
    };
  } catch (error: any) {
    console.error("generateLessonReview error:", error);
    return {
      success: false,
      teacher_notes: "",
      homework: "",
      message: "Tính năng này hiện chưa được hỗ trợ",
    };
  }
}
