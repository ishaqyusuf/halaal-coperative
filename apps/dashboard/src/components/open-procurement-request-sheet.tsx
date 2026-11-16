"use client"

import { Button } from "@halaalvest/ui/components/button"
import { PlusIcon } from "lucide-react"
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
      onClick={() =>
        setParams({
          procurementRequestId: null,
          procurementSheetType: "create",
        })
      }
      type="button"
      size={iconOnly ? "icon-touch" : "default"}
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
      onClick={() =>
        setParams({
          procurementRequestId: null,
          procurementSheetType: "self-service",
        })
      }
      type="button"
      size={iconOnly ? "icon-touch" : "default"}
    >
      <PlusIcon data-icon="inline-start" />
      {iconOnly ? (
        <span className="sr-only">Ask for an item</span>
      ) : (
        "Ask for an item"
      )}
    </Button>
  )
}
