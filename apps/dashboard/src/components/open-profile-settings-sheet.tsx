"use client"

import { Button } from "@halaalvest/ui/components/button"
import { PencilIcon } from "lucide-react"
import { useProfileSettingsParams } from "@/hooks/use-profile-settings-params"

export function OpenProfileSettingsSheet() {
  const { setParams } = useProfileSettingsParams()

  return (
    <Button
      className="h-11 w-full text-base sm:w-auto"
      onClick={() => setParams({ profileSettingsSheetType: "edit" })}
      type="button"
    >
      <PencilIcon data-icon="inline-start" />
      Edit details
    </Button>
  )
}
