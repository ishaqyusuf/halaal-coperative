import { describe, expect, test } from "bun:test"
import {
  restoreServiceDraft,
  validateRequest,
  type RequestDraft,
  type ServiceWorkspace,
} from "./service-request-model"

const blank: RequestDraft = {
  amount: "",
  cycleId: "",
  months: "",
  name: "",
  notes: "",
  secondary: "",
  structure: "undecided",
  submissionKey: "fresh",
}
const workspace: ServiceWorkspace = {
  canCreate: true,
  chargeOptions: [],
  cycles: [{ id: "open", label: "December 2026" }],
  maxMonths: 10,
  nextCursor: null,
  pendingCount: 0,
  reasons: [],
  requests: [],
  state: "available",
  structures: [{ value: "undecided", requiresPaybackMonths: false }],
  totalCount: 0,
}

describe("member request drafts", () => {
  test("restores old procurement fields and the submission key", () => {
    expect(
      restoreServiceDraft(
        "procurement",
        {
          itemDescription: "For the shop",
          itemName: "Sewing machine",
          requestedCost: "240,000",
          requestedRepaymentMonths: "8",
          submissionKey: "existing",
          vendorName: "Kano Equipment Ltd",
        },
        blank
      )
    ).toMatchObject({
      amount: "240000",
      months: "8",
      name: "Sewing machine",
      notes: "For the shop",
      secondary: "Kano Equipment Ltd",
      submissionKey: "existing",
    })
  })

  test("uses the active policy and open cycle at review", () => {
    expect(
      validateRequest(
        { ...blank, amount: "1000", cycleId: "closed", months: "11" },
        "food-purchase",
        workspace
      )
    ).toEqual({
      cycleId: "Choose an open cycle.",
      months: "Choose up to 10 months.",
    })
  })

  test("keeps a project structure without a fixed repayment term valid", () => {
    expect(
      validateRequest(
        { ...blank, name: "Cold storage", amount: "1000" },
        "project-financing",
        workspace
      )
    ).toEqual({})
  })
})
