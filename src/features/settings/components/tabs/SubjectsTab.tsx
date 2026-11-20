"use client";

import type { FormEvent } from "react";
import { BookOpen, Plus, Trash2 } from "lucide-react";
import type { Subject } from "@/lib/types";

interface SubjectsTabProps {
  subjects: Subject[];
  newSubjectName: string;
  newSubjectColor: string;
  isAddingSubject: boolean;
  onNewSubjectNameChange: (value: string) => void;
  onNewSubjectColorChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDelete: (id: string) => void;
}

/** Tab quản lý danh mục bộ môn / chương trình học. */
export function SubjectsTab({
  subjects,
  newSubjectName,
  newSubjectColor,
  isAddingSubject,
  onNewSubjectNameChange,
  onNewSubjectColorChange,
  onSubmit,
  onDelete,
}: SubjectsTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <span>Danh Mục Bộ Môn / Chương Trình Học</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tự do thiết lập các môn học phù hợp với ngành đào tạo của trung tâm (Âm nhạc, Ngoại ngữ,
            Dạy thêm, Năng khiếu...)
          </p>
        </div>
      </div>

      {/* Form thêm môn học mới */}
      <form
        onSubmit={onSubmit}
        className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 space-y-3"
      >
        <span className="text-xs font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-300 block">
          Thêm Môn Học Mới:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          <div className="sm:col-span-2">
            <input
              type="text"
              required
              placeholder="Tên môn (VD: Piano, IELTS, Toán 10, Vẽ...)"
              value={newSubjectName}
              onChange={(e) => onNewSubjectNameChange(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <select
              value={newSubjectColor}
              onChange={(e) => onNewSubjectColorChange(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
            >
              <option value="indigo">Màu Xanh Indigo</option>
              <option value="purple">Màu Tím Purple</option>
              <option value="emerald">Màu Xanh Lá Emerald</option>
              <option value="amber">Màu Cam Amber</option>
              <option value="rose">Màu Đỏ Rose</option>
              <option value="sky">Màu Xanh Biển Sky</option>
            </select>
          </div>
          <div>
            <button
              type="submit"
              disabled={isAddingSubject}
              className="w-full py-2 px-3 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAddingSubject ? "Đang thêm..." : "Thêm Môn"}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Danh sách các môn hiện có */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {subjects.map((sub) => (
          <div
            key={sub.id}
            className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3 hover:border-slate-300 transition"
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shrink-0 ${
                  sub.color === "purple"
                    ? "bg-purple-600 shadow-purple-600/30"
                    : sub.color === "emerald"
                      ? "bg-emerald-600 shadow-emerald-600/30"
                      : sub.color === "amber"
                        ? "bg-amber-600 shadow-amber-600/30"
                        : sub.color === "rose"
                          ? "bg-rose-600 shadow-rose-600/30"
                          : sub.color === "sky"
                            ? "bg-sky-600 shadow-sky-600/30"
                            : "bg-indigo-600 shadow-indigo-600/30"
                } shadow-sm`}
              >
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                  {sub.name}
                </h4>
                <span className="text-[10px] text-slate-400">
                  {sub.description || "Môn học cơ sở"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onDelete(sub.id)}
              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
              title="Xóa môn học này"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {subjects.length === 0 && (
        <div className="py-12 text-center text-xs text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
          <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p>Chưa có môn học nào. Hãy thêm các môn đào tạo ở form trên!</p>
        </div>
      )}
    </div>
  );
}
