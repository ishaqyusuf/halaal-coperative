"use client"

import { Button } from "@halaalvest/ui/components/button"
import { SlidersHorizontalIcon } from "lucide-react"
import { useOperationProfileSettingsParams } from "@/hooks/use-operation-profile-settings-params"

export function OpenOperationProfileSettingsSheet() {
  const { setParams } = useOperationProfileSettingsParams()

  return (
    <Button
      onClick={() =>
        setParams({ operationProfileSettingsSheetType: "edit" })
      }
      type="button"
    >
      <SlidersHorizontalIcon data-icon="inline-start" />
      Edit operation profile
    </Button>
  )
}
