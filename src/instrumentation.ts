export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { resumeInterruptedCampaigns } = await import("@/lib/queue");
      await resumeInterruptedCampaigns();
    } catch (err) {
      console.warn("[Instrumentation] Failed to resume interrupted campaigns on startup:", err);
    }
  }
}

