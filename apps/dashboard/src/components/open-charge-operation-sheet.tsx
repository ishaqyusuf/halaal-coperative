"use client"

import { Button } from "@halaalvest/ui/components/button"
import { PlusIcon } from "lucide-react"
import { useChargeOperationParams } from "@/hooks/use-charge-operation-params"

const labels = {
  application: "Charge a member",
  definition: "New charge",
} as const

/** The tab's one primary action: open the new-charge or charge-a-member sheet. */
export function OpenChargeOperationButton({
  type,
}: {
  type: "application" | "definition"
}) {
  const { setParams } = useChargeOperationParams()

  return (
    <Button
      size="touch"
      className="w-full text-base sm:w-auto sm:justify-self-start"
      onClick={() =>
        void setParams({
          chargeApplicationId: null,
          chargeDefinitionId: null,
          chargeOperationSheetType: type,
        })
      }
      type="button"
    >
      <PlusIcon data-icon="inline-start" />
      {labels[type]}
    </Button>
  )
}
