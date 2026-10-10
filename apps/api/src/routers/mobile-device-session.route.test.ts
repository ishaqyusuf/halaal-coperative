import { describe, expect, test } from "bun:test"

import { getMobileSessionRefreshBounds } from "./mobile-device-session.route"

describe("mobile device session refresh bounds", () => {
  test("keeps ordinary mobile refreshes on the standard session policy", () => {
    expect(getMobileSessionRefreshBounds({})).toEqual({})
  })

  test("preserves QA authorization and its original expiry", () => {
    expect(
      getMobileSessionRefreshBounds({
        qaAuthorizationId: "qa-authorization-id",
        sessionExpiresAt: 1_788_000_000_000,
      })
    ).toEqual({
      expiresAt: 1_788_000_000_000,
      qaAuthorizationId: "qa-authorization-id",
    })
  })

  test("fails closed when a QA-authorized session has no expiry", () => {
    expect(() =>
      getMobileSessionRefreshBounds({
        qaAuthorizationId: "qa-authorization-id",
      })
    ).toThrow("missing its expiry")
  })
})
