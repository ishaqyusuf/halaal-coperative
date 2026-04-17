import Link from "next/link"
import { Badge } from "@halaal-vest/ui/components/badge"
import { Button } from "@halaal-vest/ui/components/button"
import { updateMemberStatusAction } from "@/lib/dashboard-actions"
import { MembersEmptyState, MembersNoResults } from "./empty-states"

export function MembersDataTable({
  canManageMembers,
  hasFilters,
  members,
}: {
  canManageMembers: boolean
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

  return (
    <section className="overflow-hidden border-x border-b border-border bg-background">
      <div className="overflow-x-auto overscroll-contain scrollbar-hide">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="sticky top-0 z-10 border-b border-border bg-background text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="px-4 py-3 font-medium">Number</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">KYC</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b border-border/70 align-top last:border-b-0">
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-medium text-foreground">{member.fullName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {member.user?.email ?? "No linked user"}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-4">{member.memberNumber}</td>
                  <td className="px-4 py-4 capitalize">
                    {member.memberType.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-4">
                    <Badge
                      variant="outline"
                      className={member.status === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}
                    >
                      {member.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    <Badge
                      variant="outline"
                      className={member.kycStatus === "verified" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}
                    >
                      {member.kycStatus.replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {member.joinedAt.toISOString().slice(0, 10)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-medium text-foreground transition hover:bg-accent"
                        href={`/members/${member.id}`}
                      >
                        View details
                      </Link>
                      {canManageMembers ? (
                        <form action={updateMemberStatusAction} className="flex flex-wrap gap-2">
                          <input type="hidden" name="memberId" value={member.id} />
                          {member.status !== "active" ? (
                            <Button
                              className="rounded-full"
                              name="status"
                              size="xs"
                              type="submit"
                              value="active"
                              variant="outline"
                            >
                              Activate
                            </Button>
                          ) : null}
                          {member.status !== "suspended" ? (
                            <Button
                              className="rounded-full"
                              name="status"
                              size="xs"
                              type="submit"
                              value="suspended"
                              variant="outline"
                            >
                              Suspend
                            </Button>
                          ) : null}
                          {member.status !== "inactive" ? (
                            <Button
                              className="rounded-full"
                              name="status"
                              size="xs"
                              type="submit"
                              value="inactive"
                              variant="outline"
                            >
                              Mark inactive
                            </Button>
                          ) : null}
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
