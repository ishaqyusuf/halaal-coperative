import { describe, expect, test } from "bun:test"
import type { AdminFinanceSupportItem } from "./admin-finance-support-types"
import {
  adminFinanceActionNeedsLongForm,
  getAdminFinanceActionDecision,
  parseAdminFinancePositiveNumber,
} from "./admin-finance-support-action"

function buildItem(
  queueKey: AdminFinanceSupportItem["queueKey"],
  actionKey: AdminFinanceSupportItem["allowedActions"][number]["key"]
) {
  const item = {
    allowedActions: [
      {
        destructive: false,
        governanceOnly: false,
        key: actionKey,
        label: "Review",
        requiresConfirmation: true,
        requiresEvidence: true,
      },
    ],
    queueKey,
  } as AdminFinanceSupportItem

  return { action: item.allowedActions[0], item }
}

describe("admin finance support action model", () => {
  test("parses optional positive numbers without accepting zero or invalid text", () => {
    expect(parseAdminFinancePositiveNumber("")).toBeUndefined()
    expect(parseAdminFinancePositiveNumber("12,500")).toBe(12_500)
    expect(parseAdminFinancePositiveNumber("0")).toBeNull()
    expect(parseAdminFinancePositiveNumber("invalid")).toBeNull()
  })

  test("maps review actions to the server decision contract", () => {
    expect(getAdminFinanceActionDecision("mark_under_review")).toBe(
      "under_review"
    )
    expect(getAdminFinanceActionDecision("request_correction")).toBe(
      "correction_requested"
    )
    expect(getAdminFinanceActionDecision("reject")).toBe("rejected")
    expect(getAdminFinanceActionDecision("approve")).toBe("approved")
  })

  test("reserves full-screen forms for evidence-heavy approvals", () => {
    expect(
      adminFinanceActionNeedsLongForm(buildItem("procurement", "approve"))
    ).toBe(true)
    expect(
      adminFinanceActionNeedsLongForm(buildItem("shares", "approve"))
    ).toBe(true)
    expect(adminFinanceActionNeedsLongForm(buildItem("support", "reply"))).toBe(
      false
    )
    expect(
      adminFinanceActionNeedsLongForm(
        buildItem("projectFinancing", "request_correction")
      )
    ).toBe(false)
  })
})
