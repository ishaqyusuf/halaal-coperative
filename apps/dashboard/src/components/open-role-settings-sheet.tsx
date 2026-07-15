"use client"

import { Button } from "@halaalvest/ui/components/button"
import { UserPlusIcon } from "lucide-react"
import { useRoleSettingsParams } from "@/hooks/use-role-settings-params"

export function OpenRoleSettingsSheet() {
  const { setParams } = useRoleSettingsParams()

  return (
    <Button
      onClick={() => setParams({ roleSettingsSheetType: "assign" })}
      type="button"
    >
      <UserPlusIcon data-icon="inline-start" />
      Assign role
    </Button>
  )
}
