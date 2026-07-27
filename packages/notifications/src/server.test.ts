import { afterEach, describe, expect, test } from "bun:test"
import { createNotificationEmailDraft } from "./types/shared"
import {
  createServerNotificationService,
  getServerEmailDeliveryConfig,
} from "./server"

const env = process.env as Record<string, string | undefined>
const originalFetch = globalThis.fetch

const originalEnv = {
  appEnv: env.APP_ENV,
  emailDeliveryMode: env.EMAIL_DELIVERY_MODE,
  emailFromAddress: env.EMAIL_FROM_ADDRESS,
  emailQaDomainRoutes: env.EMAIL_QA_DOMAIN_ROUTES,
  emailTestMode: env.EMAIL_TEST_MODE,
  emailTestRecipient: env.EMAIL_TEST_RECIPIENT,
  nodeEnv: env.NODE_ENV,
  resendApiKey: env.RESEND_API_KEY,
  testEmail: env.TEST_EMAIL,
  vercelEnv: env.VERCEL_ENV,
}

function restoreEnvValue(key: string, value: string | undefined) {
  if (value === undefined) {
    delete env[key]
    return
  }

  env[key] = value
}

function restoreEnv() {
  restoreEnvValue("APP_ENV", originalEnv.appEnv)
  restoreEnvValue("EMAIL_DELIVERY_MODE", originalEnv.emailDeliveryMode)
  restoreEnvValue("EMAIL_FROM_ADDRESS", originalEnv.emailFromAddress)
  restoreEnvValue("EMAIL_QA_DOMAIN_ROUTES", originalEnv.emailQaDomainRoutes)
  restoreEnvValue("EMAIL_TEST_MODE", originalEnv.emailTestMode)
  restoreEnvValue("EMAIL_TEST_RECIPIENT", originalEnv.emailTestRecipient)
  restoreEnvValue("NODE_ENV", originalEnv.nodeEnv)
  restoreEnvValue("RESEND_API_KEY", originalEnv.resendApiKey)
  restoreEnvValue("TEST_EMAIL", originalEnv.testEmail)
  restoreEnvValue("VERCEL_ENV", originalEnv.vercelEnv)
  globalThis.fetch = originalFetch
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
  test("uses the platform name instead of a welcome phrase for a bare fallback address", () => {
    env.EMAIL_FROM_ADDRESS = "notifications@halaalvest.com"

    expect(getServerEmailDeliveryConfig().from).toBe(
      "Halaalvest <notifications@halaalvest.com>"
    )
  })

  test("sends through console transport in local development without provider credentials", async () => {
    env.NODE_ENV = "development"
    delete env.EMAIL_QA_DOMAIN_ROUTES
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
    delete env.EMAIL_QA_DOMAIN_ROUTES
    env.RESEND_API_KEY = "re_test"
    env.EMAIL_FROM_ADDRESS = "noreply@halaalvest.localhost"

    const delivery = await createServerNotificationService().tryEmail(
      testDraft("aisha@example.test")
    )

    expect(delivery.status).toBe("sent")
    expect(delivery.draft.recipient.value).toBe("aisha@example.test")
  })

  test("routes production QA domains while ordinary production mail stays live", async () => {
    let providerPayload: Record<string, unknown> | undefined

    env.APP_ENV = "production"
    env.NODE_ENV = "production"
    env.EMAIL_DELIVERY_MODE = "live"
    env.EMAIL_QA_DOMAIN_ROUTES = JSON.stringify({
      "ishaq.qa.test": "ishaq@example.com",
    })
    env.RESEND_API_KEY = "re_test"
    env.EMAIL_FROM_ADDRESS = "noreply@example.com"
    delete env.EMAIL_TEST_MODE
    delete env.EMAIL_TEST_RECIPIENT
    delete env.TEST_EMAIL
    delete env.VERCEL_ENV
    globalThis.fetch = async (_input, init) => {
      providerPayload = JSON.parse(String(init?.body)) as Record<
        string,
        unknown
      >

      return new Response(JSON.stringify({ id: "email_qa_456" }), {
        headers: {
          "content-type": "application/json",
        },
        status: 200,
      })
    }

    const delivery = await createServerNotificationService().tryEmail(
      testDraft("member@ishaq.qa.test")
    )

    expect(providerPayload?.to).toEqual(["ishaq@example.com"])
    expect(delivery.status).toBe("sent")
    expect(delivery.routing?.mode).toBe("qa_domain")
  })

  test("routes configured QA domains through the provider in console environments", async () => {
    let providerPayload: Record<string, unknown> | undefined

    env.APP_ENV = "staging"
    env.NODE_ENV = "production"
    env.EMAIL_DELIVERY_MODE = "console"
    env.EMAIL_QA_DOMAIN_ROUTES = JSON.stringify({
      "ishaq.qa.test": "ishaq@example.com",
    })
    env.RESEND_API_KEY = "re_test"
    env.EMAIL_FROM_ADDRESS = "noreply@example.com"
    globalThis.fetch = async (_input, init) => {
      providerPayload = JSON.parse(String(init?.body)) as Record<
        string,
        unknown
      >

      return new Response(JSON.stringify({ id: "email_qa_console_456" }), {
        headers: { "content-type": "application/json" },
        status: 200,
      })
    }

    const delivery = await createServerNotificationService().tryEmail(
      testDraft("member@ishaq.qa.test")
    )

    expect(providerPayload?.to).toEqual(["ishaq@example.com"])
    expect(delivery.routing?.mode).toBe("qa_domain")
  })
})
