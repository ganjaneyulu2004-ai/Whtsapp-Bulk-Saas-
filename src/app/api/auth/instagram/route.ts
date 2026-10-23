import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const metaAppId = process.env.META_APP_ID || "2068663130431385";
  const url = new URL(req.url);
  const origin = url.origin;
  const redirectUri = `${origin}/api/auth/instagram/callback`;

  const metaOAuthUrl = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${metaAppId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=public_profile,email&response_type=code`;

  return NextResponse.redirect(metaOAuthUrl);
}
