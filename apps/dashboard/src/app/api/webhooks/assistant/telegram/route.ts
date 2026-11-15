import { assistantChannelRoutes } from "@halaalvest/api/assistant-channels"

// Telegram assistant webhook. 404 while ASSISTANT_TELEGRAM_ENABLED is off.
// Verifies the secret header, admits the event, queues the turn job, answers.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

export const POST = assistantChannelRoutes.telegramWebhook.POST
