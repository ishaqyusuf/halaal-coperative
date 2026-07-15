"use client"

import { formatCurrency } from "@halaalvest/utils"
import type {
  MemberPaymentReceiptRow,
  MemberPaymentReceiptSummary,
} from "@halaalvest/db"
import { OpenMemberPaymentReceiptCreateSheet } from "@/components/open-payment-receipt-sheet"
import { PaymentReceiptHeader } from "@/components/payment-receipt-header"
import { PaymentReceiptSheet } from "@/components/sheets/payment-receipt-sheet"
import { PaymentReceiptsDataTable } from "@/components/tables/payment-receipts/data-table"
import type { PaymentReceiptOption } from "@/components/payment-receipt-content"
import type { PaymentReceiptCategoryOption } from "@/lib/payment-receipts/load-payment-receipts-page"
import type { TableSettings } from "@/utils/table-settings"

export function PaymentReceiptsView({
  categoryOptions,
  commitmentPlans,
  foodPurchaseApplications,
  initialSettings,
  loans,
  members,
  projectFinancingRequests,
  procurementSchedules,
  receipts,
  summary,
}: {
  categoryOptions: PaymentReceiptCategoryOption[]
  commitmentPlans: PaymentReceiptOption[]
  foodPurchaseApplications: PaymentReceiptOption[]
  initialSettings?: Partial<TableSettings>
  loans: PaymentReceiptOption[]
  members: PaymentReceiptOption[]
  projectFinancingRequests: PaymentReceiptOption[]
  procurementSchedules: PaymentReceiptOption[]
  receipts: MemberPaymentReceiptRow[]
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
        receipts={receipts}
      />
      <section className="grid gap-4 md:grid-cols-4">
        <SummaryTile label="Pending" value={summary.pendingReviewReceipts} />
        <SummaryTile label="Submitted" value={summary.submittedReceipts} />
        <SummaryTile
          label="Corrections"
          value={summary.correctionRequestedReceipts}
        />
        <SummaryTile label="Approved" value={summary.approvedReceipts} />
      </section>

      <section className="overflow-hidden rounded-md border border-border bg-card">
        <PaymentReceiptHeader />
        <PaymentReceiptsDataTable
          initialSettings={initialSettings}
          receipts={receipts}
        />
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
  receipts,
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
  receipts: MemberPaymentReceiptRow[]
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
        receipts={receipts}
      />
      <section className="grid gap-4 md:grid-cols-4">
        <SummaryTile label="Pending" value={summary.pendingReviewReceipts} />
        <SummaryTile
          label="Corrections"
          value={summary.correctionRequestedReceipts}
        />
        <SummaryTile label="Approved" value={summary.approvedReceipts} />
        <SummaryTile label="Rejected" value={summary.rejectedReceipts} />
      </section>

      {canCreateReceipt ? (
        <section className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                Submit payment receipt
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {member.fullName} ({member.memberNumber})
              </p>
            </div>
            <OpenMemberPaymentReceiptCreateSheet />
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-md border border-border bg-card">
        <PaymentReceiptHeader
          action={null}
          description="Track your transfer proofs, allocation intent, and finance review status."
          title="My payment receipts"
        />
        <PaymentReceiptsDataTable
          initialSettings={initialSettings}
          mode="member"
          receipts={receipts}
        />
      </section>
    </div>
  )
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  )
}
