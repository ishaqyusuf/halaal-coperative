"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@halaalvest/ui/components/button"

type MemberOption = {
  id: string
  label: string
}

export function MemberPreviewPicker({
  memberOptions,
  selectedMemberId,
}: {
  memberOptions: MemberOption[]
  selectedMemberId?: string | null
}) {
  const router = useRouter()
  const [memberId, setMemberId] = useState(selectedMemberId ?? "")

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row sm:items-end"
      onSubmit={(event) => {
        event.preventDefault()

        if (memberId) {
          router.push(
            `/settings/finance/migration/${encodeURIComponent(memberId)}`
          )
        }
      }}
    >
      <label className="space-y-1 text-xs font-medium text-muted-foreground">
        Member
        <select
          className="h-9 min-w-[260px] rounded-md border border-input bg-background px-3 text-sm text-foreground"
          disabled={memberOptions.length === 0}
          value={memberId}
          onChange={(event) => setMemberId(event.target.value)}
        >
          <option value="">Select a member</option>
          {memberOptions.map((member) => (
            <option key={member.id} value={member.id}>
              {member.label}
            </option>
          ))}
        </select>
      </label>
      <Button
        disabled={!memberId || memberOptions.length === 0}
        size="sm"
        type="submit"
        variant="outline"
      >
        Open preview
      </Button>
    </form>
  )
}
