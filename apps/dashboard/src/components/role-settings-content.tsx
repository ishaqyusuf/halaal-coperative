"use client"

import { useRouter } from "next/navigation"
import { RoleAssignmentForm } from "@/components/workspace-settings/role-form"
import { useRoleSettingsParams } from "@/hooks/use-role-settings-params"

type RoleAssignmentFormProps = Parameters<typeof RoleAssignmentForm>[0]

export function RoleSettingsContent({
  devMode,
  roles,
}: Omit<RoleAssignmentFormProps, "onSuccess">) {
  const router = useRouter()
  const { setParams } = useRoleSettingsParams()

  return (
    <div className="px-4 pb-1 sm:px-6">
      <RoleAssignmentForm
        devMode={devMode}
        onSuccess={() => {
          void setParams(null)
          router.refresh()
        }}
        roles={roles}
      />
    </div>
  )
}
