"use client"

import { Suspense } from "react"
import { useTenantRouter } from "@halaalvest/tenant-url/next"
import { Button } from "@halaalvest/ui/components/button"
import { useSuspenseQuery } from "@tanstack/react-query"
import { SparklesIcon } from "lucide-react"
import {
  MemberPaymentReceiptCreateContent,
  MemberPaymentReceiptSupportCaseContent,
  PaymentReceiptCreateContent,
  PaymentReceiptReviewContent,
  PaymentReceiptSupportCaseContent,
  type PaymentReceiptOption,
} from "@/components/payment-receipt-content"
import { PaymentReceiptSheetHeader } from "@/components/payment-receipt-sheet-header"
import {
  askAssistant,
  receiptReviewDraft,
} from "@/components/quick-assistant/quick-assistant-requests"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import {
  type PaymentReceiptSheetType,
  usePaymentReceiptParams,
} from "@/hooks/use-payment-receipt-params"
import type { PaymentReceiptCategoryOption } from "@/lib/payment-receipts/load-payment-receipts-page"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"
import { useTRPC } from "@/trpc/client"

export function PaymentReceiptSheet({
  categoryOptions,
  commitmentPlans = [],
  foodPurchaseApplications = [],
  loans = [],
  member,
  procurementSchedules = [],
  projectFinancingRequests = [],
}: {
  categoryOptions: PaymentReceiptCategoryOption[]
  // A member's own lists (member mode). Staff forms load one member's lists
  // when that member is chosen.
  commitmentPlans?: PaymentReceiptOption[]
  foodPurchaseApplications?: PaymentReceiptOption[]
  loans?: PaymentReceiptOption[]
  member?: { id: string }
  procurementSchedules?: PaymentReceiptOption[]
  projectFinancingRequests?: PaymentReceiptOption[]
}) {
  const { paymentReceiptId, paymentReceiptSheetType, setParams } =
    usePaymentReceiptParams()
  const isOpen = paymentReceiptSheetType !== null
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
      config={presentation}
      mobileFullScreen={presentation.presentation === "sheet"}
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
                  onClose={closeSheet}
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
              onClose={closeSheet}
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
  onClose,
  receiptId,
  type,
}: {
  categoryOptions: PaymentReceiptCategoryOption[]
  onClose: () => void | Promise<void>
  receiptId: string
  type: PaymentReceiptSheetType
}) {
  const trpc = useTRPC()
  const router = useTenantRouter()
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

  // Review fills the sheet with its own padded body and sticky footer; the
  // support dialogs sit inside the dialog's padding.
  return (
    <>
      <PaymentReceiptSheetHeader
        action={
          type === "review" ? (
            <Button
              onClick={async () => {
                const draft = receiptReviewDraft(receipt.member.memberNumber)
                // The sheet is modal: close it, then open the panel with
                // the prefill. Nothing is sent.
                await onClose()
                setTimeout(
                  () => askAssistant(draft, () => router.push("/assistant")),
                  0
                )
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              <SparklesIcon data-icon="inline-start" />
              Ask assistant
            </Button>
          ) : undefined
        }
        receipt={receipt}
        type={type}
      />
      {type === "review" ? (
        <PaymentReceiptReviewContent
          categoryOptions={categoryOptions}
          onClose={onClose}
          receipt={receipt}
        />
      ) : type === "support" ? (
        <PaymentReceiptSupportCaseContent onClose={onClose} receipt={receipt} />
      ) : type === "member-support" ? (
        <MemberPaymentReceiptSupportCaseContent
          onClose={onClose}
          receipt={receipt}
        />
      ) : null}
    </>
  )
}
