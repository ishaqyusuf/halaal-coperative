import { describe, expect, test } from "bun:test"
import {
  getWorkflowPresentation,
  workflowPresentations,
} from "./workflow-presentations"

describe("workflow presentation registry", () => {
  test("assigns every workflow mode one supported presentation", () => {
    for (const modes of Object.values(workflowPresentations)) {
      for (const config of Object.values(modes)) {
        expect(["sheet", "dialog", "alert-dialog"]).toContain(
          config.presentation
        )
        expect(["compact", "form", "review", "wide"]).toContain(config.width)
      }
    }
  })

  test("keeps long entry flows in sheets", () => {
    expect(getWorkflowPresentation("loan", "request").presentation).toBe(
      "sheet"
    )
    expect(
      getWorkflowPresentation("paymentReceipt", "create").presentation
    ).toBe("sheet")
    expect(
      getWorkflowPresentation("memberBackfill", "historicalEntry").presentation
    ).toBe("sheet")
  })

  test("centers review and focused decision flows", () => {
    expect(getWorkflowPresentation("loan", "review").presentation).toBe(
      "dialog"
    )
    expect(
      getWorkflowPresentation("foodPurchase", "accounting-review").presentation
    ).toBe("dialog")
    expect(
      getWorkflowPresentation("chargeOperation", "reverse").presentation
    ).toBe("alert-dialog")
  })
})
