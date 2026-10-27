import { getDb } from "./db";

export interface RequestAdminContext {
  adminId: string;
  schoolId: string;
}

export function getSchoolIdFromRequest(req: Request): string {
  try {
    const authHeader = req.headers.get("authorization");
    const cookieHeader = req.headers.get("cookie");
    const customHeader = req.headers.get("x-school-id");

    if (customHeader && customHeader.trim()) {
      return customHeader.trim();
    }

    let token = "";
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else if (cookieHeader) {
      const match = cookieHeader.match(/admin_session_token=([^;]+)/);
      if (match) token = match[1];
    }

    if (token) {
      const decoded = Buffer.from(token, "base64").toString("utf-8");
      const parts = decoded.split(":");
      if (parts.length >= 3 && parts[0] === "school_admin" && parts[2]) {
        return parts[2];
      }
    }

    const url = new URL(req.url);
    const querySchoolId = url.searchParams.get("school_id");
    if (querySchoolId && querySchoolId.trim()) {
      return querySchoolId.trim();
    }
  } catch {}

  return "school-default";
}
