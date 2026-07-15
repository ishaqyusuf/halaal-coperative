"use client"

import { Suspense } from "react"
import { Sheet, SheetContent } from "@halaalvest/ui/components/sheet"
import type { CooperativeProfileForm } from "@/components/forms/settings-forms"
import { ProfileSettingsContent } from "@/components/profile-settings-content"
import { ProfileSettingsSheetHeader } from "@/components/profile-settings-sheet-header"
import { useProfileSettingsParams } from "@/hooks/use-profile-settings-params"

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
    <Sheet open={isOpen} onOpenChange={handleOnOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        {isOpen ? (
          <Suspense
            fallback={
              <div className="px-6 text-sm text-muted-foreground">
                Loading profile form...
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
      </SheetContent>
    </Sheet>
  )
}
