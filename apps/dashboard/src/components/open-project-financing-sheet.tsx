"use client"

import { Button } from "@halaalvest/ui/components/button"
import { PlusIcon } from "lucide-react"
import { useProjectFinancingParams } from "@/hooks/use-project-financing-params"

export function OpenProjectFinancingRequestSheet({
  disabled,
}: {
  disabled?: boolean
}) {
  const { setParams } = useProjectFinancingParams()

  return (
    <Button
      disabled={disabled}
      onClick={() =>
        setParams({
          projectFinancingRequestId: null,
          projectFinancingSheetType: "create",
        })
      }
      type="button"
    >
      <PlusIcon data-icon="inline-start" />
      New request
    </Button>
  )
}

export function OpenMemberProjectFinancingRequestSheet() {
  const { setParams } = useProjectFinancingParams()

  return (
    <Button
      onClick={() =>
        setParams({
          projectFinancingRequestId: null,
          projectFinancingSheetType: "self-service",
        })
      }
      type="button"
    >
      <PlusIcon data-icon="inline-start" />
      Ask for funding
    </Button>
  )
}
