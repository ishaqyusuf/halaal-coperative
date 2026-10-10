"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@halaalvest/ui/components/dropdown-menu"
import { CheckCircle2, Eye, MoreHorizontal, PackageCheck } from "lucide-react"
import { useProcurementParams } from "@/hooks/use-procurement-params"
import type { ProcurementRequest } from "./columns"

export function ProcurementActionsMenu({
  canReview,
  request,
}: {
  canReview: boolean
  request: ProcurementRequest
}) {
  const { setParams } = useProcurementParams()
  const canOpenReview =
    canReview && ["submitted", "under_review"].includes(request.status)
  const canRecordPurchase = canReview && request.status === "approved"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label={`Open actions for ${request.itemName}`}
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
        <DropdownMenuItem
          onClick={() =>
            void setParams({
              procurementRequestId: request.id,
              procurementSheetType: "details",
            })
          }
        >
          <Eye />
          View details
        </DropdownMenuItem>
        {canOpenReview ? (
          <DropdownMenuItem
            onClick={() =>
              void setParams({
                procurementRequestId: request.id,
                procurementSheetType: "review",
              })
            }
          >
            <CheckCircle2 />
            Review request
          </DropdownMenuItem>
        ) : null}
        {canRecordPurchase ? (
          <DropdownMenuItem
            onClick={() =>
              void setParams({
                procurementRequestId: request.id,
                procurementSheetType: "purchase",
              })
            }
          >
            <PackageCheck />
            Record purchase
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
