"use client"

import { useRouter } from "next/navigation"
import { CooperativeProfileForm } from "@/components/forms/settings-forms"
import { useProfileSettingsParams } from "@/hooks/use-profile-settings-params"

type CooperativeProfileFormProps = Parameters<typeof CooperativeProfileForm>[0]

export function ProfileSettingsContent({
  defaultValues,
  devMode,
}: CooperativeProfileFormProps) {
  const router = useRouter()
  const { setParams } = useProfileSettingsParams()

  return (
    <div className="px-4 pb-1 sm:px-6">
      <CooperativeProfileForm
        defaultValues={defaultValues}
        devMode={devMode}
        onSuccess={async () => {
          await setParams(null)
          router.refresh()
        }}
      />
    </div>
  )
}
