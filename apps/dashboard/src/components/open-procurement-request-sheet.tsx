"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  CheckCircle2Icon,
  PackageCheckIcon,
  PlusIcon,
  ShoppingBagIcon,
} from "lucide-react"
import { useProcurementParams } from "@/hooks/use-procurement-params"

export function OpenProcurementRequestCreateSheet({
  disabled,
}: {
  disabled?: boolean
}) {
  const { setParams } = useProcurementParams()

  return (
    <Button
      disabled={disabled}
      onClick={() =>
        setParams({
          procurementRequestId: null,
          procurementSheetType: "create",
        })
      }
      type="button"
    >
      <PlusIcon data-icon="inline-start" />
      New request
    </Button>
  )
}

export function OpenMemberProcurementRequestCreateSheet() {
  const { setParams } = useProcurementParams()

  return (
    <Button
      onClick={() =>
        setParams({
          procurementRequestId: null,
          procurementSheetType: "self-service",
        })
      }
      type="button"
    >
      <ShoppingBagIcon data-icon="inline-start" />
      Request purchase
    </Button>
  )
}

export function OpenProcurementRequestReviewSheet({
  requestId,
}: {
  requestId: string
}) {
  const { setParams } = useProcurementParams()

  return (
    <Button
      onClick={() =>
        setParams({
          procurementRequestId: requestId,
          procurementSheetType: "review",
        })
      }
      size="sm"
      type="button"
      variant="outline"
    >
      <CheckCircle2Icon data-icon="inline-start" />
      Review
    </Button>
  )
}

export function OpenProcurementPurchaseSheet({
  requestId,
}: {
  requestId: string
}) {
  const { setParams } = useProcurementParams()

  return (
    <Button
      onClick={() =>
        setParams({
          procurementRequestId: requestId,
          procurementSheetType: "purchase",
        })
      }
      size="sm"
      type="button"
    >
      <PackageCheckIcon data-icon="inline-start" />
      Record purchase
    </Button>
  )
}
