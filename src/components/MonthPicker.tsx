"use client";

import React, { useState, useRef, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { MonthFormat } from "@/lib/types";
import { formatMonthDisplay } from "@/lib/tuition";

interface MonthPickerProps {
  value: string; // "YYYY-MM"
  onChange: (newMonth: string) => void;
  monthFormat?: MonthFormat;
  className?: string;
}

export const MonthPicker: React.FC<MonthPickerProps> = ({
  value,
  onChange,
  monthFormat = "vietnamese",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current year & month from value (e.g. "2026-10")
  const currentYear = value && value.includes("-") ? parseInt(value.split("-")[0], 10) : new Date().getFullYear();
  const currentMonth = value && value.includes("-") ? parseInt(value.split("-")[1], 10) : new Date().getMonth() + 1;

  const [displayYear, setDisplayYear] = useState<number>(currentYear);

  useEffect(() => {
    if (value && value.includes("-")) {
      setDisplayYear(parseInt(value.split("-")[0], 10));
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectMonth = (m: number) => {
    const formattedMonth = String(m).padStart(2, "0");
    onChange(`${displayYear}-${formattedMonth}`);
    setIsOpen(false);
  };

  const getMonthItemLabel = (m: number) => {
    if (monthFormat === "number") {
      return `Tháng ${m}`;
    }
    if (monthFormat === "english") {
      const shortEng = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return shortEng[m - 1];
    }
    return `Tháng ${m}`;
  };

  return (
    <div className={`relative ${className.includes("w-full") ? "w-full" : "inline-block"} ${className}`} ref={containerRef}>
      {/* Display Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:border-indigo-400 hover:bg-white dark:hover:bg-slate-700/80 transition cursor-pointer shadow-2xs ${
          className.includes("w-full") ? "w-full justify-between" : ""
        }`}
      >
        <span className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span className="font-bold text-slate-800 dark:text-slate-200">
            {formatMonthDisplay(value, monthFormat)}
          </span>
        </span>
        <span className="text-[10px] text-slate-400 font-semibold">Thay đổi</span>
      </button>

      {/* Dropdown Calendar Popup */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-3 w-64 animate-in fade-in zoom-in-95 duration-150">
          {/* Year selector header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setDisplayYear((prev) => prev - 1)}
              className="p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Năm trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-black text-sm text-slate-900 dark:text-white">
              {displayYear}
            </span>
            <button
              type="button"
              onClick={() => setDisplayYear((prev) => prev + 1)}
              className="p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Năm sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 12 Months Grid */}
          <div className="grid grid-cols-3 gap-1.5">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
              const isSelected = displayYear === currentYear && m === currentMonth;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleSelectMonth(m)}
                  className={`py-2 px-1.5 text-xs font-bold rounded-xl transition text-center ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-700 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-300"
                  }`}
                >
                  {getMonthItemLabel(m)}
                </button>
              );
            })}
          </div>

          {/* Quick jump to Current Month button */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[11px]">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
                onChange(nowStr);
                setDisplayYear(now.getFullYear());
                setIsOpen(false);
              }}
              className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
            >
              Tháng hiện tại
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
