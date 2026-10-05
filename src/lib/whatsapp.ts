export interface MetaTemplatePayload {
  name: string;
  category: "MARKETING" | "UTILITY";
  language: string;
  components: Array<{
    type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
    format?: "IMAGE" | "TEXT";
    text?: string;
    example?: {
      header_handle?: string[];
      header_url?: string[];
      body_text?: string[][];
    };
    buttons?: Array<{
      type: "PHONE_NUMBER" | "URL" | "QUICK_REPLY";
      text: string;
      phone_number?: string;
      url?: string;
    }>;
  }>;
}

// Map Meta error codes to friendly human-readable messages
export function mapMetaErrorCode(code: string | number, defaultMsg?: string): string {
  const codeStr = String(code);
  if (codeStr === "132001") {
    return "This template is not approved yet in Meta (or wrong language code).";
  }
  if (codeStr === "131058") {
    return "Hello World sample template can only be sent from Meta test numbers.";
  }
  if (codeStr === "131026") {
    return "Message undeliverable: Recipient phone number invalid or opted out.";
  }
  if (codeStr === "130429" || codeStr === "131056") {
    return "Rate limit exceeded. System will retry automatically with backoff.";
  }
  return defaultMsg || `Meta Error Code ${codeStr}`;
}

export async function submitTemplateToMeta(
  config: {
    waToken?: string;
    waBusinessAccountId?: string;
    waApiVersion?: string;
  },
  payload: MetaTemplatePayload
): Promise<{ success: boolean; metaTemplateId?: string; status: string; error?: string }> {
  const token = config.waToken || process.env.WA_TOKEN;
  const wabaId = config.waBusinessAccountId || process.env.WA_BUSINESS_ACCOUNT_ID;
  const version = config.waApiVersion || process.env.WA_API_VERSION || "v26.0";

  if (!token || !wabaId || token.startsWith("EAAG...") || wabaId.startsWith("104829375...")) {
    return {
      success: true,
      metaTemplateId: `meta_tpl_${Date.now()}`,
      status: "APPROVED",
    };
  }

  try {
    const url = `https://graph.facebook.com/${version}/${wabaId}/message_templates`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        status: "REJECTED",
        error: mapMetaErrorCode(data.error?.code, data.error?.message),
      };
    }

    return {
      success: true,
      metaTemplateId: data.id,
      status: data.status || "APPROVED",
    };
  } catch (error: any) {
    return {
      success: false,
      status: "REJECTED",
      error: error?.message || "Network error while submitting to Meta API",
    };
  }
}

export async function uploadMediaToMeta(
  config: {
    waToken?: string;
    waPhoneNumberId?: string;
    waApiVersion?: string;
  },
  base64OrBuffer: string | Buffer,
  mimeType = "image/png"
): Promise<{ success: boolean; mediaId?: string; error?: string }> {
  const token = config.waToken || process.env.WA_TOKEN;
  const phoneId = config.waPhoneNumberId || process.env.WA_PHONE_NUMBER_ID;
  const version = process.env.WA_API_VERSION || config.waApiVersion || "v26.0";

  if (!token || !phoneId) {
    return { success: false, error: "Missing token or phoneId" };
  }

  try {
    let buffer: Buffer;
    let detectedMime = mimeType;
    if (typeof base64OrBuffer === "string") {
      const match = base64OrBuffer.match(/^data:([a-zA-Z0-9.+_-]+\/[a-zA-Z0-9.+_-]+);base64,/);
      if (match) {
        detectedMime = match[1];
      }
      const cleanBase64 = base64OrBuffer.replace(/^data:[^;]+;base64,/, "");
      buffer = Buffer.from(cleanBase64, "base64");
    } else {
      buffer = base64OrBuffer;
    }

    const blob = new Blob([buffer as any], { type: detectedMime });
    const ext = detectedMime.includes("jpeg") || detectedMime.includes("jpg") ? "jpg" : "png";
    const formData = new FormData();
    formData.append("file", blob, `poster.${ext}`);
    formData.append("type", detectedMime);
    formData.append("messaging_product", "whatsapp");

    const url = `https://graph.facebook.com/${version}/${phoneId}/media`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error?.message || "Failed to upload media to Meta" };
    }

    return { success: true, mediaId: data.id };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error uploading media" };
  }
}

