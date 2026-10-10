import { describe, expect, test } from "bun:test"
import { getMobileAdminContributionCapabilities } from "./mobile-admin-contribution-operations.route"

describe("mobile admin contribution capability boundary", () => {
  test("lets operations staff manage member contributions without batch posting", () => {
    expect(
      getMobileAdminContributionCapabilities("operations_officer")
    ).toEqual({
      manageBatches: false,
      manageMemberContributions: true,
      view: true,
    })
  })

  test("lets finance staff post Collection Source batches", () => {
    expect(getMobileAdminContributionCapabilities("finance_officer")).toEqual({
      manageBatches: true,
      manageMemberContributions: true,
      view: true,
    })
  })

  test("keeps members outside staff contribution operations", () => {
    expect(getMobileAdminContributionCapabilities("member")).toEqual({
      manageBatches: false,
      manageMemberContributions: false,
      view: false,
    })
  })
})
