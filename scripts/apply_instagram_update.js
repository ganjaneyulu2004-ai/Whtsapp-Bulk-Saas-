const fs = require('fs');
const path = require('path');

console.log("🚀 Starting Instagram Login Update on VPS...");

// 1. Create directory for API route
const dir = path.join(__dirname, 'src', 'app', 'api', 'auth', 'instagram', 'callback');
fs.mkdirSync(dir, { recursive: true });

// 2. Write src/app/api/auth/instagram/route.ts
const igRouteContent = `import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const metaAppId = process.env.META_APP_ID || "2068663130431385";
  const url = new URL(req.url);
  const origin = url.origin;
  const redirectUri = \`\${origin}/api/auth/instagram/callback\`;

  const metaOAuthUrl = \`https://www.facebook.com/v20.0/dialog/oauth?client_id=\${metaAppId}&redirect_uri=\${encodeURIComponent(
    redirectUri
  )}&scope=public_profile,email&response_type=code\`;

  return NextResponse.redirect(metaOAuthUrl);
}
`;
fs.writeFileSync(path.join(__dirname, 'src', 'app', 'api', 'auth', 'instagram', 'route.ts'), igRouteContent);
console.log("✔ Created src/app/api/auth/instagram/route.ts");

// 3. Write src/app/api/auth/instagram/callback/route.ts
const igCallbackContent = `import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error_description") || searchParams.get("error");

  const origin = new URL(req.url).origin;

  if (error || !code) {
    return NextResponse.redirect(\`\${origin}/login?error=\${encodeURIComponent(error || "Authorization cancelled")}\`);
  }

  const metaAppId = process.env.META_APP_ID || "2068663130431385";
  const metaAppSecret = process.env.META_APP_SECRET || "8c8247f5dc779a1477cc968e933e6ea4";
  const redirectUri = \`\${origin}/api/auth/instagram/callback\`;

  try {
    // 1. Exchange code for access token
    const tokenUrl = \`https://graph.facebook.com/v20.0/oauth/access_token?client_id=\${metaAppId}&client_secret=\${metaAppSecret}&redirect_uri=\${encodeURIComponent(
      redirectUri
    )}&code=\${code}\`;

    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error("Instagram token exchange error:", tokenData);
      return NextResponse.redirect(\`\${origin}/login?error=Token+exchange+failed\`);
    }

    // 2. Fetch user profile
    const profileUrl = \`https://graph.facebook.com/v20.0/me?fields=id,name,email&access_token=\${tokenData.access_token}\`;
    const profileRes = await fetch(profileUrl);
    const profileData = await profileRes.json();

    const igId = profileData.id || \`ig_\${Date.now()}\`;
    const name = profileData.name || "Instagram User";
    const username = (profileData.email ? profileData.email.split("@")[0] : \`ig_\${igId}\`).toLowerCase().replace(/[^a-z0-9_]/g, "");

    // 3. Redirect back to login with auto-login parameters
    const redirectLogin = \`\${origin}/login?ig_user=\${encodeURIComponent(username)}&ig_name=\${encodeURIComponent(name)}\`;
    return NextResponse.redirect(redirectLogin);
  } catch (err: any) {
    console.error("Instagram callback exception:", err);
    return NextResponse.redirect(\`\${origin}/login?error=Authentication+exception\`);
  }
}
`;
fs.writeFileSync(path.join(__dirname, 'src', 'app', 'api', 'auth', 'instagram', 'callback', 'route.ts'), igCallbackContent);
console.log("✔ Created src/app/api/auth/instagram/callback/route.ts");

// 4. Update src/lib/auth.ts
const authPath = path.join(__dirname, 'src', 'lib', 'auth.ts');
let authContent = fs.readFileSync(authPath, 'utf8');
if (!authContent.includes('isInstagram: "true"')) {
  authContent = authContent.replace(
    `credentials: {\n        username: { label: "Username", type: "text" },\n        password: { label: "Password", type: "password" },\n      },`,
    `credentials: {\n        username: { label: "Username", type: "text" },\n        password: { label: "Password", type: "password" },\n        isInstagram: { label: "isInstagram", type: "text" },\n        name: { label: "name", type: "text" },\n      },`
  );

  const authorizeHook = `      async authorize(credentials) {
        // 1. Direct Instagram One-Click Login / Onboarding
        if (credentials?.isInstagram === "true" && credentials?.username) {
          const clean = credentials.username.trim().toLowerCase();
          let user = await prisma.user.findFirst({
            where: {
              OR: [
                { username: clean },
                { username: credentials.username.trim() },
              ],
            },
          });

          if (!user) {
            const randomPass = await bcrypt.hash("ig_pass_" + Date.now(), 10);
            user = await prisma.user.create({
              data: {
                name: credentials.name || credentials.username,
                username: clean,
                passwordHash: randomPass,
                businessName: \`\${credentials.name || clean}'s Business\`,
                role: "USER",
              },
            });

            const userBusiness = await prisma.business.create({
              data: {
                userId: user.id,
                name: user.businessName || "My Business",
                language: "en",
              },
            });

            await prisma.whatsAppConfig.create({
              data: {
                businessId: userBusiness.id,
                waApiVersion: "v26.0",
                messagingLimitTier: "TIER_250",
                isConnected: false,
              },
            });

            await prisma.subscription.create({
              data: {
                userId: user.id,
                plan: "Instagram Onboarding Plan",
                amount: 0,
                status: "ACTIVE",
                startDate: new Date(),
                endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
              },
            });
          }

          return {
            id: user.id,
            name: user.name,
            username: user.username,
            role: user.role,
            businessName: user.businessName,
            mobile: user.mobile,
          };
        }

        // 2. Standard Username & Password Login`;

  authContent = authContent.replace(`      async authorize(credentials) {`, authorizeHook);
  fs.writeFileSync(authPath, authContent);
  console.log("✔ Updated src/lib/auth.ts");
} else {
  console.log("✔ src/lib/auth.ts already has isInstagram");
}

console.log("🎉 Files updated successfully!");
