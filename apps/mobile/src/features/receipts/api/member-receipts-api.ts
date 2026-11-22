import { isMobileDevFixtureSession } from "@/dev/mobile-dev-session"
import {
  createDevMemberReceipt,
  createDevSupportCase,
  getDevMemberReceipts,
} from "@/dev/mobile-dev-fixtures"
import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
import { receiptMatches } from "../model/receipt-presentation"
import { readCachedMobileQuery } from "@/lib/read-cache"
import type {
  MobileMemberPayables,
  MobileMemberReceipts,
  MobilePaymentReceipt,
  MobileReceiptCreateInput,
} from "../model/member-receipt-types"

/** Dev fixture payables (Aisha Bello, Amana Savings Cooperative). */
const devPayables: MobileMemberPayables = {
  canCreateReceipt: true,
  mode: "automatic",
  payables: [
    {
      amount: 72500,
      checkingAmount: 0,
      dueDate: "2026-11-05",
      id: "procurement:procurement-schedule-dev-1",
      kind: "procurement",
      overdue: true,
      subtitle: "Instalment 3 of 6",
      targetId: "procurement-schedule-dev-1",
      title: "Laptop",
    },
    {
      amount: 48000,
      dueDate: "2026-11-30",
      id: "food_purchase:food-purchase-dev-1",
      kind: "food_purchase",
      overdue: false,
      subtitle: "Rice, oil and beans",
      targetId: "food-purchase-dev-1",
      title: "November basket",
    },
    {
      amount: 60000,
      dueDate: "2026-11-25",
      id: "loan:loan-dev-1",
      kind: "loan",
      overdue: false,
      subtitle: "Repayment",
      targetId: "loan-dev-1",
      title: "Equipment financing",
    },
    {
      amount: 25000,
      dueDate: "2026-11-30",
      id: "commitment:commitment-dev-1",
      kind: "commitment",
      overdue: false,
      subtitle: "November",
      targetId: "commitment-dev-1",
      title: "Monthly commitment",
    },
  ],
  proofRequired: false,
}

function fixtureReceipt(
  receipt: ReturnType<typeof createDevMemberReceipt>
): MobilePaymentReceipt {
  return {
    ...receipt,
    reviewedAt: receipt.reviewedAt ?? null,
    allocations: receipt.allocations.map((split) => ({
      contributionPlanId: null,
      foodPurchaseApplicationId: null,
      loanId: null,
      projectFinancingRequestId: null,
      procurementRepaymentScheduleItemId: null,
      ...split,
    })),
  }
}

export async function getMemberReceipts({
  cursor,
  online,
  search,
}: {
  cursor?: string | null
  online: boolean
  search?: string
}): Promise<MobileMemberReceipts> {
  return readCachedMobileQuery<MobileMemberReceipts>(
    "member.receipts.first",
    async () => {
      if (!online) throw new Error("You’re offline.")
      if (isMobileDevFixtureSession()) {
        const snapshot = getDevMemberReceipts()
        const receipts = snapshot.receipts.map(fixtureReceipt)
        return {
          ...snapshot,
          receipts: search
            ? receipts.filter((item) => receiptMatches(item, search, "NGN"))
            : receipts,
          categories: [],
          canCreateSupportCase: true,
          nextCursor: null,
          state: "available" as const,
        }
      }
      const page: MobileMemberReceipts =
        await createMobileTrpcClient().mobile.member.receipts.list.query({
          compact: true,
          cursor: cursor ?? undefined,
          search,
        })
      if (page.state === "database_unavailable")
        throw new Error("Receipts are unavailable.")
      return page
    },
    { persist: !cursor && !search }
  )
}

/**
 * Record payment's one read (T30): current payables in the cooperative's
 * order plus the allocation mode. Cached so the list's "Due now" shows
 * offline.
 */
export async function getMemberPayables({
  online,
}: {
  online: boolean
}): Promise<MobileMemberPayables> {
  return readCachedMobileQuery<MobileMemberPayables>(
    "member.receipts.payables",
    async () => {
      if (!online) throw new Error("You’re offline.")
      if (isMobileDevFixtureSession()) return devPayables
      return createMobileTrpcClient().mobile.member.receipts.payables.query()
    }
  )
}

export async function createMemberReceipt(
  input: MobileReceiptCreateInput
): Promise<MobilePaymentReceipt> {
  if (isMobileDevFixtureSession()) {
    return fixtureReceipt(createDevMemberReceipt(input))
  }
  const client = createMobileTrpcClient()
  return client.mobile.member.receipts.create.mutate(
    input
  ) as Promise<MobilePaymentReceipt>
}

export async function getMemberReceiptDetail(
  receiptId: string
): Promise<MobilePaymentReceipt | null> {
  if (isMobileDevFixtureSession()) {
    const receipt = getDevMemberReceipts().receipts.find(
      (item) => item.id === receiptId
    )
    return receipt ? fixtureReceipt(receipt) : null
  }
  const client = createMobileTrpcClient()
  return client.mobile.member.receipts.detail.query({
    receiptId,
  }) as Promise<MobilePaymentReceipt | null>
}

export async function createReceiptSupportCase(input: {
  description: string
  receiptId: string
}) {
  const payload = {
    category: "payment_issue" as const,
    description: input.description,
    linkedRecordId: input.receiptId,
    linkedRecordType: "receipt" as const,
    moneyImpactRequested: true,
    subject: "Receipt support request",
  }
  if (isMobileDevFixtureSession()) return createDevSupportCase(payload)
  const client = createMobileTrpcClient()
  return client.mobile.member.support.create.mutate(payload)
}
