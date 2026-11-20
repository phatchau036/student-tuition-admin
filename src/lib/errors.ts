/** Tiện ích xử lý lỗi an toàn về kiểu. */

/** Lấy thông điệp từ một giá trị `unknown` bắt được trong `catch`. */
export function getErrorMessage(error: unknown, fallback = "Lỗi không xác định"): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}
