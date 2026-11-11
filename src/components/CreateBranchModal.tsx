"use client";

import React, { useState } from "react";
import { useToast } from "@/components/Toast";
import {
  Building2,
  X,
  Save,
  Phone,
  MapPin,
  Tag,
  Sparkles,
  AlertCircle,
} from "lucide-react";

interface CreateBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (branch: {
    id: string;
    name: string;
    code: string;
    address?: string;
    phone?: string;
  }) => void;
}

export const CreateBranchModal: React.FC<CreateBranchModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    setName(val);
    // Tự động gợi ý mã code viết tắt nếu người dùng chưa tự sửa code
    if (!code || code.startsWith("CN-") || code.startsWith("TT-")) {
      const words = val.trim().split(/\s+/);
      if (words.length > 0 && words[0]) {
        const initials = words
          .map((w) => w[0]?.toUpperCase() || "")
          .join("")
          .replace(/[^A-Z0-9]/g, "");
        if (initials.length >= 2) {
          setCode(`CN-${initials.slice(0, 4)}`);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("Vui lòng nhập tên chi nhánh mới!", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/admin/branches", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim() || undefined,
          address: address.trim() || undefined,
          phone: phone.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success && data.branch) {
        showToast(data.message || "Tạo chi nhánh mới thành công!", "success");
        onCreated(data.branch);
        setName("");
        setCode("");
        setAddress("");
        setPhone("");
        onClose();
      } else {
        showToast(data.message || "Không thể tạo chi nhánh mới!", "error");
      }
    } catch {
      showToast("Lỗi kết nối máy chủ!", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-50/70 to-purple-50/70 dark:from-indigo-950/40 dark:to-purple-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Thêm Chi Nhánh / Cơ Sở Mới</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                  Đa cơ sở
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Mở rộng mạng lưới chi nhánh, dùng chung tài khoản Admin quản lý tập trung
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Thông báo tính năng dùng chung tài khoản */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/40 flex items-start gap-2.5 text-xs text-indigo-900 dark:text-indigo-200">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold block">Tài khoản Admin dùng chung tiện lợi:</span>
              <p className="text-indigo-800/80 dark:text-indigo-300/80 text-[11px] leading-relaxed">
                Tài khoản Admin hiện tại của bạn sẽ tự động có toàn quyền trên chi nhánh mới này. Bạn có thể chuyển qua lại giữa các chi nhánh ngay trên thanh Menu bất kỳ lúc nào.
              </p>
            </div>
          </div>

          {/* Tên chi nhánh */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Tên chi nhánh / Cơ sở mới *
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="VD: Cơ sở 2 - Tân Bình, Chi Nhánh Quận 7..."
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm font-semibold rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
              />
            </div>
          </div>

          {/* Mã chi nhánh */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Mã định danh chi nhánh (Code)
              </label>
              <span className="text-[10px] text-slate-400">
                Tự động tạo hoặc tùy chỉnh
              </span>
            </div>
            <div className="relative">
              <Tag className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="VD: CN-02, TT-TB, HA-02..."
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm font-black font-mono uppercase rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-indigo-700 dark:text-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
              />
            </div>
          </div>

          {/* Địa chỉ chi nhánh */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Địa chỉ chi nhánh (Tùy chọn)
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="VD: 456 Đường Cộng Hòa, P.13, Q. Tân Bình"
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm font-semibold rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
              />
            </div>
          </div>

          {/* Hotline liên hệ */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Số điện thoại hotline chi nhánh (Tùy chọn)
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="VD: 0908123456"
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm font-mono rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold rounded-xl text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl shadow-md shadow-indigo-600/30 transition disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4 stroke-[2.5]" />
              <span>{isSubmitting ? "Đang tạo chi nhánh..." : "Tạo & Chuyển Sang Chi Nhánh Này"}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
