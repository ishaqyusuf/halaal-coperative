import { describe, expect, test } from "bun:test"
import {
  memberVerificationReason,
  nextUnpaidScheduleItem,
  serviceRequestGate,
  type ServiceGateInput,
} from "./service-request-gate"

const base: ServiceGateInput = {
  accessMode: "member_self_service",
  canCreate: false,
  design: { noun: "request", title: "Procurement" },
  formatMoney: (amount) => `₦${amount.toLocaleString("en-US")}`,
  kind: "procurement",
  reasons: [],
}

describe("serviceRequestGate", () => {
  test("open when the member can create", () => {
    expect(serviceRequestGate({ ...base, canCreate: true })).toBeNull()
  })

  test("access modes map to one state each", () => {
    expect(serviceRequestGate({ ...base, accessMode: "disabled" })?.state).toBe(
      "disabled"
    )
    expect(
      serviceRequestGate({ ...base, accessMode: "office_only" })?.state
    ).toBe("office")
    expect(
      serviceRequestGate({ ...base, accessMode: "read_only" })?.state
    ).toBe("paused")
  })

  test("foodstuff with only the cycle reason is no-cycle", () => {
    const gate = serviceRequestGate({
      ...base,
      design: { noun: "application", title: "Foodstuff purchase" },
      kind: "food-purchase",
      reasons: [
        "Applications reopen when the cooperative starts a new Foodstuff Purchase cycle.",
      ],
    })
    expect(gate?.state).toBe("no-cycle")
  })

  test("not yet lists the server's reasons with Pay on the current item", () => {
    const gate = serviceRequestGate({
      ...base,
      active: {
        outstanding: 72500,
        payable: "procurement:item-3",
        title: "Laptop",
      },
      reasons: [
        memberVerificationReason,
        "Settle an active procurement obligation before creating another request. Limit: 1.",
        "An active financing obligation must be settled before requesting procurement.",
      ],
    })
    expect(gate?.state).toBe("not-yet")
    expect(gate?.steps?.map((step) => [step.key, step.done])).toEqual([
      ["verification", false],
      ["obligation", false],
      ["financing", false],
    ])
    expect(gate?.steps?.[1]?.payable).toBe("procurement:item-3")
    expect(gate?.steps?.[1]?.detail).toBe("₦72,500 left on Laptop")
  })
})

describe("nextUnpaidScheduleItem", () => {
  test("skips paid and waived rows", () => {
    expect(
      nextUnpaidScheduleItem([
        { amount: 10, id: "a", paidAmount: 10, status: "paid" },
        { amount: 10, id: "b", paidAmount: 0, status: "waived" },
        { amount: 10, id: "c", paidAmount: 4, status: "partially_paid" },
      ])?.id
    ).toBe("c")
  })
})
