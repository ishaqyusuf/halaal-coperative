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
  MobileMemberReceipts,
  MobilePaymentReceipt,
  MobileReceiptCreateInput,
} from "../model/member-receipt-types"

const devCategories: MobileMemberReceipts["categories"] = [
  {
    label: "Commitment",
    postable: true,
    requiresTarget: false,
    targetKind: "contributionPlanId",
    targets: [
      {
        id: "commitment-dev-1",
        label: "NGN 85,000 active commitment",
        outstandingAmount: null,
      },
    ],
    value: "commitment",
  },
  {
    label: "Special savings",
    postable: true,
    requiresTarget: false,
    targetKind: "contributionPlanId",
    targets: [
      {
        id: "commitment-dev-1",
        label: "NGN 85,000 active commitment",
        outstandingAmount: null,
      },
    ],
    value: "special_savings",
  },
  {
    label: "Loan servicing",
    postable: true,
    requiresTarget: true,
    targetKind: "loanId",
    targets: [
      {
        id: "loan-dev-1",
        label: "Equipment financing · NGN 320,000 outstanding",
        outstandingAmount: 320000,
      },
    ],
    value: "loan_servicing",
  },
  {
    label: "Extra loan payment",
    postable: true,
    requiresTarget: true,
    targetKind: "loanId",
    targets: [
      {
        id: "loan-dev-1",
        label: "Equipment financing · NGN 320,000 outstanding",
        outstandingAmount: 320000,
      },
    ],
    value: "loan_extra_payment",
  },
  {
    label: "Shares",
    postable: true,
    requiresTarget: false,
    targetKind: null,
    targets: [],
    value: "shares",
  },
  {
    label: "Procurement",
    postable: true,
    requiresTarget: true,
    targetKind: "procurementRepaymentScheduleItemId",
    targets: [
      {
        id: "procurement-schedule-dev-1",
        label: "Office equipment · NGN 72,500 outstanding",
        outstandingAmount: 72500,
      },
    ],
    value: "procurement",
  },
  {
    label: "Project financing",
    postable: true,
    requiresTarget: true,
    targetKind: "projectFinancingRequestId",
    targets: [
      {
        id: "project-financing-dev-1",
        label: "Workshop expansion · NGN 180,000 outstanding",
        outstandingAmount: 180000,
      },
    ],
    value: "project_financing",
  },
  {
    label: "Foodstuff Purchase",
    postable: true,
    requiresTarget: true,
    targetKind: "foodPurchaseApplicationId",
    targets: [
      {
        id: "food-purchase-dev-1",
        label: "August household basket · NGN 48,000 outstanding",
        outstandingAmount: 48000,
      },
    ],
    value: "food_purchase",
  },
  {
    label: "Other",
    postable: false,
    requiresTarget: false,
    targetKind: null,
    targets: [],
    value: "other",
  },
]

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

export async function getReceiptFormOptions(): Promise<{
  canCreateReceipt: boolean
  categories: MobileMemberReceipts["categories"]
}> {
  if (isMobileDevFixtureSession()) {
    return { canCreateReceipt: true, categories: devCategories }
  }
  return createMobileTrpcClient().mobile.member.receipts.formOptions.query()
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
