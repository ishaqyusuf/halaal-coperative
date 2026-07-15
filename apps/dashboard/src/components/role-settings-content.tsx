"use client"

import { RoleAssignmentForm } from "@/components/forms/settings-forms"

type RoleAssignmentFormProps = Parameters<typeof RoleAssignmentForm>[0]

export function RoleSettingsContent({
  devMode,
  roles,
}: RoleAssignmentFormProps) {
  return (
    <div className="px-6">
      <RoleAssignmentForm devMode={devMode} roles={roles} />
    </div>
  )
}
