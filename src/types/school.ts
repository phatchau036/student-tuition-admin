/**
 * school.ts — Kiểu dữ liệu domain school.
 * Tự động tách từ src/lib/types.ts trong Giai đoạn 2 (refactor/phase-2).
 */
export interface School {
  id: string;
  name: string; // Tên trường / trung tâm
  code: string; // Mã trường (e.g. "TT-01")
  school_type?: "TT" | "TH"; // TT: Trung tâm, TH: Trường học
  street?: string; // Tên đường riêng (VD: "Hiền Vương")
  city?: string; // Tỉnh / Thành phố (VD: "TPHCM", "Hà Nội"...)
  branch_num?: number | string; // Chi nhánh số mấy (VD: 1, 2)
  address?: string;
  phone?: string;
  domain?: string; // Tên miền riêng (Custom Domain, VD: "edu.trungtamhongan.vn")
  subdomain?: string; // Tên miền con hệ thống (Subdomain, VD: "hongan" -> "hongan.tenmienban.com")
  ip_restriction_enabled?: number; // 0: không giới hạn, 1: chỉ cho phép vào từ IP quy định
  allowed_ips?: string; // Danh sách IP cho phép, phân tách bằng dấu phẩy
  created_at?: string;
}

export interface SchoolAdmin {
  id: string;
  school_id: string;
  username: string; // Tên đăng nhập
  password?: string; // Mật khẩu
  full_name: string;
  phone?: string;
  role_id?: string;
  role_name?: string;
  is_active?: number; // 1: Hoạt động, 0: Khóa
  is_owner?: number; // 1: Chủ cơ sở (toàn quyền)
  permissions?: string[];
  created_at?: string;
}

export interface AdminRole {
  id: string;
  school_id: string;
  name: string;
  description?: string;
  permissions_json: string;
  permissions?: string[];
  staff_count?: number;
  is_system?: number; // 1: Vai trò hệ thống cố định (không thể sửa/xóa)
  created_at?: string;
}

export interface AdminPermissionItem {
  id: string;
  label: string;
  description: string;
}

export interface AdminPermissionGroup {
  id: string;
  name: string;
  description: string;
  items: AdminPermissionItem[];
}

export const ADMIN_PERMISSION_GROUPS: AdminPermissionGroup[] = [
  {
    id: "students",
    name: "Quản Lý Học Sinh",
    description: "Xem danh sách, thêm, sửa, xóa, bảo lưu và xuất file học sinh",
    items: [
      {
        id: "students.view",
        label: "Xem danh sách học sinh",
        description: "Mở xem bảng học sinh và thông tin chi tiết hồ sơ",
      },
      {
        id: "students.create",
        label: "Thêm học sinh mới",
        description: "Tạo hồ sơ học sinh mới vào trung tâm",
      },
      {
        id: "students.edit",
        label: "Chỉnh sửa học sinh",
        description: "Sửa thông tin cá nhân, ca học, môn học, gói phí",
      },
      {
        id: "students.delete",
        label: "Xóa học sinh",
        description: "Xóa hồ sơ học sinh (đơn lẻ hoặc hàng loạt)",
      },
      {
        id: "students.status",
        label: "Đổi trạng thái học sinh",
        description: "Chuyển Bảo lưu, Nghỉ học hoặc cho học tiếp",
      },
      {
        id: "students.excel",
        label: "Nhập / Xuất Excel",
        description: "Import học sinh từ file Excel hoặc xuất file danh sách",
      },
    ],
  },
  {
    id: "tuition",
    name: "Học Phí & Doanh Thu",
    description: "Xem tiền học phí, công nợ, đối soát thu tiền và xem báo cáo tài chính",
    items: [
      {
        id: "tuition.view",
        label: "Xem học phí & công nợ",
        description: "Nhìn thấy số tiền học phí, công nợ nợ cũ của học sinh",
      },
      {
        id: "tuition.audit",
        label: "Thu tiền / Đối soát",
        description: "Bấm Đã đóng/Chưa đóng, ghi chú thanh toán đối soát",
      },
      {
        id: "tuition.override",
        label: "Điều chỉnh học phí tháng",
        description: "Nhập học phí tùy chỉnh cho từng tháng cụ thể",
      },
      {
        id: "tuition.receipt",
        label: "Xuất biên lai học phí",
        description: "In hoặc tải biên lai điện tử gửi phụ huynh",
      },
      {
        id: "tuition.remind",
        label: "Hàng đợi nhắc học phí Zalo",
        description: "Mở danh sách nợ học phí và thực hiện nhắc nợ qua Zalo hoặc Bot",
      },
      {
        id: "revenue.reports",
        label: "Xem báo cáo tổng doanh thu",
        description: "Mở cửa sổ Tổng kết doanh thu tháng và giao dịch SePay",
      },
    ],
  },
  {
    id: "schedule",
    name: "Lịch Học & Điểm Danh / Bù",
    description: "Xem sơ đồ ma trận phòng học, báo nghỉ, xếp lịch học bù và quỹ giờ",
    items: [
      {
        id: "schedule.matrix",
        label: "Xem ma trận phòng học",
        description: "Mở sơ đồ ma trận phân bổ lớp và ca học tuần",
      },
      {
        id: "attendance.manage",
        label: "Điểm danh & Sổ bài học",
        description: "Điểm danh theo ngày cho các lớp/ca và ghi nhận xét, bài tập",
      },
      {
        id: "makeups.manage",
        label: "Quản lý Báo nghỉ & Học bù",
        description: "Ghi nhận báo nghỉ, xếp ca bù và xem quỹ giờ bù",
      },
      {
        id: "schedule.consult",
        label: "Tư vấn xếp lịch ca trống",
        description: "Tra cứu các khung giờ còn trống để tư vấn phụ huynh",
      },
    ],
  },
  {
    id: "classes_teachers",
    name: "Lớp Học & Giáo Viên",
    description: "Quản lý danh mục lớp học, chia ca và đội ngũ giáo viên",
    items: [
      {
        id: "classes.manage",
        label: "Quản lý Lớp học",
        description: "Thêm, sửa, đóng/mở lớp học và phân công ca",
      },
      {
        id: "teachers.manage",
        label: "Quản lý Giáo viên",
        description: "Thêm, sửa giáo viên và phân ca đứng lớp",
      },
    ],
  },
  {
    id: "settings",
    name: "Cài Đặt & Nhân Sự",
    description: "Cấu hình trung tâm và phân quyền tài khoản nhân viên",
    items: [
      {
        id: "settings.manage",
        label: "Cài đặt hệ thống cơ sở",
        description: "Mở và chỉnh sửa cài đặt trung tâm (học phí gốc, SePay, Zalo...)",
      },
      {
        id: "staff.manage",
        label: "Quản lý Nhân viên & Phân quyền",
        description: "Tạo nhóm quyền, tạo tài khoản và phân quyền nhân viên",
      },
    ],
  },
];
