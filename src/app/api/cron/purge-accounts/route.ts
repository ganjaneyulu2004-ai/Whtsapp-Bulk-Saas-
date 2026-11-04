import { NextResponse } from "next/server";
import { purgeExpiredAccounts } from "../../../../../scripts/cron-purge-accounts";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    const cronSecret = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET;

    if (cronSecret && key !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized cron execution." }, { status: 401 });
    }

    const result = await purgeExpiredAccounts();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err: any) {
    console.error("Purge cron endpoint error:", err);
    return NextResponse.json({ error: err.message || "Cron purge failed." }, { status: 500 });
  }
}

