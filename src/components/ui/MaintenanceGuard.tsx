"use client";

import React, { useEffect, useState } from "react";
import MaintenancePage from "@/app/maintenance/page";

export function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const [isMaintenance, setIsMaintenance] = useState(false);

  useEffect(() => {
    // Không áp dụng cho đường dẫn /he-thong (dành cho chủ hệ thống quản lý)
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      if (path.startsWith("/he-thong") || path.startsWith("/api/system")) {
        return;
      }
    }

    const checkMaintenance = async () => {
      try {
        const res = await fetch("/api/system/upgrade/status");
        const json = await res.json();
        if (json.maintenance === true) {
          setIsMaintenance(true);
        } else {
          setIsMaintenance(false);
        }
      } catch {
        // Có thể server đang restart, tiếp tục theo dõi
      }
    };

    checkMaintenance();
    const interval = setInterval(checkMaintenance, 3000);
    return () => clearInterval(interval);
  }, []);

  if (isMaintenance) {
    return <MaintenancePage />;
  }

  return <>{children}</>;
}
