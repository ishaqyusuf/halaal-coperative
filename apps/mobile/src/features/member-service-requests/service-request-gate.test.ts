import { describe, expect, test } from "bun:test"
import { requestGate, requestPayLink } from "./service-request-gate"
import {
  serviceDesign,
  type ServiceRequest,
  type ServiceWorkspace,
} from "./service-request-model"

const procurement = serviceDesign.procurement
const food = serviceDesign["food-purchase"]

const base: ServiceWorkspace = {
  accessMode: "member_self_service",
  canCreate: false,
  chargeOptions: [],
  nextCursor: null,
  pendingCount: 0,
  reasons: [],
  requests: [],
  state: "available",
  totalCount: 0,
}

const active: ServiceRequest = {
  amount: 435000,
  date: "2026-09-01T00:00:00.000Z",
  details: [],
  id: "req-1",
  monthly: 72500,
  months: 6,
  outstanding: 290000,
  paid: 145000,
  payments: [
    {
      amount: 72500,
      date: "2026-10-05",
      id: "s1",
      number: 1,
      paid: 72500,
      status: "paid",
    },
    {
      amount: 72500,
      date: "2026-11-05",
      id: "s2",
      number: 2,
      paid: 0,
      status: "pending",
    },
    {
      amount: 72500,
      date: "2026-12-05",
      id: "s3",
      number: 3,
      paid: 0,
      status: "pending",
    },
  ],
  reviewNotes: null,
  status: "active",
  subtitle: null,
  title: "HP ProBook 450",
}

describe("requestGate", () => {
  test("no gate when the member can start a request", () => {
    expect(
      requestGate(
        "procurement",
        procurement,
        { ...base, canCreate: true },
        "NGN"
      )
    ).toBeNull()
  })

  test("maps access modes to not offered, office only and paused", () => {
    const state = (accessMode: ServiceWorkspace["accessMode"]) =>
      requestGate("procurement", procurement, { ...base, accessMode }, "NGN")
        ?.state
    expect(state("disabled")).toBe("disabled")
    expect(state("office_only")).toBe("office")
    expect(state("read_only")).toBe("paused")
  })

  test("access mode wins over member reasons", () => {
    const gate = requestGate(
      "procurement",
      procurement,
      {
        ...base,
        accessMode: "disabled",
        reasons: [
          "Member verification is required before financial or operational actions can continue.",
          "Procurement requests are not currently offered.",
        ],
      },
      "NGN"
    )
    expect(gate?.state).toBe("disabled")
    expect(gate?.title).toBe("Procurement isn’t offered yet")
  })

  test("foodstuff with no open cycle is the no-cycle state", () => {
    const gate = requestGate(
      "food-purchase",
      food,
      {
        ...base,
        cycles: [],
        reasons: [
          "Applications reopen when the cooperative starts a new Foodstuff Purchase cycle.",
        ],
      },
      "NGN"
    )
    expect(gate?.state).toBe("no-cycle")
    expect(gate?.action.kind).toBe("retry")
  })

  test("not eligible yet lists real reasons with Pay on the unpaid item", () => {
    const gate = requestGate(
      "procurement",
      procurement,
      {
        ...base,
        activeRequest: active,
        reasons: [
          "Settle an active procurement obligation before creating another request. Limit: 1.",
        ],
      },
      "NGN"
    )
    expect(gate?.state).toBe("not-yet")
    expect(gate?.steps?.map((step) => [step.key, step.done])).toEqual([
      ["verification", true],
      ["obligation", false],
    ])
    expect(gate?.steps?.[1]?.pay?.params.payable).toBe("procurement:s2")
    expect(gate?.description).toBe(
      "One more thing and you can start a new request."
    )
  })

  test("unknown reasons stay visible as steps", () => {
    const gate = requestGate(
      "procurement",
      procurement,
      {
        ...base,
        reasons: [
          "Member verification is required before financial or operational actions can continue.",
          "An active financing obligation must be settled before requesting procurement.",
          "Something new from the server.",
        ],
      },
      "NGN"
    )
    expect(gate?.steps?.map((step) => step.key)).toEqual([
      "verification",
      "obligation",
      "financing",
      "reason-0",
    ])
    expect(gate?.steps?.[3]?.title).toBe("Something new from the server.")
  })
})

describe("requestPayLink", () => {
  test("procurement pays the next unpaid schedule item", () => {
    expect(requestPayLink("procurement", active)).toEqual({
      params: { compose: "1", payable: "procurement:s2" },
      pathname: "/(member)/receipts",
    })
  })

  test("foodstuff pays the approved application", () => {
    expect(
      requestPayLink("food-purchase", { ...active, payments: undefined })
        ?.params.payable
    ).toBe("food_purchase:req-1")
  })

  test("no link for project financing, pending or fully paid requests", () => {
    expect(requestPayLink("project-financing", active)).toBeNull()
    expect(
      requestPayLink("procurement", { ...active, status: "pending" })
    ).toBeNull()
    expect(
      requestPayLink("food-purchase", { ...active, outstanding: 0 })
    ).toBeNull()
  })
})
