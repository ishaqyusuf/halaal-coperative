"use client"

import { useQuery } from "@tanstack/react-query"
import {
  MemberEditForm,
  type MemberEditDefaults,
} from "@/components/forms/member-forms"
import { useTRPC } from "@/trpc/client"

/**
 * Edit member details. Workplace options load only when the sheet is open
 * and the staff member may change workplaces.
 */
export function MemberEditContent({
  canChangeWorkplace,
  member,
  onSuccess,
}: {
  canChangeWorkplace: boolean
  member: MemberEditDefaults
  onSuccess: () => void
}) {
  const trpc = useTRPC()
  const workplaces = useQuery({
    ...trpc.workplaces.list.queryOptions(),
    enabled: canChangeWorkplace,
  })

  if (canChangeWorkplace && workplaces.isPending) {
    return <p className="text-sm text-muted-foreground">Loading...</p>
  }

  const workplaceOptions = (workplaces.data ?? [])
    .filter(
      (workplace) =>
        workplace.isActive || workplace.id === member.deductionSourceId
    )
    .map((workplace) => ({ label: workplace.name, value: workplace.id }))

  return (
    <MemberEditForm
      canChangeWorkplace={canChangeWorkplace && !workplaces.isError}
      member={member}
      onSuccess={onSuccess}
      workplaceOptions={workplaceOptions}
    />
  )
}
