"use client"

import { formatCurrency } from "@halaalvest/utils"
import { RequestListItem } from "@/components/requests/request-list-item"
import { RequestStatusBadge } from "@/components/requests/request-status-badge"
import { useProcurementParams } from "@/hooks/use-procurement-params"
import { formatMonths } from "@/lib/requests/request-status-words"
import {
  getProcurementAmount,
  getProcurementLatePayments,
  type ProcurementRequest,
} from "./columns"

export function ProcurementMobileItem({
  canReview,
  request,
}: {
  canReview: boolean
  request: ProcurementRequest
}) {
  const { setParams } = useProcurementParams()
  const { amount, months } = getProcurementAmount(request)
  const late = getProcurementLatePayments(request)
  const owed = request.repaymentScheduleItems.length
    ? `${formatCurrency(request.outstandingAmount)} still owed${late ? ` · ${late} late` : ""}`
    : null

  return (
    <RequestListItem
      amount={`${formatCurrency(amount)} · ${formatMonths(months)}`}
      badge={<RequestStatusBadge kind="procurement" status={request.status} />}
      meta={owed}
      onOpen={() =>
        void setParams({
          procurementRequestId: request.id,
          procurementSheetType: "details",
        })
      }
      subtitle={canReview ? request.member.fullName : null}
      title={request.itemName}
    />
  )
}
