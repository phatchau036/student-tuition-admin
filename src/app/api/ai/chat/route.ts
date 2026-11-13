import { NextResponse } from "next/server";
import { askAiAssistant, generateLessonReview, getAiConfig } from "@/lib/aiBrain";
import { getSchoolIdFromRequest, getAdminFromRequest } from "@/lib/authHelper";

// POST /api/ai/chat - Trợ lý AI trung tâm cho Admin & Giáo viên
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action = "chat", message, history = [], student_name, subject_name, rating = 5, keywords = "", class_name } = body;

    const schoolId = getSchoolIdFromRequest(req) || body.school_id || "school-default";
    const senderName = body.sender_name || "Admin";

    // 1. Kiểm tra trạng thái cấu hình AI
    if (action === "status") {
      const config = await getAiConfig();
      return NextResponse.json({
        success: true,
        is_ready: Boolean(config.baseUrl && config.apiKey && config.isActive),
        is_active: config.isActive,
        model: config.model || "gemini-3.8-flash",
      });
    }

    // 2. Giáo viên / Admin yêu cầu AI Gợi ý nhận xét buổi học & bài tập về nhà
    if (action === "suggest_feedback") {
      if (!student_name) {
        return NextResponse.json(
          { success: false, message: "Thiếu tên học sinh để gợi ý nhận xét!" },
          { status: 400 }
        );
      }

      const result = await generateLessonReview({
        studentName: String(student_name),
        subjectName: subject_name ? String(subject_name) : undefined,
        rating: Number(rating) || 5,
        keywords: keywords ? String(keywords) : undefined,
        className: class_name ? String(class_name) : undefined,
      });

      return NextResponse.json(result);
    }

    // 3. Admin trò chuyện với Trợ lý AI (Hỏi doanh thu, công nợ, cách dùng phần mềm...)
    if (action === "chat") {
      if (!message || !String(message).trim()) {
        return NextResponse.json(
          { success: false, message: "Tin nhắn không được để trống!" },
          { status: 400 }
        );
      }

      // Bắt buộc đăng nhập Admin và giới hạn dữ liệu tài chính theo đúng quyền
      const admin = await getAdminFromRequest(req);
      if (!admin) {
        return NextResponse.json(
          { success: false, message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn!" },
          { status: 401 }
        );
      }
      const isOwnerOrWildcard = admin.is_owner === 1 || admin.permissions.includes("*");
      const canViewRevenue = isOwnerOrWildcard || admin.permissions.includes("revenue.reports");
      const canViewTuition = isOwnerOrWildcard || admin.permissions.includes("tuition.view");

      const answer = await askAiAssistant({
        userMessage: String(message).trim(),
        history,
        schoolId,
        senderName,
        isZalo: false,
        canViewRevenue,
        canViewTuition,
      });

      return NextResponse.json({
        success: true,
        answer,
      });
    }

    return NextResponse.json({ success: false, message: "Hành động không hợp lệ!" }, { status: 400 });
  } catch (error: any) {
    console.error("AI Chat API Error:", error);
    return NextResponse.json(
      { success: false, message: "Tính năng này hiện chưa được hỗ trợ." },
      { status: 500 }
    );
  }
}
