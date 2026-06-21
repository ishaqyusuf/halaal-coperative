"use client"

import { Add01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@halaalvest/ui/components/button"
import { useBusinessParams } from "@/hooks/use-business-params"

export function OpenBusinessSheet({ disabled }: { disabled: boolean }) {
  const { setParams } = useBusinessParams()

  return (
    <div>
      <Button
        aria-label="Record business"
        disabled={disabled}
        onClick={() => setParams({ businessType: "create" })}
        size="icon"
        type="button"
        variant="outline"
      >
        <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
      </Button>
    </div>
  )
}
