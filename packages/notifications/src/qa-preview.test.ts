import { describe, expect, test } from "bun:test"
import type { NotificationEmailDelivery } from "./core-types"
import {
  createQaNotificationPreview,
  createQaNotificationPreviews,
} from "./qa-preview"

function delivery(
  overrides: Partial<NotificationEmailDelivery> = {},
): NotificationEmailDelivery {
  return {
    attempts: 1,
    draft: {
      actionLabel: "Continue setup",
      actionUrl: "https://example.test/onboarding?token=secret",
      bodyText: "Continue setup.",
      notificationType: "signup.verification",
      previewText: "Continue setup.",
      recipient: {
        kind: "email",
        value: "example-cooperative@ishaq.qa.test",
      },
      subject: "Continue setup",
    },
    messageId: "message-1",
    routing: {
      deliveredRecipients: ["ishaq@example.com"],
      mode: "qa_domain",
      originalRecipient: "example-cooperative@ishaq.qa.test",
    },
    status: "sent",
    ...overrides,
  }
}

describe("createQaNotificationPreview", () => {
  test("returns an actionable link for a QA-routed email", () => {
    expect(createQaNotificationPreview(delivery())).toEqual({
      artifacts: [
        {
          kind: "link",
          label: "Continue setup",
          value: "https://example.test/onboarding?token=secret",
        },
      ],
      deliveryStatus: "sent",
      id: "message-1",
      notificationType: "signup.verification",
      recipient: "example-cooperative@ishaq.qa.test",
    })
  })

  test("does not expose artifacts for live delivery", () => {
    expect(
      createQaNotificationPreview(
        delivery({
          routing: {
            deliveredRecipients: ["member@example.com"],
            mode: "live",
            originalRecipient: "member@example.com",
          },
        }),
      ),
    ).toBeNull()
  })

  test("supports explicit OTP artifacts without parsing the email body", () => {
    const result = createQaNotificationPreview(
      delivery({
        draft: {
          ...delivery().draft,
          actionUrl: "/",
          qaArtifacts: [
            {
              expiresAt: "2026-07-24T12:00:00.000Z",
              kind: "otp",
              label: "Verification code",
              value: "482193",
            },
          ],
        },
      }),
    )

    expect(result?.artifacts).toEqual([
      {
        expiresAt: "2026-07-24T12:00:00.000Z",
        kind: "otp",
        label: "Verification code",
        value: "482193",
      },
    ])
  })

  test("ignores non-actionable root links", () => {
    expect(
      createQaNotificationPreview(
        delivery({
          draft: {
            ...delivery().draft,
            actionUrl: "/",
          },
        }),
      ),
    ).toBeNull()
  })

  test("preserves recipient and delivery status across multiple deliveries", () => {
    const previews = createQaNotificationPreviews([
      delivery(),
      delivery({
        messageId: "message-2",
        routing: {
          deliveredRecipients: ["mubarak@example.com"],
          mode: "qa_domain",
          originalRecipient: "member@mubarak.qa.test",
        },
        status: "failed",
      }),
    ])

    expect(previews).toHaveLength(2)
    expect(previews[1]).toMatchObject({
      deliveryStatus: "failed",
      id: "message-2",
      recipient: "member@mubarak.qa.test",
    })
  })
})
