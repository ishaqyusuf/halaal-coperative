"use client"

import { Button } from "@halaalvest/ui/components/button"
import { BottomBar } from "@/components/tables/core"
import type { Member } from "./columns"

function escapeCsv(value: unknown) {
  const text = String(value ?? "")
  return `"${text.replaceAll('"', '""')}"`
}

export function MembersBottomBar({
  members,
  onDeselect,
}: {
  members: Member[]
  onDeselect: () => void
}) {
  function exportSelected() {
    const rows = members.map((member) => ({
      member_number: member.memberNumber,
      full_name: member.fullName,
      member_type: member.memberType,
      status: member.status,
      kyc_status: member.kycStatus,
      joined_at: new Date(member.joinedAt).toISOString().slice(0, 10),
      email: member.user?.email ?? "",
    }))
    const headers = Object.keys(rows[0] ?? {})
    const csv = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) =>
        headers
          .map((header) => escapeCsv(row[header as keyof typeof row]))
          .join(",")
      ),
    ].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")

    link.href = url
    link.download = "selected-members.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <BottomBar selectedCount={members.length} onDeselect={onDeselect}>
      <Button onClick={exportSelected} type="button" variant="outline">
        Export selected
      </Button>
    </BottomBar>
  )
}
