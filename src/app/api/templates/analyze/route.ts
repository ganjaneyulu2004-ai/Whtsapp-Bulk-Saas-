import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getCurrentBusiness, getCurrentUserSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  analyzePosterWithGemini,
  generateOfferOptionsFromDetails,
  mapExtractedDetailsToTemplateVariables,
} from "@/lib/gemini";

async function loadOwnedTemplateImageBase64(
  imageUrl: string | null | undefined
): Promise<{ base64Image: string; mimeType: string } | null> {
  if (!imageUrl || typeof imageUrl !== "string") return null;
  const trimmed = imageUrl.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("data:image/")) {
    const mimeMatch = trimmed.match(/^data:(image\/[a-zA-Z0-9.+_-]+);base64,/i);
    return {
      base64Image: trimmed,
      mimeType: mimeMatch?.[1]?.toLowerCase() || "image/jpeg",
    };
  }

  const localMatch = trimmed.match(/\/api\/templates\/media\/([a-zA-Z0-9_-]+\.(jpg|jpeg|png))(?:\?.*)?$/i);
  if (localMatch?.[1]) {
    const filename = localMatch[1];
    const filePath = path.join(process.cwd(), "public", "uploads", "templates", filename);
    const buf = await fs.readFile(filePath);
    const mimeType = filename.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
    return {
      base64Image: buf.toString("base64"),
      mimeType,
    };
  }

  if (
    trimmed.startsWith("https://") &&
    !trimmed.includes("localhost") &&
    !trimmed.includes("127.0.0.1")
  ) {
    const imgRes = await fetch(trimmed);
    if (!imgRes.ok) return null;
    const contentType = String(imgRes.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
    if (!contentType.startsWith("image/")) return null;
    const arrayBuf = await imgRes.arrayBuffer();
    if (arrayBuf.byteLength === 0 || arrayBuf.byteLength > 8 * 1024 * 1024) return null;
    return {
      base64Image: Buffer.from(arrayBuf).toString("base64"),
      mimeType: contentType,
    };
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const session = await getCurrentUserSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const business = await getCurrentBusiness();
    if (!business?.id) {
      return NextResponse.json({ error: "Business account not found" }, { status: 403 });
    }

    const body = await req.json();
    const {
      base64Image,
      mimeType,
      targetLang,
      note,
      extractedDetails,
      bookingLink,
      templateId,
      templateBodyText,
      templateExamples,
      targetVariable,
    } = body;

    const finalBookingLink = (bookingLink || business.defaultBookingLink || "").trim();

    // Multi-tenant lookup: only allow reading a template owned by this businessId
    const ownedTemplate =
      templateId && typeof templateId === "string"
        ? await prisma.template.findFirst({
            where: { id: templateId, businessId: business.id },
            select: {
              id: true,
              bodyText: true,
              bodyExamplesJson: true,
              headerImageUrl: true,
              headerMediaUrl: true,
            },
          })
        : null;

    if (templateId && !ownedTemplate) {
      return NextResponse.json({ error: "Template not found for this business" }, { status: 404 });
    }

    const resolvedBodyText =
      typeof templateBodyText === "string" && templateBodyText.trim()
        ? templateBodyText
        : ownedTemplate?.bodyText || undefined;

    let resolvedExamples: string[] | undefined = Array.isArray(templateExamples)
      ? templateExamples.map((x: any) => String(x ?? ""))
      : undefined;
    if (!resolvedExamples && ownedTemplate?.bodyExamplesJson) {
      try {
        const parsedEx = JSON.parse(ownedTemplate.bodyExamplesJson);
        if (Array.isArray(parsedEx)) resolvedExamples = parsedEx.map((x: any) => String(x ?? ""));
      } catch {}
    }

    const parsedTargetVar =
      typeof targetVariable === "number" && targetVariable > 0 ? targetVariable : undefined;

    // 1. Resolve image: prefer uploaded base64Image, else load this business's own template default image
    let imageDataToAnalyze: string | null =
      typeof base64Image === "string" && base64Image.trim() ? base64Image.trim() : null;
    let imageMimeToAnalyze: string = mimeType || "image/jpeg";

    if (!imageDataToAnalyze && ownedTemplate && !extractedDetails) {
      const defaultUrl = ownedTemplate.headerImageUrl || ownedTemplate.headerMediaUrl;
      const loaded = await loadOwnedTemplateImageBase64(defaultUrl).catch(() => null);
      if (loaded) {
        imageDataToAnalyze = loaded.base64Image;
        imageMimeToAnalyze = loaded.mimeType;
      }
    }

    // Also allow full Vision re-run when targetVariable is requested without inline base64
    if (!imageDataToAnalyze && parsedTargetVar && ownedTemplate) {
      const defaultUrl = ownedTemplate.headerImageUrl || ownedTemplate.headerMediaUrl;
      const loaded = await loadOwnedTemplateImageBase64(defaultUrl).catch(() => null);
      if (loaded) {
        imageDataToAnalyze = loaded.base64Image;
        imageMimeToAnalyze = loaded.mimeType;
      }
    }

    if (imageDataToAnalyze) {
      const result = await analyzePosterWithGemini(
        imageDataToAnalyze,
        imageMimeToAnalyze,
        targetLang || "auto",
        note,
        undefined,
        finalBookingLink || undefined,
        {
          templateBodyText: resolvedBodyText,
          templateExamples: resolvedExamples,
          targetVariable: parsedTargetVar,
        }
      );

      return NextResponse.json(result);
    }

    // 2. Fallback: map/regenerate from user-edited or previously extracted details
    if (extractedDetails) {
      const options = generateOfferOptionsFromDetails(
        extractedDetails,
        targetLang || "English",
        finalBookingLink || undefined
      );
      const suggestedVariables = resolvedBodyText
        ? mapExtractedDetailsToTemplateVariables(extractedDetails, resolvedBodyText, {
            bookingLink: finalBookingLink || undefined,
            targetVariable: parsedTargetVar,
          })
        : undefined;

      return NextResponse.json({
        success: true,
        extractedDetails,
        generatedOptions: options,
        ...(suggestedVariables ? { suggestedVariables } : {}),
      });
    }

    return NextResponse.json(
      { error: "Poster image or template default image is required for vision analysis" },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("Poster analysis error:", err);
    return NextResponse.json({ error: err.message || "Failed to analyze poster image" }, { status: 500 });
  }
}
