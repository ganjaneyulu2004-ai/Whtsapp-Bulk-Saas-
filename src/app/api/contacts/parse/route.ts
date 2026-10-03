import { NextResponse } from "next/server";
import { parseCsvOrExcelBuffer } from "@/lib/csv-parser";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const rawNameCol = formData.get("nameColIndex");
    const rawPhoneCol = formData.get("phoneColIndex");
    const manualSelect = formData.get("manualSelect") === "true";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const nameColIndex = manualSelect && rawNameCol !== null ? parseInt(String(rawNameCol), 10) : undefined;
    const phoneColIndex = manualSelect && rawPhoneCol !== null ? parseInt(String(rawPhoneCol), 10) : undefined;

    const buffer = await file.arrayBuffer();
    const result = parseCsvOrExcelBuffer(buffer, file.name, nameColIndex, phoneColIndex);

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to parse contact file" }, { status: 500 });
  }
}
