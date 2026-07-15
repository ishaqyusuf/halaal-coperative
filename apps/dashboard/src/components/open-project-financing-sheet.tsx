"use client"

import { Button } from "@halaalvest/ui/components/button"
import { BanknoteIcon, CheckCircle2Icon, PlusIcon } from "lucide-react"
import { useProjectFinancingParams } from "@/hooks/use-project-financing-params"

export function OpenProjectFinancingRequestSheet() {
  const { setParams } = useProjectFinancingParams()

  return (
    <Button
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
      Request funding
    </Button>
  )
}

export function OpenProjectFinancingReviewSheet({
  requestId,
}: {
  requestId: string
}) {
  const { setParams } = useProjectFinancingParams()

  return (
    <Button
      onClick={() =>
        setParams({
          projectFinancingRequestId: requestId,
          projectFinancingSheetType: "review",
        })
      }
      size="sm"
      type="button"
      variant="outline"
    >
      <CheckCircle2Icon data-icon="inline-start" />
      Review request
    </Button>
  )
}

export function OpenProjectFinancingDisbursementSheet({
  requestId,
}: {
  requestId: string
}) {
  const { setParams } = useProjectFinancingParams()

  return (
    <Button
      onClick={() =>
        setParams({
          projectFinancingRequestId: requestId,
          projectFinancingSheetType: "disbursement",
        })
      }
      size="sm"
      type="button"
    >
      <BanknoteIcon data-icon="inline-start" />
      Record disbursement
    </Button>
  )
}
