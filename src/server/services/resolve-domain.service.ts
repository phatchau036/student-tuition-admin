/**
 * resolve-domain.service.ts - Tang nghiep vu & truy cap du lieu cho endpoint tuong ung.
 *
 * Toan bo truy van SQL cua endpoint nam tai day. Cac file route handler
 * chi con lop chuyen tiep mong (nhan Request -> goi handler -> tra Response).
 *
 * Tu dong tach tu route handler trong Giai doan 2.
 */
import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { resolveSchoolIdByHost } from "@/lib/authHelper";
import { getErrorMessage } from "@/lib/errors";

// GET /api/resolve-domain - Xác định cơ sở dựa trên Tên Miền (Host) truy cập
export async function handleResolveDomainGet(req: Request) {
  try {
    await initDb();
    const db = getDb();

    // 1. Lấy Host từ Header (Hỗ trợ cả X-Forwarded-Host khi đứng sau Nginx/Cloudflare)
    const forwardedHost = req.headers.get("x-forwarded-host");
    const rawHost = forwardedHost || req.headers.get("host") || "";
    const cleanHost = rawHost.split(":")[0].toLowerCase().trim();

    if (
      !cleanHost ||
      cleanHost === "localhost" ||
      cleanHost === "127.0.0.1" ||
      cleanHost === "::1"
    ) {
      return NextResponse.json({
        success: true,
        matched: false,
        host: cleanHost,
        school: null,
      });
    }

    // 2. Tìm schoolId thông qua hàm resolveSchoolIdByHost (có cache)
    const schoolId = await resolveSchoolIdByHost(cleanHost);

    if (schoolId) {
      const schoolRes = await db.execute({
        sql: "SELECT id, name, code, domain, subdomain, address, phone FROM schools WHERE id = ? LIMIT 1",
        args: [schoolId],
      });

      if (schoolRes.rows.length > 0) {
        return NextResponse.json({
          success: true,
          matched: true,
          host: cleanHost,
          school: schoolRes.rows[0],
        });
      }
    }

    return NextResponse.json({
      success: true,
      matched: false,
      host: cleanHost,
      school: null,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, message: getErrorMessage(error) || "Lỗi khi phân giải tên miền" },
      { status: 500 }
    );
  }
}
