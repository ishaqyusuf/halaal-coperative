"use client"

import { Suspense } from "react"
import { useSuspenseQuery } from "@tanstack/react-query"
import {
  MemberPaymentReceiptCreateContent,
  MemberPaymentReceiptSupportCaseContent,
  PaymentReceiptCreateContent,
  PaymentReceiptReviewContent,
  PaymentReceiptSupportCaseContent,
  type PaymentReceiptOption,
} from "@/components/payment-receipt-content"
import { PaymentReceiptSheetHeader } from "@/components/payment-receipt-sheet-header"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { usePaymentReceiptParams } from "@/hooks/use-payment-receipt-params"
import type { PaymentReceiptCategoryOption } from "@/lib/payment-receipts/load-payment-receipts-page"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"
import { useTRPC } from "@/trpc/client"

type PaymentReceiptSheetType =
  | "create"
  | "member-create"
  | "member-support"
  | "review"
  | "support"

function isPaymentReceiptSheetType(
  value: string | null
): value is PaymentReceiptSheetType {
  return (
    value === "create" ||
    value === "member-create" ||
    value === "member-support" ||
    value === "review" ||
    value === "support"
  )
}

export function PaymentReceiptSheet({
  categoryOptions,
  commitmentPlans,
  foodPurchaseApplications,
  loans,
  member,
  members = [],
  procurementSchedules,
  projectFinancingRequests,
}: {
  categoryOptions: PaymentReceiptCategoryOption[]
  commitmentPlans: PaymentReceiptOption[]
  foodPurchaseApplications: PaymentReceiptOption[]
  loans: PaymentReceiptOption[]
  member?: { id: string }
  members?: PaymentReceiptOption[]
  procurementSchedules: PaymentReceiptOption[]
  projectFinancingRequests: PaymentReceiptOption[]
}) {
  const { paymentReceiptId, paymentReceiptSheetType, setParams } =
    usePaymentReceiptParams()
  const isOpen = isPaymentReceiptSheetType(paymentReceiptSheetType)
  const presentation = getWorkflowPresentation(
    "paymentReceipt",
    paymentReceiptSheetType
  )

  const closeSheet = async () => {
    await setParams({
      paymentReceiptId: null,
      paymentReceiptSheetType: null,
    })
  }

  return (
    <WorkflowPresentation
      className={
        paymentReceiptSheetType === "review"
          ? "flex h-dvh flex-col gap-0 overflow-hidden p-0 md:h-[calc(100dvh-2rem)]"
          : undefined
      }
      config={presentation}
      contentClassName={
        paymentReceiptSheetType === "review"
          ? "flex h-full min-h-0 flex-col"
          : undefined
      }
      mobileFullScreen
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) void closeSheet()
      }}
    >
      {isOpen ? (
        <Suspense
          fallback={
            <div className="px-6 text-sm text-muted-foreground">
              Loading payment receipt...
            </div>
          }
        >
          {paymentReceiptSheetType === "create" ? (
            <>
              <PaymentReceiptSheetHeader type={paymentReceiptSheetType} />
              <div className="px-4 pb-6 md:px-6">
                <PaymentReceiptCreateContent
                  categoryOptions={categoryOptions}
                  commitmentPlans={commitmentPlans}
                  foodPurchaseApplications={foodPurchaseApplications}
                  loans={loans}
                  members={members}
                  onClose={closeSheet}
                  procurementSchedules={procurementSchedules}
                  projectFinancingRequests={projectFinancingRequests}
                />
              </div>
            </>
          ) : paymentReceiptSheetType === "member-create" && member ? (
            <>
              <PaymentReceiptSheetHeader type={paymentReceiptSheetType} />
              <div className="px-4 pb-6 md:px-6">
                <MemberPaymentReceiptCreateContent
                  categoryOptions={categoryOptions}
                  commitmentPlans={commitmentPlans}
                  foodPurchaseApplications={foodPurchaseApplications}
                  loans={loans}
                  member={member}
                  onClose={closeSheet}
                  procurementSchedules={procurementSchedules}
                  projectFinancingRequests={projectFinancingRequests}
                />
              </div>
            </>
          ) : paymentReceiptId ? (
            <SelectedPaymentReceiptContent
              categoryOptions={categoryOptions}
              commitmentPlans={commitmentPlans}
              foodPurchaseApplications={foodPurchaseApplications}
              loans={loans}
              onClose={closeSheet}
              procurementSchedules={procurementSchedules}
              projectFinancingRequests={projectFinancingRequests}
              receiptId={paymentReceiptId}
              type={paymentReceiptSheetType}
            />
          ) : (
            <p className="px-4 text-sm text-muted-foreground md:px-6">
              This payment receipt could not be found.
            </p>
          )}
        </Suspense>
      ) : null}
    </WorkflowPresentation>
  )
}

function SelectedPaymentReceiptContent({
  categoryOptions,
  commitmentPlans,
  foodPurchaseApplications,
  loans,
  onClose,
  procurementSchedules,
  projectFinancingRequests,
  receiptId,
  type,
}: {
  categoryOptions: PaymentReceiptCategoryOption[]
  commitmentPlans: PaymentReceiptOption[]
  foodPurchaseApplications: PaymentReceiptOption[]
  loans: PaymentReceiptOption[]
  onClose: () => void | Promise<void>
  procurementSchedules: PaymentReceiptOption[]
  projectFinancingRequests: PaymentReceiptOption[]
  receiptId: string
  type: PaymentReceiptSheetType
}) {
  const trpc = useTRPC()
  const { data: receipt } = useSuspenseQuery(
    trpc.paymentReceipts.get.queryOptions({ receiptId })
  )

  if (!receipt) {
    return (
      <p className="px-4 text-sm text-muted-foreground md:px-6">
        This payment receipt could not be found.
      </p>
    )
  }

  return (
    <>
      <PaymentReceiptSheetHeader receipt={receipt} type={type} />
      <div
        className={
          type === "review"
            ? "relative flex min-h-0 flex-1 overflow-hidden"
            : "px-4 pb-6 md:px-6"
        }
      >
        {type === "review" ? (
          <PaymentReceiptReviewContent
            categoryOptions={categoryOptions}
            commitmentPlans={commitmentPlans}
            foodPurchaseApplications={foodPurchaseApplications}
            loans={loans}
            onClose={onClose}
            procurementSchedules={procurementSchedules}
            projectFinancingRequests={projectFinancingRequests}
            receipt={receipt}
          />
        ) : type === "support" ? (
          <PaymentReceiptSupportCaseContent
            onClose={onClose}
            receipt={receipt}
          />
        ) : type === "member-support" ? (
          <MemberPaymentReceiptSupportCaseContent
            onClose={onClose}
            receipt={receipt}
          />
        ) : null}
      </div>
    </>
  )
}
