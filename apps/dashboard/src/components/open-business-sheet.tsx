"use client"

import { Button } from "@halaalvest/ui/components/button"
import { PlusIcon } from "lucide-react"
import { useBusinessParams } from "@/hooks/use-business-params"

export function OpenBusinessSheet({
  disabled,
  iconOnly = false,
}: {
  disabled?: boolean
  iconOnly?: boolean
}) {
  const { setParams } = useBusinessParams()

  return (
    <Button
      aria-label={iconOnly ? "Record business" : undefined}
      className={iconOnly ? "size-11" : undefined}
      disabled={disabled}
      onClick={() =>
        setParams({
          businessId: null,
          businessType: "create",
          profitEntryId: null,
        })
      }
      size={iconOnly ? "icon-lg" : "default"}
      type="button"
    >
      <PlusIcon data-icon={iconOnly ? undefined : "inline-start"} />
      {iconOnly ? (
        <span className="sr-only">Record business</span>
      ) : (
        "Record business"
      )}
    </Button>
  )
}

export function OpenReviewNoBusinessProfitSheet() {
  const { setParams } = useBusinessParams()

  return (
    <Button
      onClick={() =>
        setParams({
          businessId: null,
          businessType: "reviewNone",
          profitEntryId: null,
        })
      }
      type="button"
      variant="outline"
    >
      Review none
    </Button>
  )
}
