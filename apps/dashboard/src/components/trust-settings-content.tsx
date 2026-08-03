"use client"

import { useRouter } from "next/navigation"
import { TenantTrustProfileForm } from "@/components/forms/settings-forms"
import { useTrustSettingsParams } from "@/hooks/use-trust-settings-params"

type TenantTrustProfileFormProps = Parameters<typeof TenantTrustProfileForm>[0]

export function TrustSettingsContent({
  defaultValues,
}: TenantTrustProfileFormProps) {
  const router = useRouter()
  const { setParams } = useTrustSettingsParams()

  return (
    <div className="px-4 pb-1 sm:px-6">
      <TenantTrustProfileForm
        defaultValues={defaultValues}
        onSuccess={async () => {
          await setParams(null)
          router.refresh()
        }}
      />
    </div>
  )
}
