"use client"

import { Suspense } from "react"
import { Sheet, SheetContent } from "@halaalvest/ui/components/sheet"
import type { RoleAssignmentForm } from "@/components/forms/settings-forms"
import { RoleSettingsContent } from "@/components/role-settings-content"
import { RoleSettingsSheetHeader } from "@/components/role-settings-sheet-header"
import { useRoleSettingsParams } from "@/hooks/use-role-settings-params"

type RoleAssignmentFormProps = Parameters<typeof RoleAssignmentForm>[0]

export function RoleSettingsSheet({
  devMode,
  roles,
}: RoleAssignmentFormProps) {
  const { roleSettingsSheetType, setParams } = useRoleSettingsParams()
  const isOpen = roleSettingsSheetType === "assign"

  const handleOnOpenChange = (open: boolean) => {
    if (open) {
      return
    }

    setParams(null)
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleOnOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        {isOpen ? (
          <Suspense
            fallback={
              <div className="px-6 text-sm text-muted-foreground">
                Loading role assignment form...
              </div>
            }
          >
            <RoleSettingsSheetHeader />
            <RoleSettingsContent devMode={devMode} roles={roles} />
          </Suspense>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
