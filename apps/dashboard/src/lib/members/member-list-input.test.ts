import { describe, expect, test } from "bun:test"
import { getMembersListInput, getMembersSort } from "./member-list-input"

const emptyFilters = {
  dateRange: null,
  kycStatus: null,
  memberType: null,
  migrationStatus: null,
  q: null,
  status: null,
}

describe("member list input", () => {
  test("keeps valid filters and drops unsupported enum values", () => {
    expect(
      getMembersListInput(
        {
          ...emptyFilters,
          dateRange: ["2026-01-01", "2026-06-30"],
          kycStatus: "verified",
          memberType: "unsupported",
          migrationStatus: "finalized",
          q: "Aisha",
          status: "active",
        },
        ["joinedAt", "desc"]
      )
    ).toEqual({
      joinedFrom: "2026-01-01",
      joinedTo: "2026-06-30",
      kycStatus: "verified",
      memberType: undefined,
      migrationStatus: "finalized",
      q: "Aisha",
      sort: ["joinedAt", "desc"],
      status: "active",
    })
  })

  test("resolves a canonical date preset at the API boundary", () => {
    const input = getMembersListInput({
      ...emptyFilters,
      dateRange: ["last month"],
    })

    expect(input.joinedFrom).toMatch(/^\d{4}-\d{2}-01$/)
    expect(input.joinedTo).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  test("uses deferred search without changing the URL filter object", () => {
    expect(getMembersListInput(emptyFilters, null, "deferred search").q).toBe(
      "deferred search"
    )
    expect(emptyFilters.q).toBeNull()
  })

  test("rejects malformed sorts", () => {
    expect(getMembersSort(["fullName", "sideways"])).toBeNull()
    expect(getMembersSort(["unknown", "asc"])).toBeNull()
    expect(getMembersSort(["fullName"])).toBeNull()
  })
})
