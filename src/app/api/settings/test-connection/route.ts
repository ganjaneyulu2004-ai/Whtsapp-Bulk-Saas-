import { NextResponse } from "next/server";
import { testWhatsAppConnection } from "@/lib/whatsapp";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { waToken, waPhoneNumberId, waApiVersion } = body;

    const res = await testWhatsAppConnection({
      waToken,
      waPhoneNumberId,
      waApiVersion,
    });

    return NextResponse.json(res);
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message || "Connection test failed" }, { status: 500 });
  }
}
