export let lastWebhookReceivedAt: Date | null = null;

export function setLastWebhookReceivedAt(date: Date) {
  lastWebhookReceivedAt = date;
}
