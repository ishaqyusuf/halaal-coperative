import { afterEach, describe, expect, test } from "bun:test"
import {
  createMarketingEarlyAccessRequestEmail,
  createResendEmailTransport,
  createSignupVerificationEmail,
  NotificationService,
  type NotificationEmailDraft,
} from "./index"

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

function testDraft(
  recipient: string,
  sender?: NotificationEmailDraft["sender"]
): NotificationEmailDraft {
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
    sender,
    subject: "Test notification",
  }
}

describe("Resend email transport routing", () => {
  test("keeps the tenant address stable when the cooperative display name changes", async () => {
    const providerPayloads: Record<string, unknown>[] = []

    globalThis.fetch = async (_input, init) => {
      providerPayloads.push(
        JSON.parse(String(init?.body)) as Record<string, unknown>
      )

      return new Response(JSON.stringify({ id: "email_renamed_123" }), {
        headers: {
          "content-type": "application/json",
        },
        status: 200,
      })
    }

    const transport = createResendEmailTransport({
      apiKey: "re_test",
      deliveryMode: "live",
      from: "Halaalvest <notifications@halaalvest.com>",
    })
    const localPart = "a".repeat(63)

    await transport.send(
      testDraft("member@example.com", {
        displayName: "Original Cooperative",
        localPart,
      })
    )
    await transport.send(
      testDraft("member@example.com", {
        displayName: "Renamed Cooperative",
        localPart,
      })
    )

    expect(providerPayloads.map((payload) => payload.from)).toEqual([
      `"Original Cooperative" <${localPart}@halaalvest.com>`,
      `"Renamed Cooperative" <${localPart}@halaalvest.com>`,
    ])
  })

  test("preserves the configured platform sender when no tenant identity exists", async () => {
    let providerPayload: Record<string, unknown> | undefined

    globalThis.fetch = async (_input, init) => {
      providerPayload = JSON.parse(String(init?.body)) as Record<
        string,
        unknown
      >

      return new Response(JSON.stringify({ id: "email_platform_123" }), {
        headers: {
          "content-type": "application/json",
        },
        status: 200,
      })
    }

    const transport = createResendEmailTransport({
      apiKey: "re_test",
      deliveryMode: "live",
      from: "Halaalvest <notifications@halaalvest.com>",
    })

    await transport.send(testDraft("member@example.com"))

    expect(providerPayload?.from).toBe(
      '"Halaalvest" <notifications@halaalvest.com>'
    )
  })

  test("rejects control characters in the configured platform sender", async () => {
    let providerCalled = false

    globalThis.fetch = async () => {
      providerCalled = true
      return new Response(JSON.stringify({ id: "unexpected" }), {
        status: 200,
      })
    }

    const transport = createResendEmailTransport({
      apiKey: "re_test",
      deliveryMode: "live",
      from: "Halaalvest\r\nBcc: attacker@example.com <notifications@halaalvest.com>",
    })

    await expect(
      transport.send(testDraft("member@example.com"))
    ).rejects.toThrow("Invalid configured email sender address")
    expect(providerCalled).toBe(false)
  })

  test("uses the cooperative display name and slug on the configured sending domain", async () => {
    let providerPayload: Record<string, unknown> | undefined

    globalThis.fetch = async (_input, init) => {
      providerPayload = JSON.parse(String(init?.body)) as Record<
        string,
        unknown
      >

      return new Response(JSON.stringify({ id: "email_tenant_123" }), {
        headers: {
          "content-type": "application/json",
        },
        status: 200,
      })
    }

    const transport = createResendEmailTransport({
      apiKey: "re_test",
      deliveryMode: "live",
      from: "Halaalvest <notifications@halaalvest.com>",
    })

    await transport.send(
      testDraft("member@example.com", {
        displayName: 'Kaduna Reliable "Health"\u0000 Workers\r\nSociety\u001b',
        localPart: "kaduna-reliable-health-workers-society-723",
      })
    )

    expect(providerPayload?.from).toBe(
      '"Kaduna Reliable \\"Health\\" Workers Society" <kaduna-reliable-health-workers-society-723@halaalvest.com>'
    )
    expect(providerPayload?.subject).toBe("Test notification")
  })

  test("rejects an invalid cooperative sender local part before provider delivery", async () => {
    let providerCalled = false

    globalThis.fetch = async () => {
      providerCalled = true
      return new Response(JSON.stringify({ id: "unexpected" }), {
        status: 200,
      })
    }

    const transport = createResendEmailTransport({
      apiKey: "re_test",
      deliveryMode: "live",
      from: "Halaalvest <notifications@halaalvest.com>",
    })

    await expect(
      transport.send(
        testDraft("member@example.com", {
          displayName: "Invalid Cooperative",
          localPart: "Invalid Cooperative",
        })
      )
    ).rejects.toThrow("Invalid cooperative email sender local part")
    expect(providerCalled).toBe(false)
  })

  test("rejects malformed configured sender addresses before provider delivery", async () => {
    let providerCalled = false

    globalThis.fetch = async () => {
      providerCalled = true
      return new Response(JSON.stringify({ id: "unexpected" }), {
        status: 200,
      })
    }

    const transport = createResendEmailTransport({
      apiKey: "re_test",
      deliveryMode: "live",
      from: "Halaalvest <notifications@bad..example.com>",
    })

    await expect(
      transport.send(
        testDraft("member@example.com", {
          displayName: "Demo Cooperative",
          localPart: "demo-cooperative",
        })
      )
    ).rejects.toThrow("Invalid configured email sender address")
    expect(providerCalled).toBe(false)
  })

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
      deliveryMode: "live",
      from: "Halaalvest <notifications@example.com>",
      qaDomainRoutes: new Map([["ishaq.qa.test", "ishaq@example.com"]]),
    })
    const draft = testDraft("member-001@ishaq.qa.test", {
      displayName: "Demo Cooperative",
      localPart: "demo-cooperative",
    })
    const delivery = await transport.send(draft)

    expect(providerPayload?.from).toBe(
      '"Demo Cooperative" <demo-cooperative@example.com>'
    )
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
      deliveryMode: "live",
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
        deliveryMode: "live",
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

describe("notification sender lifecycle", () => {
  test("adds the chosen workspace slug after signup reaches tenant context", () => {
    const draft = createSignupVerificationEmail({
      expiresAt: "2026-07-28T00:00:00.000Z",
      recipientEmail: "owner@example.com",
      recipientName: "Aisha Bello",
      tenantName: "Demo Cooperative",
      tenantSlug: "demo-cooperative",
      verificationUrl: "https://halaalvest.com/onboarding",
    })

    expect(draft.sender).toEqual({
      displayName: "Demo Cooperative",
      localPart: "demo-cooperative",
    })
  })

  test("keeps pre-workspace early-access mail on the platform sender", () => {
    const draft = createMarketingEarlyAccessRequestEmail({
      approvalUrl: "https://halaalvest.com/approve",
      contactEmail: "owner@example.com",
      contactName: "Aisha Bello",
      currentSizeLabel: "1-50 members",
      launchTimelineLabel: "This month",
      recordSystemLabel: "Spreadsheets",
      recipientEmail: "admin@halaalvest.com",
      recipientName: "Halaalvest admin",
      requestedAt: "2026-07-27T00:00:00.000Z",
      setupNeedLabels: ["Member records"],
      tenantName: "Proposed Cooperative",
    })

    expect(draft.sender).toBeUndefined()
  })
})
