"use client"

import { Button } from "@halaalvest/ui/components/button"
import { PlusIcon } from "lucide-react"
import { useBusinessParams } from "@/hooks/use-business-params"

export function OpenBusinessSheet({ disabled }: { disabled?: boolean }) {
  const { setParams } = useBusinessParams()

  return (
    <Button
      className="h-11 w-full text-base sm:w-auto"
      disabled={disabled}
      onClick={() =>
        void setParams({
          businessId: null,
          businessType: "create",
          profitEntryId: null,
        })
      }
      type="button"
    >
      <PlusIcon data-icon="inline-start" />
      Add a business
    </Button>
  )
}

/** Setup only: the cooperative has no past business profit to bring in. */
export function OpenReviewNoBusinessProfitSheet() {
  const { setParams } = useBusinessParams()

  return (
    <Button
      className="h-11 w-full text-base sm:w-auto"
      onClick={() =>
        void setParams({
          businessId: null,
          businessType: "reviewNone",
          profitEntryId: null,
        })
      }
      type="button"
      variant="outline"
    >
      No businesses to bring in
    </Button>
  )
}
