import { describe, expect, it } from "bun:test"
import {
  createNotificationEmailDraft,
  NotificationService,
} from "@halaalvest/notifications"
import { captureFailedNotificationDelivery } from "./server-notifications"

describe("server notification observability", () => {
  it("captures a failed delivery as a provider failure with its retained cause", async () => {
    const providerCause = new Error("provider rejected a private recipient")
    const notificationService = new NotificationService(() => "unused", {
      send() {
        throw providerCause
      },
    })
    const delivery = await notificationService.tryEmail(
      createNotificationEmailDraft({
        actionLabel: "Open workspace",
        actionUrl: "https://example.test/workspace",
        bodyText: "Your workspace is ready.",
        eventLabel: "Workspace ready",
        notificationType: "workspace_ready",
        previewText: "Your workspace is ready.",
        recipient: {
          email: "private@example.test",
          kind: "email",
          value: "private@example.test",
        },
        sender: {
          displayName: "Halaalvest",
          localPart: "halaalvest",
        },
        subject: "Workspace ready",
      })
    )

    const report = captureFailedNotificationDelivery(delivery)

    expect(report?.classified).toMatchObject({
      code: "PROVIDER_UNAVAILABLE",
      reportable: true,
    })
    expect(report?.reportableError).toBe(providerCause)
    expect(report?.captureContext.tags).toMatchObject({
      operation: "notifications.email.send",
      runtime: "api",
      source: "notification",
    })
    expect(JSON.stringify(report?.captureContext)).not.toContain(
      "private@example.test"
    )
  })
})
