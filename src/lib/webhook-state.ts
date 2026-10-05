export let lastWebhookReceivedAt: Date | null = null;

export interface MessageDeliveryStatus {
  waMessageId: string;
  recipientId: string;
  status: "sent" | "delivered" | "read" | "failed";
  errorCode?: string;
  errorMessage?: string;
  timestamp: Date;
}

const statusStore = new Map<string, MessageDeliveryStatus>();

export function setLastWebhookReceivedAt(date: Date) {
  lastWebhookReceivedAt = date;
}

export function recordMessageDeliveryStatus(data: MessageDeliveryStatus) {
  statusStore.set(data.waMessageId, data);
  // Keep store from growing indefinitely
  if (statusStore.size > 1000) {
    const oldestKey = statusStore.keys().next().value;
    if (oldestKey) statusStore.delete(oldestKey);
  }
}

export function getMessageDeliveryStatus(waMessageId: string): MessageDeliveryStatus | undefined {
  return statusStore.get(waMessageId);
}
