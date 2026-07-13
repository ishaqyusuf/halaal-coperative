import { describe, expect, test } from "bun:test"
import {
  accessModeFromServiceChoice,
  accessModesFromCommitmentCollectionChoice,
  firstOperationProfileStep,
  getOperationProfileStepNavigation,
  operationProfileStepHref,
  operationProfileStepKeys,
  resolveOperationProfileStep,
} from "./operation-profile-flow"

describe("getting started operation profile flow", () => {
  test("normalizes missing and invalid sub-step values to the first sub-step", () => {
    expect(resolveOperationProfileStep(null)).toBe(firstOperationProfileStep)
    expect(resolveOperationProfileStep(undefined)).toBe(
      firstOperationProfileStep
    )
    expect(resolveOperationProfileStep("unknown")).toBe(
      firstOperationProfileStep
    )
    expect(resolveOperationProfileStep("procurement")).toBe("procurement")
  })

  test("builds shareable operation profile sub-step hrefs", () => {
    expect(operationProfileStepHref("commitments")).toBe(
      "?step=operation-profile&profileStep=commitments"
    )
  })

  test("routes previous and next across the guided sub-steps", () => {
    expect(getOperationProfileStepNavigation("intro")).toMatchObject({
      nextHref: operationProfileStepHref("commitments"),
      previousHref: "?step=setup-mode",
    })
    expect(getOperationProfileStepNavigation("review")).toMatchObject({
      nextHref: "?step=start-date",
      previousHref: operationProfileStepHref("member-access"),
    })
    expect(operationProfileStepKeys).toEqual([
      "intro",
      "commitments",
      "procurement",
      "foodstuff",
      "member-access",
      "review",
    ])
  })

  test("maps simple service choices onto persisted access modes", () => {
    expect(accessModeFromServiceChoice("no")).toBe("disabled")
    expect(accessModeFromServiceChoice("no", "office", true)).toBe("read_only")
    expect(accessModeFromServiceChoice("yes", "office")).toBe("office_only")
    expect(accessModeFromServiceChoice("yes", "member")).toBe(
      "member_self_service"
    )
  })

  test("maps commitment collection choices onto payment and source services", () => {
    expect(accessModesFromCommitmentCollectionChoice("office")).toEqual({
      collectionSourceBatchPosting: "disabled",
      collectionSources: "disabled",
      paymentReceipts: "office_only",
    })
    expect(
      accessModesFromCommitmentCollectionChoice("member_receipts")
    ).toEqual({
      collectionSourceBatchPosting: "disabled",
      collectionSources: "disabled",
      paymentReceipts: "member_self_service",
    })
    expect(
      accessModesFromCommitmentCollectionChoice("collection_sources")
    ).toEqual({
      collectionSourceBatchPosting: "office_only",
      collectionSources: "office_only",
      paymentReceipts: "office_only",
    })
    expect(accessModesFromCommitmentCollectionChoice("mixed")).toEqual({
      collectionSourceBatchPosting: "office_only",
      collectionSources: "office_only",
      paymentReceipts: "member_self_service",
    })
  })
})
