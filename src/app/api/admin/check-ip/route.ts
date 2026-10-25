import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { getClientIp, isIpAllowed } from "@/lib/ipHelper";

export async function GET(req: Request) {
  try {
    await initDb();
    const db = getDb();

    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get("school_id") || "school-default";

    const clientIp = getClientIp(req);

    // Fetch school IP restriction settings
    const schoolRes = await db.execute({
      sql: "SELECT id, name, code, ip_restriction_enabled, allowed_ips FROM schools WHERE id = ? LIMIT 1",
      args: [schoolId],
    });

    if (schoolRes.rows.length === 0) {
      return NextResponse.json({ allowed: true, client_ip: clientIp });
    }

    const school = schoolRes.rows[0];
    const isEnabled = Number(school.ip_restriction_enabled) === 1;
    const allowedIps = String(school.allowed_ips || "");

    if (!isEnabled) {
      // Feature is disabled -> Allowed for all IPs
      return NextResponse.json({
        allowed: true,
        ip_restriction_enabled: false,
        client_ip: clientIp,
        school_name: String(school.name),
      });
    }

    // Feature is enabled -> Check client IP against allowed IPs
    const allowed = isIpAllowed(clientIp, allowedIps);

    if (!allowed) {
      return NextResponse.json({
        allowed: false,
        ip_restriction_enabled: true,
        client_ip: clientIp,
        school_name: String(school.name),
        school_code: String(school.code),
        message: `Web Error: Địa chỉ IP ${clientIp} không được phép truy cập vào trang Quản trị của trường ${school.name}!`,
      });
    }

    return NextResponse.json({
      allowed: true,
      ip_restriction_enabled: true,
      client_ip: clientIp,
      school_name: String(school.name),
    });
  } catch (error: unknown) {
    if ((error as { digest?: string })?.digest === "NEXT_PRERENDER_INTERRUPTED") {
      throw error;
    }
    console.error("Check IP Error:", error);
    return NextResponse.json(
      { allowed: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
