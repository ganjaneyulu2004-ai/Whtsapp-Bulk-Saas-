import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentBusiness } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const business: any = await getCurrentBusiness();
    return NextResponse.json({
      apiCardLinked: !!business.apiCardLinked,
      apiCardLast4: business.apiCardLast4 || null,
      apiCardBrand: business.apiCardBrand || null,
      unbilledApiSpend: business.unbilledApiSpend || 0.0,
      billingThreshold: business.billingThreshold || 500.0,
      totalApiCharged: business.totalApiCharged || 0.0,
      perMessageCost: business.perMessageCost || 0.80,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const business: any = await getCurrentBusiness();
    const body = await req.json();
    const { last4, brand, token } = body;

    const updated: any = await prisma.business.update({
      where: { id: business.id },
      data: {
        apiCardLinked: true,
        apiCardLast4: last4 || "4242",
        apiCardBrand: brand || "Visa",
        apiCardToken: token || `tok_${Date.now()}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Meta WhatsApp API card successfully linked! Per-message billing is now active.",
      business: {
        apiCardLinked: updated.apiCardLinked,
        apiCardLast4: updated.apiCardLast4,
        apiCardBrand: updated.apiCardBrand,
        unbilledApiSpend: updated.unbilledApiSpend,
        billingThreshold: updated.billingThreshold,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
