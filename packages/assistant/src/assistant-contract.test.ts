import { describe, expect, test } from "bun:test"
import {
  assistantAnswerSchema,
  assistantProposalSchema,
} from "./contracts"
import { capabilitiesFor, capabilityAllowed } from "./capabilities/manifest"
import { fixtureAnswers, fixtureProposal } from "./fixtures"
import {
  PAYMENT_REFERENCE_MAX,
  extractAmount,
  extractMemberNumber,
  extractPaidOn,
  extractPaymentReference,
  extractPeriod,
  routeIntent,
} from "./intents"
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

  test("member numbers and names in payment requests", () => {
    expect(
      routeIntent("Record ₦500 from member OPA-QA-075233 for November", "staff", now).candidates.memberNumber
    ).toBe("OPA-QA-075233")
    expect(routeIntent("Record 5000 naira from Halima Sani for October", "staff", now).candidates.memberQuery).toBe(
      "Halima Sani"
    )
    expect(routeIntent("Open OPA-7641", "staff", now).candidates.memberNumber).toBe("OPA-7641")
  })

  test("amount and period extraction", () => {
    expect(extractAmount("I paid N25k")).toBe("25000")
    expect(extractAmount("₦1,250.50 yesterday")).toBe("1250.50")
    expect(extractAmount("no amount")).toBeNull()
    expect(extractPeriod("for 2026-10", now)).toBe("2026-10")
  })

  test("amounts in words need a scale word or naira", () => {
    expect(extractAmount("I paid my cooperative five thousand naira yesterday")).toBe("5000")
    expect(extractAmount("twenty-five thousand")).toBe("25000")
    expect(extractAmount("2.5 million naira")).toBe("2500000")
    expect(extractAmount("one hundred and fifty naira")).toBe("150")
    expect(extractAmount("one of my receipts")).toBeNull()
    expect(extractAmount("₦5,000 and five thousand")).toBe("5000")
  })

  test("payment dates in Lagos, never in the future", () => {
    // 14 Nov 2026 00:00 UTC is 01:00 in Lagos.
    expect(extractPaidOn("I paid yesterday", now)).toBe("2026-11-13")
    expect(extractPaidOn("paid today", now)).toBe("2026-11-14")
    expect(extractPaidOn("on 12th November", now)).toBe("2026-11-12")
    expect(extractPaidOn("November 20", now)).toBe("2025-11-20")
    expect(extractPaidOn("on 31 February", now)).toBeNull()
    expect(extractPaidOn("2026-12-01", now)).toBeNull()
    expect(extractPaidOn("no date here", now)).toBeNull()
    expect(routeIntent("I paid five thousand naira yesterday", "member", now).candidates).toMatchObject({
      amount: "5000",
      paidOn: "2026-11-13",
    })
  })

  test("payment references in common phrasings", () => {
    expect(extractPaymentReference("I paid five thousand naira yesterday, reference TRF5521")).toBe("TRF5521")
    expect(extractPaymentReference("ref: TRF-5521")).toBe("TRF-5521")
    expect(extractPaymentReference("ref no TRF5521")).toBe("TRF5521")
    expect(extractPaymentReference("Ref No. TRF5521.")).toBe("TRF5521")
    expect(extractPaymentReference("the reference number is TRF5521")).toBe("TRF5521")
    expect(extractPaymentReference("transaction id FT26111400123")).toBe("FT26111400123")
    expect(extractPaymentReference("Transaction ID: 000123456789")).toBe("000123456789")
    expect(extractPaymentReference("teller number 004512")).toBe("004512")
    expect(extractPaymentReference("teller no: 4512")).toBe("4512")
    expect(extractPaymentReference("ref#TRF5521")).toBe("TRF5521")
    expect(extractPaymentReference(`ref ${"A1".repeat(100)}`)).toHaveLength(PAYMENT_REFERENCE_MAX)
  })

  test("no reference is invented", () => {
    expect(extractPaymentReference("I paid five thousand naira yesterday")).toBeNull()
    expect(extractPaymentReference("I paid ₦5,000 with reference to my November dues")).toBeNull()
    expect(extractPaymentReference("I need a refund of 5000 naira")).toBeNull()
    expect(extractPaymentReference("one transaction of 5000 naira")).toBeNull()
    expect(routeIntent("I paid five thousand naira yesterday", "member", now).candidates.paymentReference).toBeNull()
  })

  test("a reference is not read as the amount or a member number", () => {
    expect(extractAmount("ref TRN5521")).toBeNull()
    expect(extractAmount("I paid five thousand naira, ref TRN5521")).toBe("5000")
    expect(extractAmount("I paid N5,000")).toBe("5000")
    expect(extractMemberNumber("ref: TRF-5521")).toBe("TRF-5521")
    const member = routeIntent("I paid five thousand naira yesterday, reference TRF5521", "member", now)
    expect(member.capabilityId).toBe("M04")
    expect(member.candidates).toMatchObject({ amount: "5000", paidOn: "2026-11-13", paymentReference: "TRF5521" })
    const staff = routeIntent("Record ₦25,000 from HV-1048 for November, ref: TRF-5521", "staff", now)
    expect(staff.capabilityId).toBe("S04")
    expect(staff.candidates).toMatchObject({ amount: "25000", memberNumber: "HV-1048", paymentReference: "TRF-5521" })
    expect(routeIntent("Record ₦25,000 for November, teller no TRF-5521", "staff", now).candidates.memberNumber).toBeNull()
  })

  test("amount-only receipts still fill amount and date", () => {
    expect(routeIntent("I paid ₦5,000", "member", now).candidates).toMatchObject({
      amount: "5000",
      paymentReference: null,
    })
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
