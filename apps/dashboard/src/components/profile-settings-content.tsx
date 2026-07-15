"use client"

import { CooperativeProfileForm } from "@/components/forms/settings-forms"

type CooperativeProfileFormProps = Parameters<typeof CooperativeProfileForm>[0]

export function ProfileSettingsContent({
  defaultValues,
  devMode,
}: CooperativeProfileFormProps) {
  return (
    <div className="px-6">
      <CooperativeProfileForm defaultValues={defaultValues} devMode={devMode} />
    </div>
  )
}
