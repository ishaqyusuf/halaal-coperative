import { describe, expect, it } from "bun:test"
import {
  filterQaProfiles,
  normalizeQaDomainInput,
  qaChooserLayout,
  qaProfileInitials,
  qaRoleLabel,
  type QaChooserProfile,
} from "./qa-access-chooser"

function profile(overrides: Partial<QaChooserProfile>): QaChooserProfile {
  return {
    cooperativeName: "Barakah Cooperative",
    eligible: true,
    identityLabel: "Amina Bello",
    memberCode: "M-0001",
    role: "member",
    selectionRef: "ref-1",
    ...overrides,
  }
}

describe("QA access chooser", () => {
  it("keeps five or fewer profiles in the compact sheet", () => {
    expect(qaChooserLayout(0)).toBe("sheet")
    expect(qaChooserLayout(5)).toBe("sheet")
    expect(qaChooserLayout(6)).toBe("full")
  })

  it("filters by identity, cooperative, role, and member code", () => {
    const profiles = [
      profile({ selectionRef: "a" }),
      profile({
        cooperativeName: "Ummah Traders",
        identityLabel: "Yusuf Adeyemi",
        memberCode: null,
        role: "finance_officer",
        selectionRef: "b",
      }),
    ]

    expect(filterQaProfiles(profiles, "  ").map((p) => p.selectionRef)).toEqual(
      ["a", "b"]
    )
    expect(
      filterQaProfiles(profiles, "ummah").map((p) => p.selectionRef)
    ).toEqual(["b"])
    expect(
      filterQaProfiles(profiles, "Finance Officer").map((p) => p.selectionRef)
    ).toEqual(["b"])
    expect(
      filterQaProfiles(profiles, "m-0001").map((p) => p.selectionRef)
    ).toEqual(["a"])
  })

  it("derives two-letter initials and readable role labels", () => {
    expect(qaProfileInitials(" amina  bello ojo")).toBe("AB")
    expect(qaRoleLabel("tenant_admin")).toBe("tenant admin")
  })

  it("normalizes QA domains and rejects malformed input", () => {
    expect(normalizeQaDomainInput("  Ishaq.QA.Test. ")).toBe("ishaq.qa.test")
    expect(normalizeQaDomainInput("ishaq")).toBeNull()
    expect(normalizeQaDomainInput("ishaq@qa.test")).toBeNull()
    expect(normalizeQaDomainInput("-bad.qa.test")).toBeNull()
  })
})
