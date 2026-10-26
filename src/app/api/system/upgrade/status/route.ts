import { NextResponse } from "next/server";
import { existsSync } from "fs";
import { join } from "path";

export async function GET() {
  const flagPath = join(process.cwd(), ".maintenance");
  const isMaintenance = existsSync(flagPath);

  return NextResponse.json({
    success: true,
    maintenance: isMaintenance,
  });
}
