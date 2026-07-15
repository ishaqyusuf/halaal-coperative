"use client"

import { Button } from "@halaalvest/ui/components/button"
import { DropdownMenuItem } from "@halaalvest/ui/components/dropdown-menu"
import { PlusIcon, UploadIcon } from "lucide-react"
import { useMemberParams } from "@/hooks/use-member-params"

export function OpenMemberSheet({ disabled }: { disabled?: boolean }) {
  const { setParams } = useMemberParams()

  return (
    <Button
      disabled={disabled}
      onClick={() =>
        setParams({
          memberSheetType: "create",
          selectedMemberId: null,
          selectedMemberStatus: null,
        })
      }
      type="button"
    >
      <PlusIcon data-icon="inline-start" />
      New member
    </Button>
  )
}

export function OpenMemberImportSheet() {
  const { memberSheetType, setParams } = useMemberParams()
  const isOpen = memberSheetType === "import"

  return (
    <Button
      className="rounded-full"
      onClick={() =>
        setParams({
          memberSheetType: "import",
          selectedMemberId: null,
          selectedMemberStatus: null,
        })
      }
      size="sm"
      type="button"
      variant={isOpen ? "default" : "outline"}
    >
      <UploadIcon data-icon="inline-start" />
      Import members
    </Button>
  )
}

export function OpenMemberStatusSheet({
  label,
  memberId,
  status,
}: {
  label: string
  memberId: string
  status: string
}) {
  const { setParams } = useMemberParams()

  return (
    <DropdownMenuItem
      onClick={() =>
        setParams({
          memberSheetType: "status",
          selectedMemberId: memberId,
          selectedMemberStatus: status,
        })
      }
    >
      {label}
    </DropdownMenuItem>
  )
}
