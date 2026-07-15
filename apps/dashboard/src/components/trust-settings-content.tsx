"use client"

import { TenantTrustProfileForm } from "@/components/forms/settings-forms"

type TenantTrustProfileFormProps = Parameters<typeof TenantTrustProfileForm>[0]

export function TrustSettingsContent({
  defaultValues,
}: TenantTrustProfileFormProps) {
  return (
    <div className="px-6">
      <TenantTrustProfileForm defaultValues={defaultValues} />
    </div>
  )
}
