import { afterEach, describe, expect, test } from "bun:test"
import {
  createResendEmailTransport,
  NotificationService,
  type NotificationEmailDraft,
} from "./index"

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

function testDraft(recipient: string): NotificationEmailDraft {
  return {
    actionLabel: "Open dashboard",
    actionUrl: "https://tenant.example.test/dashboard",
    bodyHtml: "<p>Test notification body.</p>",
    bodyText: "Test notification body.",
    notificationType: "test.notification",
    previewText: "Test notification body.",
    recipient: {
      email: recipient,
      kind: "email",
      value: recipient,
    },
    subject: "Test notification",
  }
}

describe("Resend email transport routing", () => {
  test("changes only the provider envelope for a QA domain route", async () => {
    let providerPayload: Record<string, unknown> | undefined

    globalThis.fetch = async (_input, init) => {
      providerPayload = JSON.parse(String(init?.body)) as Record<
        string,
        unknown
      >

      return new Response(JSON.stringify({ id: "email_qa_123" }), {
        headers: {
          "content-type": "application/json",
        },
        status: 200,
      })
    }

    const transport = createResendEmailTransport({
      apiKey: "re_test",
      deliveryMode: "qa_routed",
      from: "Halaalvest <notifications@example.com>",
      qaDomainRoutes: new Map([["ishaq.qa.test", "ishaq@example.com"]]),
    })
    const draft = testDraft("member-001@ishaq.qa.test")
    const delivery = await transport.send(draft)

    expect(providerPayload?.to).toEqual(["ishaq@example.com"])
    expect(providerPayload?.subject).toBe(
      "[QA: member-001@ishaq.qa.test] Test notification"
    )
    expect(providerPayload?.text).toContain(
      "Original recipient: member-001@ishaq.qa.test"
    )
    expect(providerPayload?.html).toContain("QA routed email")
    expect(providerPayload?.bcc).toBeUndefined()
    expect(providerPayload?.tags).toEqual([
      { name: "notification_type", value: "test_notification" },
    ])
    expect(delivery.draft).toBe(draft)
    expect(delivery.routing).toEqual({
      deliveredRecipients: ["ishaq@example.com"],
      mode: "qa_domain",
      originalRecipient: "member-001@ishaq.qa.test",
    })
  })

  test("returns routing metadata when the provider rejects a QA email", async () => {
    globalThis.fetch = async () =>
      new Response("provider unavailable", {
        status: 503,
      })

    const transport = createResendEmailTransport({
      apiKey: "re_test",
      deliveryMode: "qa_routed",
      from: "Halaalvest <notifications@example.com>",
      qaDomainRoutes: new Map([["ishaq.qa.test", "ishaq@example.com"]]),
    })

    await expect(
      transport.send(testDraft("member-001@ishaq.qa.test"))
    ).rejects.toMatchObject({
      emailRouting: {
        deliveredRecipients: ["ishaq@example.com"],
        mode: "qa_domain",
        originalRecipient: "member-001@ishaq.qa.test",
      },
    })
  })

  test("fails closed with QA routing metadata for an unmatched domain", async () => {
    const service = new NotificationService(
      () => "notification-test",
      createResendEmailTransport({
        apiKey: "re_test",
        deliveryMode: "qa_routed",
        from: "Halaalvest <notifications@example.com>",
        qaDomainRoutes: new Map([["ishaq.qa.test", "ishaq@example.com"]]),
      })
    )

    const delivery = await service.tryEmail(
      testDraft("member@unmapped.qa.test")
    )

    expect(delivery.status).toBe("failed")
    expect(delivery.routing).toEqual({
      deliveredRecipients: [],
      mode: "qa_domain",
      originalRecipient: "member@unmapped.qa.test",
    })
  })
})
