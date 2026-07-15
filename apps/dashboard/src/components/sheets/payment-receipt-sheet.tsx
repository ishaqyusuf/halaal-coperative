"use client"

import { Suspense } from "react"
import type { MemberPaymentReceiptRow } from "@halaalvest/db"
import { Sheet, SheetContent } from "@halaalvest/ui/components/sheet"
import { useQuery } from "@tanstack/react-query"
import {
  MemberPaymentReceiptCreateContent,
  MemberPaymentReceiptSupportCaseContent,
  PaymentReceiptCreateContent,
  PaymentReceiptReviewContent,
  PaymentReceiptSupportCaseContent,
  type PaymentReceiptOption,
} from "@/components/payment-receipt-content"
import { PaymentReceiptSheetHeader } from "@/components/payment-receipt-sheet-header"
import { usePaymentReceiptParams } from "@/hooks/use-payment-receipt-params"
import type { PaymentReceiptCategoryOption } from "@/lib/payment-receipts/load-payment-receipts-page"
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

const disabledPaymentReceiptId = "00000000-0000-4000-8000-000000000000"

export function PaymentReceiptSheet({
  categoryOptions,
  commitmentPlans,
  foodPurchaseApplications,
  loans,
  member,
  members = [],
  procurementSchedules,
  projectFinancingRequests,
  receipts,
}: {
  categoryOptions: PaymentReceiptCategoryOption[]
  commitmentPlans: PaymentReceiptOption[]
  foodPurchaseApplications: PaymentReceiptOption[]
  loans: PaymentReceiptOption[]
  member?: { id: string }
  members?: PaymentReceiptOption[]
  procurementSchedules: PaymentReceiptOption[]
  projectFinancingRequests: PaymentReceiptOption[]
  receipts: MemberPaymentReceiptRow[]
}) {
  const trpc = useTRPC()
  const { paymentReceiptId, paymentReceiptSheetType, setParams } =
    usePaymentReceiptParams()
  const isOpen = isPaymentReceiptSheetType(paymentReceiptSheetType)
  const selectedRouteReceipt = receipts.find((receipt) => {
    return receipt.id === paymentReceiptId
  })
  const shouldLoadSelectedReceipt =
    isOpen &&
    Boolean(paymentReceiptId) &&
    paymentReceiptSheetType !== "create" &&
    paymentReceiptSheetType !== "member-create"
  const { data: fetchedReceipt, isLoading: isSelectedReceiptLoading } =
    useQuery(
      trpc.paymentReceipts.get.queryOptions(
        { receiptId: paymentReceiptId ?? disabledPaymentReceiptId },
        { enabled: shouldLoadSelectedReceipt }
      )
    )
  const selectedReceipt = fetchedReceipt ?? selectedRouteReceipt

  const closeSheet = () => {
    void setParams({
      paymentReceiptId: null,
      paymentReceiptSheetType: null,
    })
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeSheet()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
        {isOpen ? (
          <Suspense
            fallback={
              <div className="px-6 text-sm text-muted-foreground">
                Loading payment receipt...
              </div>
            }
          >
            <PaymentReceiptSheetHeader
              receipt={selectedReceipt}
              type={paymentReceiptSheetType}
            />
            <div className="px-6">
              {paymentReceiptSheetType === "create" ? (
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
              ) : paymentReceiptSheetType === "member-create" && member ? (
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
              ) : shouldLoadSelectedReceipt && isSelectedReceiptLoading ? (
                <p className="text-sm text-muted-foreground">
                  Loading payment receipt...
                </p>
              ) : paymentReceiptSheetType === "review" && selectedReceipt ? (
                <PaymentReceiptReviewContent
                  categoryOptions={categoryOptions}
                  commitmentPlans={commitmentPlans}
                  foodPurchaseApplications={foodPurchaseApplications}
                  loans={loans}
                  onClose={closeSheet}
                  procurementSchedules={procurementSchedules}
                  projectFinancingRequests={projectFinancingRequests}
                  receipt={selectedReceipt}
                />
              ) : paymentReceiptSheetType === "support" && selectedReceipt ? (
                <PaymentReceiptSupportCaseContent
                  onClose={closeSheet}
                  receipt={selectedReceipt}
                />
              ) : paymentReceiptSheetType === "member-support" &&
                selectedReceipt ? (
                <MemberPaymentReceiptSupportCaseContent
                  onClose={closeSheet}
                  receipt={selectedReceipt}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  This payment receipt could not be found.
                </p>
              )}
            </div>
          </Suspense>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
