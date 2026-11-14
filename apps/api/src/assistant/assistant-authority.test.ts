import { describe, expect, test } from "bun:test"
import type { AssistantPrincipal } from "./principal"
import { confirmProposal } from "./proposals"
import {
  type AssistantReadDependencies,
  defaultReadDependencies,
  readFinancingStatus,
  readInvestments,
  readMemberMatches,
  readReceiptQueue,
} from "./reads"

const member: AssistantPrincipal = {
  tenantId: "t1",
  tenantName: "Test Cooperative",
  userId: "u1",
  membershipId: "ms1",
  role: "member",
  channel: "web",
  channelLinkId: null,
}
const staff: AssistantPrincipal = { ...member, userId: "u2", membershipId: "ms2", role: "finance_officer" }

const failIfCalled = () => {
  throw new Error("source must not be read without authority")
}
const guarded: AssistantReadDependencies = {
  ...defaultReadDependencies,
  findMember: failIfCalled,
  statement: failIfCalled,
  financing: failIfCalled,
  memberReceipts: failIfCalled,
  receiptQueue: failIfCalled,
  searchMembers: failIfCalled,
  now: () => new Date("2026-11-14T09:00:00Z"),
}

describe("assistant read authority", () => {
  test("members cannot use staff reads, and no source is touched", async () => {
    expect(await readMemberMatches(member, "HV-1048", guarded)).toMatchObject({ kind: "notice", tone: "denied" })
    expect(await readReceiptQueue(member, guarded)).toMatchObject({ kind: "notice", tone: "denied" })
  })

  test("staff own-record reads never borrow a member's identity", async () => {
    // Staff have no linked member in the principal; the own-member lookup is skipped.
    const answer = await readFinancingStatus(staff, guarded).catch((error) => error)
    expect(answer).toMatchObject({ kind: "notice" })
  })

  test("member reads are scoped to the member linked to the signed-in user", async () => {
    const calls: unknown[] = []
    const deps: AssistantReadDependencies = {
      ...guarded,
      findMember: (async (input: unknown) => {
        calls.push(input)
        return { id: "m1", memberNumber: "HV-1048", fullName: "Aisha", status: "active" }
      }) as unknown as AssistantReadDependencies["findMember"],
      statement: (async (tenantId: string, memberId: string) => {
        calls.push({ tenantId, memberId })
        return {
          totalSavingsSnapshot: 184000,
          specialSavingsBalance: 45000,
          shareCapitalBalance: 50000,
          totalDividendAllocations: 7350,
        }
      }) as unknown as AssistantReadDependencies["statement"],
    }
    const answer = await readInvestments(member, deps)
    expect(calls).toEqual([{ tenantId: "t1", userId: "u1" }, { tenantId: "t1", memberId: "m1" }])
    expect(answer).toMatchObject({
      kind: "investments",
      regularSavings: { amount: "184000.00" },
      specialSavings: { amount: "45000.00" },
      shareCapital: { amount: "50000.00" },
      publishedProfit: { amount: "7350.00" },
    })
  })
})

describe("confirmation channel", () => {
  test("messaging channels can never confirm a write", async () => {
    const result = await confirmProposal(
      { ...member, channel: "telegram", channelLinkId: "l1" },
      { proposalId: "p1", revision: 1, confirmationKey: "confirm-key-1" }
    )
    expect(result).toMatchObject({ outcome: "not_saved", reference: null })
  })
})
