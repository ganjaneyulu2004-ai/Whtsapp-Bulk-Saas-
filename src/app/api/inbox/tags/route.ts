import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tags = await (prisma as any).contactTag.findMany();
    const tagMap: Record<string, { tag: string; notes?: string | null }> = {};
    for (const t of tags) {
      let clean = String(t.phone || "").replace(/[^0-9]/g, "");
      if (clean.startsWith("91") && clean.length === 12) clean = clean.slice(2);
      tagMap[clean] = { tag: t.tag, notes: t.notes };
      tagMap[t.phone] = { tag: t.tag, notes: t.notes };
    }
    return NextResponse.json({ success: true, tags: tagMap });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone, tag, notes } = body;

    if (!phone || !tag) {
      return NextResponse.json(
        { success: false, error: "Phone and tag are required." },
        { status: 400 }
      );
    }

    let cleanPhone = String(phone).replace(/[^0-9]/g, "");
    if (cleanPhone.length === 10) {
      cleanPhone = "91" + cleanPhone;
    }

    const updated = await (prisma as any).contactTag.upsert({
      where: { phone: cleanPhone },
      update: { tag, notes },
      create: { phone: cleanPhone, tag, notes },
    });

    // Also sync to Contact model if contact exists
    try {
      await prisma.contact.updateMany({
        where: {
          phone: {
            contains: cleanPhone.slice(-10),
          },
        },
        data: { leadTag: tag } as any,
      });
    } catch {}

    return NextResponse.json({ success: true, contactTag: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
