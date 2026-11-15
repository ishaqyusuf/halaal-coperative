import { assistantChannelRoutes } from "@halaalvest/api/assistant-channels"

// WhatsApp assistant webhook. 404 while ASSISTANT_WHATSAPP_ENABLED is off.
// GET is Meta's verify handshake; POST checks X-Hub-Signature-256 over the raw
// body, admits the events, queues the turn jobs and answers.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

export const GET = assistantChannelRoutes.whatsAppWebhook.GET
export const POST = assistantChannelRoutes.whatsAppWebhook.POST
