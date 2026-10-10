import { describe, expect, test } from "bun:test"
import { getProjectFinancingDetailFailureKind } from "./project-financing-detail-failure"

describe("project-financing detail failures", () => {
  test("recognizes every supported tRPC NOT_FOUND error shape", () => {
    expect(
      getProjectFinancingDetailFailureKind({ data: { code: "NOT_FOUND" } })
    ).toBe("request_unavailable")
    expect(
      getProjectFinancingDetailFailureKind({
        shape: { data: { code: "NOT_FOUND" } },
      })
    ).toBe("request_unavailable")
    expect(getProjectFinancingDetailFailureKind({ code: "NOT_FOUND" })).toBe(
      "request_unavailable"
    )
  })

  test("keeps transport and unexpected failures retryable", () => {
    expect(
      getProjectFinancingDetailFailureKind({ data: { code: "TIMEOUT" } })
    ).toBe("retryable")
    expect(getProjectFinancingDetailFailureKind(new Error("offline"))).toBe(
      "retryable"
    )
    expect(getProjectFinancingDetailFailureKind(null)).toBe("retryable")
  })
})
