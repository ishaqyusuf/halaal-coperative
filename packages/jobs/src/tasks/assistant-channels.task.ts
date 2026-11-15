import { logger, queue, task } from "@trigger.dev/sdk/v3"
import {
  ASSISTANT_CHANNEL_DELIVERY_JOB_ID,
  ASSISTANT_CHANNEL_DELIVERY_MAX_ATTEMPTS,
  ASSISTANT_CHANNEL_TURN_JOB_ID,
  ASSISTANT_CHANNEL_TURN_MAX_ATTEMPTS,
  type AssistantChannelDeliveryJob,
  type AssistantChannelTurnJob,
  runAssistantChannelDeliveryJob,
  runAssistantChannelTurnJob,
} from "../assistant-channels"

/**
 * Triggered only by an admitted WhatsApp/Telegram event (both flags are off,
 * so nothing runs today). `concurrencyLimit: 1` applies per concurrency key,
 * and every trigger passes the linked chat's key: one run per chat at a time.
 */
const assistantChannelTurnQueue = queue({
  name: "assistant-channel-turn",
  concurrencyLimit: 1,
})

const assistantChannelDeliveryQueue = queue({
  name: "assistant-channel-delivery",
  concurrencyLimit: 1,
})

export const assistantChannelTurnTask = task({
  id: ASSISTANT_CHANNEL_TURN_JOB_ID,
  maxDuration: 180,
  queue: assistantChannelTurnQueue,
  retry: {
    factor: 2,
    maxAttempts: ASSISTANT_CHANNEL_TURN_MAX_ATTEMPTS,
    maxTimeoutInMs: 30_000,
    minTimeoutInMs: 2_000,
    randomize: true,
  },
  run: async (payload: AssistantChannelTurnJob) => {
    const result = await runAssistantChannelTurnJob(payload)
    logger.info("Processed assistant channel turn", result)
    return result
  },
})

// Provider rate limits (429) need seconds, not milliseconds, between tries.
export const assistantChannelDeliveryTask = task({
  id: ASSISTANT_CHANNEL_DELIVERY_JOB_ID,
  maxDuration: 120,
  queue: assistantChannelDeliveryQueue,
  retry: {
    factor: 3,
    maxAttempts: ASSISTANT_CHANNEL_DELIVERY_MAX_ATTEMPTS,
    maxTimeoutInMs: 60_000,
    minTimeoutInMs: 5_000,
    randomize: true,
  },
  run: async (payload: AssistantChannelDeliveryJob) => {
    const result = await runAssistantChannelDeliveryJob(payload)
    logger.info("Processed assistant channel delivery", result)
    return result
  },
})
