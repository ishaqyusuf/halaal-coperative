import { describe, expect, test } from "bun:test"
import {
  countPendingGuarantorRequests,
  listGuarantorRequestsForMember,
  listLoanBorrowerOptions,
} from "./loan-views"
import { listLoanRequestRowsPage } from "./loans"

describe("loan page lean reads", () => {
  test("borrower options read labels of members with a loan only", async () => {
    let args: any
    const prisma = {
      member: { findMany: async (input: any) => ((args = input), []) },
    }

    await listLoanBorrowerOptions("tenant-1", prisma as never)

    expect(args.where).toEqual({ loans: { some: {} }, tenantId: "tenant-1" })
    expect(Object.keys(args.select)).toEqual(["fullName", "id", "memberNumber"])
  })

  test("guarantor requests carry no staff names or emails", async () => {
    let args: any
    const prisma = {
      loanGuarantorApproval: {
        count: async (input: any) => ((args = input), 2),
        findMany: async (input: any) => {
          args = input
          return [
            {
              id: "g1",
              loanRequest: {
                estimatedMonthlyServicing: "13333.33",
                id: "r1",
                loanProduct: { name: "Quick" },
                member: { fullName: "Fatima" },
                purpose: null,
                requestedAmount: "40000.00",
                requestedTermMonths: 3,
                status: "submitted",
              },
              requestedAt: new Date("2026-11-01T00:00:00.000Z"),
              respondedAt: null,
              responseNotes: null,
              status: "pending",
            },
          ]
        },
      },
    }

    const rows = await listGuarantorRequestsForMember(
      { guarantorMemberId: "m1", tenantId: "tenant-1" },
      prisma as never
    )

    expect(JSON.stringify(args.select)).not.toContain("email")
    expect(JSON.stringify(args.select)).not.toContain("ByUser")
    expect(rows[0]!.loanRequest.requestedAmount).toBe(40000)
    expect(
      await countPendingGuarantorRequests(
        { guarantorMemberId: "m1", tenantId: "tenant-1" },
        prisma as never
      )
    ).toBe(2)
    expect(args.where).toEqual({
      guarantorMemberId: "m1",
      status: "pending",
      tenantId: "tenant-1",
    })
  })

  test("request rows select only what a list row shows", async () => {
    let args: any
    const prisma = {
      loanRequest: {
        findMany: async (input: any) => ((args = input), []),
      },
    }

    await listLoanRequestRowsPage("tenant-1", { pageSize: 10 }, prisma as never)

    expect(args.include).toBeUndefined()
    expect(Object.keys(args.select).sort()).toEqual([
      "estimatedMonthlyServicing",
      "guarantorApprovals",
      "id",
      "loanProduct",
      "member",
      "requestedAmount",
      "requestedAt",
      "requestedTermMonths",
      "status",
    ])
    expect(args.take).toBe(11)
  })
})
