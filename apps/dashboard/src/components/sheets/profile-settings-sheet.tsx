"use client"

import { Suspense } from "react"
import type { CooperativeProfileForm } from "@/components/workspace-settings/profile-form"
import { ProfileSettingsContent } from "@/components/profile-settings-content"
import { ProfileSettingsSheetHeader } from "@/components/profile-settings-sheet-header"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useProfileSettingsParams } from "@/hooks/use-profile-settings-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"

type CooperativeProfileFormProps = Parameters<typeof CooperativeProfileForm>[0]

export function ProfileSettingsSheet({
  defaultValues,
  devMode,
}: CooperativeProfileFormProps) {
  const { profileSettingsSheetType, setParams } = useProfileSettingsParams()
  const isOpen = profileSettingsSheetType === "edit"

  const handleOnOpenChange = (open: boolean) => {
    if (open) {
      return
    }

    setParams(null)
  }

  return (
    <WorkflowPresentation
      config={getWorkflowPresentation("profile", "edit")}
      open={isOpen}
      onOpenChange={handleOnOpenChange}
    >
      {isOpen ? (
        <Suspense
          fallback={
            <div className="px-4 text-sm text-muted-foreground sm:px-6">
              Loading…
            </div>
          }
        >
          <ProfileSettingsSheetHeader />
          <ProfileSettingsContent
            defaultValues={defaultValues}
            devMode={devMode}
          />
        </Suspense>
      ) : null}
    </WorkflowPresentation>
  )
}
