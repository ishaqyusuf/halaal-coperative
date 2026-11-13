import { describe, expect, test } from "bun:test"
import { getAllowedMemberKycTransitions } from "@halaalvest/db"
import {
  getMemberKycNextStatuses,
  getMemberKycStatusOptions,
  type MemberKycStatus,
} from "./member-kyc-transitions"

const statuses: MemberKycStatus[] = [
  "not_started",
  "pending",
  "verified",
  "rejected",
]

describe("member KYC transitions", () => {
  test("match the transitions the server enforces", () => {
    for (const status of statuses) {
      expect([...getMemberKycNextStatuses(status)].sort()).toEqual(
        [...getAllowedMemberKycTransitions(status)].sort()
      )
    }
  })

  test("never offer Verified straight from Not started", () => {
    const values = getMemberKycStatusOptions("not_started").map(
      (option) => option.value
    )

    expect(values).toEqual(["not_started", "pending"])
    expect(values).not.toContain("verified")
  })

  test("keep the current status selectable so other fields can save", () => {
    for (const status of statuses) {
      expect(getMemberKycStatusOptions(status)[0]?.value).toBe(status)
    }
  })
})
