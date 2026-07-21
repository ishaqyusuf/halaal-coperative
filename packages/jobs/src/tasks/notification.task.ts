import { logger, task } from "@trigger.dev/sdk/v3"
import { createWorkspaceReadyEmail } from "@halaalvest/notifications"
import { createServerNotificationService } from "@halaalvest/notifications/server"

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
