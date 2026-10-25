// Helper sinh tài khoản và mật khẩu thông minh theo quy định hệ thống

export function getInitials(text: string): string {
  if (!text) return "";
  // Remove accents
  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");

  const clean = normalized.replace(/[^a-zA-Z0-9\s]/g, " ");
  const words = clean.trim().split(/\s+/).filter(Boolean);
  return words.map((w) => w[0].toUpperCase()).join("");
}

export function generateAdminUsernameFromSchool(
  school: {
    name: string;
    code?: string;
    school_type?: string;
    street?: string;
    city?: string;
    branch_num?: number | string;
    address?: string;
  },
  adminIndex: number = 1
): string {
  // 1. Loại cơ sở: "TT" (Trung tâm) hoặc "TH" (Trường học)
  let type = "TT";
  if (school.school_type) {
    type = school.school_type.toUpperCase() === "TH" ? "TH" : "TT";
  } else if (school.name.toLowerCase().includes("trường")) {
    type = "TH";
  }

  // 2. Tên trung tâm / trường: lấy chữ cái đầu
  let cleanName = school.name.replace(/^(trung\s*tâm|trường|cơ\s*sở)\s*/i, "").trim();
  const nameInitials = getInitials(cleanName) || getInitials(school.name) || "NAME";

  // 3. Tên đường: ưu tiên lấy từ trường street, nếu không có thì trích xuất sạch từ address
  let streetInitials = "HV";
  if (school.street && school.street.trim()) {
    streetInitials = getInitials(school.street.trim());
  } else if (school.address && school.address.trim()) {
    const addr = school.address.trim();
    const streetMatch = addr.match(/(?:đường|phố)\s+([^,]+)/i);
    if (streetMatch && streetMatch[1]) {
      streetInitials = getInitials(streetMatch[1].trim());
    } else {
      // Loại bỏ số nhà ở đầu (chỉ số, gạch chéo, xuyệt, vd: "123/4 ", "Số 45 ")
      const cleanAddr = addr.split(",")[0].replace(/^(?:số\s+)?[\d\/\-\s]+(?:[a-zA-Z]\b)?\s*/i, "").trim();
      streetInitials = getInitials(cleanAddr) || getInitials(addr) || "LOC";
    }
  }

  // 4. Tỉnh / Thành phố: lấy từ trường city hoặc trích xuất từ address
  let province = "TPHCM";
  if (school.city && school.city.trim()) {
    const c = school.city.trim().toUpperCase();
    if (c === "HÀ NỘI" || c === "HA NOI" || c === "HN") province = "HN";
    else if (c === "ĐÀ NẴNG" || c === "DA NANG" || c === "DN") province = "DN";
    else if (c === "BÌNH DƯƠNG" || c === "BINH DUONG" || c === "BD") province = "BD";
    else if (c === "ĐỒNG NAI" || c === "DONG NAI") province = "DNAI";
    else if (c === "CẦN THƠ" || c === "CAN THO") province = "CT";
    else if (c === "HẢI PHÒNG" || c === "HAI PHONG") province = "HP";
    else if (c === "TPHCM" || c === "HCM" || c === "HỒ CHÍ MINH") province = "TPHCM";
    else province = getInitials(school.city) || "TPHCM";
  } else {
    const addrLower = (school.address || "").toLowerCase();
    if (addrLower.includes("hà nội") || addrLower.includes("hn")) province = "HN";
    else if (addrLower.includes("đà nẵng") || addrLower.includes("dn")) province = "DN";
    else if (addrLower.includes("bình dương") || addrLower.includes("bd")) province = "BD";
    else if (addrLower.includes("đồng nai")) province = "DNAI";
    else if (addrLower.includes("cần thơ")) province = "CT";
    else if (addrLower.includes("hải phòng")) province = "HP";
  }

  // 5. Chi nhánh: lấy từ branch_num hoặc tìm trong name/code
  let branch = "CN1";
  if (school.branch_num !== undefined && school.branch_num !== null && String(school.branch_num).trim()) {
    const num = String(school.branch_num).replace(/\D/g, "") || "1";
    branch = `CN${num}`;
  } else {
    const branchMatch = (school.name + " " + (school.code || "")).match(/(?:cn|chi\s*nhánh|cơ\s*sở|\-)\s*(\d+)/i);
    if (branchMatch && branchMatch[1]) {
      branch = `CN${parseInt(branchMatch[1], 10)}`;
    }
  }

  // 6. QTV: nếu là admin đầu tiên là QTV1, admin thứ 2 là QTV2...
  const qtvSuffix = `QTV${adminIndex}`;

  return `${type}-${nameInitials}-${streetInitials}-${province}-${branch}-${qtvSuffix}`;
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
