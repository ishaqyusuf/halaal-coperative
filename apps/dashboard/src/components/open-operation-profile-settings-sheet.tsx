"use client"

import type { TenantServiceKey } from "@halaalvest/db"
import { Button } from "@halaalvest/ui/components/button"
import { useOperationProfileSettingsParams } from "@/hooks/use-operation-profile-settings-params"

export function OpenOperationProfileSettingsSheet({
  serviceKey,
  serviceLabel,
}: {
  serviceKey: TenantServiceKey
  serviceLabel: string
}) {
  const { setParams } = useOperationProfileSettingsParams()

  return (
    <Button
      size="touch"
      aria-label={`Change who can start ${serviceLabel.toLowerCase()}`}
      className="w-full text-base sm:w-auto"
      onClick={() =>
        setParams({
          operationProfileServiceKey: serviceKey,
          operationProfileSettingsSheetType: "edit",
        })
      }
      type="button"
      variant="outline"
    >
      Change
    </Button>
  )
}
