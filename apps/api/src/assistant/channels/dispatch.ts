import {
  enqueueAssistantChannelDelivery,
  enqueueAssistantChannelTurn,
} from "@halaalvest/jobs/assistant-channels"
import type { AssistantChannelDispatch } from "./runtime"

type Env = Record<string, string | undefined>

/**
 * Durable channel work goes to Trigger.dev when both sides are configured:
 * `TRIGGER_SECRET_KEY` to queue jobs, and `ASSISTANT_CHANNEL_WORKER_SECRET`
 * so the jobs can call back into the channel worker route. Otherwise the
 * runtime processes in process (local API, tests).
 */
export function createAssistantChannelJobDispatch(
  env: Env = process.env,
  enqueue: AssistantChannelDispatch = {
    turn: enqueueAssistantChannelTurn,
    delivery: enqueueAssistantChannelDelivery,
  }
): AssistantChannelDispatch | undefined {
  const triggerKey = env.TRIGGER_SECRET_KEY?.trim()
  const workerSecret = env.ASSISTANT_CHANNEL_WORKER_SECRET?.trim()
  if (!triggerKey || !workerSecret || workerSecret.length < 32) return undefined
  return enqueue
}
