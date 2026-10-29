import { NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { getPreviousMonthStr, getNextMonthStr, applyDiscount } from "@/lib/tuition";
import { grantCycleForPayment } from "@/lib/wallet";

// Helper: cấp giờ vào Ví Giờ Học cho toàn bộ chu kỳ tháng đã đóng (idempotent, lỗi không chặn thanh toán)
async function grantHoursForPeriod(studentId: string, startPeriod: string, endPeriod: string) {
  try {
    let cursor = startPeriod;
    let safety = 0;
    const results: any[] = [];
    while (safety < 24) {
      const r = await grantCycleForPayment({
        studentId,
        cycleMonth: cursor,
        createdBy: "payment",
      });
      results.push({ cycle: cursor, ...r });
      if (cursor === endPeriod) break;
      cursor = getNextMonthStr(cursor);
      safety++;
    }
    return results;
  } catch (err) {
    console.error("grantHoursForPeriod Error (không chặn thanh toán):", err);
    return [];
  }
}

// Helper: tính toán tháng kết thúc từ tháng bắt đầu và số tháng chu kỳ
// Ví dụ: addMonthsToPeriod("2026-10", 3) => "2026-12" (10, 11, 12 là 3 tháng)
function computeEndMonth(startMonth: string, cycleMonths: number): string {
  if (!startMonth || !startMonth.includes("-")) return startMonth;
  const [yearStr, monthStr] = startMonth.split("-");
  let y = parseInt(yearStr, 10);
  let m = parseInt(monthStr, 10);

  // Cộng thêm (cycleMonths - 1) tháng
  const totalMonths = m + (cycleMonths - 1);
  m = ((totalMonths - 1) % 12) + 1;
  y += Math.floor((totalMonths - 1) / 12);

  return `${y}-${String(m).padStart(2, "0")}`;
}

// GET /api/payments?student_id=... Lấy danh sách các kỳ thanh toán của học sinh
export async function GET(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const url = new URL(req.url);
    const studentId = url.searchParams.get("student_id");

    if (!studentId) {
      return NextResponse.json({ success: false, message: "Thiếu mã học sinh!" }, { status: 400 });
    }

    const res = await db.execute({
      sql: "SELECT * FROM student_payments WHERE student_id = ? ORDER BY start_period DESC, created_at DESC",
      args: [studentId],
    });

    const payments = res.rows.map((row) => ({
      id: String(row.id),
      student_id: String(row.student_id),
      package_id: String(row.package_id || ""),
      package_name: String(row.package_name || ""),
      amount: Number(row.amount),
      paid_date: String(row.paid_date),
      start_period: String(row.start_period),
      end_period: String(row.end_period),
      status: String(row.status) as "paid" | "unpaid",
      note: String(row.note || ""),
      created_at: String(row.created_at || ""),
    }));

    return NextResponse.json({ success: true, data: payments });
  } catch (error: unknown) {
    console.error("Payments GET Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await initDb();
    const db = getDb();
    const body = await req.json();
    const { action, student_id, month, package_id, amount, note } = body;

    if (!student_id) {
      return NextResponse.json({ success: false, message: "Thiếu thông tin học sinh!" }, { status: 400 });
    }

    const currentMonth = month || new Date().toISOString().slice(0, 7);

    // 1. ĐỐI SOÁT: ĐÁNH DẤU ĐÃ ĐÓNG (Paid)
    if (action === "mark_paid") {
      let cycleMonths = 1;
      let packageName = "Gói 1 Tháng (Chuẩn)";
      let paymentAmount = Number(amount) || 1000000;
      let targetPackageId = package_id || null;

      // Nếu có chọn gói học phí cụ thể
      if (package_id) {
        const pkgRes = await db.execute({
          sql: "SELECT * FROM tuition_packages WHERE id = ?",
          args: [package_id],
        });
        if (pkgRes.rows.length > 0) {
          const pkg = pkgRes.rows[0];
          packageName = String(pkg.name);
          targetPackageId = String(pkg.id);
          paymentAmount = amount !== undefined ? Number(amount) : Number(pkg.amount);

          if (pkg.cycle_unit === "week") {
            // Quy đổi tuần sang tháng: 4 tuần ~ 1 tháng
            cycleMonths = Math.max(1, Math.round(Number(pkg.cycle_value) / 4));
          } else {
            cycleMonths = Math.max(1, Number(pkg.cycle_value));
          }
        }
      } else {
        // Kiểm tra xem học sinh có được gán gói mặc định không
        const stRes = await db.execute({
          sql: `SELECT s.tuition_package_id, s.is_discount_enabled, s.discount_percent, p.name as package_name, p.amount as package_amount, p.cycle_unit, p.cycle_value 
                FROM students s 
                LEFT JOIN tuition_packages p ON s.tuition_package_id = p.id 
                WHERE s.id = ?`,
          args: [student_id],
        });
        if (stRes.rows.length > 0 && stRes.rows[0].tuition_package_id) {
          const stPkg = stRes.rows[0];
          targetPackageId = String(stPkg.tuition_package_id);
          packageName = String(stPkg.package_name || "Gói học phí");
          const discountedPkgAmount = applyDiscount(
            Number(stPkg.package_amount || 0),
            Number(stPkg.is_discount_enabled || 0),
            Number(stPkg.discount_percent || 0)
          );
          paymentAmount = amount !== undefined ? Number(amount) : discountedPkgAmount;
          if (stPkg.cycle_unit === "week") {
            cycleMonths = Math.max(1, Math.round(Number(stPkg.cycle_value) / 4));
          } else {
            cycleMonths = Math.max(1, Number(stPkg.cycle_value));
          }
        }
      }

      const startPeriod = currentMonth;
      const endPeriod = computeEndMonth(startPeriod, cycleMonths);
      const todayStr = new Date().toISOString().slice(0, 10);
      const paymentId = `pay-${Date.now()}`;

      // Xóa các thanh toán trùng kỳ nếu có
      await db.execute({
        sql: `DELETE FROM student_payments 
              WHERE student_id = ? AND start_period = ?`,
        args: [student_id, startPeriod],
      });

      // Ghi nhận bản ghi thanh toán mới
      await db.execute({
        sql: `INSERT INTO student_payments (id, student_id, package_id, package_name, amount, paid_date, start_period, end_period, status, note)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?)`,
        args: [paymentId, student_id, targetPackageId, packageName, paymentAmount, todayStr, startPeriod, endPeriod, note || ""],
      });

      // ⭐ VÍ GIỜ HỌC: Cấp giờ vào ví cho toàn bộ chu kỳ tháng đã đóng (idempotent)
      await grantHoursForPeriod(student_id, startPeriod, endPeriod);

      const periodDesc = cycleMonths > 1 ? `${startPeriod} đến ${endPeriod}` : `Tháng ${startPeriod}`;
      return NextResponse.json({
        success: true,
        message: `Đã xác nhận thanh toán thành công cho ${periodDesc}!`,
        data: {
          payment_id: paymentId,
          start_period: startPeriod,
          end_period: endPeriod,
          package_name: packageName,
        },
      });
    }

    // 2. ĐỐI SOÁT: ĐÁNH DẤU CHƯA ĐÓNG / HỦY ĐỐI SOÁT (Unpaid)
    if (action === "mark_unpaid") {
      // Tìm các bản ghi thanh toán đang bao phủ currentMonth
      const activePaymentsRes = await db.execute({
        sql: `SELECT * FROM student_payments 
              WHERE student_id = ? AND ? >= start_period AND ? <= end_period AND status = 'paid'`,
        args: [student_id, currentMonth, currentMonth],
      });

      for (const pay of activePaymentsRes.rows) {
        const sp = String(pay.start_period);
        const ep = String(pay.end_period);

        if (sp === ep) {
          // Gói đơn 1 tháng: Xóa bản ghi này
          await db.execute({
            sql: "DELETE FROM student_payments WHERE id = ?",
            args: [pay.id],
          });
        } else if (currentMonth === sp) {
          // Hủy tháng đầu tiên của gói: co ngắn gói lại bắt đầu từ tháng kế tiếp
          const nextStart = getNextMonthStr(currentMonth);
          if (nextStart <= ep) {
            await db.execute({
              sql: "UPDATE student_payments SET start_period = ? WHERE id = ?",
              args: [nextStart, pay.id],
            });
          } else {
            await db.execute({
              sql: "DELETE FROM student_payments WHERE id = ?",
              args: [pay.id],
            });
          }
        } else if (currentMonth === ep) {
          // Hủy tháng cuối cùng của gói: co ngắn gói lại kết thúc tại tháng trước
          const prevEnd = getPreviousMonthStr(currentMonth);
          if (prevEnd >= sp) {
            await db.execute({
              sql: "UPDATE student_payments SET end_period = ? WHERE id = ?",
              args: [prevEnd, pay.id],
            });
          } else {
            await db.execute({
              sql: "DELETE FROM student_payments WHERE id = ?",
              args: [pay.id],
            });
          }
        } else {
          // Tháng bị hủy nằm ở giữa chu kỳ: bảo lưu tháng cũ từ sp -> prevMonth, tách tháng mới từ nextMonth -> ep
          const prevEnd = getPreviousMonthStr(currentMonth);
          const nextStart = getNextMonthStr(currentMonth);

          // Cập nhật nửa đầu (các tháng cũ đã đóng giữ nguyên)
          await db.execute({
            sql: "UPDATE student_payments SET end_period = ? WHERE id = ?",
            args: [prevEnd, pay.id],
          });

          // Tách nửa sau nếu còn tháng hiệu lực
          if (nextStart <= ep) {
            const splitId = `pay-split-${Date.now()}`;
            await db.execute({
              sql: `INSERT INTO student_payments (id, student_id, package_id, package_name, amount, paid_date, start_period, end_period, status, note)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?)`,
              args: [
                splitId,
                pay.student_id,
                pay.package_id,
                pay.package_name,
                pay.amount,
                pay.paid_date,
                nextStart,
                ep,
                pay.note || "Bảo lưu các tháng khác sau khi hủy đối soát tháng giữa",
              ],
            });
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: `Đã chuyển trạng thái tháng ${currentMonth} thành "Cần đóng tiền" (các tháng trước vẫn được bảo lưu)!`,
      });
    }

    // 3. ĐỐI SOÁT CHUẨN XÁC: SET TRẠNG THÁI CHO NHIỀU THÁNG CỤ THỂ
    if (action === "set_months_status") {
      const { paid_months, unpaid_months } = body; // Mảng các tháng dạng ["2026-09", "2026-10", "2026-11"]
      
      // Xử lý các tháng được đánh dấu Cần đóng tiền (unpaid)
      if (Array.isArray(unpaid_months)) {
        for (const unMonth of unpaid_months) {
          const activePaymentsRes = await db.execute({
            sql: `SELECT * FROM student_payments 
                  WHERE student_id = ? AND ? >= start_period AND ? <= end_period AND status = 'paid'`,
            args: [student_id, unMonth, unMonth],
          });

          for (const pay of activePaymentsRes.rows) {
            const sp = String(pay.start_period);
            const ep = String(pay.end_period);

            if (sp === ep) {
              await db.execute({ sql: "DELETE FROM student_payments WHERE id = ?", args: [pay.id] });
            } else if (unMonth === sp) {
              const nextStart = getNextMonthStr(unMonth);
              if (nextStart <= ep) {
                await db.execute({ sql: "UPDATE student_payments SET start_period = ? WHERE id = ?", args: [nextStart, pay.id] });
              } else {
                await db.execute({ sql: "DELETE FROM student_payments WHERE id = ?", args: [pay.id] });
              }
            } else if (unMonth === ep) {
              const prevEnd = getPreviousMonthStr(unMonth);
              if (prevEnd >= sp) {
                await db.execute({ sql: "UPDATE student_payments SET end_period = ? WHERE id = ?", args: [prevEnd, pay.id] });
              } else {
                await db.execute({ sql: "DELETE FROM student_payments WHERE id = ?", args: [pay.id] });
              }
            } else {
              const prevEnd = getPreviousMonthStr(unMonth);
              const nextStart = getNextMonthStr(unMonth);
              await db.execute({ sql: "UPDATE student_payments SET end_period = ? WHERE id = ?", args: [prevEnd, pay.id] });
              if (nextStart <= ep) {
                const splitId = `pay-split-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
                await db.execute({
                  sql: `INSERT INTO student_payments (id, student_id, package_id, package_name, amount, paid_date, start_period, end_period, status, note)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?)`,
                  args: [splitId, pay.student_id, pay.package_id, pay.package_name, pay.amount, pay.paid_date, nextStart, ep, pay.note || ""],
                });
              }
            }
          }
        }
      }

      // Xử lý các tháng được đánh dấu Đã đóng (paid)
      if (Array.isArray(paid_months)) {
        const todayStr = new Date().toISOString().slice(0, 10);
        for (const pMonth of paid_months) {
          // Kiểm tra xem đã có bản ghi bao phủ tháng này chưa
          const checkRes = await db.execute({
            sql: `SELECT id FROM student_payments 
                  WHERE student_id = ? AND ? >= start_period AND ? <= end_period AND status = 'paid'`,
            args: [student_id, pMonth, pMonth],
          });

          if (checkRes.rows.length === 0) {
            const payId = `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
            await db.execute({
              sql: `INSERT INTO student_payments (id, student_id, package_id, package_name, amount, paid_date, start_period, end_period, status, note)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?)`,
              args: [
                payId,
                student_id,
                package_id || null,
                "Đã đối soát",
                Number(amount) || 1000000,
                todayStr,
                pMonth,
                pMonth,
                note || "",
              ],
            });

            // ⭐ VÍ GIỜ HỌC: Cấp giờ cho tháng vừa đối soát (idempotent)
            await grantHoursForPeriod(student_id, pMonth, pMonth);
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: "Cập nhật đối soát các tháng thành công!",
      });
    }

    return NextResponse.json({ success: false, message: "Hành động không hợp lệ!" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Payments API Error:", error);
    return NextResponse.json(
      { success: false, message: (error as Error).message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
