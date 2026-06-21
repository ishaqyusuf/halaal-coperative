"use client"

import { Add01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@halaalvest/ui/components/button"
import { useChargeParams } from "@/hooks/use-charge-params"

export function OpenChargeSheet({ disabled }: { disabled: boolean }) {
  const { setParams } = useChargeParams()

  return (
    <div>
      <Button
        aria-label="Create charge"
        disabled={disabled}
        onClick={() => setParams({ chargeType: "create" })}
        size="icon"
        type="button"
        variant="outline"
      >
        <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
      </Button>
    </div>
  )
}
