"use client"

import { Button } from "@halaalvest/ui/components/button"
import { PencilIcon } from "lucide-react"
import { useTrustSettingsParams } from "@/hooks/use-trust-settings-params"

export function OpenTrustSettingsSheet() {
  const { setParams } = useTrustSettingsParams()

  return (
    <Button
      className="h-11 w-full md:h-10 md:w-auto"
      onClick={() => setParams({ trustSettingsSheetType: "edit" })}
      type="button"
    >
      <PencilIcon data-icon="inline-start" />
      Edit trust profile
    </Button>
  )
}
