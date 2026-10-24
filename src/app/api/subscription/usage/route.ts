import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserMessageUsage } from "@/lib/quota";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const usage = await getUserMessageUsage(session.user.id);
    return NextResponse.json(usage);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
