import { afterEach, describe, expect, test } from "bun:test"
import { createQaNotificationPreviews } from "./qa-preview"
import { createNotificationEmailDraft } from "./types/shared"
import {
  createServerNotificationService,
  getServerEmailDeliveryConfig,
} from "./server"

const env = process.env as Record<string, string | undefined>
const originalFetch = globalThis.fetch
const originalConsoleError = console.error
const originalConsoleLog = console.log

const originalEnv = {
  appEnv: env.APP_ENV,
  emailDeliveryMode: env.EMAIL_DELIVERY_MODE,
  emailFromAddress: env.EMAIL_FROM_ADDRESS,
  emailQaDomainRoutes: env.EMAIL_QA_DOMAIN_ROUTES,
  emailTestMode: env.EMAIL_TEST_MODE,
  emailTestRecipient: env.EMAIL_TEST_RECIPIENT,
  nodeEnv: env.NODE_ENV,
  qaPolicyReadKey: env.QA_POLICY_READ_KEY,
  qaPolicyUrl: env.QA_POLICY_URL,
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
  restoreEnvValue("QA_POLICY_READ_KEY", originalEnv.qaPolicyReadKey)
  restoreEnvValue("QA_POLICY_URL", originalEnv.qaPolicyUrl)
  restoreEnvValue("RESEND_API_KEY", originalEnv.resendApiKey)
  restoreEnvValue("TEST_EMAIL", originalEnv.testEmail)
  restoreEnvValue("VERCEL_ENV", originalEnv.vercelEnv)
  globalThis.fetch = originalFetch
  console.error = originalConsoleError
  console.log = originalConsoleLog
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

// Routes come from the env var unless a test opts into Oversight's policy.
delete env.QA_POLICY_URL

describe("server notification delivery", () => {
  test("logs bounded failure details without the recipient or provider response", async () => {
    const errors: string[] = []
    console.error = (...values) => errors.push(values.map(String).join(" "))
    // Keep React's test-process runtime stable; APP_ENV owns routing policy.
    env.NODE_ENV = "development"
    env.APP_ENV = "production"
    env.EMAIL_DELIVERY_MODE = "live"
    delete env.EMAIL_QA_DOMAIN_ROUTES
    delete env.EMAIL_TEST_MODE
    delete env.EMAIL_TEST_RECIPIENT
    delete env.TEST_EMAIL
    delete env.VERCEL_ENV
    env.RESEND_API_KEY = "re_test"
    env.EMAIL_FROM_ADDRESS = "noreply@example.com"
    globalThis.fetch = async () =>
      new Response("Rejected private@example.test with secret-token", {
        status: 503,
      })

    const delivery = await createServerNotificationService().tryEmail({
      ...testDraft("private@example.test"),
      bodyHtml: "<p>Safe test body.</p>",
      bodyTemplate: undefined,
      notificationType: "private@example.test-secret-token",
    })

    expect(delivery.status).toBe("failed")
    expect(delivery.errorMessage).toBe("Email delivery failed.")
    expect(errors).toHaveLength(2)
    expect(errors.join(" ")).toContain("Email delivery attempt failed.")
    expect(errors.join(" ")).not.toContain("private@example.test")
    expect(errors.join(" ")).not.toContain("secret-token")
  })
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
    env.NODE_ENV = "development"
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

  test("never calls the provider outside production, even for QA domains", async () => {
    const logs: string[] = []
    let providerCalls = 0
    console.log = (...values) => logs.push(values.map(String).join(" "))
    globalThis.fetch = async () => {
      providerCalls += 1
      return new Response(JSON.stringify({ id: "unexpected" }), { status: 200 })
    }
    env.EMAIL_QA_DOMAIN_ROUTES = JSON.stringify({
      "ishaq.qa.test": "ishaq@example.com",
    })
    env.RESEND_API_KEY = "re_test"
    env.EMAIL_FROM_ADDRESS = "noreply@example.com"
    delete env.EMAIL_DELIVERY_MODE
    delete env.EMAIL_TEST_MODE
    delete env.EMAIL_TEST_RECIPIENT
    delete env.TEST_EMAIL

    for (const runtime of [
      { APP_ENV: "local", NODE_ENV: "development" },
      { APP_ENV: "development", NODE_ENV: "development" },
      { APP_ENV: "test", NODE_ENV: "test" },
      { APP_ENV: "staging", NODE_ENV: "development" },
      { APP_ENV: "preview", NODE_ENV: "production", VERCEL_ENV: "preview" },
      { NODE_ENV: "development" },
    ]) {
      restoreEnvValue("APP_ENV", runtime.APP_ENV)
      restoreEnvValue("VERCEL_ENV", runtime.VERCEL_ENV)
      env.NODE_ENV = runtime.NODE_ENV

      for (const recipient of ["member@ishaq.qa.test", "member@example.com"]) {
        const delivery = await createServerNotificationService().tryEmail(
          testDraft(recipient)
        )

        expect(delivery.status).toBe("sent")
        expect(delivery.routing?.deliveredRecipients).toEqual([])
        expect(delivery.routing?.suppressed).toBeDefined()
      }
    }

    expect(providerCalls).toBe(0)
    expect(logs.join(" ")).not.toContain("member@")
    expect(logs.join(" ")).toContain("email.suppressed")
  })

  test("a development profile logs the full link and offers a local QA preview", async () => {
    const logs: string[] = []
    console.log = (...values) => logs.push(values.map(String).join(" "))
    env.APP_ENV = "local"
    env.NODE_ENV = "development"
    delete env.VERCEL_ENV
    delete env.EMAIL_DELIVERY_MODE
    delete env.EMAIL_QA_DOMAIN_ROUTES

    const delivery = await createServerNotificationService().tryEmail({
      ...testDraft("member@example.com"),
      actionUrl: "https://tenant.localhost/login/reset/confirm?token=dev-token",
    })

    expect(delivery.routing?.suppressed).toBe("development")
    expect(delivery.routing?.mode).toBe("console")
    expect(logs.join(" ")).toContain("token=dev-token")
    expect(createQaNotificationPreviews([delivery])).toHaveLength(1)
  })

  test("does not log a verification link or offer a preview for a real Preview recipient", async () => {
    const logs: string[] = []
    console.log = (...values) => logs.push(values.map(String).join(" "))
    env.APP_ENV = "preview"
    env.VERCEL_ENV = "preview"
    env.NODE_ENV = "development"
    env.EMAIL_DELIVERY_MODE = "console"
    env.EMAIL_QA_DOMAIN_ROUTES = JSON.stringify({
      "ishaq.qa.test": "ishaq@example.com",
    })
    delete env.EMAIL_TEST_MODE
    delete env.EMAIL_TEST_RECIPIENT
    delete env.TEST_EMAIL

    const delivery = await createServerNotificationService().tryEmail({
      ...testDraft("member@example.com"),
      actionUrl:
        "https://halaalvest.com/delete-account/verify?challenge=c1#token=private-token",
    })

    expect(delivery.status).toBe("sent")
    expect(delivery.routing?.suppressed).toBe("non_production")
    expect(createQaNotificationPreviews([delivery])).toEqual([])
    expect(logs.join(" ")).not.toContain("private-token")
    expect(logs.join(" ")).not.toContain("challenge=c1")
    expect(logs.join(" ")).not.toContain("member@example.com")
    expect(logs.join(" ")).toContain(
      "https://halaalvest.com/delete-account/verify"
    )
  })

  test("a Preview QA-domain recipient gets a QA preview instead of an email", async () => {
    let providerCalls = 0
    console.log = () => undefined
    globalThis.fetch = async () => {
      providerCalls += 1
      return new Response("{}", { status: 200 })
    }
    env.APP_ENV = "preview"
    env.VERCEL_ENV = "preview"
    env.NODE_ENV = "production"
    env.EMAIL_DELIVERY_MODE = "console"
    env.EMAIL_QA_DOMAIN_ROUTES = JSON.stringify({
      "ishaq.qa.test": "ishaq@example.com",
    })
    env.RESEND_API_KEY = "re_test"
    env.EMAIL_FROM_ADDRESS = "noreply@example.com"

    const delivery = await createServerNotificationService().tryEmail(
      testDraft("member@ishaq.qa.test")
    )

    expect(providerCalls).toBe(0)
    expect(delivery.routing?.mode).toBe("qa_domain")
    expect(createQaNotificationPreviews([delivery])).toHaveLength(1)
  })

  test("Oversight's QA policy owns the routes when QA_POLICY_URL is set", async () => {
    console.log = () => undefined
    let policyAvailable = true
    let providerCalls = 0
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      if (String(input).includes("/api/qa-policy/")) {
        if (!policyAvailable)
          return new Response("<!DOCTYPE html>", { status: 502 })
        return Response.json({
          projectId: "halaalvest",
          revision: 1,
          environments: { development: true, preview: true },
          entries: [
            {
              id: "57da5d46-6b28-44ef-8be7-d29eb6171f3f",
              qa: "fresh.qa.test",
              email: "fresh-tester@example.com",
              phone: null,
              accountId: null,
              active: true,
            },
          ],
        })
      }
      providerCalls += 1
      return new Response("{}", { status: 200 })
    }) as typeof fetch
    env.APP_ENV = "preview"
    env.VERCEL_ENV = "preview"
    env.NODE_ENV = "production"
    env.EMAIL_DELIVERY_MODE = "console"
    // A stale env route no longer decides once Oversight owns QA.
    env.EMAIL_QA_DOMAIN_ROUTES = JSON.stringify({
      "ishaq.qa.test": "ishaq@example.com",
    })
    env.QA_POLICY_URL =
      "https://oversight.example.test/api/qa-policy/v1/halaalvest"
    env.QA_POLICY_READ_KEY = crypto.randomUUID()

    const fresh = await createServerNotificationService().tryEmail(
      testDraft("owner@fresh.qa.test")
    )
    expect(fresh.status).toBe("sent")
    expect(fresh.routing?.mode).toBe("qa_domain")
    expect(providerCalls).toBe(0)

    const stale = await createServerNotificationService().tryEmail(
      testDraft("owner@ishaq.qa.test")
    )
    expect(stale.status).toBe("failed")

    // An unreachable policy fails closed for QA recipients.
    policyAvailable = false
    env.QA_POLICY_READ_KEY = crypto.randomUUID()
    const unreachable = await createServerNotificationService().tryEmail(
      testDraft("owner@fresh.qa.test")
    )
    expect(unreachable.status).toBe("failed")
  })

  test("production fails closed: every production signal sends live and refuses console", async () => {
    let providerCalls = 0
    globalThis.fetch = async () => {
      providerCalls += 1
      return new Response(JSON.stringify({ id: "email_live" }), {
        headers: { "content-type": "application/json" },
        status: 200,
      })
    }
    env.RESEND_API_KEY = "re_test"
    env.EMAIL_FROM_ADDRESS = "noreply@example.com"
    delete env.EMAIL_DELIVERY_MODE
    delete env.EMAIL_QA_DOMAIN_ROUTES
    delete env.EMAIL_TEST_MODE
    delete env.EMAIL_TEST_RECIPIENT
    delete env.TEST_EMAIL

    for (const runtime of [
      { APP_ENV: "production", NODE_ENV: "development" },
      { APP_ENV: "local", NODE_ENV: "development", VERCEL_ENV: "production" },
      { NODE_ENV: "production" },
    ]) {
      restoreEnvValue("APP_ENV", runtime.APP_ENV)
      restoreEnvValue("VERCEL_ENV", runtime.VERCEL_ENV)
      env.NODE_ENV = runtime.NODE_ENV
      delete env.EMAIL_DELIVERY_MODE

      const delivery = await createServerNotificationService().tryEmail(
        testDraft("member@example.com")
      )

      expect(delivery.status).toBe("sent")
      expect(delivery.routing?.mode).toBe("live")
      expect(delivery.routing?.suppressed).toBeUndefined()

      env.EMAIL_DELIVERY_MODE = "console"
      expect(() => createServerNotificationService()).toThrow(
        "EMAIL_DELIVERY_MODE=console is not allowed in the production runtime."
      )
    }

    expect(providerCalls).toBe(3)
  })
})
