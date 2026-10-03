# 🚀 OfferBlast – WhatsApp Bulk Campaign Platform for Small Businesses

OfferBlast is a production-ready, multi-tenant WhatsApp bulk marketing campaign platform built with Next.js 14, Tailwind CSS, Prisma, and the official Meta WhatsApp Cloud API.

---

## ⚡ Meta WhatsApp Webhook Setup Guide

### 1. Local Testing with ngrok
To receive real-time WhatsApp status updates (sent, delivered, read, failed) and customer replies on your local computer:

1. **Start Next.js dev server**:
   ```bash
   npm run dev
   ```
2. **Launch ngrok tunnel**:
   ```bash
   npm run tunnel
   ```
   *(Or run `ngrok http 3000`)*
3. **Copy your HTTPS Forwarding URL** from ngrok output (e.g. `https://a1b2-34-56-78.ngrok-free.app`).

---

### 2. Configure Meta Dashboard
1. Go to your **[Meta App Dashboard](https://developers.facebook.com/)**.
2. Navigate to **WhatsApp > Configuration**.
3. Under **Webhooks**, click **Edit** and paste:
   - **Callback URL**: `https://<your-ngrok-url-or-domain>/api/webhooks/whatsapp`
   - **Verify Token**: `offerblast_verify_token_123` (or the `WA_VERIFY_TOKEN` configured in your `.env`)
4. Click **Verify and Save**.
5. Under **Webhook fields**, click **Manage** and subscribe to **`messages`**.

---

### 3. Production Deployment on Vercel
When deploying to Vercel:

1. Connect your repository to Vercel.
2. In Vercel Project Settings > **Environment Variables**, add:
   ```env
   DATABASE_URL="file:./dev.db" # or PostgreSQL database URI
   NEXTAUTH_SECRET="your_nextauth_secret"
   NEXTAUTH_URL="https://<your-app>.vercel.app"
   GEMINI_API_KEY="your_gemini_api_key"
   WA_TOKEN="your_meta_system_user_access_token"
   WA_PHONE_NUMBER_ID="your_whatsapp_phone_number_id"
   WA_BUSINESS_ACCOUNT_ID="your_waba_account_id"
   WA_API_VERSION="v19.0"
   META_APP_ID="your_meta_app_id"
   WA_VERIFY_TOKEN="choose_any_secret_word"
   META_APP_SECRET="from_meta_app_settings_basic"
   ```
3. Your **Production Callback URL** format in Meta will be:
   ```text
   https://<your-app>.vercel.app/api/webhooks/whatsapp
   ```

---

## 🧪 Testing the Webhook Locally
Run the automated test script to verify both GET handshake and POST message status updates:
```bash
npm run test:webhook
```
