"use client"

import { Button } from "@halaalvest/ui/components/button"
import { PlusIcon, Settings2Icon } from "lucide-react"
import { useShareParams } from "@/hooks/use-share-params"

export function OpenShareSheet({
  disabled,
}: {
  disabled: boolean
}) {
  const { setParams } = useShareParams()

  return (
    <Button
      aria-label="Create share rule"
      disabled={disabled}
      onClick={() =>
        setParams({
          shareId: null,
          shareType: "create",
        })
      }
      size="icon"
      type="button"
      variant="outline"
    >
      <PlusIcon className="size-4" />
    </Button>
  )
}

export function OpenSharePolicySheet() {
  const { setParams } = useShareParams()

  return (
    <Button
      onClick={() =>
        setParams({
          shareId: null,
          shareType: "policy",
        })
      }
      size="sm"
      type="button"
      variant="outline"
    >
      <Settings2Icon data-icon="inline-start" />
      Edit share model
    </Button>
  )
}
