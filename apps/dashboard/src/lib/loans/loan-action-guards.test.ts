import { describe, expect, test } from "bun:test"
import {
  canFinalizeLoanRequest,
  canMarkLoanRequestUnderReview,
} from "./loan-action-guards"

describe("loan request action guards", () => {
  test("only exposes approve and reject during reviewable states", () => {
    expect(canFinalizeLoanRequest("submitted")).toBe(true)
    expect(canFinalizeLoanRequest("under_review")).toBe(true)
    expect(canFinalizeLoanRequest("approved")).toBe(false)
    expect(canFinalizeLoanRequest("rejected")).toBe(false)
  })

  test("only exposes under-review from submitted", () => {
    expect(canMarkLoanRequestUnderReview("submitted")).toBe(true)
    expect(canMarkLoanRequestUnderReview("under_review")).toBe(false)
    expect(canMarkLoanRequestUnderReview("approved")).toBe(false)
  })
})
