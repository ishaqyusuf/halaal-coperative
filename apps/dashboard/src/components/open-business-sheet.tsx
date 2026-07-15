"use client"

import { Button } from "@halaalvest/ui/components/button"
import { PlusIcon } from "lucide-react"
import { useBusinessParams } from "@/hooks/use-business-params"

export function OpenBusinessSheet({ disabled }: { disabled?: boolean }) {
  const { setParams } = useBusinessParams()

  return (
    <Button
      disabled={disabled}
      onClick={() =>
        setParams({
          businessId: null,
          businessType: "create",
          profitEntryId: null,
        })
      }
      type="button"
    >
      <PlusIcon data-icon="inline-start" />
      Record business
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
