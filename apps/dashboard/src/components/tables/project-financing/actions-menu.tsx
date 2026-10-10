"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@halaalvest/ui/components/dropdown-menu"
import { Banknote, CheckCircle2, Eye, MoreHorizontal } from "lucide-react"
import { useProjectFinancingParams } from "@/hooks/use-project-financing-params"
import type { ProjectFinancingRequest } from "./columns"

export function ProjectFinancingActionsMenu({
  canReview,
  request,
}: {
  canReview: boolean
  request: ProjectFinancingRequest
}) {
  const { setParams } = useProjectFinancingParams()
  const canOpenReview =
    canReview && ["submitted", "under_review"].includes(request.status)
  const canRecordDisbursement = canReview && request.status === "approved"

  function open(type: "details" | "disbursement" | "review") {
    void setParams({
      projectFinancingRequestId: request.id,
      projectFinancingSheetType: type,
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`Open actions for ${request.businessName}`}
            className="size-8"
            size="icon"
            type="button"
            variant="ghost"
          />
        }
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => open("details")}>
          <Eye />
          View details
        </DropdownMenuItem>
        {canOpenReview ? (
          <DropdownMenuItem onClick={() => open("review")}>
            <CheckCircle2 />
            Review request
          </DropdownMenuItem>
        ) : null}
        {canRecordDisbursement ? (
          <DropdownMenuItem onClick={() => open("disbursement")}>
            <Banknote />
            Record disbursement
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
