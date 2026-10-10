import { expect, test } from "bun:test"
import { buildMemberHomePresentation } from "./member-home-presentation"
import type { MobileMemberHome } from "./member-core-types"

test("unavailable member home never substitutes sample financial data", () => {
  expect(buildMemberHomePresentation(null, "NGN")).toEqual({
    readinessPercentage: null,
    services: [],
    stats: [],
  })
})

test("member home shows only the returned server facts", () => {
  const home = {
    actionItems: [],
    generatedAt: "2026-09-28T08:00:00.000Z",
    member: null,
    readiness: {
      detail: "Review needed",
      percentage: 18,
      status: "needs_attention",
    },
    services: [
      {
        icon: "HandCoins",
        key: "financing",
        label: "Financing",
        tone: "primary",
      },
    ],
    stats: [
      {
        detail: "Posted savings",
        format: "currency",
        key: "savings",
        label: "Savings total",
        value: 860000,
      },
    ],
  } satisfies MobileMemberHome
  expect(buildMemberHomePresentation(home, "NGN")).toMatchObject({
    readinessPercentage: 18,
    services: home.services,
    stats: [{ detail: "Posted savings", label: "Savings total" }],
  })
  expect(buildMemberHomePresentation(home, "NGN").stats[0]?.value).toBe("₦860K")
})
