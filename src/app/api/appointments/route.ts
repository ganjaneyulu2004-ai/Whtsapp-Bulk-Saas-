import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentBusiness } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const business = await getCurrentBusiness();
    const appointments = await (prisma as any).appointment.findMany({
      where: { businessId: business.id },
      orderBy: { appointmentDate: "desc" },
    });

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    let todayCount = 0;
    let upcomingCount = 0;
    let completedCount = 0;

    appointments.forEach((a: any) => {
      const d = new Date(a.appointmentDate);
      if (a.status === "COMPLETED") {
        completedCount++;
      } else if (d >= startOfToday && d <= endOfToday) {
        todayCount++;
      } else if (d > endOfToday) {
        upcomingCount++;
      }
    });

    return NextResponse.json({
      appointments,
      stats: {
        total: appointments.length,
        today: todayCount,
        upcoming: upcomingCount,
        completed: completedCount,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const business = await getCurrentBusiness();
    const body = await req.json();
    const { customerName, customerPhone, serviceName, appointmentDate, slotTime, notes } = body;

    if (!customerName || !customerPhone || !appointmentDate || !slotTime) {
      return NextResponse.json(
        { error: "Customer name, phone, date, and slot time are required." },
        { status: 400 }
      );
    }

    let cleanPhone = String(customerPhone).replace(/[^0-9]/g, "");
    if (cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;

    const appointment = await (prisma as any).appointment.create({
      data: {
        businessId: business.id,
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
        serviceName: serviceName?.trim() || "Consultation",
        appointmentDate: new Date(appointmentDate),
        slotTime: slotTime.trim(),
        status: "CONFIRMED",
        bookedBy: "MANUAL",
        notes: notes?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, appointment });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const business = await getCurrentBusiness();
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "Appointment ID and status are required." }, { status: 400 });
    }

    const updated = await (prisma as any).appointment.updateMany({
      where: { id, businessId: business.id },
      data: { status },
    });

    return NextResponse.json({ success: true, count: updated.count });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const business = await getCurrentBusiness();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Appointment ID is required." }, { status: 400 });
    }

    await (prisma as any).appointment.deleteMany({
      where: { id, businessId: business.id },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
