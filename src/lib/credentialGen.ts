// Helper sinh tài khoản và mật khẩu thông minh theo quy định hệ thống

export function getInitials(text: string): string {
  if (!text) return "";
  // Remove accents
  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");

  const words = normalized.trim().split(/\s+/).filter(Boolean);
  return words.map((w) => w[0].toUpperCase()).join("");
}

export function generateAdminUsername(params: {
  orgType: "TT" | "TH"; // Trung tâm hoặc Trường học
  orgName: string; // Tên trung tâm / trường
  streetName: string; // Tên đường (VD: Hiền Vương -> HV)
  provinceCode: string; // Tỉnh thành (VD: TPHCM, HN, DN)
  branch: string; // Chi nhánh (VD: CN1, CN2)
}): string {
  const type = params.orgType || "TT";
  const orgInitials = getInitials(params.orgName) || "NAME";
  const streetInitials = getInitials(params.streetName) || "LOC";
  const province = (params.provinceCode || "TPHCM").toUpperCase();
  const branch = (params.branch || "CN1").toUpperCase();

  return `${type}-${orgInitials}-${streetInitials}-${province}-${branch}`;
}

export function generateRandomPassword(length: number = 10): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "@#$%&*!";

  // Ensure at least one of each
  let password = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ];

  const allChars = upper + lower + digits + symbols;
  for (let i = password.length; i < length; i++) {
    password.push(allChars[Math.floor(Math.random() * allChars.length)]);
  }

  // Shuffle
  return password.sort(() => Math.random() - 0.5).join("");
}

export const PROVINCES_VIETNAM = [
  { code: "TPHCM", name: "TP. Hồ Chí Minh" },
  { code: "HN", name: "Hà Nội" },
  { code: "DN", name: "Đà Nẵng" },
  { code: "CT", name: "Cần Thơ" },
  { code: "HP", name: "Hải Phòng" },
  { code: "BD", name: "Bình Dương" },
  { code: "DNAI", name: "Đồng Nai" },
  { code: "VT", name: "Bà Rịa - Vũng Tàu" },
  { code: "KHOA", name: "Khánh Hòa" },
  { code: "LDO", name: "Lâm Đồng" },
  { code: "KHAC", name: "Tỉnh / Thành khác" },
];
