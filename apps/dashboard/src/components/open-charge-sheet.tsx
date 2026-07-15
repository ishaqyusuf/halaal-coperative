"use client"

import { Button } from "@halaalvest/ui/components/button"
import { PlusIcon } from "lucide-react"
import { useChargeParams } from "@/hooks/use-charge-params"

export function OpenChargeSheet({
  disabled,
}: {
  disabled: boolean
}) {
  const { setParams } = useChargeParams()

  return (
    <Button
      aria-label="Create charge"
      disabled={disabled}
      onClick={() =>
        setParams({
          chargeId: null,
          chargeType: "create",
          chargeVersionId: null,
        })
      }
      size="icon"
      type="button"
      variant="outline"
    >
      <PlusIcon className="size-4" />
    </Button>
  )
}
