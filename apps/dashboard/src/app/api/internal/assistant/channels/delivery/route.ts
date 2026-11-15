import { assistantChannelRoutes } from "@halaalvest/api/assistant-channels"

// Machine-only: called by the `assistant-channel-delivery` Trigger.dev job
// with ASSISTANT_CHANNEL_WORKER_SECRET. 404 until that secret is set. The
// job's request timeout (70 s) must stay above this route's maxDuration.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

export const POST = assistantChannelRoutes.deliveryWorker.POST
