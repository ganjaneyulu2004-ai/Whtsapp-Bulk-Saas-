import { NextResponse } from "next/server";
import { testWhatsAppConnection } from "@/lib/whatsapp";
import { getCurrentBusiness } from "@/lib/session";
import { decryptToken } from "@/lib/encryption";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { waToken, waPhoneNumberId, waApiVersion } = body;

    let tokenToTest = waToken;
    if (!tokenToTest || tokenToTest.includes("...")) {
      const business = await getCurrentBusiness();
      tokenToTest = decryptToken(business.whatsappConfig?.waToken) || process.env.WA_TOKEN || "";
    }

    const res = await testWhatsAppConnection({
      waToken: tokenToTest,
      waPhoneNumberId,
      waApiVersion,
    });

    return NextResponse.json(res);
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message || "Connection test failed" }, { status: 500 });
  }
}
