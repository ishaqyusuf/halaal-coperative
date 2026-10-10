import { afterEach, expect, test } from "bun:test"
import {
  issueAnalyticsContext,
  verifyAnalyticsContext,
} from "./attribution.server"
import { safeProperties } from "./attribution"
const original = process.env.LOGLY_ATTRIBUTION_SECRET
afterEach(() => {
  if (original === undefined) delete process.env.LOGLY_ATTRIBUTION_SECRET
  else process.env.LOGLY_ATTRIBUTION_SECRET = original
})
const now = Date.parse("2026-10-01T12:00:00Z")
function issue(
  project: "halaalvest-mobile" | "halaalvest-dashboard" = "halaalvest-dashboard"
) {
  process.env.LOGLY_ATTRIBUTION_SECRET =
    "test-only-secret-with-at-least-32-characters"
  return issueAnalyticsContext({
    project,
    user: { id: "private-user" },
    tenant: { id: "private-tenant", name: "Example Cooperative" },
    role: "member",
    now,
  })!
}
test("context has project-scoped opaque user/group references and mutable display name", () => {
  const web = issue()
  const native = issue("halaalvest-mobile")
  const claims = verifyAnalyticsContext(
    web.token,
    "halaalvest-dashboard",
    new Date(now).toISOString(),
    now
  )!
  expect(claims.groups?.business?.properties?.name).toBe("Example Cooperative")
  expect(claims.actorId).not.toBe("private-user")
  expect(claims.groups?.business?.key).not.toBe("private-tenant")
  const nativeClaims = verifyAnalyticsContext(
    native.token,
    "halaalvest-mobile",
    new Date(now).toISOString(),
    now
  )!
  expect(nativeClaims.actorId).not.toBe(claims.actorId)
  const renamed = issueAnalyticsContext({
    project: "halaalvest-dashboard",
    user: { id: "private-user" },
    tenant: { id: "private-tenant", name: "Renamed" },
    now,
  })!
  expect(
    verifyAnalyticsContext(
      renamed.token,
      "halaalvest-dashboard",
      new Date(now).toISOString(),
      now
    )?.groups?.business?.key
  ).toBe(claims.groups?.business?.key)
})
test("rejects tampering, wrong project, capture after expiry, future events and aged retry", () => {
  const context = issue()
  const at = new Date(now).toISOString()
  expect(
    verifyAnalyticsContext(context.token + "x", "halaalvest-dashboard", at, now)
  ).toBeNull()
  expect(
    verifyAnalyticsContext(context.token, "halaalvest-mobile", at, now)
  ).toBeNull()
  expect(
    verifyAnalyticsContext(
      context.token,
      "halaalvest-dashboard",
      new Date(context.expiresAt + 1).toISOString(),
      context.expiresAt + 1
    )
  ).toBeNull()
  expect(
    verifyAnalyticsContext(
      context.token,
      "halaalvest-dashboard",
      new Date(now + 120_000).toISOString(),
      now
    )
  ).toBeNull()
  expect(
    verifyAnalyticsContext(
      context.token,
      "halaalvest-dashboard",
      at,
      now + 86_400_001
    )
  ).toBeNull()
  expect(
    verifyAnalyticsContext(
      context.token,
      "halaalvest-dashboard",
      at,
      now + 7_200_000
    )
  ).not.toBeNull()
})
test("public tenant context has group without account and unset config stays anonymous", () => {
  issue()
  const context = issueAnalyticsContext({
    project: "halaalvest-dashboard",
    tenant: { id: "tenant", name: "Public" },
    now,
  })!
  const claims = verifyAnalyticsContext(
    context.token,
    "halaalvest-dashboard",
    new Date(now).toISOString(),
    now
  )!
  expect(claims.actorId).toBeUndefined()
  expect(claims.properties.surface).toBe("tenant_site")
  delete process.env.LOGLY_ATTRIBUTION_SECRET
  expect(issueAnalyticsContext({ project: "halaalvest-dashboard" })).toBeNull()
  expect(
    safeProperties({ email: "private", channel: "pos", item_count: 3 })
  ).toEqual({ channel: "pos", item_count: 3 })
})
