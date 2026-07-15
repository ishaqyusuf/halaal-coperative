"use client"

import { Button } from "@halaalvest/ui/components/button"
import { BanIcon, PlusIcon, RotateCcwIcon, SendIcon } from "lucide-react"
import { useChargeOperationParams } from "@/hooks/use-charge-operation-params"

export function OpenChargeDefinitionSheet({ disabled }: { disabled?: boolean }) {
  const { setParams } = useChargeOperationParams()

  return (
    <Button
      disabled={disabled}
      onClick={() =>
        setParams({
          chargeApplicationId: null,
          chargeDefinitionId: null,
          chargeIsActive: null,
          chargeKind: null,
          chargeOperationSheetType: "definition",
          chargeValueType: null,
        })
      }
      type="button"
    >
      <PlusIcon data-icon="inline-start" />
      New charge
    </Button>
  )
}

export function OpenChargeApplicationSheet({
  disabled,
}: {
  disabled?: boolean
}) {
  const { setParams } = useChargeOperationParams()

  return (
    <Button
      disabled={disabled}
      onClick={() =>
        setParams({
          chargeApplicationId: null,
          chargeDefinitionId: null,
          chargeIsActive: null,
          chargeKind: null,
          chargeOperationSheetType: "application",
          chargeValueType: null,
        })
      }
      type="button"
      variant="outline"
    >
      <SendIcon data-icon="inline-start" />
      Apply charge
    </Button>
  )
}

export function OpenChargeWaiveSheet({
  chargeApplicationId,
}: {
  chargeApplicationId: string
}) {
  const { setParams } = useChargeOperationParams()

  return (
    <Button
      onClick={() =>
        setParams({
          chargeApplicationId,
          chargeDefinitionId: null,
          chargeIsActive: null,
          chargeKind: null,
          chargeOperationSheetType: "waive",
          chargeValueType: null,
        })
      }
      size="sm"
      type="button"
      variant="outline"
    >
      <BanIcon data-icon="inline-start" />
      Waive
    </Button>
  )
}

export function OpenChargeReverseSheet({
  chargeApplicationId,
}: {
  chargeApplicationId: string
}) {
  const { setParams } = useChargeOperationParams()

  return (
    <Button
      onClick={() =>
        setParams({
          chargeApplicationId,
          chargeDefinitionId: null,
          chargeIsActive: null,
          chargeKind: null,
          chargeOperationSheetType: "reverse",
          chargeValueType: null,
        })
      }
      size="sm"
      type="button"
      variant="outline"
    >
      <RotateCcwIcon data-icon="inline-start" />
      Reverse
    </Button>
  )
}

export function OpenChargeToggleSheet({
  chargeDefinitionId,
  isActive,
}: {
  chargeDefinitionId: string
  isActive: boolean
}) {
  const { setParams } = useChargeOperationParams()

  return (
    <Button
      onClick={() =>
        setParams({
          chargeApplicationId: null,
          chargeDefinitionId,
          chargeIsActive: isActive ? "false" : "true",
          chargeKind: null,
          chargeOperationSheetType: "toggle",
          chargeValueType: null,
        })
      }
      size="sm"
      type="button"
      variant="outline"
    >
      {isActive ? "Deactivate" : "Activate"}
    </Button>
  )
}

export function OpenChargeVersionSheet({
  chargeDefinitionId,
  chargeKind,
  chargeValueType,
}: {
  chargeDefinitionId: string
  chargeKind: string
  chargeValueType: string
}) {
  const { setParams } = useChargeOperationParams()

  return (
    <Button
      onClick={() =>
        setParams({
          chargeApplicationId: null,
          chargeDefinitionId,
          chargeIsActive: null,
          chargeKind,
          chargeOperationSheetType: "version",
          chargeValueType,
        })
      }
      size="sm"
      type="button"
      variant="outline"
    >
      Add dated update
    </Button>
  )
}
