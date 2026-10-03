import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentBusiness } from "@/lib/session";

export async function GET() {
  try {
    const business = await getCurrentBusiness();
    const lists = await prisma.contactList.findMany({
      where: { businessId: business.id },
      include: {
        _count: { select: { contacts: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(lists);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const business = await getCurrentBusiness();
    const body = await req.json();

    const { name, description, contacts } = body;

    if (!name || !contacts || !Array.isArray(contacts)) {
      return NextResponse.json({ error: "Contact list name and contacts array are required" }, { status: 400 });
    }

    const contactList = await prisma.contactList.create({
      data: {
        businessId: business.id,
        name,
        description,
        contactCount: contacts.length,
      },
    });

    const contactRecords = [];
    for (const c of contacts) {
      if (!c.cleanPhone || !c.isValid || c.isDuplicate) continue;
      const contact = await prisma.contact.upsert({
        where: {
          businessId_phone: {
            businessId: business.id,
            phone: c.cleanPhone,
          },
        },
        update: {
          name: c.name || "Customer",
          listId: contactList.id,
        },
        create: {
          businessId: business.id,
          listId: contactList.id,
          name: c.name || "Customer",
          phone: c.cleanPhone,
        },
      });
      contactRecords.push(contact);
    }

    // Update actual count
    await prisma.contactList.update({
      where: { id: contactList.id },
      data: { contactCount: contactRecords.length },
    });

    return NextResponse.json({ contactList, savedCount: contactRecords.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
