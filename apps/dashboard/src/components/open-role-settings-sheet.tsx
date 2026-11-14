"use client"

import { Button } from "@halaalvest/ui/components/button"
import { UserPlusIcon } from "lucide-react"
import { useRoleSettingsParams } from "@/hooks/use-role-settings-params"

export function OpenRoleSettingsSheet() {
  const { setParams } = useRoleSettingsParams()

  return (
    <Button
      className="h-11 w-full text-base sm:w-auto"
      onClick={() => setParams({ roleSettingsSheetType: "assign" })}
      type="button"
    >
      <UserPlusIcon data-icon="inline-start" />
      Add a person
    </Button>
  )
}
