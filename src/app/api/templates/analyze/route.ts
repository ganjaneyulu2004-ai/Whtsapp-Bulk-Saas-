import { NextResponse } from "next/server";
import { getCurrentBusiness } from "@/lib/session";
import { analyzePosterWithGemini, generateOfferOptionsFromDetails } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const business = await getCurrentBusiness();
    const body = await req.json();
    const { base64Image, mimeType, targetLang, note, extractedDetails, bookingLink } = body;
    const finalBookingLink = (bookingLink || business.defaultBookingLink || "").trim();

    // If details are provided directly (user edited fields and clicked Regenerate)
    if (extractedDetails) {
      const options = generateOfferOptionsFromDetails(
        extractedDetails,
        targetLang || "English",
        finalBookingLink || undefined
      );
      return NextResponse.json({
        success: true,
        extractedDetails,
        generatedOptions: options,
      });
    }

    if (!base64Image) {
      return NextResponse.json({ error: "Poster image base64 is required" }, { status: 400 });
    }

    const result = await analyzePosterWithGemini(
      base64Image,
      mimeType || "image/jpeg",
      targetLang || "auto",
      note,
      undefined,
      finalBookingLink || undefined
    );

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Poster analysis error:", err);
    return NextResponse.json({ error: err.message || "Failed to analyze poster image" }, { status: 500 });
  }
}
