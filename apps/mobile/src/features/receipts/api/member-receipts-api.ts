import { isMobileDevFixtureSession } from "@/dev/mobile-dev-session"
import {
  createDevMemberReceipt,
  createDevSupportCase,
  getDevMemberReceipts,
} from "@/dev/mobile-dev-fixtures"
import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
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

export async function getMemberReceipts(
  cursor?: string | null
): Promise<MobileMemberReceipts> {
  if (isMobileDevFixtureSession()) {
    return readCachedMobileQuery(
      `member.receipts.${cursor ?? "first"}`,
      async () => ({
        ...getDevMemberReceipts(),
        categories: devCategories,
        canCreateSupportCase: true,
        nextCursor: null,
        state: "available" as const,
      })
    ) as Promise<MobileMemberReceipts>
  }
  const client = createMobileTrpcClient()
  return readCachedMobileQuery(`member.receipts.${cursor ?? "first"}`, () =>
    client.mobile.member.receipts.list.query(cursor ? { cursor } : undefined)
  ) as Promise<MobileMemberReceipts>
}

export async function createMemberReceipt(
  input: MobileReceiptCreateInput
): Promise<MobilePaymentReceipt> {
  if (isMobileDevFixtureSession()) {
    return createDevMemberReceipt(input as never) as MobilePaymentReceipt
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
    return (
      getDevMemberReceipts().receipts.find((receipt) => receipt.id === receiptId) ??
      null
    ) as MobilePaymentReceipt | null
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
