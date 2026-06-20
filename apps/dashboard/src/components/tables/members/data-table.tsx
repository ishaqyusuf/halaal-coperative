import Link from "next/link"
import { MembersEmptyState, MembersNoResults } from "./empty-states"
import { memberColumns, type MemberTableRow } from "./columns"
import { MembersTableHeader } from "./table-header"

export function MembersDataTable({
  canManageMembers,
  cooperativeStartDate,
  hasFilters,
  members,
}: {
  canManageMembers: boolean
  cooperativeStartDate?: string | null
  hasFilters?: boolean
  members: Array<{
    fullName: string
    id: string
    joinedAt: Date
    kycStatus: string
    memberNumber: string
    memberType: string
    status: string
    user?: { email: string | null } | null
  }>
}) {
  if (!members.length) {
    return hasFilters ? <MembersNoResults /> : <MembersEmptyState />
  }

  const rows: MemberTableRow[] = members.map((member) => ({
    ...member,
    canManageMembers,
    cooperativeStartDate,
  }))

  return (
    <section className="overflow-hidden border-x border-b border-border bg-background">
      <div className="overflow-x-auto overscroll-contain scrollbar-hide">
        <table className="w-full min-w-[860px] text-sm">
          <MembersTableHeader />
          <tbody>
              {rows.map((member) => (
                <tr key={member.id} className="border-b border-border/70 align-top last:border-b-0">
                  {memberColumns.map((column) => (
                    <td key={column.key} className="px-4 py-4">
                      {column.render(member)}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
