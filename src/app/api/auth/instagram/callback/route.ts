import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error_description") || searchParams.get("error");

  const origin = new URL(req.url).origin;

  if (error || !code) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error || "Authorization cancelled")}`);
  }

  const metaAppId = process.env.META_APP_ID || "1019114041212914";
  const metaAppSecret = process.env.META_APP_SECRET || "8b567b0fd50b48c423aed2359402aa52";
  const redirectUri = `${origin}/api/auth/instagram/callback`;

  try {
    // 1. Exchange code for access token
    const tokenUrl = `https://graph.facebook.com/v20.0/oauth/access_token?client_id=${metaAppId}&client_secret=${metaAppSecret}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&code=${code}`;

    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error("Instagram token exchange error:", tokenData);
      return NextResponse.redirect(`${origin}/login?error=Token+exchange+failed`);
    }

    // 2. Fetch user profile
    const profileUrl = `https://graph.facebook.com/v20.0/me?fields=id,name,email&access_token=${tokenData.access_token}`;
    const profileRes = await fetch(profileUrl);
    const profileData = await profileRes.json();

    const igId = profileData.id || `ig_${Date.now()}`;
    const name = profileData.name || "Instagram User";
    const username = (profileData.email ? profileData.email.split("@")[0] : `ig_${igId}`).toLowerCase().replace(/[^a-z0-9_]/g, "");

    // 3. Redirect back to login with auto-login parameters
    const redirectLogin = `${origin}/login?ig_user=${encodeURIComponent(username)}&ig_name=${encodeURIComponent(name)}`;
    return NextResponse.redirect(redirectLogin);
  } catch (err: any) {
    console.error("Instagram callback exception:", err);
    return NextResponse.redirect(`${origin}/login?error=Authentication+exception`);
  }
}
