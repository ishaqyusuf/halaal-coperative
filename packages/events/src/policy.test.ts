import { expect, test } from "bun:test"
import { isAllowedOrigin, safeBatch, safeRoute } from "./policy"

test("strips identities, form properties and dynamic route values", () => {
  const batch = safeBatch(
    {
      sentAt: new Date().toISOString(),
      sdk: { name: "@ishaqyusuf/logly-core", version: "0.2.0" },
      events: [
        {
          eventId: crypto.randomUUID(),
          project: "attacker",
          name: "page_view",
          version: 1,
          source: "browser",
          occurredAt: new Date().toISOString(),
          actorId: "private-user-id",
          route: "/members/private-id?email=private",
          referrerHost: "private.example",
          campaign: { source: "private" },
          properties: { email: "private" },
        },
      ],
    },
    "halaalvest-web"
  )
  expect(batch.events[0]).toMatchObject({
    project: "halaalvest-web",
    route: "/members",
    properties: {},
  })
  expect(batch.events[0]).not.toHaveProperty("actorId")
  expect(batch.events[0]).not.toHaveProperty("campaign")
  expect(batch.events[0]).not.toHaveProperty("referrerHost")
  expect(safeRoute("/private-tenant-token")).toBe("/other")
})
test("validates production and local origins without suffix spoofing", () => {
  expect(
    isAllowedOrigin("https://tenant.halaalvest.com", [
      "https://tenant.halaalvest.com",
    ])
  ).toBe(true)
  expect(
    isAllowedOrigin("https://halaalvest.com.evil.test", [
      "https://tenant.halaalvest.com",
    ])
  ).toBe(false)
  expect(
    isAllowedOrigin("https://halaalvest.com/path", [
      "https://tenant.halaalvest.com",
    ])
  ).toBe(false)
  expect(
    isAllowedOrigin("http://tenant.halaalvest.com", [
      "https://tenant.halaalvest.com",
    ])
  ).toBe(false)
  expect(
    isAllowedOrigin("https://tenant.halaalvest.localhost", [
      "https://tenant.halaalvest.localhost",
    ])
  ).toBe(true)
})
