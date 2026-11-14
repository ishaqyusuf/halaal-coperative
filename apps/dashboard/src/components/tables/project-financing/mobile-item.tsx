"use client"

import { formatCurrency } from "@halaalvest/utils"
import { RequestListItem } from "@/components/requests/request-list-item"
import { useProjectFinancingParams } from "@/hooks/use-project-financing-params"
import { getProjectFinancingTypeLabel } from "@/lib/requests/request-status-words"
import {
  getProjectFinancingAmount,
  getProjectFinancingOwed,
  type ProjectFinancingRequest,
  ProjectFinancingStatusBadge,
} from "./columns"

export function ProjectFinancingMobileItem({
  canReview,
  request,
}: {
  canReview: boolean
  request: ProjectFinancingRequest
}) {
  const { setParams } = useProjectFinancingParams()
  const { amount, type } = getProjectFinancingAmount(request)
  const owed = getProjectFinancingOwed(request)

  return (
    <RequestListItem
      amount={formatCurrency(amount)}
      badge={<ProjectFinancingStatusBadge request={request} />}
      meta={
        owed !== null
          ? `${formatCurrency(owed)} still owed`
          : getProjectFinancingTypeLabel(type)
      }
      onOpen={() =>
        void setParams({
          projectFinancingRequestId: request.id,
          projectFinancingSheetType: "details",
        })
      }
      subtitle={canReview ? request.member.fullName : null}
      title={request.businessName}
    />
  )
}
