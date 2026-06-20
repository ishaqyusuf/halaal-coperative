import { describe, expect, test } from "bun:test"
import {
  allocateBusinessProfitByShare,
  resolveMemberShareBalance,
  resolveShareBalancesAtDate,
} from "./finance"

describe("share finance rules", () => {
  test("resolves member share balance by effective date", () => {
    const entries = [
      { memberId: "member-1", amount: 10000, effectiveDate: "2025-01-01" },
      { memberId: "member-1", amount: 5000, effectiveDate: "2025-02-01" },
      { memberId: "member-1", amount: 5000, effectiveDate: "2025-03-01" },
      { memberId: "member-2", amount: 20000, effectiveDate: "2025-01-01" },
    ]

    expect(resolveMemberShareBalance(entries, "member-1", "2025-02-15")).toBe(15000)
    expect(resolveShareBalancesAtDate(entries, "2025-02-15")).toEqual([
      { memberId: "member-1", shareBalance: 15000 },
      { memberId: "member-2", shareBalance: 20000 },
    ])
  })

  test("allocates business profit by share percentage and preserves cents", () => {
    const allocations = allocateBusinessProfitByShare({
      profitAmount: 100,
      balances: [
        { memberId: "member-1", shareBalance: 100 },
        { memberId: "member-2", shareBalance: 200 },
        { memberId: "member-3", shareBalance: 300 },
      ],
    })

    expect(allocations).toEqual([
      {
        allocatedProfitAmount: 16.67,
        memberId: "member-1",
        shareBalance: 100,
        sharePercentage: 1 / 6,
      },
      {
        allocatedProfitAmount: 33.33,
        memberId: "member-2",
        shareBalance: 200,
        sharePercentage: 1 / 3,
      },
      {
        allocatedProfitAmount: 50,
        memberId: "member-3",
        shareBalance: 300,
        sharePercentage: 1 / 2,
      },
    ])
    expect(allocations.reduce((sum, allocation) => sum + allocation.allocatedProfitAmount, 0)).toBe(100)
  })
})
