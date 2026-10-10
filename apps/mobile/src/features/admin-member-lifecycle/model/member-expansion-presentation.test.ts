import { describe, expect, test } from "bun:test"
import { getMemberExpansionPresentation } from "./member-expansion-presentation"

describe("member expansion presentation", () => {
  test("fails closed while a legacy cache refreshes", () => {
    expect(getMemberExpansionPresentation(undefined)).toEqual({
      actionLabel: "View plan",
      detail: "Plan status unavailable",
      title: "Member creation unavailable",
    })
  })

  test("stays absent while the tenant can create an active member", () => {
    expect(
      getMemberExpansionPresentation({
        activeMemberCount: 2,
        activeMemberLimit: 100,
        planCode: "free_beta",
        planName: "Free Beta",
        reason: null,
        status: "available",
      })
    ).toBeNull()
  })

  test("presents a compact server-owned at-capacity fact", () => {
    expect(
      getMemberExpansionPresentation({
        activeMemberCount: 1,
        activeMemberLimit: 1,
        planCode: "starter",
        planName: "Starter",
        reason: "active_member_limit_reached",
        status: "at_capacity",
      })
    ).toEqual({
      actionLabel: "View plan",
      detail: "Starter · 1 of 1 active",
      title: "Member capacity reached",
    })
  })

  test("does not mislabel another subscription restriction as capacity", () => {
    expect(
      getMemberExpansionPresentation({
        activeMemberCount: 1,
        activeMemberLimit: 250,
        planCode: "starter",
        planName: "Starter",
        reason: "subscription_past_due",
        status: "restricted",
      })
    ).toEqual({
      actionLabel: "View plan",
      detail: "Starter",
      title: "Member creation unavailable",
    })
  })
})
