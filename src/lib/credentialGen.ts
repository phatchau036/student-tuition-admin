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
    address?: string;
  },
  adminIndex: number = 1
): string {
  // 1. Loại cơ sở: "TT" (Trung tâm) hoặc "TH" (Trường học)
  const isSchool = school.name.toLowerCase().includes("trường");
  const type = isSchool ? "TH" : "TT";

  // 2. Tên trung tâm: lấy tên sau "Trung tâm" hoặc "Trường"
  let cleanName = school.name.replace(/^(trung\s*tâm|trường|cơ\s*sở)\s*/i, "").trim();
  const nameInitials = getInitials(cleanName) || getInitials(school.name) || "NAME";

  // 3. Tên đường: tách từ địa chỉ (VD: "Hiền Vương" -> "HV", "123 Đường Sáng Tạo" -> "ST")
  let streetInitials = "HV";
  if (school.address && school.address.trim()) {
    const addr = school.address.trim();
    const streetMatch = addr.match(/đường\s+([^,]+)/i);
    if (streetMatch && streetMatch[1]) {
      streetInitials = getInitials(streetMatch[1]);
    } else {
      const firstPart = addr.split(",")[0].replace(/^[\d\s\/\-A-Za-z]+/, "").trim();
      streetInitials = getInitials(firstPart) || getInitials(addr) || "LOC";
    }
  }

  // 4. Tỉnh thành: phát hiện từ địa chỉ
  let province = "TPHCM";
  const addrLower = (school.address || "").toLowerCase();
  if (addrLower.includes("hà nội") || addrLower.includes("hn")) province = "HN";
  else if (addrLower.includes("đà nẵng") || addrLower.includes("dn")) province = "DN";
  else if (addrLower.includes("bình dương") || addrLower.includes("bd")) province = "BD";
  else if (addrLower.includes("đồng nai")) province = "DNAI";
  else if (addrLower.includes("cần thơ")) province = "CT";
  else if (addrLower.includes("hải phòng")) province = "HP";

  // 5. Chi nhánh: phát hiện từ code hoặc name (VD: "TT-01" -> "CN1", "Chi nhánh 2" -> "CN2")
  let branch = "CN1";
  const branchMatch = (school.name + " " + (school.code || "")).match(/(?:cn|chi\s*nhánh|cơ\s*sở|\-)\s*(\d+)/i);
  if (branchMatch && branchMatch[1]) {
    branch = `CN${parseInt(branchMatch[1], 10)}`;
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
