import { describe, expect, it } from "bun:test"
import { classifyError } from "@halaalvest/errors"
import {
  duplicateChargeResponseLossQaState,
  getAdminChargeOperationsQaState,
  isCommittedChargeResponseLoss,
  throwCommittedChargeResponseLoss,
} from "./admin-charge-response-loss"

describe("duplicate charge response-loss QA control", () => {
  it("accepts the scenario only for a QA-capable client", () => {
    expect(
      getAdminChargeOperationsQaState(duplicateChargeResponseLossQaState, true)
    ).toBe(duplicateChargeResponseLossQaState)
    expect(
      getAdminChargeOperationsQaState(duplicateChargeResponseLossQaState, false)
    ).toBeNull()
    expect(getAdminChargeOperationsQaState("offline", true)).toBeNull()
  })

  it("cannot interrupt a committed response outside a QA-capable client", () => {
    expect(() =>
      throwCommittedChargeResponseLoss({
        enabled: true,
        qaClientEnabled: false,
      })
    ).not.toThrow()
  })

  it("throws a retryable, non-reportable network error when armed", () => {
    let captured: unknown
    try {
      throwCommittedChargeResponseLoss({
        enabled: true,
        qaClientEnabled: true,
      })
    } catch (error) {
      captured = error
    }

    expect(captured).toBeDefined()
    expect(classifyError(captured)).toMatchObject({
      code: "NETWORK_UNAVAILABLE",
      reportable: false,
      retryable: true,
    })
    expect(isCommittedChargeResponseLoss(captured)).toBe(true)
    expect(isCommittedChargeResponseLoss(new Error("network"))).toBe(false)
  })
})
