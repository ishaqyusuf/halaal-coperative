import { logger, task, tasks } from "@trigger.dev/sdk/v3"
import { createWorkspaceReadyEmail } from "@halaalvest/notifications"
import { createServerNotificationService } from "@halaalvest/notifications/server"
import {
  mobilePushDeliveryHandler,
  type MobilePushDeliveryPayload,
} from "../handlers/mobile-push-delivery"
import {
  mobilePushReceiptHandler,
  type MobilePushReceiptPayload,
} from "../handlers/mobile-push-receipt"
import type { BackgroundTask } from "../trigger"

export type EmailSmokeTestPayload = {
  email: string
}

export const emailSmokeTestTask = task({
  id: "email-smoke-test",
  maxDuration: 60,
  run: async (payload: EmailSmokeTestPayload) => {
    const email = payload.email.trim()

    if (!email) {
      throw new Error("email is required for the email smoke test.")
    }

    const draft = createWorkspaceReadyEmail({
      dashboardUrl: "https://app.halaalvest.com",
      recipientEmail: email,
      recipientName: "HalaalVest email smoke test",
      siteUrl: "https://halaalvest.com",
      tenantName: "HalaalVest",
      tenantSlug: "halaalvest",
    })
    const delivery = await createServerNotificationService().tryEmail(draft)

    logger.info("Processed email smoke test", {
      messageId: delivery.messageId,
      status: delivery.status,
    })

    return {
      deliveredRecipients: delivery.routing?.deliveredRecipients,
      errorMessage: delivery.errorMessage,
      messageId: delivery.messageId,
      recipient: delivery.draft.recipient.value,
      routingMode: delivery.routing?.mode,
      status: delivery.status,
    }
  },
})

export const mobilePushDeliveryTask: BackgroundTask<MobilePushDeliveryPayload> = {
  id: "mobile-push-delivery",
  run: mobilePushDeliveryHandler,
}

// Expo receipts are usually ready ~15 minutes after the ticket. The global
// 1–10 s backoff would spend every retry before a pending receipt can change,
// so pending receipts wait minutes between a capped number of attempts.
export const mobilePushReceiptRetry = {
  factor: 2,
  maxAttempts: 3,
  maxTimeoutInMs: 30 * 60_000,
  minTimeoutInMs: 10 * 60_000,
  randomize: true,
} as const

export const mobilePushReceiptTriggerTask = task({
  id: "mobile-push-receipt",
  maxDuration: 60,
  retry: mobilePushReceiptRetry,
  run: async (payload: MobilePushReceiptPayload) => {
    const result = await mobilePushReceiptHandler(payload)
    logger.info("Processed mobile push receipt", {
      notificationId: payload.notificationId,
      ...result,
      tenantId: payload.tenantId,
    })
    return result
  },
})

export const mobilePushDeliveryTriggerTask = task({
  id: mobilePushDeliveryTask.id,
  maxDuration: 90,
  run: async (rawPayload: MobilePushDeliveryPayload) => {
    const result = await mobilePushDeliveryHandler(rawPayload, {
      scheduleReceipt: async (payload) => {
        await tasks.trigger(
          mobilePushReceiptTriggerTask.id,
          payload,
          {
            delay: "15m",
            idempotencyKey: ["mobile-push-receipt", payload.providerTicketId],
            idempotencyKeyTTL: "7d",
            maxAttempts: mobilePushReceiptRetry.maxAttempts,
          }
        )
      },
    })
    logger.info("Processed mobile push delivery", {
      ...result,
      notificationId: rawPayload.notificationId,
      tenantId: rawPayload.tenantId,
    })
    return result
  },
})
