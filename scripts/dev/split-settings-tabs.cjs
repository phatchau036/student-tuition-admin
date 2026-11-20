/**
 * Script một lần: tách 4 tab còn lại của SettingsModal ra component riêng.
 * Xóa sau khi hoàn tất.
 */
const fs = require("fs");

const FILE = "src/features/settings/components/SettingsModal.tsx";
const lines = fs.readFileSync(FILE, "utf8").split("\n");

// 1-based ranges (đã xác định)
const tabs = [
  {
    key: "slots",
    name: "SlotsTab",
    start: 2744,
    end: 2908,
    propsType: `interface SlotsTabProps {
  timeSlots: TimeSlot[];
  weekdays: string[];
  formatLabel: (slot: TimeSlot) => string;
  onAdd: () => void;
  onUpdate: (index: number, field: keyof TimeSlot, value: string | number) => void;
  onRemove: (index: number) => void;
}`,
    propsList: "{ timeSlots, weekdays, formatLabel, onAdd, onUpdate, onRemove }",
    destructure: `export function SlotsTab({ timeSlots, weekdays, formatLabel, onAdd, onUpdate, onRemove }: SlotsTabProps)`,
  },
  {
    key: "levels",
    name: "LevelsTab",
    start: 2909,
    end: 3045,
    propsType: `interface LevelsTabProps {
  levels: LevelSurcharge[];
  onAdd: () => void;
  onUpdate: (index: number, field: keyof LevelSurcharge, value: string | number) => void;
  onRemove: (index: number) => void;
}`,
    propsList: "{ levels, onAdd, onUpdate, onRemove }",
    destructure: `export function LevelsTab({ levels, onAdd, onUpdate, onRemove }: LevelsTabProps)`,
  },
  {
    key: "discounts",
    name: "DiscountsTab",
    start: 3046,
    end: 3126,
    propsType: `interface DiscountsTabProps {
  discounts: DiscountOption[];
  onAdd: () => void;
  onUpdate: (index: number, field: "percentage" | "label", value: string | number) => void;
  onRemove: (index: number) => void;
}`,
    propsList: "{ discounts, onAdd, onUpdate, onRemove }",
    destructure: `export function DiscountsTab({ discounts, onAdd, onUpdate, onRemove }: DiscountsTabProps)`,
  },
  {
    key: "password",
    name: "PasswordTab",
    start: 3127,
    end: 3305,
    propsType: `interface PasswordTabProps {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  isChangingPassword: boolean;
  onCurrentPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}`,
    propsList:
      "{ currentPassword, newPassword, confirmPassword, isChangingPassword, onCurrentPasswordChange, onNewPasswordChange, onConfirmPasswordChange, onSubmit }",
    destructure: `export function PasswordTab({ currentPassword, newPassword, confirmPassword, isChangingPassword, onCurrentPasswordChange, onNewPasswordChange, onConfirmPasswordChange, onSubmit }: PasswordTabProps)`,
  },
];

// Trích nội dung JSX bên trong `{activeTab === "x" && ( ... )}`.
function extract(range) {
  const body = lines.slice(range.start - 1, range.end); // từ dòng `{activeTab...` tới trước tab kế tiếp
  // bỏ dòng đầu `{activeTab === "x" && (` và dòng cuối `)}`
  const startIdx = body.findIndex((l) => l.includes("{activeTab ==="));
  const endIdx = body.length - 1;
  // body[startIdx] là `{activeTab...`; nội dung JSX bắt đầu dòng sau
  let inner = body.slice(startIdx + 1, endIdx);
  // bỏ các dòng đóng `)}` còn sót ở cuối
  while (inner.length && inner[inner.length - 1].trim() === "") inner.pop();
  // tìm `)}` đóng cuối
  let closeIdx = -1;
  for (let i = inner.length - 1; i >= 0; i--) {
    if (inner[i].trim() === ")}") {
      closeIdx = i;
      break;
    }
  }
  if (closeIdx >= 0) inner = inner.slice(0, closeIdx);
  return inner.join("\n");
}

// Map tên handler cũ -> prop mới trong từng tab
const handlerMap = {
  slots: {
    "handleAddTimeSlot": "onAdd",
    "handleUpdateTimeSlot": "onUpdate",
    "handleRemoveTimeSlot": "onRemove",
    "WEEKDAYS": "weekdays",
    "formatTimeSlotLabel": "formatLabel",
  },
  levels: {
    "handleAddLevel": "onAdd",
    "handleUpdateLevel": "onUpdate",
    "handleRemoveLevel": "onRemove",
  },
  discounts: {
    "handleAddDiscount": "onAdd",
    "handleUpdateDiscount": "onUpdate",
    "handleRemoveDiscount": "onRemove",
  },
  password: {
    "handleChangePassword": "onSubmit",
    "setCurrentPassword": "onCurrentPasswordChange",
    "setNewPassword": "onNewPasswordChange",
    "setConfirmPassword": "onConfirmPasswordChange",
  },
};

const importByTab = {
  slots: `import type { TimeSlot } from "@/lib/types";`,
  levels: `import type { LevelSurcharge } from "@/lib/types";`,
  discounts: `import type { DiscountOption } from "@/lib/types";`,
  password: `import type React from "react";`,
};

for (const tab of tabs) {
  let content = extract(tab);
  for (const [oldName, newName] of Object.entries(handlerMap[tab.key])) {
    content = content.replace(new RegExp(`\\b${oldName}\\b`, "g"), newName);
  }

  const header = `"use client";

${importByTab[tab.key]}

${tab.propsType}

/**
 * Tab cấu hình "${tab.key}" của SettingsModal — tách ra trong Giai đoạn 2.
 */
${tab.destructure} {
  return (
`;
  const footer = `  );
}
`;
  fs.mkdirSync("src/features/settings/components/tabs", { recursive: true });
  fs.writeFileSync(`src/features/settings/components/tabs/${tab.name}.tsx`, header + content + "\n" + footer);
  console.log("Đã tạo", tab.name);
}
