/**
 * types.ts — Barrel re-export toàn bộ kiểu dữ liệu domain.
 *
 * Nguồn sự thật nằm trong `src/types/`. File này giữ lại để tương thích
 * với các import cũ `@/lib/types`. Code mới nên import trực tiếp từ `@/types/<domain>`.
 */
export * from "@/types/common";
export * from "@/types/school";
export * from "@/types/catalog";
export * from "@/types/student";
export * from "@/types/teacher";
export * from "@/types/class";
export * from "@/types/finance";
export * from "@/types/feedback";
export * from "@/types/lesson";
