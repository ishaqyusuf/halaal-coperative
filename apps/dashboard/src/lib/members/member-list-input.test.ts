import { describe, expect, test } from "bun:test"
import { getMembersListInput, getMembersSort } from "./member-list-input"

const emptyFilters = {
  joinedFrom: null,
  joinedTo: null,
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
          joinedFrom: "2026-01-01",
          joinedTo: "2026-06-30",
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
