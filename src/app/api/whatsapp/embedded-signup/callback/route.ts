import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Connecting WhatsApp...</title>
        <style>
          body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8f5fc; color: #2B2350; text-align: center; }
          .card { background: white; padding: 30px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); max-width: 400px; }
          .spinner { width: 40px; height: 40px; border: 4px solid #E9E4F5; border-top-color: #6B2D8F; border-radius: 50%; animation: spin 1s infinite linear; margin: 0 auto 20px; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="card">
          ${error ? `
            <h3 style="color: #e11d48;">Connection Failed</h3>
            <p style="font-size: 13px; color: #645D7E;">${errorDescription || error}</p>
            <button onclick="window.close()" style="margin-top: 15px; padding: 10px 20px; background: #6B2D8F; color: white; border: none; border-radius: 10px; cursor: pointer;">Close Window</button>
          ` : `
            <div class="spinner"></div>
            <h3>Connecting to WhatsApp Business...</h3>
            <p style="font-size: 13px; color: #645D7E;">Please wait while we sync your WhatsApp account details with your dashboard.</p>
          `}
        </div>

        <script>
          const code = ${JSON.stringify(code)};
          const error = ${JSON.stringify(error || errorDescription)};

          if (window.opener) {
            if (code) {
              window.opener.postMessage({ type: 'WA_EMBEDDED_OAUTH_CODE', code: code }, '*');
            } else if (error) {
              window.opener.postMessage({ type: 'WA_EMBEDDED_OAUTH_ERROR', error: error }, '*');
            }
            setTimeout(() => {
              window.close();
            }, 1200);
          } else {
            setTimeout(() => {
              window.location.href = '/settings';
            }, 1500);
          }
        </script>
      </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
