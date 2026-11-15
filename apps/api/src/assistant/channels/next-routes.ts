import {
  getAssistantChannelRuntime,
  handleTelegramWebhook,
  handleWhatsAppVerification,
  handleWhatsAppWebhook,
} from "./routes"
import { handleAssistantChannelWorker } from "./worker"

/**
 * WhatsApp and Telegram assistant routes for the deployed dashboard
 * (`@halaalvest/api/assistant-channels`). Each handler builds the shared
 * runtime on its first request; nothing runs at import.
 *
 * - `/api/webhooks/assistant/telegram` (POST) and `/whatsapp` (GET, POST):
 *   provider webhooks, 404 while the channel flag is off.
 * - `/api/internal/assistant/channels/turn` and `/delivery` (POST): the
 *   channel worker the Trigger.dev jobs call, 404 until its secret is set.
 */
const worker = (kind: "turn" | "delivery") => (request: Request) =>
  handleAssistantChannelWorker(kind, request, {
    secret: () => process.env.ASSISTANT_CHANNEL_WORKER_SECRET,
    runtime: getAssistantChannelRuntime,
    log: (event, detail) =>
      console.warn(`[assistant-channels] ${event}`, detail ?? {}),
  })

export const assistantChannelRoutes = {
  telegramWebhook: {
    POST: (request: Request) =>
      handleTelegramWebhook(request, getAssistantChannelRuntime()),
  },
  whatsAppWebhook: {
    GET: (request: Request) =>
      handleWhatsAppVerification(request, getAssistantChannelRuntime()),
    POST: (request: Request) =>
      handleWhatsAppWebhook(request, getAssistantChannelRuntime()),
  },
  turnWorker: { POST: worker("turn") },
  deliveryWorker: { POST: worker("delivery") },
} as const
