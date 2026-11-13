import { describe, expect, test } from "bun:test"
import { createHmac } from "node:crypto"
import {
  cooperativePaystackConfig,
  canUseCooperativePaystack,
} from "./cooperative-paystack"
import { verifyPaystackWebhookSignature } from "./cooperative-paystack-webhook"

const tenantId = "079b72d3-725a-4b77-8ab6-f5a9749e45f7"

describe("cooperative Paystack environment", () => {
  test("matches the Vercel target and keeps checkout disabled by default", () => {
    expect(
      cooperativePaystackConfig({
        VERCEL_ENV: "production",
        PAYSTACK_SECRET_KEY: "sk_test_fixture",
      })
    ).toBeNull()
    expect(
      cooperativePaystackConfig({
        VERCEL_ENV: "preview",
        APP_ENV: "production",
        PAYSTACK_SECRET_KEY: "sk_live_fixture",
      })
    ).toBeNull()
    const config = cooperativePaystackConfig({
      VERCEL_ENV: "preview",
      NODE_ENV: "production",
      PAYSTACK_SECRET_KEY: "sk_test_fixture",
      PAYSTACK_SANDBOX_TENANT_ID: tenantId,
    })!
    expect(config.mode).toBe("test")
    expect(config.checkoutEnabled).toBe(false)
    expect(canUseCooperativePaystack(config, tenantId)).toBe(true)
    expect(canUseCooperativePaystack(config, crypto.randomUUID())).toBe(false)
  })
})

describe("Paystack webhook signatures", () => {
  const body = Buffer.from('{"event":"charge.success","data":{}}')
  const config = {
    secret: "sk_test_fixture",
    signingSecret: "whsec_fixture",
  }
  const now = 1_760_270_400
  const legacy = createHmac("sha512", config.secret).update(body).digest("hex")
  const modern = createHmac("sha512", config.signingSecret)
    .update(`${now}.`)
    .update(body)
    .digest("hex")

  test("accepts a correctly signed legacy or timestamped event", () => {
    expect(
      verifyPaystackWebhookSignature(
        body,
        new Headers({
          "x-paystack-signature": legacy,
        }),
        config,
        now
      )
    ).toBe(true)
    expect(
      verifyPaystackWebhookSignature(
        body,
        new Headers({
          "Paystack-Signature": `t=${now},v1=whk_fixture:${modern}`,
        }),
        config,
        now
      )
    ).toBe(true)
  })

  test("rejects altered bytes and stale signatures without downgrading", () => {
    const headers = new Headers({
      "Paystack-Signature": `t=${now},v1=whk_fixture:${modern}`,
      "x-paystack-signature": legacy,
    })
    expect(
      verifyPaystackWebhookSignature(body, headers, config, now + 301)
    ).toBe(false)
    expect(
      verifyPaystackWebhookSignature(
        Buffer.concat([body, Buffer.from(" ")]),
        headers,
        config,
        now
      )
    ).toBe(false)
    expect(
      verifyPaystackWebhookSignature(
        body,
        headers,
        { secret: config.secret },
        now
      )
    ).toBe(false)
  })
})
