import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import unusedImports from "eslint-plugin-unused-imports";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Quy tắc chất lượng của dự án (xem docs/CODE_STANDARDS.md).
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: {
      "unused-imports": unusedImports,
    },
    rules: {
      // Import/biến không dùng: plugin này tự xóa import khi chạy `--fix`.
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "error",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      // Tắt bản gốc để tránh trùng lặp báo cáo.
      "@typescript-eslint/no-unused-vars": "off",
      // Cấm ghi log bằng console trực tiếp — chỉ dùng logger.
      "no-console": "error",
      // Cấm debugger trong mã nguồn.
      "no-debugger": "error",
      // Cấm khối catch rỗng không giải thích.
      "no-empty": ["error", { allowEmptyCatch: false }],
    },
  },

  // Ngoại lệ duy nhất: module logger được phép dùng console.
  {
    files: ["src/lib/logger.ts"],
    rules: {
      "no-console": "off",
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },

  // Script vận hành chạy bằng Node CLI được phép dùng console.
  {
    files: ["scripts/**/*.{js,cjs,mjs}"],
    rules: {
      "no-console": "off",
    },
  },

  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Test & script vận hành không thuộc phạm vi lint của src.
    "tests/**",
    "scripts/**",
  ]),
]);

export default eslintConfig;