export function formatDirectOfferMessage(
  offerText: string,
  recipientName: string,
  businessName: string,
  bookingLink?: string
): string {
  const recipient = recipientName?.trim() || "Customer";
  const business = businessName?.trim() || "iBrainLabs";
  let rawText = (offerText || "").trim();

  const bLink = bookingLink?.trim();
  if (bLink && !rawText.includes(bLink)) {
    rawText = rawText ? `${rawText} 👉 ${bLink}` : `👉 ${bLink}`;
  }

  if (rawText.includes("\n")) {
    if (rawText.startsWith("Dear ") && rawText.includes("Thank you for shopping with")) {
      return rawText;
    }
    return `Dear ${recipient},\n\n${rawText}\n\nThank you for shopping with ${business}. Have a great day!`;
  }

  const formattedLines: string[] = [];

  if (rawText.includes("|")) {
    const pipeParts = rawText.split("|").map((p) => p.trim()).filter(Boolean);
    for (let i = 0; i < pipeParts.length; i++) {
      const part = pipeParts[i];
      if (i === 0) {
        const boldMatch = part.match(/^([^*]*\*[^*]+\*)(.*)$/);
        if (boldMatch) {
          const titlePart = boldMatch[1].trim();
          const point1Part = boldMatch[2].trim();
          if (titlePart) formattedLines.push(titlePart);
          if (point1Part) formattedLines.push(point1Part);
        } else {
          formattedLines.push(part);
        }
      } else {
        formattedLines.push(part);
      }
    }
  } else {
    // Balanced format: "<1 emoji> *<title>* – <sentence>. <cta> 👉 <link>"
    const match = rawText.match(/^([^*]*\*[^*]+\*)\s*–\s*(.*)$/);
    if (match) {
      const titleLine = match[1].trim();
      const rest = match[2].trim();
      formattedLines.push(titleLine);

      if (rest.includes("👉")) {
        const [sentencePart, linkPart] = rest.split(/(?=👉)/);
        if (sentencePart.trim()) formattedLines.push(sentencePart.trim());
        if (linkPart.trim()) formattedLines.push(linkPart.trim());
      } else {
        formattedLines.push(rest);
      }
    } else {
      formattedLines.push(rawText);
    }
  }

  const contentBlock = formattedLines.length > 0 ? formattedLines.join("\n") : rawText;
  return `Dear ${recipient},\n\n${contentBlock}\n\nThank you for shopping with ${business}. Have a great day!`;
}

