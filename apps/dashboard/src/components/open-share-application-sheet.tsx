"use client"

import { Button } from "@halaalvest/ui/components/button"
import { CheckCircle2Icon, EyeIcon, PlusIcon } from "lucide-react"
import { useShareApplicationParams } from "@/hooks/use-share-application-params"

export function OpenMemberShareApplicationSheet({
  iconOnly = false,
  disabled,
}: {
  iconOnly?: boolean
  disabled?: boolean
}) {
  const { setParams } = useShareApplicationParams()

  return (
    <Button
      disabled={disabled}
      aria-label={iconOnly ? "Submit share request" : undefined}
      className={iconOnly ? "size-11" : undefined}
      onClick={() =>
        setParams({
          shareApplicationId: null,
          shareApplicationSheetType: "member-create",
        })
      }
      size={iconOnly ? "icon-lg" : "default"}
      type="button"
    >
      <PlusIcon data-icon={iconOnly ? undefined : "inline-start"} />
      {iconOnly ? null : "Submit request"}
    </Button>
  )
}

export function OpenMemberShareApplicationDetailsSheet({
  applicationId,
  className,
}: {
  applicationId: string
  className?: string
}) {
  const { setParams } = useShareApplicationParams()

  return (
    <Button
      className={className}
      onClick={() =>
        setParams({
          shareApplicationId: applicationId,
          shareApplicationSheetType: "details",
        })
      }
      size="sm"
      type="button"
      variant="ghost"
    >
      <EyeIcon data-icon="inline-start" />
      View details
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
