"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@halaalvest/ui/components/button"
import { LabeledSelectInput } from "@/components/labeled-select-input"

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
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        Member
        <LabeledSelectInput
          disabled={memberOptions.length === 0}
          options={memberOptions.map((member) => ({
            label: member.label,
            value: member.id,
          }))}
          placeholder="Select a member"
          triggerClassName="min-w-[260px]"
          onValueChange={setMemberId}
          value={memberId}
        />
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
