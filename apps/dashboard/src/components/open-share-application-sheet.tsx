"use client"

import { Button } from "@halaalvest/ui/components/button"
import { CheckCircle2Icon, PlusIcon } from "lucide-react"
import { useShareApplicationParams } from "@/hooks/use-share-application-params"

export function OpenMemberShareApplicationSheet({
  disabled,
}: {
  disabled?: boolean
}) {
  const { setParams } = useShareApplicationParams()

  return (
    <Button
      disabled={disabled}
      onClick={() =>
        setParams({
          shareApplicationId: null,
          shareApplicationSheetType: "member-create",
        })
      }
      type="button"
    >
      <PlusIcon data-icon="inline-start" />
      Submit request
    </Button>
  )
}

export function OpenShareApplicationCreateSheet({
  disabled,
}: {
  disabled?: boolean
}) {
  const { setParams } = useShareApplicationParams()

  return (
    <Button
      disabled={disabled}
      onClick={() =>
        setParams({
          shareApplicationId: null,
          shareApplicationSheetType: "create",
        })
      }
      type="button"
    >
      <PlusIcon data-icon="inline-start" />
      Create request
    </Button>
  )
}

export function OpenShareApplicationReviewSheet({
  applicationId,
}: {
  applicationId: string
}) {
  const { setParams } = useShareApplicationParams()

  return (
    <Button
      onClick={() =>
        setParams({
          shareApplicationId: applicationId,
          shareApplicationSheetType: "review",
        })
      }
      size="sm"
      type="button"
      variant="outline"
    >
      <CheckCircle2Icon data-icon="inline-start" />
      Review
    </Button>
  )
}
