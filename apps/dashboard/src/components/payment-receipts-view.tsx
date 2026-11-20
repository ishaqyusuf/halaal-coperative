"use client"

import type { MemberPaymentReceiptSummary } from "@halaalvest/db"
import { Suspense } from "react"
import { PaymentReceiptHeader } from "@/components/payment-receipt-header"
import { PaymentReceiptSheet } from "@/components/sheets/payment-receipt-sheet"
import { SummaryCard } from "@/components/summary-card"
import { PaymentReceiptsDataView } from "@/components/tables/payment-receipts/data-view"
import { PaymentReceiptsDataErrorBoundary } from "@/components/tables/payment-receipts/error-boundary"
import { PaymentReceiptsSkeleton } from "@/components/tables/payment-receipts/skeleton"
import { usePaymentReceiptFilterParams } from "@/hooks/use-payment-receipt-filter-params"
import type { PaymentReceiptCategoryOption } from "@/lib/payment-receipts/load-payment-receipts-page"
import type { TableSettings } from "@/utils/table-settings"

export function PaymentReceiptsView({
  canCreateReceipt,
  categoryOptions,
  initialSettings,
  summary,
}: {
  canCreateReceipt: boolean
  categoryOptions: PaymentReceiptCategoryOption[]
  initialSettings?: Partial<TableSettings>
  summary: MemberPaymentReceiptSummary
}) {
  return (
    <div className="space-y-6">
      <PaymentReceiptSheet categoryOptions={categoryOptions} />
      <ReceiptSummary
        cards={[
          {
            label: "To review",
            tone: summary.pendingReviewReceipts ? "attention" : "default",
            value: summary.pendingReviewReceipts,
          },
          {
            label: "New",
            status: "submitted",
            value: summary.submittedReceipts,
          },
          {
            label: "Needs correction",
            status: "correction_requested",
            value: summary.correctionRequestedReceipts,
          },
          {
            label: "Approved",
            status: "approved",
            tone: "good",
            value: summary.approvedReceipts,
          },
        ]}
      />

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
  initialSettings,
  memberId,
  summary,
}: {
  canCreateReceipt: boolean
  initialSettings?: Partial<TableSettings>
  memberId: string
  summary: MemberPaymentReceiptSummary
}) {
  return (
    <div className="space-y-6">
      <PaymentReceiptSheet memberId={memberId} />
      <ReceiptSummary
        cards={[
          { label: "Waiting", value: summary.pendingReviewReceipts },
          {
            label: "Needs correction",
            status: "correction_requested",
            tone: summary.correctionRequestedReceipts ? "attention" : "default",
            value: summary.correctionRequestedReceipts,
          },
          {
            label: "Approved",
            status: "approved",
            tone: "good",
            value: summary.approvedReceipts,
          },
          {
            label: "Rejected",
            status: "rejected",
            value: summary.rejectedReceipts,
          },
        ]}
      />

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

type ReceiptSummaryCard = {
  label: string
  /** A card with one receipt status filters the table to it. */
  status?: string
  tone?: "attention" | "default" | "good"
  value: number
}

// Hidden on phones, where the filter drawer does the same job. "To review"
// and "Waiting" count two statuses, so they only show the number.
function ReceiptSummary({ cards }: { cards: ReceiptSummaryCard[] }) {
  const { filter, setFilter } = usePaymentReceiptFilterParams()

  return (
    <section aria-label="Summary" className="hidden grid-cols-4 gap-3 sm:grid">
      {cards.map((card) => {
        const { status } = card

        return status ? (
          <SummaryCard
            compact
            key={card.label}
            label={card.label}
            onClick={() =>
              void setFilter({
                status: filter.status === status ? null : status,
              })
            }
            selected={filter.status === status}
            tone={card.tone}
            value={String(card.value)}
          />
        ) : (
          <SummaryCard
            compact
            key={card.label}
            label={card.label}
            tone={card.tone}
            value={String(card.value)}
          />
        )
      })}
    </section>
  )
}
