import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentBusiness } from "@/lib/session";

export async function GET() {
  try {
    const business = await getCurrentBusiness();
    const profile = await prisma.business.findUnique({
      where: { id: business.id },
      select: {
        id: true,
        name: true,
        category: true,
        logoUrl: true,
        phone: true,
        address: true,
        website: true,
        defaultBookingLink: true,
      },
    });

    return NextResponse.json(profile || business);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const business = await getCurrentBusiness();
    const body = await req.json();

    const {
      name,
      category,
      logoUrl,
      phone,
      address,
      website,
      defaultBookingLink,
    } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "Business name is required" }, { status: 400 });
    }

    if (defaultBookingLink && defaultBookingLink.trim() !== "" && !defaultBookingLink.trim().startsWith("https://")) {
      return NextResponse.json({ error: "Default booking link must be a valid https:// URL" }, { status: 400 });
    }

    const updated = await prisma.business.update({
      where: { id: business.id },
      data: {
        name: name.trim(),
        category: category !== undefined ? category : business.category,
        logoUrl: logoUrl !== undefined ? logoUrl : business.logoUrl,
        phone: phone !== undefined ? phone.trim() : business.phone,
        address: address !== undefined ? address.trim() : business.address,
        website: website !== undefined ? website.trim() : business.website,
        defaultBookingLink: defaultBookingLink !== undefined ? defaultBookingLink.trim() : business.defaultBookingLink,
      },
      select: {
        id: true,
        name: true,
        category: true,
        logoUrl: true,
        phone: true,
        address: true,
        website: true,
        defaultBookingLink: true,
      },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
