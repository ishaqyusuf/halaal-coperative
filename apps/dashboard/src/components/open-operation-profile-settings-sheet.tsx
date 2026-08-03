"use client"

import type { TenantServiceKey } from "@halaalvest/db"
import { Button } from "@halaalvest/ui/components/button"
import { PencilIcon } from "lucide-react"
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
      aria-label={`Edit ${serviceLabel} access`}
      className="h-11 w-full md:h-10 md:w-auto"
      onClick={() =>
        setParams({
          operationProfileServiceKey: serviceKey,
          operationProfileSettingsSheetType: "edit",
        })
      }
      type="button"
      variant="outline"
    >
      <PencilIcon data-icon="inline-start" />
      Edit access
    </Button>
  )
}
