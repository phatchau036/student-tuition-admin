import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

// Helper: Tính toán tháng kết thúc từ chu kỳ
function computeEndMonth(startMonth: string, cycleMonths: number): string {
  if (!startMonth || !startMonth.includes("-")) return startMonth;
  const [yearStr, monthStr] = startMonth.split("-");
  let y = parseInt(yearStr, 10);
  let m = parseInt(monthStr, 10);

  const totalMonths = m + (cycleMonths - 1);
  m = ((totalMonths - 1) % 12) + 1;
  y += Math.floor((totalMonths - 1) / 12);

  return `${y}-${String(m).padStart(2, "0")}`;
}

// Xử lý POST Webhook từ SePay Platform
export async function POST(req: Request) {
  try {
    await initDb();
    const db = getDb();

    // 1. Kiểm tra xác thực API Key từ SePay header (Authorization: Apikey API_KEY_CUA_BAN)
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    
    // Lấy cấu hình SePay từ database
    const settingsRes = await db.execute("SELECT key, value FROM settings WHERE key IN ('sepay_api_key', 'sepay_prefix', 'reconciliation_mode')");
    let configuredApiKey = "";
    let sepayPrefix = "HP";
    let reconciliationMode = "auto";

    for (const row of settingsRes.rows) {
      if (row.key === "sepay_api_key") configuredApiKey = String(row.value || "").trim();
      if (row.key === "sepay_prefix") sepayPrefix = String(row.value || "HP").trim().toUpperCase();
      if (row.key === "reconciliation_mode") reconciliationMode = String(row.value || "auto");
    }

    // Nếu hệ thống đã set API Key, kiểm tra khớp header
    if (configuredApiKey) {
      const expectedBearer = `Apikey ${configuredApiKey}`.toLowerCase();
      const currentAuth = authHeader.trim().toLowerCase();
      if (!currentAuth.includes(configuredApiKey.toLowerCase()) && currentAuth !== expectedBearer) {
        return NextResponse.json(
          { success: false, message: "Xác thực API Key SePay không hợp lệ!" },
          { status: 401 }
        );
      }
    }

    const body = await req.json();
    /*
      Cấu trúc payload từ SePay:
      {
        "id": 92704,
        "gateway": "Vietcombank",
        "transactionDate": "2024-07-02 11:08:33",
        "accountNumber": "1017588888",
        "subAccount": "",
        "code": "SEVN63DC8E5C",
        "content": "SEVN63DC8E5C HP HS1234 T10 chuyen tien",
        "transferType": "in",
        "description": "...",
        "transferAmount": 1500000,
        "accumulated": 105000000,
        "referenceCode": "FT24012345678"
      }
    */
    const {
      id: sepayTxId,
      gateway,
      transactionDate,
      accountNumber,
      subAccount,
      code,
      content = "",
      transferType = "in",
      transferAmount = 0,
      referenceCode,
    } = body;

    // Chỉ xử lý giao dịch tiền vào (transferType: 'in')
    if (transferType !== "in" || Number(transferAmount) <= 0) {
      return NextResponse.json({
        success: true,
        message: "Bỏ qua giao dịch không phải tiền vào (transferType != in)",
      });
    }

    const txIdStr = String(sepayTxId || `sepay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
    const cleanContent = String(content || "").trim();

    // 2. Tìm học sinh phù hợp dựa trên nội dung chuyển khoản
    // Chiến lược đối soát thông minh:
    // a. Khớp qua Student Code (VD: HS1234, HS01, ...)
    // b. Khớp qua Số Điện Thoại của học sinh (VD: 0901234567)
    // c. Khớp qua Tên học sinh không dấu
    const studentsRes = await db.execute(`
      SELECT s.*, p.name as package_name, p.amount as package_amount, p.cycle_unit, p.cycle_value
      FROM students s
      LEFT JOIN tuition_packages p ON s.tuition_package_id = p.id
    `);

    let matchedStudent: any = null;
    let matchedPeriod: string = new Date().toISOString().slice(0, 7); // Mặc định tháng hiện tại YYYY-MM

    // Trích xuất tháng từ nội dung nếu có (VD: T10, T10/2026, 10/2026, THANG10)
    const monthRegex = /(?:T|THANG|THÁNG)\s*(\d{1,2})(?:\/(\d{4}))?/i;
    const monthMatch = cleanContent.match(monthRegex);
    if (monthMatch) {
      const m = parseInt(monthMatch[1], 10);
      const y = monthMatch[2] ? parseInt(monthMatch[2], 10) : new Date().getFullYear();
      if (m >= 1 && m <= 12) {
        matchedPeriod = `${y}-${String(m).padStart(2, "0")}`;
      }
    }

    const upperContent = cleanContent.toUpperCase();

    // Tìm kiếm học sinh
    for (const st of studentsRes.rows) {
      const code = String(st.student_code || "").toUpperCase();
      const phone = String(st.phone || "").replace(/\D/g, "");
      const cleanPhone = phone.startsWith("0") ? phone.slice(1) : phone;

      // 1. Khớp mã học sinh (nếu mã học sinh có trong nội dung)
      if (code && upperContent.includes(code)) {
        matchedStudent = st;
        break;
      }

      // 2. Khớp số điện thoại
      if (phone.length >= 9 && (cleanContent.includes(phone) || cleanContent.includes(cleanPhone))) {
        matchedStudent = st;
        break;
      }
    }

    // Nếu chưa tìm thấy bằng code hoặc phone, thử tìm theo ID học sinh (4 ký tự cuối)
    if (!matchedStudent) {
      for (const st of studentsRes.rows) {
        const idTail = String(st.id).slice(-4).toUpperCase();
        if (upperContent.includes(`HS${idTail}`) || upperContent.includes(idTail)) {
          matchedStudent = st;
          break;
        }
      }
    }

    // 3. Ghi nhận giao dịch SePay vào bảng sepay_transactions
    const txStatus = matchedStudent ? "matched" : "unmatched";
    await db.execute({
      sql: `INSERT INTO sepay_transactions (
              id, gateway, transaction_date, account_number, sub_account, code,
              content, transfer_type, transfer_amount, reference_code,
              student_id, student_name, matched_period, status, raw_payload
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              status = excluded.status,
              student_id = excluded.student_id,
              student_name = excluded.student_name,
              matched_period = excluded.matched_period`,
      args: [
        txIdStr,
        gateway || "Ngân hàng",
        transactionDate || new Date().toISOString().slice(0, 19).replace("T", " "),
        accountNumber || "",
        subAccount || "",
        code || "",
        cleanContent,
        transferType,
        Number(transferAmount),
        referenceCode || "",
        matchedStudent ? matchedStudent.id : null,
        matchedStudent ? matchedStudent.name : null,
        matchedPeriod,
        txStatus,
        JSON.stringify(body),
      ],
    });

    // 4. Nếu tìm thấy học sinh, tự động tạo thanh toán và đánh dấu ĐÃ ĐÓNG (Paid)
    if (matchedStudent) {
      let cycleMonths = 1;
      let packageName = matchedStudent.package_name || "Gói chuẩn cơ sở";
      let targetPackageId = matchedStudent.tuition_package_id || null;

      if (matchedStudent.cycle_unit === "week") {
        cycleMonths = Math.max(1, Math.round(Number(matchedStudent.cycle_value || 4) / 4));
      } else if (matchedStudent.cycle_value) {
        cycleMonths = Math.max(1, Number(matchedStudent.cycle_value));
      }

      const startPeriod = matchedPeriod;
      const endPeriod = computeEndMonth(startPeriod, cycleMonths);
      const todayStr = new Date().toISOString().slice(0, 10);
      const paymentId = `pay-sepay-${Date.now()}`;

      // Xóa thanh toán cũ cùng kỳ nếu có để cập nhật
      await db.execute({
        sql: "DELETE FROM student_payments WHERE student_id = ? AND start_period = ?",
        args: [matchedStudent.id, startPeriod],
      });

      // Tạo bản ghi thanh toán hoàn tất
      await db.execute({
        sql: `INSERT INTO student_payments (
                id, student_id, package_id, package_name, amount, paid_date, start_period, end_period, status, note
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?)`,
        args: [
          paymentId,
          matchedStudent.id,
          targetPackageId,
          packageName,
          Number(transferAmount),
          todayStr,
          startPeriod,
          endPeriod,
          `Tự động đối soát qua SePay (${gateway} - Mã GD: ${referenceCode || code || txIdStr})`,
        ],
      });

      return NextResponse.json({
        success: true,
        message: `Đã đối soát thành công cho học sinh ${matchedStudent.name} (${startPeriod} đến ${endPeriod})!`,
        matched_student: {
          id: matchedStudent.id,
          name: matchedStudent.name,
          phone: matchedStudent.phone,
          period: `${startPeriod} - ${endPeriod}`,
          amount: transferAmount,
        },
      });
    }

    // Trường hợp không tự động khớp được học sinh (lưu lại giao dịch để admin gán thủ công)
    return NextResponse.json({
      success: true,
      message: "Giao dịch SePay đã được ghi nhận nhưng chưa khớp tự động với học sinh nào.",
      tx_id: txIdStr,
    });
  } catch (error: unknown) {
    console.error("SePay Webhook Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
