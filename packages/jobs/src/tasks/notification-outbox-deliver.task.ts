import type { BackgroundTask } from "../trigger"
import { logger, schedules, task } from "@trigger.dev/sdk/v3"
import {
  emailSmokeTestHandler,
  notificationOutboxDeliverHandler,
  type EmailSmokeTestPayload,
} from "../handlers/notification-outbox-deliver"

export type NotificationOutboxDeliverPayload = {
  includeFailed?: boolean
  limit?: number
  maxAttempts?: number
  tenantId?: string
}

export const notificationOutboxDeliverTask: BackgroundTask<NotificationOutboxDeliverPayload> =
  {
    id: "notification-outbox-deliver",
    run: notificationOutboxDeliverHandler,
  }

export const notificationOutboxDeliverTriggerTask = task({
  id: notificationOutboxDeliverTask.id,
  maxDuration: 60,
  queue: {
    concurrencyLimit: 1,
  },
  run: async (payload: NotificationOutboxDeliverPayload = {}) => {
    const result = await notificationOutboxDeliverHandler(payload)

    logger.info("Delivered notification outbox entries", result)

    return result
  },
})

export const notificationOutboxDeliverSchedule = schedules.task({
  id: "notification-outbox-deliver-schedule",
  cron: {
    pattern: "* * * * *",
    timezone: "UTC",
  },
  maxDuration: 60,
  queue: {
    concurrencyLimit: 1,
  },
  run: async () => {
    const result = await notificationOutboxDeliverHandler({
      includeFailed: true,
      limit: 25,
      maxAttempts: 4,
    })

    logger.info("Scheduled notification outbox drain completed", result)

    return result
  },
})

export const emailSmokeTestTask = task({
  id: "email-smoke-test",
  maxDuration: 60,
  run: async (payload: EmailSmokeTestPayload) => {
    const result = await emailSmokeTestHandler(payload)

    logger.info("Processed email smoke test", {
      messageId: result.messageId,
      outboxId: result.outboxId,
      status: result.status,
    })

    return result
  },
})
