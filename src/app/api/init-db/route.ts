import { NextResponse } from "next/server";
import { initializeDatabase } from "@/lib/init-db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await initializeDatabase();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Init DB Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to initialize database",
    }, { status: 500 });
  }
}
