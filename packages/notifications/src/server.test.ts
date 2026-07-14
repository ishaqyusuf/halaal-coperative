import { afterEach, describe, expect, test } from "bun:test"
import { createNotificationEmailDraft } from "./types/shared"
import { createServerNotificationService } from "./server"

const env = process.env as Record<string, string | undefined>

const originalEnv = {
  emailFromAddress: env.EMAIL_FROM_ADDRESS,
  nodeEnv: env.NODE_ENV,
  resendApiKey: env.RESEND_API_KEY,
}

function restoreEnv() {
  env.NODE_ENV = originalEnv.nodeEnv
  if (originalEnv.emailFromAddress === undefined) {
    delete env.EMAIL_FROM_ADDRESS
  } else {
    env.EMAIL_FROM_ADDRESS = originalEnv.emailFromAddress
  }
  if (originalEnv.resendApiKey === undefined) {
    delete env.RESEND_API_KEY
  } else {
    env.RESEND_API_KEY = originalEnv.resendApiKey
  }
}

function testDraft(recipientEmail: string) {
  return createNotificationEmailDraft({
    actionLabel: "Open dashboard",
    actionUrl: "https://tenant.halaalvest-dash.localhost",
    bodyText: "Test notification body.",
    eventLabel: "test.notification",
    notificationType: "test.notification",
    previewText: "Test notification body.",
    recipient: {
      email: recipientEmail,
      kind: "email",
      value: recipientEmail,
    },
    subject: "Test notification",
  })
}

afterEach(() => {
  restoreEnv()
})

describe("server notification delivery", () => {
  test("sends through console transport in local development without provider credentials", async () => {
    env.NODE_ENV = "development"
    delete env.RESEND_API_KEY
    delete env.EMAIL_FROM_ADDRESS

    const delivery = await createServerNotificationService().tryEmail(
      testDraft("aisha@example.test")
    )

    expect(delivery.status).toBe("sent")
    expect(delivery.attempts).toBe(1)
  })

  test("short-circuits reserved test domains to console transport when provider credentials exist locally", async () => {
    env.NODE_ENV = "development"
    env.RESEND_API_KEY = "re_test"
    env.EMAIL_FROM_ADDRESS = "noreply@halaalvest.localhost"

    const delivery = await createServerNotificationService().tryEmail(
      testDraft("aisha@example.test")
    )

    expect(delivery.status).toBe("sent")
    expect(delivery.draft.recipient.value).toBe("aisha@example.test")
  })
})
