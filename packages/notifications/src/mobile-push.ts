import type {
  MobileNotificationActionPayload,
  MobileNotificationCategoryKey,
} from "@halaalvest/domain/mobile-notifications"

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
const EXPO_PUSH_RECEIPTS_URL =
  "https://exp.host/--/api/v2/push/getReceipts"

export type MobilePushMessage = {
  category: MobileNotificationCategoryKey
  data: MobileNotificationActionPayload
  to: string
}

export type MobilePushTicket = {
  errorCode: string | null
  message: string | null
  providerTicketId: string | null
  status: "error" | "ok"
}

export type MobilePushReceipt = {
  errorCode: string | null
  message: string | null
  status: "error" | "ok" | "pending"
}

function channelForCategory(category: MobileNotificationCategoryKey) {
  if (category === "security") return "security"
  if (category === "transactions") return "transactions"
  return "updates"
}

export async function sendExpoMobilePush(
  message: MobilePushMessage,
  fetcher: typeof fetch = fetch
): Promise<MobilePushTicket> {
  const response = await fetcher(EXPO_PUSH_URL, {
    body: JSON.stringify({
      body: "Open Halaalvest to review it.",
      channelId: channelForCategory(message.category),
      data: message.data,
      priority:
        message.category === "security" || message.category === "transactions"
          ? "high"
          : "default",
      sound: "default",
      title: "Halaalvest update",
      to: message.to,
    }),
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    method: "POST",
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) {
    return {
      errorCode: `http_${response.status}`,
      message: "The push provider could not accept this delivery.",
      providerTicketId: null,
      status: "error",
    }
  }

  const payload = (await response.json()) as {
    data?: {
      details?: { error?: unknown }
      id?: unknown
      message?: unknown
      status?: unknown
    }
  }
  const ticket = payload.data
  if (ticket?.status === "ok") {
    return {
      errorCode: null,
      message: null,
      providerTicketId:
        typeof ticket.id === "string" ? ticket.id.slice(0, 160) : null,
      status: "ok",
    }
  }
  return {
    errorCode:
      typeof ticket?.details?.error === "string"
        ? ticket.details.error.slice(0, 80)
        : "provider_rejected",
    message:
      typeof ticket?.message === "string"
        ? ticket.message.slice(0, 240)
        : "The push provider rejected this delivery.",
    providerTicketId: null,
    status: "error",
  }
}

export async function getExpoMobilePushReceipt(
  providerTicketId: string,
  fetcher: typeof fetch = fetch
): Promise<MobilePushReceipt> {
  const ticketId = providerTicketId.trim().slice(0, 160)
  if (!ticketId) {
    return {
      errorCode: "missing_ticket_id",
      message: "The push receipt identifier is missing.",
      status: "error",
    }
  }
  const response = await fetcher(EXPO_PUSH_RECEIPTS_URL, {
    body: JSON.stringify({ ids: [ticketId] }),
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    method: "POST",
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) {
    return {
      errorCode: `http_${response.status}`,
      message: "The push provider receipt is unavailable.",
      status: "error",
    }
  }
  const payload = (await response.json()) as {
    data?: Record<
      string,
      {
        details?: { error?: unknown }
        message?: unknown
        status?: unknown
      }
    >
  }
  const receipt = payload.data?.[ticketId]
  if (!receipt) {
    return { errorCode: null, message: null, status: "pending" }
  }
  if (receipt.status === "ok") {
    return { errorCode: null, message: null, status: "ok" }
  }
  return {
    errorCode:
      typeof receipt.details?.error === "string"
        ? receipt.details.error.slice(0, 80)
        : "provider_rejected",
    message:
      typeof receipt.message === "string"
        ? receipt.message.slice(0, 240)
        : "The push provider rejected this delivery.",
    status: "error",
  }
}
