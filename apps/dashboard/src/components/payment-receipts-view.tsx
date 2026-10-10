"use client"

import type { MemberPaymentReceiptSummary } from "@halaalvest/db"
import { Suspense } from "react"
import { PaymentReceiptHeader } from "@/components/payment-receipt-header"
import { PaymentReceiptSheet } from "@/components/sheets/payment-receipt-sheet"
import { PaymentReceiptsDataView } from "@/components/tables/payment-receipts/data-view"
import { PaymentReceiptsDataErrorBoundary } from "@/components/tables/payment-receipts/error-boundary"
import { PaymentReceiptsSkeleton } from "@/components/tables/payment-receipts/skeleton"
import type { PaymentReceiptOption } from "@/components/payment-receipt-content"
import type { PaymentReceiptCategoryOption } from "@/lib/payment-receipts/load-payment-receipts-page"
import type { TableSettings } from "@/utils/table-settings"

export function PaymentReceiptsView({
  canCreateReceipt,
  categoryOptions,
  commitmentPlans,
  foodPurchaseApplications,
  initialSettings,
  loans,
  members,
  projectFinancingRequests,
  procurementSchedules,
  summary,
}: {
  canCreateReceipt: boolean
  categoryOptions: PaymentReceiptCategoryOption[]
  commitmentPlans: PaymentReceiptOption[]
  foodPurchaseApplications: PaymentReceiptOption[]
  initialSettings?: Partial<TableSettings>
  loans: PaymentReceiptOption[]
  members: PaymentReceiptOption[]
  projectFinancingRequests: PaymentReceiptOption[]
  procurementSchedules: PaymentReceiptOption[]
  summary: MemberPaymentReceiptSummary
}) {
  return (
    <div className="space-y-6">
      <PaymentReceiptSheet
        categoryOptions={categoryOptions}
        commitmentPlans={commitmentPlans}
        foodPurchaseApplications={foodPurchaseApplications}
        loans={loans}
        members={members}
        procurementSchedules={procurementSchedules}
        projectFinancingRequests={projectFinancingRequests}
      />
      <section className="hidden divide-x divide-border border-y border-border md:grid md:grid-cols-4">
        <SummaryTile label="Pending" value={summary.pendingReviewReceipts} />
        <SummaryTile label="Submitted" value={summary.submittedReceipts} />
        <SummaryTile
          label="Corrections"
          value={summary.correctionRequestedReceipts}
        />
        <SummaryTile label="Approved" value={summary.approvedReceipts} />
      </section>

      <section className="min-w-0">
        <PaymentReceiptHeader canCreateReceipt={canCreateReceipt} />
        <PaymentReceiptsDataErrorBoundary>
          <Suspense
            fallback={
              <PaymentReceiptsSkeleton initialSettings={initialSettings} />
            }
          >
            <PaymentReceiptsDataView initialSettings={initialSettings} />
          </Suspense>
        </PaymentReceiptsDataErrorBoundary>
      </section>
    </div>
  )
}

export function MemberPaymentReceiptsView({
  canCreateReceipt,
  categoryOptions,
  commitmentPlans,
  foodPurchaseApplications,
  initialSettings,
  loans,
  member,
  projectFinancingRequests,
  procurementSchedules,
  summary,
}: {
  canCreateReceipt: boolean
  categoryOptions: PaymentReceiptCategoryOption[]
  commitmentPlans: PaymentReceiptOption[]
  foodPurchaseApplications: PaymentReceiptOption[]
  initialSettings?: Partial<TableSettings>
  loans: PaymentReceiptOption[]
  member: {
    fullName: string
    id: string
    memberNumber: string
  }
  projectFinancingRequests: PaymentReceiptOption[]
  procurementSchedules: PaymentReceiptOption[]
  summary: MemberPaymentReceiptSummary
}) {
  return (
    <div className="space-y-6">
      <PaymentReceiptSheet
        categoryOptions={categoryOptions}
        commitmentPlans={commitmentPlans}
        foodPurchaseApplications={foodPurchaseApplications}
        loans={loans}
        member={member}
        procurementSchedules={procurementSchedules}
        projectFinancingRequests={projectFinancingRequests}
      />
      <section className="hidden divide-x divide-border border-y border-border md:grid md:grid-cols-4">
        <SummaryTile label="Pending" value={summary.pendingReviewReceipts} />
        <SummaryTile
          label="Corrections"
          value={summary.correctionRequestedReceipts}
        />
        <SummaryTile label="Approved" value={summary.approvedReceipts} />
        <SummaryTile label="Rejected" value={summary.rejectedReceipts} />
      </section>

      <section className="min-w-0">
        <PaymentReceiptHeader
          canCreateReceipt={canCreateReceipt}
          mode="member"
        />
        <PaymentReceiptsDataErrorBoundary>
          <Suspense
            fallback={
              <PaymentReceiptsSkeleton initialSettings={initialSettings} />
            }
          >
            <PaymentReceiptsDataView
              initialSettings={initialSettings}
              mode="member"
            />
          </Suspense>
        </PaymentReceiptsDataErrorBoundary>
      </section>
    </div>
  )
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-4 py-4">
      <p className="text-xs font-medium tracking-normal text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  )
}
