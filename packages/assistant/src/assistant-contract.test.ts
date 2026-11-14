import { describe, expect, test } from "bun:test"
import {
  assistantAnswerSchema,
  assistantProposalSchema,
} from "./contracts"
import { capabilitiesFor, capabilityAllowed } from "./capabilities/manifest"
import { fixtureAnswers, fixtureProposal } from "./fixtures"
import { extractAmount, extractPeriod, routeIntent } from "./intents"
import { formatMoney, money } from "./format"

const now = new Date("2026-11-14T00:00:00Z")

describe("capability registry", () => {
  test("members never get staff capabilities", () => {
    const ids = capabilitiesFor("member", "web").map((c) => c.id)
    expect(ids).toContain("M01")
    expect(ids).not.toContain("S01")
    expect(ids).not.toContain("S04")
  })

  test("staff never get member self-service capabilities", () => {
    const ids = capabilitiesFor("finance_officer", "web").map((c) => c.id)
    expect(ids).toContain("S04")
    expect(ids).not.toContain("M04")
  })

  test("messaging channels are off until the runtime flag enables them", () => {
    expect(capabilityAllowed("M03", "member", "telegram")).toBe(false)
    expect(
      capabilityAllowed("M03", "member", "telegram", {
        messagingChannelEnabled: true,
      })
    ).toBe(true)
    // `off` stays off even with the flag.
    expect(
      capabilityAllowed("M05", "member", "whatsapp", {
        messagingChannelEnabled: true,
      })
    ).toBe(false)
  })
})

describe("intent routing", () => {
  test("plan phrases route to the right capability", () => {
    expect(routeIntent("What's my loan status?", "member", now).capabilityId).toBe("M01")
    expect(routeIntent("What are my total investments?", "member", now).capabilityId).toBe("M02")
    expect(routeIntent("Has my ₦25,000 receipt been approved?", "member", now).capabilityId).toBe("M03")
    expect(routeIntent("I transferred ₦25,000. Here's my receipt.", "member", now).capabilityId).toBe("M04")
    expect(routeIntent("I want to request payment.", "member", now).capabilityId).toBe("M05")
    expect(routeIntent("Find Aisha Bello", "staff", now).capabilityId).toBe("S01")
    expect(routeIntent("Show HV-1048's history for October", "staff", now).capabilityId).toBe("S02")
    expect(routeIntent("Which receipts need review?", "staff", now).capabilityId).toBe("S03")
    const record = routeIntent("Record ₦25,000 from member HV-1048 for November", "staff", now)
    expect(record.capabilityId).toBe("S04")
    expect(record.candidates).toMatchObject({
      amount: "25000",
      memberNumber: "HV-1048",
      period: "2026-11",
    })
  })

  test("amount and period extraction", () => {
    expect(extractAmount("I paid N25k")).toBe("25000")
    expect(extractAmount("₦1,250.50 yesterday")).toBe("1250.50")
    expect(extractAmount("no amount")).toBeNull()
    expect(extractPeriod("for 2026-10", now)).toBe("2026-10")
  })
})

describe("DTO fixtures", () => {
  test("every fixture answer matches the contract", () => {
    for (const answer of Object.values(fixtureAnswers))
      expect(assistantAnswerSchema.safeParse(answer).success).toBe(true)
    expect(assistantProposalSchema.safeParse(fixtureProposal).success).toBe(true)
  })

  test("money formatting", () => {
    expect(formatMoney(money(25000))).toBe("₦25,000")
    expect(formatMoney(money("1250.5"))).toBe("₦1,250.50")
  })
})