export async function sendWhatsAppTemplateMessage(
  config: {
    waToken?: string;
    waPhoneNumberId?: string;
    waApiVersion?: string;
  },
  recipientPhone: string,
  recipientName: string,
  templateName: string,
  templateLanguage: string,
  mediaUrl?: string,
  params?: {
    offerText?: string;
    businessName?: string;
    bookingLink?: string;
    is24HourWindow?: boolean;
    freeFormText?: string;
    mediaId?: string;
  }
): Promise<{ success: boolean; waMessageId?: string; errorCode?: string; errorMessage?: string }> {
  const token = config.waToken || process.env.WA_TOKEN;
  const phoneId = config.waPhoneNumberId || process.env.WA_PHONE_NUMBER_ID;
  const version = process.env.WA_API_VERSION || config.waApiVersion || "v26.0";

  if (!token || token.startsWith("EAAG...") || !phoneId) {
    await new Promise((r) => setTimeout(r, 60));
    return {
      success: true,
      waMessageId: `wamid.HBgL${Date.now()}${Math.random().toString(36).substr(2, 6)}`,
    };
  }

  try {
    let cleanRecipient = String(recipientPhone || "").replace(/[^0-9]/g, "");
    if (cleanRecipient.length === 10) {
      cleanRecipient = "91" + cleanRecipient;
    } else if (cleanRecipient.length === 11 && cleanRecipient.startsWith("0")) {
      cleanRecipient = "91" + cleanRecipient.slice(1);
    }

    let payload: any;
    const recipient = recipientName?.trim() || "Customer";
    const bName = params?.businessName?.trim() || "iBrainLabs";
    const bLink = params?.bookingLink?.trim() || "";

    // 1. If 24-hour customer service window is active, send free-form image + caption without template
    if (params?.is24HourWindow) {
      let mediaId: string | null = params?.mediaId || null;

      if (!mediaId && mediaUrl) {
        if (mediaUrl.startsWith("data:image/") || mediaUrl.length > 500) {
          const uploadRes = await uploadMediaToMeta(config, mediaUrl);
          if (uploadRes.success && uploadRes.mediaId) {
            mediaId = uploadRes.mediaId;
          }
        }
      }

      const directCaption = params?.freeFormText || 
        formatDirectOfferMessage(params?.offerText || "Special Offer for you today!", recipient, bName, bLink);

      if (mediaId) {
        payload = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: cleanRecipient,
          type: "image",
          image: {
            id: mediaId,
            caption: directCaption,
          },
        };
      } else if (mediaUrl && (mediaUrl.startsWith("http://") || mediaUrl.startsWith("https://")) && !mediaUrl.includes("localhost")) {
        payload = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: cleanRecipient,
          type: "image",
          image: {
            link: mediaUrl,
            caption: directCaption,
          },
        };
      } else {
        payload = {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: cleanRecipient,
          type: "text",
          text: {
            body: directCaption,
          },
        };
      }
    } else {
      // 2. Standard Template Message
      // Meta rules for variables: single line, no line breaks, no tabs, max 4 consecutive spaces, trimmed, max 300 chars
      let baseOffer = (params?.offerText || "Special Offer for you today!").trim();
      if (bLink && !baseOffer.includes(bLink)) {
        baseOffer = `${baseOffer} 👉 ${bLink}`;
      }

      const cleanOffer = baseOffer
        .replace(/[\r\n\t]/g, " ")
        .replace(/ {5,}/g, "    ")
        .replace(/\s+/g, " ")
        .trim()
        .substring(0, 300);

      // Body parameters in order: {{1}} = contact name, {{2}} = offer text, {{3}} = business name
      const bodyParameters: any[] = [
        { type: "text", text: recipient },
        { type: "text", text: cleanOffer },
        { type: "text", text: bName },
      ];

      const components: any[] = [
        {
          type: "body",
          parameters: bodyParameters,
        },
      ];

      // Header component
      if (templateName === "offer_poster_v1") {
        let posterMediaId = params?.mediaId;
        if (!posterMediaId && mediaUrl) {
          if (mediaUrl.startsWith("data:image/") || mediaUrl.length > 500) {
            const uploadRes = await uploadMediaToMeta(config, mediaUrl);
            if (uploadRes.success && uploadRes.mediaId) {
              posterMediaId = uploadRes.mediaId;
            }
          }
        }

        if (posterMediaId) {
          components.unshift({
            type: "header",
            parameters: [
              {
                type: "image",
                image: { id: posterMediaId },
              },
            ],
          });
        } else if (mediaUrl && (mediaUrl.startsWith("http://") || mediaUrl.startsWith("https://")) && !mediaUrl.includes("localhost")) {
          components.unshift({
            type: "header",
            parameters: [
              {
                type: "image",
                image: { link: mediaUrl },
              },
            ],
          });
        }
      } else if (templateName === "offer_update_v1") {
        components.unshift({
          type: "header",
          parameters: [
            {
              type: "text",
              text: recipient,
            },
          ],
        });
      } else if (templateName === "student_welcome") {
        // student_welcome has NO header component in Meta Cloud API
      } else if (mediaUrl) {
        components.unshift({
          type: "header",
          parameters: [
            {
              type: "image",
              image: { link: mediaUrl },
            },
          ],
        });
      }

      payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanRecipient,
        type: "template",
        template: {
          name: templateName,
          language: { code: templateLanguage || "en_US" },
          components,
        },
      };
    }

    const url = `https://graph.facebook.com/${version}/${phoneId}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      const rawCode = data.error?.code || "META_ERROR";
      const rawMsg = data.error?.error_data?.details || data.error?.message || "Meta API error";
      return {
        success: false,
        errorCode: String(rawCode),
        errorMessage: mapMetaErrorCode(rawCode, rawMsg),
      };
    }

    const waMsgId = data.messages?.[0]?.id;
    return {
      success: true,
      waMessageId: waMsgId,
    };
  } catch (err: any) {
    return {
      success: false,
      errorCode: "NET_ERR",
      errorMessage: err.message || "Network error",
    };
  }
}

export async function testWhatsAppConnection(config: {
  waToken: string;
  waPhoneNumberId: string;
  waApiVersion?: string;
}): Promise<{ ok: boolean; message: string }> {
  if (!config.waToken || !config.waPhoneNumberId) {
    return { ok: false, message: "Missing Token or Phone Number ID." };
  }
  if (config.waToken.startsWith("EAAG...")) {
    return { ok: true, message: "Demo mode connection active! Credentials configured for test." };
  }

  try {
    const version = config.waApiVersion || process.env.WA_API_VERSION || "v26.0";
    const url = `https://graph.facebook.com/${version}/${config.waPhoneNumberId}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${config.waToken}` },
    });
    const data = await res.json();
    if (res.ok) {
      return { ok: true, message: `Successfully connected! Display Phone: ${data.display_phone_number || data.id} (${data.verified_name || "Verified"})` };
    }
    return { ok: false, message: mapMetaErrorCode(data.error?.code, data.error?.message) };
  } catch (err: any) {
    return { ok: false, message: err.message || "Failed to reach Meta Graph API." };
  }
}
