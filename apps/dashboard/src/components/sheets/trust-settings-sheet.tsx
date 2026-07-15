"use client"

import { Suspense } from "react"
import { Sheet, SheetContent } from "@halaalvest/ui/components/sheet"
import type { TenantTrustProfileForm } from "@/components/forms/settings-forms"
import { TrustSettingsContent } from "@/components/trust-settings-content"
import { TrustSettingsSheetHeader } from "@/components/trust-settings-sheet-header"
import { useTrustSettingsParams } from "@/hooks/use-trust-settings-params"

type TenantTrustProfileFormProps = Parameters<typeof TenantTrustProfileForm>[0]

export function TrustSettingsSheet({
  defaultValues,
}: TenantTrustProfileFormProps) {
  const { setParams, trustSettingsSheetType } = useTrustSettingsParams()
  const isOpen = trustSettingsSheetType === "edit"

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
                Loading trust profile form...
              </div>
            }
          >
            <TrustSettingsSheetHeader />
            <TrustSettingsContent defaultValues={defaultValues} />
          </Suspense>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
