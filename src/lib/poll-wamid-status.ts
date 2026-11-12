export interface WamidPollUpdate {
  ok: boolean;
  message: string;
  final: boolean;
  details?: any;
}

/**
 * Displays the accepted notice for a wamid and polls `/api/campaigns/status`
 * for ~20 seconds until webhook delivery (`delivered`/`read`) or failure (`failed`).
 * Returns a cancellation function to stop polling if superseded or unmounted.
 */
export function startWamidStatusPolling(
  waMessageId: string | undefined,
  onUpdate: (update: WamidPollUpdate) => void,
  options?: { intervalMs?: number; maxWaitMs?: number }
): () => void {
  const displayId = waMessageId || "OK";
  onUpdate({
    ok: true,
    message: `Accepted by Meta (ID: ${displayId}). Final delivery status will update shortly.`,
    final: false,
  });

  if (!waMessageId) {
    return () => {};
  }

  const intervalMs = options?.intervalMs ?? 2000;
  const maxWaitMs = options?.maxWaitMs ?? 20000;
  const maxAttempts = Math.max(1, Math.ceil(maxWaitMs / intervalMs));

  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let attempts = 0;

  const tick = async () => {
    if (cancelled) return;
    attempts += 1;

    try {
      const res = await fetch(
        `/api/campaigns/status?wamid=${encodeURIComponent(waMessageId)}`,
        { cache: "no-store" }
      );
      const data = await res.json();

      if (cancelled) return;

      if (data?.found) {
        const st = String(data.status || "").toLowerCase();
        if (st === "delivered" || st === "read") {
          onUpdate({
            ok: true,
            message: "Delivered ✅",
            final: true,
            details: data,
          });
          return;
        }
        if (st === "failed") {
          const code = data.errorCode || "ERROR";
          const title = data.errorTitle || data.errorMessage || "Message delivery failed";
          onUpdate({
            ok: false,
            message: `Failed ❌ ${code} — ${title}`,
            final: true,
            details: data,
          });
          return;
        }
      }
    } catch {
      // Ignore transient network errors while polling
    }

    if (!cancelled && attempts < maxAttempts) {
      timer = setTimeout(tick, intervalMs);
    }
  };

  timer = setTimeout(tick, intervalMs);

  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
  };
}

