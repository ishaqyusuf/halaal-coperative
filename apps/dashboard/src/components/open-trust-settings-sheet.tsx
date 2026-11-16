"use client"

import { Button } from "@halaalvest/ui/components/button"
import { PencilIcon } from "lucide-react"
import { useTrustSettingsParams } from "@/hooks/use-trust-settings-params"

export function OpenTrustSettingsSheet() {
  const { setParams } = useTrustSettingsParams()

  return (
    <Button
      size="touch"
      className="w-full text-base sm:w-auto"
      onClick={() => setParams({ trustSettingsSheetType: "edit" })}
      type="button"
    >
      <PencilIcon data-icon="inline-start" />
      Edit details
    </Button>
  )
}
