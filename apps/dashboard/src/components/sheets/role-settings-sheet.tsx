"use client"

import { Suspense } from "react"
import type { RoleAssignmentForm } from "@/components/forms/settings-forms"
import { RoleSettingsContent } from "@/components/role-settings-content"
import { RoleSettingsSheetHeader } from "@/components/role-settings-sheet-header"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useRoleSettingsParams } from "@/hooks/use-role-settings-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"

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
    <WorkflowPresentation
      config={getWorkflowPresentation("role", "assign")}
      open={isOpen}
      onOpenChange={handleOnOpenChange}
    >
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
    </WorkflowPresentation>
  )
}
