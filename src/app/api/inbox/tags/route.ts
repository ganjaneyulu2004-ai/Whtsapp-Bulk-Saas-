import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentBusiness, getCurrentUserSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getCurrentUserSession();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const business = await getCurrentBusiness();
    if (!business?.id) {
      return NextResponse.json({ success: false, error: "Business account not found" }, { status: 403 });
    }

    // Strictly return tags belonging to the logged-in user's businessId
    const tags = await prisma.contactTag.findMany({
      where: { businessId: business.id },
    });

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
    const session = await getCurrentUserSession();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const business = await getCurrentBusiness();
    if (!business?.id) {
      return NextResponse.json({ success: false, error: "Business account not found" }, { status: 403 });
    }

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

    const existing = await prisma.contactTag.findFirst({
      where: {
        businessId: business.id,
        phone: cleanPhone,
      },
    });

    const updated = existing
      ? await prisma.contactTag.update({
          where: { id: existing.id },
          data: { tag, notes },
        })
      : await prisma.contactTag.create({
          data: {
            businessId: business.id,
            phone: cleanPhone,
            tag,
            notes,
          },
        });

    // Sync Contact.leadTag strictly scoped to this businessId
    try {
      await prisma.contact.updateMany({
        where: {
          businessId: business.id,
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
