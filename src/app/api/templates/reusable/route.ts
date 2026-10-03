import { NextResponse } from "next/server";
import { getCurrentBusiness } from "@/lib/session";
import { getOrCreateReusableTemplate, getCampaignTemplates, POSTER_TEMPLATE_NAME, TEXT_TEMPLATE_NAME } from "@/lib/template-service";

export async function GET(req: Request) {
  try {
    const business = await getCurrentBusiness();
    const { searchParams } = new URL(req.url);
    const hasPoster = searchParams.get("hasPoster") === "true";
    const requestedName = searchParams.get("name") || (hasPoster ? POSTER_TEMPLATE_NAME : TEXT_TEMPLATE_NAME);

    const { posterTemplate, textTemplate } = await getCampaignTemplates(business.id);
    const selectedTemplate = requestedName === POSTER_TEMPLATE_NAME ? posterTemplate : textTemplate;

    return NextResponse.json({
      ...selectedTemplate,
      posterTemplate,
      textTemplate,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
