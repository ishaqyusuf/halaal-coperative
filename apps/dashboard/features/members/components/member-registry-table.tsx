import Link from "next/link"
import { Button } from "@halaal-vest/ui/components/button"
import {
  DashboardDataTable,
  DashboardSectionCard,
  DashboardSectionHeader,
  DashboardTable,
  DashboardTableBody,
  DashboardTableCell,
  DashboardTableHead,
  DashboardTableHeaderCell,
  DashboardTableRow,
  TrendPill,
} from "@/components/dashboard/primitives"
import { updateMemberStatusAction } from "@/lib/dashboard-actions"

export function MemberRegistryTable({
  canManageMembers,
  members,
}: {
  canManageMembers: boolean
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
  return (
    <DashboardSectionCard>
      <DashboardSectionHeader
        eyebrow="Registry"
        title="Member records"
        description="Search, filter, and act on member status, KYC, and cooperative identity from one denser registry surface."
        actions={<TrendPill>{members.length} rows</TrendPill>}
      />
      <div className="mt-5">
        <DashboardDataTable>
          <DashboardTable>
            <DashboardTableHead>
              <DashboardTableHeaderCell>Member</DashboardTableHeaderCell>
              <DashboardTableHeaderCell>Number</DashboardTableHeaderCell>
              <DashboardTableHeaderCell>Type</DashboardTableHeaderCell>
              <DashboardTableHeaderCell>Status</DashboardTableHeaderCell>
              <DashboardTableHeaderCell>KYC</DashboardTableHeaderCell>
              <DashboardTableHeaderCell>Joined</DashboardTableHeaderCell>
              <DashboardTableHeaderCell>Actions</DashboardTableHeaderCell>
            </DashboardTableHead>
            <DashboardTableBody>
              {members.map((member) => (
                <DashboardTableRow key={member.id}>
                  <DashboardTableCell>
                    <div>
                      <p className="font-medium text-foreground">{member.fullName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{member.user?.email ?? "No linked user"}</p>
                    </div>
                  </DashboardTableCell>
                  <DashboardTableCell>{member.memberNumber}</DashboardTableCell>
                  <DashboardTableCell className="capitalize">{member.memberType.replace(/_/g, " ")}</DashboardTableCell>
                  <DashboardTableCell><TrendPill tone={member.status === "active" ? "positive" : "warning"}>{member.status}</TrendPill></DashboardTableCell>
                  <DashboardTableCell><TrendPill tone={member.kycStatus === "verified" ? "positive" : "warning"}>{member.kycStatus.replace(/_/g, " ")}</TrendPill></DashboardTableCell>
                  <DashboardTableCell>{member.joinedAt.toISOString().slice(0, 10)}</DashboardTableCell>
                  <DashboardTableCell>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/members/${member.id}`} className="inline-flex h-8 items-center rounded-full border border-border px-3 text-xs font-medium text-foreground transition hover:border-foreground/30">
                        View details
                      </Link>
                      {canManageMembers ? (
                        <form action={updateMemberStatusAction} className="flex flex-wrap gap-2">
                          <input type="hidden" name="memberId" value={member.id} />
                          {member.status !== "active" ? <Button size="xs" type="submit" name="status" value="active" variant="outline" className="rounded-full">Activate</Button> : null}
                          {member.status !== "suspended" ? <Button size="xs" type="submit" name="status" value="suspended" variant="outline" className="rounded-full">Suspend</Button> : null}
                          {member.status !== "inactive" ? <Button size="xs" type="submit" name="status" value="inactive" variant="outline" className="rounded-full">Mark inactive</Button> : null}
                        </form>
                      ) : null}
                    </div>
                  </DashboardTableCell>
                </DashboardTableRow>
              ))}
            </DashboardTableBody>
          </DashboardTable>
        </DashboardDataTable>
      </div>
    </DashboardSectionCard>
  )
}
