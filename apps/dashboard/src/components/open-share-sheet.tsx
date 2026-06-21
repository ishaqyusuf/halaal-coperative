"use client"

import { Add01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@halaalvest/ui/components/button"
import { useShareParams } from "@/hooks/use-share-params"

export function OpenShareSheet({ disabled }: { disabled: boolean }) {
  const { setParams } = useShareParams()

  return (
    <div>
      <Button
        aria-label="Create share rule"
        disabled={disabled}
        onClick={() => setParams({ shareType: "create" })}
        size="icon"
        type="button"
        variant="outline"
      >
        <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
      </Button>
    </div>
  )
}
