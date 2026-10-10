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
  iconOnly = false,
}: {
  disabled?: boolean
  iconOnly?: boolean
}) {
  const { setParams } = useProcurementParams()

  return (
    <Button
      disabled={disabled}
      aria-label="New procurement request"
      className={iconOnly ? "size-11" : undefined}
      onClick={() =>
        setParams({
          procurementRequestId: null,
          procurementSheetType: "create",
        })
      }
      type="button"
      size={iconOnly ? "icon-lg" : "default"}
    >
      <PlusIcon data-icon="inline-start" />
      {iconOnly ? <span className="sr-only">New request</span> : "New request"}
    </Button>
  )
}

export function OpenMemberProcurementRequestCreateSheet({
  iconOnly = false,
}: {
  iconOnly?: boolean
}) {
  const { setParams } = useProcurementParams()

  return (
    <Button
      aria-label="Request item purchase"
      className={iconOnly ? "size-11" : undefined}
      onClick={() =>
        setParams({
          procurementRequestId: null,
          procurementSheetType: "self-service",
        })
      }
      type="button"
      size={iconOnly ? "icon-lg" : "default"}
    >
      <ShoppingBagIcon data-icon="inline-start" />
      {iconOnly ? (
        <span className="sr-only">Request purchase</span>
      ) : (
        "Request purchase"
      )}
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
