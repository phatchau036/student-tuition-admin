"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  BookOpen,
  Users,
  GraduationCap,
  CalendarCheck,
  CreditCard,
  QrCode,
  ShieldCheck,
  Zap,
  Clock,
  History,
  MessageSquare,
  Send,
  Star,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  Layers,
  ChevronRight,
  TrendingUp,
  Inbox,
  Award,
  Terminal,
} from "lucide-react";
import { ParentFeedback, SystemFeedback } from "@/lib/types";
import { useToast } from "@/components/Toast";

interface AppInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  schoolId?: string;
  schoolName?: string;
  schoolCode?: string;
}

export const AppInfoModal: React.FC<AppInfoModalProps> = ({
  isOpen,
  onClose,
  schoolId = "school-default",
  schoolName = "Trung tâm đào tạo",
  schoolCode = "TT",
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"about" | "changelog" | "tpteam_feedback" | "parent_feedbacks">("about");

  // Tab 3: TpTeam Feedback State
  const [fbTitle, setFbTitle] = useState("");
  const [fbCategory, setFbCategory] = useState<"feature_request" | "bug_report" | "ui_ux" | "performance" | "other">("feature_request");
  const [fbPriority, setFbPriority] = useState<"low" | "medium" | "high">("medium");
  const [fbContent, setFbContent] = useState("");
  const [fbSenderName, setFbSenderName] = useState("");
  const [fbSenderContact, setFbSenderContact] = useState("");
  const [isSubmittingTpTeam, setIsSubmittingTpTeam] = useState(false);
  const [systemFeedbacks, setSystemFeedbacks] = useState<SystemFeedback[]>([]);
  const [isLoadingSystemFb, setIsLoadingSystemFb] = useState(false);

  // Tab 4: Parent Feedbacks List
  const [parentFeedbacks, setParentFeedbacks] = useState<ParentFeedback[]>([]);
  const [isLoadingParentFb, setIsLoadingParentFb] = useState(false);
  const [selectedParentFb, setSelectedParentFb] = useState<ParentFeedback | null>(null);
  const [replyNote, setReplyNote] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (activeTab === "tpteam_feedback") {
        loadSystemFeedbacks();
      } else if (activeTab === "parent_feedbacks") {
        loadParentFeedbacks();
      }
    }
  }, [isOpen, activeTab]);

  const loadSystemFeedbacks = async () => {
    try {
      setIsLoadingSystemFb(true);
      const res = await fetch(`/api/feedbacks/system?school_id=${schoolId}`);
      const json = await res.json();
      if (json.success) {
        setSystemFeedbacks(json.data || []);
      }
    } catch {
      console.error("Lỗi tải góp ý hệ thống");
    } finally {
      setIsLoadingSystemFb(false);
    }
  };

  const loadParentFeedbacks = async () => {
    try {
      setIsLoadingParentFb(true);
      const res = await fetch(`/api/feedbacks/parent?school_id=${schoolId}`);
      const json = await res.json();
      if (json.success) {
        setParentFeedbacks(json.data || []);
      }
    } catch {
      console.error("Lỗi tải góp ý phụ huynh");
    } finally {
      setIsLoadingParentFb(false);
    }
  };

  const handleSubmitToTpTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fbTitle.trim() || !fbContent.trim()) {
      showToast("Vui lòng điền tiêu đề và nội dung góp ý!", "error");
      return;
    }

    try {
      setIsSubmittingTpTeam(true);
      const res = await fetch("/api/feedbacks/system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school_id: schoolId,
          school_name: schoolName,
          school_code: schoolCode,
          sender_name: fbSenderName.trim(),
          sender_contact: fbSenderContact.trim(),
          category: fbCategory,
          priority: fbPriority,
          title: fbTitle.trim(),
          content: fbContent.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        setFbTitle("");
        setFbContent("");
        loadSystemFeedbacks();
      } else {
        showToast(data.message || "Không thể gửi góp ý!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    } finally {
      setIsSubmittingTpTeam(false);
    }
  };

  const handleUpdateParentFbStatus = async (id: string, status: "reviewed" | "resolved") => {
    try {
      const res = await fetch("/api/feedbacks/parent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, response_note: replyNote }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        setSelectedParentFb(null);
        setReplyNote("");
        loadParentFeedbacks();
      }
    } catch {
      showToast("Lỗi khi cập nhật trạng thái", "error");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-sans">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/25 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Thông Tin Ứng Dụng & Trung Tâm Hỗ Trợ
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  Phiên bản 2.5.0
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Giới thiệu tính năng, lịch sử cập nhật hệ thống và kênh kết nối phản hồi hai chiều
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 px-6 py-2.5 gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab("about")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition shrink-0 ${
              activeTab === "about"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/25"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Giới Thiệu Phần Mềm</span>
          </button>

          <button
            onClick={() => setActiveTab("changelog")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition shrink-0 ${
              activeTab === "changelog"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/25"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <History className="w-4 h-4" />
            <span>Nhật Ký Nâng Cấp (Changelog)</span>
          </button>

          <button
            onClick={() => setActiveTab("parent_feedbacks")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition shrink-0 ${
              activeTab === "parent_feedbacks"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/25"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>Ý Kiến Phụ Huynh Gửi Về ({parentFeedbacks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("tpteam_feedback")}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition shrink-0 ${
              activeTab === "tpteam_feedback"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/25"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <MessageSquare className="w-4 h-4 text-amber-500" />
            <span>Góp Ý Cho TpTeam</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: GIỚI THIỆU PHẦN MỀM (Không lộ hệ thống mẹ) */}
          {activeTab === "about" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Banner */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 p-6 sm:p-8 text-white shadow-lg">
                <div className="relative z-10 max-w-2xl space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-white/10 backdrop-blur-md border border-white/20 text-indigo-200">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>Nền Tảng Quản Lý Giáo Dục Độc Quyền Cơ Sở</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-snug">
                    Giải Pháp Vận Hành Toàn Diện Cho Trung Tâm Đào Tạo
                  </h3>
                  <p className="text-sm text-indigo-100/90 leading-relaxed font-normal">
                    Phần mềm được thiết kế chuyên biệt nhằm chuẩn hóa toàn bộ quy trình: từ quản lý hồ sơ học sinh, xếp lịch học bù thông minh theo sức chứa thực tế, phân công giáo viên đến đối soát học phí tự động 100% qua ngân hàng và cổng kết nối trực tuyến với phụ huynh.
                  </p>
                </div>
                <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 opacity-10 pointer-events-none">
                  <BookOpen className="w-72 h-72 text-white" />
                </div>
              </div>

              {/* Grid 6 Trụ cột Tính năng */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-2.5 shadow-xs hover:border-indigo-300 transition">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center font-bold">
                    <Users className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    Quản Lý Học Sinh Đa Chiều
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Theo dõi đầy đủ mã học sinh, ngày bắt đầu nhập học, hình thức học theo giờ/buổi, cấp độ level, chính sách chiết khấu kèm lý do cụ thể và trạng thái bảo lưu / nghỉ học có lưu vết.
                  </p>
                </div>

                <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-2.5 shadow-xs hover:border-emerald-300 transition">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    Đối Soát Học Phí Tự Động (SePay)
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Tích hợp Webhook kết nối trực tiếp biến động số dư ngân hàng (Vietcombank, MB, ACB...). Tự nhận diện mã học sinh hoặc SĐT để gạch nợ tức thì mà không cần đối soát thủ công.
                  </p>
                </div>

                <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-2.5 shadow-xs hover:border-amber-300 transition">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 flex items-center justify-center font-bold">
                    <CalendarCheck className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    Học Bù Thông Minh & Sức Chứa
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Tự động cấp suất học bù khi bé xin nghỉ. Kiểm tra sức chứa lớp học thời gian thực, cảnh báo khi ca học quá tải (&gt;80%) và tự động khóa chọn khi lớp đã đủ sĩ số tối đa.
                  </p>
                </div>

                <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-2.5 shadow-xs hover:border-blue-300 transition">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center font-bold">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    Phân Công Giáo Viên & Cổng GV
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Gán giáo viên chủ nhiệm và phân ca giảng dạy trực tiếp. Cung cấp cổng riêng dành cho giáo viên tra cứu danh sách lớp học và theo dõi lịch học bù của học viên.
                  </p>
                </div>

                <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-2.5 shadow-xs hover:border-rose-300 transition">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 flex items-center justify-center font-bold">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    Báo Cáo & Tổng Kết Tháng
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Trực quan hóa tài chính: tổng doanh thu dự kiến, số tiền thực tế đã thu, nợ tồn, tỷ lệ hoàn tất thu học phí và lịch sử toàn bộ các giao dịch chuyển khoản tự động.
                  </p>
                </div>

                <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-2.5 shadow-xs hover:border-purple-300 transition">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    Cổng Phụ Huynh Trực Tuyến
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Phụ huynh đăng nhập nhanh bằng số điện thoại để kiểm tra lịch học, thông tin học phí, chủ động báo nghỉ học, chọn lịch bù trực tiếp và gửi ý kiến đóng góp cho trung tâm.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CHANGELOG */}
          {activeTab === "changelog" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Nhật Ký Cập Nhật Tính Năng & Phiên Bản
                </h3>
                <p className="text-xs text-slate-500">
                  Hệ thống được phát triển và nâng cấp liên tục để phục vụ tối đa nhu cầu vận hành của cơ sở
                </p>
              </div>

              <div className="space-y-4">
                {/* v2.5.0 */}
                <div className="p-5 rounded-2xl border-2 border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/20 dark:bg-indigo-950/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-indigo-600 text-white">
                        v2.5.0 (Hiện tại)
                      </span>
                      <span className="text-xs font-bold text-slate-500">26/10/2026</span>
                    </div>
                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      Đa Ngôn Ngữ & Nâng Cấp Tự Động
                    </span>
                  </div>
                  <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1.5 list-disc list-inside">
                    <li><strong>Kết nối thông báo Zalo cho Giáo viên & Phụ huynh:</strong> Cung cấp khu vực kết nối trực tiếp trên Cổng Giáo Viên và Cổng Phụ Huynh để nhận tin nhắn lịch học, nhắc học phí và lịch bù qua Zalo Bot.</li>
                    <li><strong>Thông báo đóng học phí & Mã VietQR tự động:</strong> Cổng Phụ Huynh hiển thị rõ trạng thái đóng/nợ học phí, mã VietQR quét nộp tiền tức thì kèm nút &quot;Tôi đã đóng học phí&quot; để ghi nhận ngay lập tức vào hệ thống.</li>
                    <li><strong>Đa ngôn ngữ toàn diện (Full System i18n):</strong> Hỗ trợ 4 ngôn ngữ chuẩn quốc tế (🇻🇳 Tiếng Việt, 🇬🇧 English, 🇨🇳 中文, 🇯🇵 日本語) với chuyển ngữ 1-click tức thì trên toàn giao diện quản trị và cổng phụ huynh.</li>
                    <li><strong>1-Click Cập nhật tự động từ GitHub:</strong> Tự động tải mã nguồn mới nhất từ kho GitHub, biên dịch bản build và khởi động lại dịch vụ ngay trên trang quản trị hệ thống.</li>
                    <li><strong>Chế độ Bảo Trì Thông Minh (Maintenance Guard):</strong> Tự động kích hoạt màn hình thông báo &quot;Server Đang Được Nâng Cấp&quot; khi cập nhật, tự động kết nối lại khi máy chủ hoàn tất.</li>
                    <li><strong>Tự động phát hiện nợ quá hạn & cộng dồn:</strong> Đánh dấu cảnh báo đỏ học sinh nợ học phí từ 2 tháng liên tiếp trở lên và tự động tính tổng nợ cũ vào tháng kế tiếp.</li>
                  </ul>
                </div>

                {/* v2.4.0 */}
                <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                        v2.4.0
                      </span>
                      <span className="text-xs font-bold text-slate-500">25/10/2026</span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Đối Soát Ngân Hàng & Báo Cáo
                    </span>
                  </div>
                  <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc list-inside">
                    <li><strong>Tích hợp SePay Webhook tự động:</strong> Nhận biến động số dư ngân hàng và tự động gạch nợ học phí theo mã HS và số điện thoại.</li>
                    <li><strong>Cửa sổ Tổng Kết Tháng (Monthly Summary):</strong> Theo dõi doanh thu dự thu, thực thu, số nợ và nhật ký giao dịch ngân hàng theo từng tháng.</li>
                    <li><strong>Lý do chiết khấu:</strong> Thêm cấu hình tên/lý do mốc chiết khấu trong Cài đặt và tự động điền vào hồ sơ học sinh.</li>
                    <li><strong>Ngày bắt đầu đăng ký học:</strong> Bổ sung trường ngày nhập học kèm nút 1-click &quot;Hôm nay (Hiện tại ngay)&quot;.</li>
                    <li><strong>Kênh tiếp nhận góp ý phụ huynh:</strong> Cung cấp form đánh giá sao và gửi phản hồi trực tiếp từ Cổng Phụ Huynh.</li>
                  </ul>
                </div>

                {/* v2.3.0 */}
                <div className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                        v2.3.0
                      </span>
                      <span className="text-xs font-bold text-slate-500">24/10/2026 (Bắt đầu dự án)</span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Khởi tạo nền tảng
                    </span>
                  </div>
                  <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc list-inside">
                    <li><strong>Khởi tạo hệ thống quản trị trung tâm:</strong> Quản lý học sinh, danh sách lớp, gói học phí, phân công giáo viên và cổng phụ huynh tra cứu.</li>
                    <li><strong>Quản lý học bù & sĩ số:</strong> Đăng ký học bù trực tuyến, theo dõi số buổi cần bù của học sinh.</li>
                    <li><strong>Cấu hình chiết khấu & ngày đăng ký:</strong> Quản lý mốc chiết khấu, lý do giảm và ngày nhập học kèm nút Hôm nay.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GÓP Ý CHO TPTEAM */}
          {activeTab === "tpteam_feedback" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 font-bold">
                  <Terminal className="w-4 h-4" />
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  <span className="font-bold text-amber-900 dark:text-amber-200 block text-sm mb-0.5">
                    Kênh Kết Nối Trực Tiếp Đến Đội Ngũ Phát Triển TpTeam
                  </span>
                  Quý trung tâm có mong muốn bổ sung tính năng mới, phát hiện lỗi phát sinh hoặc cần tối ưu trải nghiệm? Mọi góp ý được gửi tại đây sẽ chuyển thẳng đến ban kỹ thuật TpTeam để đánh giá và đưa vào lộ trình phát triển.
                </div>
              </div>

              {/* Form gửi góp ý */}
              <form onSubmit={handleSubmitToTpTeam} className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Gửi Góp Ý / Yêu Cầu Tính Năng Mới
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Phân loại
                    </label>
                    <select
                      value={fbCategory}
                      onChange={(e) => setFbCategory(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none"
                    >
                      <option value="feature_request">Yêu cầu tính năng mới</option>
                      <option value="bug_report">Báo lỗi hệ thống</option>
                      <option value="ui_ux">Cải tiến giao diện / Trải nghiệm</option>
                      <option value="performance">Tốc độ & Hiệu năng</option>
                      <option value="other">Ý kiến đóng góp khác</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Mức độ ưu tiên
                    </label>
                    <select
                      value={fbPriority}
                      onChange={(e) => setFbPriority(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none"
                    >
                      <option value="low">Thấp (Cải thiện dần)</option>
                      <option value="medium">Bình thường (Đề xuất thêm)</option>
                      <option value="high">Cao (Cần hỗ trợ sớm)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                      Người gửi / Số liên hệ
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Thầy Phát (0901234567)"
                      value={fbSenderContact}
                      onChange={(e) => setFbSenderContact(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Tiêu đề góp ý <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Đề xuất thêm tính năng xuất file Excel báo cáo theo quý..."
                    value={fbTitle}
                    onChange={(e) => setFbTitle(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Nội dung chi tiết <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Mô tả cụ thể yêu cầu hoặc vấn đề trung tâm gặp phải..."
                    value={fbContent}
                    onChange={(e) => setFbContent(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none resize-none"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmittingTpTeam}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/25 transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmittingTpTeam ? "Đang gửi..." : "Gửi Góp Ý Cho TpTeam"}</span>
                  </button>
                </div>
              </form>

              {/* Lịch sử các góp ý trung tâm đã gửi */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Lịch Sử Góp Ý Của Trung Tâm ({systemFeedbacks.length})
                </h4>

                {isLoadingSystemFb ? (
                  <div className="py-8 text-center text-xs text-slate-400">Đang tải lịch sử góp ý...</div>
                ) : systemFeedbacks.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-400">
                    Trung tâm chưa gửi góp ý nào cho hệ thống.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {systemFeedbacks.map((fb) => (
                      <div
                        key={fb.id}
                        className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900 dark:text-white">
                              {fb.title}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase">
                              {fb.category}
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              fb.status === "completed"
                                ? "bg-emerald-100 text-emerald-800"
                                : fb.status === "planned"
                                ? "bg-blue-100 text-blue-800"
                                : fb.status === "in_review"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {fb.status === "completed"
                              ? "Đã hoàn thành"
                              : fb.status === "planned"
                              ? "Đã lên kế hoạch"
                              : fb.status === "in_review"
                              ? "Đang xem xét"
                              : "Đã tiếp nhận"}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {fb.content}
                        </p>

                        {fb.admin_reply && (
                          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-xs text-indigo-900 dark:text-indigo-200">
                            <strong className="block text-[10px] uppercase text-indigo-600">Phản hồi từ TpTeam:</strong>
                            <p className="mt-0.5">{fb.admin_reply}</p>
                          </div>
                        )}

                        <div className="text-[10px] text-slate-400 pt-1">
                          Gửi ngày: {fb.created_at}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: Ý KIẾN PHỤ HUYNH GỬI VỀ */}
          {activeTab === "parent_feedbacks" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Hòm Thư Đóng Góp Ý Kiến Từ Phụ Huynh
                  </h3>
                  <p className="text-xs text-slate-500">
                    Xem phản hồi, mức độ hài lòng và đánh giá của phụ huynh học sinh
                  </p>
                </div>
                <button
                  onClick={loadParentFeedbacks}
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 transition"
                >
                  Làm mới
                </button>
              </div>

              {isLoadingParentFb ? (
                <div className="py-12 text-center text-xs text-slate-400">Đang tải danh sách góp ý...</div>
              ) : parentFeedbacks.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-400 space-y-2">
                  <Inbox className="w-8 h-8 mx-auto text-slate-300" />
                  <p>Chưa có phụ huynh nào gửi ý kiến đóng góp.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {parentFeedbacks.map((fb) => (
                    <div
                      key={fb.id}
                      className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-2.5 shadow-xs"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                            {fb.student_name ? `Học sinh: ${fb.student_name}` : "Phụ huynh"}
                          </span>
                          {fb.parent_phone && (
                            <span className="font-mono text-xs text-slate-500">({fb.parent_phone})</span>
                          )}
                          <div className="flex items-center text-amber-400">
                            {[...Array(fb.rating || 5)].map((_, i) => (
                              <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            ))}
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            fb.status === "resolved"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : fb.status === "reviewed"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {fb.status === "resolved"
                            ? "Đã xử lý"
                            : fb.status === "reviewed"
                            ? "Đã xem"
                            : "Chưa đọc"}
                        </span>
                      </div>

                      <div className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 leading-relaxed">
                        {fb.content}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span>Gửi ngày: {fb.created_at}</span>
                        <div className="flex items-center gap-2">
                          {fb.status === "pending" && (
                            <button
                              onClick={() => handleUpdateParentFbStatus(fb.id, "reviewed")}
                              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                            >
                              Đánh dấu đã xem
                            </button>
                          )}
                          {fb.status !== "resolved" && (
                            <button
                              onClick={() => handleUpdateParentFbStatus(fb.id, "resolved")}
                              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                            >
                              Đã xử lý xong
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
