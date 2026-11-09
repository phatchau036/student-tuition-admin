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

  // Chuẩn hóa baseUrl: loại bỏ dấu gạch chéo cuối nếu có
  if (baseUrl.endsWith("/")) {
    baseUrl = baseUrl.slice(0, -1);
  }

  return { baseUrl, apiKey, model, isActive };
}

/**
 * Cẩm nang hướng dẫn sử dụng toàn bộ tính năng phần mềm (Software Knowledge Base)
 */
const SYSTEM_FEATURE_KNOWLEDGE_BASE = `
# CẨM NANG TOÀN BỘ CHỨC NĂNG CỦA PHẦN MỀM QUẢN LÝ TRUNG TÂM (STUDENT TUITION ADMIN):
1. QUẢN LÝ HỌC SINH & THỜI KHÓA BIỂU:
   - Thêm học sinh: Trên Dashboard, bấm nút "+ Thêm học sinh" (màu xanh). Nhập Họ tên, Số điện thoại phụ huynh, chọn Bộ môn, Lớp học, Trình độ/Level.
   - Chọn lịch học & thời lượng: Có thể chọn nhanh theo Kiểu lịch mẫu (Thứ chẵn 2-4-6, Thứ lẻ 3-5-7, Cuối tuần T7-CN) hoặc tự chọn từng thứ trong tuần kèm giờ học cụ thể (ví dụ 18:00 - 19:30). Hệ thống tự động tính ra số tiếng/tuần và số phút 1 buổi.
   - Sửa/Xóa học sinh: Bấm vào dòng học sinh trên bảng hoặc bấm dấu 3 chấm góc phải chọn "Chỉnh sửa" hoặc "Xóa học sinh".
   - Chuyển trạng thái: Chọn "Chuyển trạng thái" để cho học sinh Bảo lưu (ghi ngày dự kiến học lại) hoặc Nghỉ học. Khi bảo lưu, học sinh không bị tính học phí kỳ sau.

2. ĐIỂM DANH CA DẠY & SỔ LIÊN LẠC ĐIỆN TỬ:
   - Phía Giáo viên: Giáo viên đăng nhập số điện thoại tại Cổng Giáo Viên (/giao-vien), vào tab "Điểm Danh & Nhận Xét". Chọn ngày dạy, hệ thống liệt kê các ca dạy. Giáo viên tích chọn Có mặt, Vắng có phép, hoặc Vắng không phép; chấm điểm sao (1-5 sao), gõ nhận xét tiến bộ và dặn dò bài tập về nhà. Có nút "AI Gợi ý" giúp tự động soạn nhận xét.
   - Phía Quản lý / Admin: Trên Dashboard /admin, mở Menu Nghiệp vụ cơ sở chọn "Điểm Danh & Sổ Bài Học" (DailyAttendanceModal). Admin có thể điểm danh toàn trường theo ngày, bổ sung lời nhận xét mà không bị khóa nút.
   - Phía Phụ huynh: Phụ huynh đăng nhập /phu-huynh bằng số điện thoại, vào tab "Sổ Học Tập" để xem chi tiết từng buổi học của con (ngày giờ, thầy cô, số sao, nhận xét và bài tập về nhà).

3. BÁO NGHỈ & XẾP LỊCH HỌC BÙ (VÍ GIỜ HỌC - HOUR WALLET):
   - Phụ huynh báo nghỉ: Phụ huynh vào /phu-huynh, bấm "Báo nghỉ học", chọn ngày nghỉ và lý do. Hệ thống tự động cộng dồn số phút của buổi học vào Quỹ giờ học bù (Ví giờ).
   - Đặt lịch học bù: Phụ huynh hoặc Admin chọn ngày muốn học bù, hệ thống kiểm tra sĩ số thời gian thực và cho phép chọn ca còn chỗ trống. Khi bù xong, số giờ sẽ tự động trừ trong ví.

4. GIÁO VIÊN BÁO NGHỈ & DUYỆT PHÂN CÔNG DẠY THAY:
   - Giáo viên xin nghỉ: Vào /giao-vien, tab "Báo Nghỉ", chọn ngày nghỉ, ca nghỉ, lý do và giáo viên dạy thay dự kiến (nếu có).
   - Admin duyệt đơn: Vào /admin, mở "Đội Ngũ Giáo Viên", chuyển sang tab "Đơn Xin Nghỉ Của Giáo Viên". Quản lý có thể bấm "Duyệt đơn" (chọn giáo viên dạy thay chính thức) hoặc "Từ chối đơn".

5. HÀNG ĐỢI NHẮC HỌC PHÍ NHANH QUA ZALO:
   - Trên Dashboard, bấm nút "Nhắc Học Phí" (màu xanh dương). Hệ thống gom toàn bộ học sinh chưa đóng kỳ này và học sinh còn nợ dồn.
   - Bấm nút "Gửi Zalo": Hệ thống tự động copy mẫu tin nhắn chuẩn (kèm số tiền nợ, tài khoản ngân hàng và link ảnh mã QR VietQR đúng số tiền), đồng thời mở thẳng ứng dụng Zalo tới phụ huynh. Lễ tân chỉ cần dán (Ctrl+V) gửi đi trong 2 giây. Dòng đó tự động gắn nhãn [✓ Đã nhắc hôm nay] để chống nhắc trùng.
   - Có hỗ trợ gửi tự động 1-click qua Zalo Bot nếu học sinh có Zalo Chat ID.

6. PHÂN QUYỀN NHÂN VIÊN (RBAC):
   - Chủ cơ sở vào Menu Nghiệp vụ -> "Tài Khoản & Phân Quyền" (StaffManagementModal).
   - Tab "Nhóm Quyền & Vai Trò": Tạo vai trò (VD: Lễ tân, Kế toán) và tích chọn các quyền trong 5 nhóm (19 quyền chi tiết).
   - Tab "Tài Khoản Nhân Viên": Tạo tài khoản đăng nhập cho nhân viên, gán vai trò tương ứng. Nhân viên không có quyền xem học phí sẽ bị che số tiền thành dấu ••••••.

7. ĐỐI SOÁT SEPAY & BIÊN LAI ĐIỆN TỬ:
   - Kết nối SePay Webhook tự động gạch nợ học phí khi phụ huynh chuyển khoản đúng cú pháp (HP {MãHS}).
   - Xuất biên lai điện tử (e-Receipt): Trong mục Thu tiền/Đối soát, có thể tải ảnh biên lai gửi Zalo và lưu số biên lai giấy viết tay.
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
Bạn là "Trợ Lý AI Quản Trị Trung Tâm" - người đồng hành đắc lực của Quản trị viên/Chủ cơ sở ${senderName}.
Bạn am hiểu sâu sắc nghiệp vụ giáo dục, lịch học, học phí và toàn bộ các tính năng của phần mềm.

${operationalContext}

${SYSTEM_FEATURE_KNOWLEDGE_BASE}

QUY TẮC PHẢN HỒI QUAN TRỌNG:
1. Văn phong: Thân thiện, tôn trọng, chuyên nghiệp, tiếng Việt chuẩn mực, xưng hô "Em" và "Anh/Chị" (hoặc "Thầy/Cô").
2. Khi người dùng hỏi về SỐ LIỆU (Doanh thu tháng này, còn ai chưa đóng tiền, sĩ số học sinh...):
   - Trả lời CHÍNH XÁC dựa trên số liệu thực tế được cung cấp ở trên.
   - Nêu rõ số tiền, số lượng học sinh và liệt kê một số học sinh tiêu biểu.
3. Khi người dùng hỏi về TÍNH NĂNG WEB (Web đã có chức năng này chưa? Làm sao để thêm học sinh? Điểm danh thế nào?):
   - Trả lời RÕ RÀNG là web ĐÃ CÓ hay CHƯA.
   - Hướng dẫn TỪNG BƯỚC cụ thể: bấm nút nào, màu gì, ở trang nào, điền thông tin gì.
4. Độ dài:
   ${isZalo ? "- Vì đang gửi qua Zalo, câu trả lời cần súc tích, ngắn gọn, dùng gạch đầu dòng rõ ràng, không viết quá dài dòng." : "- Trình bày đẹp mắt bằng định dạng Markdown, dùng icon sinh động."}
5. Bảo mật: Tuyệt đối không bịa đặt số liệu không có trong báo cáo, không bao giờ tiết lộ API key hay mật khẩu hệ thống.
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
        message: `Lỗi kết nối AI (${response.status})`,
      };
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || "";

    // Parse JSON từ phản hồi
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
      message: error.message || "Lỗi xử lý phản hồi từ AI",
    };
  }
}
