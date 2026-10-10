import { describe, expect, test } from "bun:test"
import { presentSubscriptionCheckout } from "./checkout-presentation"

const now = new Date("2026-09-07T12:00:00Z")
const intent = {
  id: "checkout-1",
  requestedPlanCode: "starter" as const,
  status: "ready" as const,
  checkoutUrl: "https://checkout.example.test/session/opaque",
  expiresAt: new Date("2026-09-07T12:30:00Z"),
}

describe("billing checkout presentation", () => {
  test("requires an exact HTTPS host allowlist", () => {
    expect(presentSubscriptionCheckout(intent, [], now).checkoutAvailable).toBe(
      false
    )
    expect(
      presentSubscriptionCheckout(intent, ["checkout.example.test"], now)
        .checkoutAvailable
    ).toBe(true)
    for (const checkoutUrl of [
      "http://checkout.example.test/session",
      "https://checkout.example.test.evil.test/session",
      "https://user:secret@checkout.example.test/session",
      "javascript:alert(1)",
      "https://checkout.example.test:8443/session",
    ]) {
      expect(
        presentSubscriptionCheckout(
          { ...intent, checkoutUrl },
          ["checkout.example.test"],
          now
        ).checkoutUrl
      ).toBeNull()
    }
  })

  test("never exposes expired or terminal checkout links", () => {
    expect(
      presentSubscriptionCheckout(
        { ...intent, expiresAt: now },
        ["checkout.example.test"],
        now
      )
    ).toMatchObject({
      status: "expired",
      checkoutAvailable: false,
      checkoutUrl: null,
    })
    for (const status of [
      "completed",
      "cancelled",
      "failed",
      "expired",
      "pending",
    ] as const) {
      expect(
        presentSubscriptionCheckout(
          { ...intent, status },
          ["checkout.example.test"],
          now
        ).checkoutUrl
      ).toBeNull()
    }
  })

  test("never exposes hosted checkout for a mobile-origin intent", () => {
    expect(
      presentSubscriptionCheckout(
        { ...intent, requestState: { channel: "mobile" } },
        ["checkout.example.test"],
        now
      )
    ).toMatchObject({ checkoutAvailable: false, checkoutUrl: null })
  })
})
