import { createDbRuntime, listMembers } from "@halaal-vest/db"
import { Button } from "@halaal-vest/ui/components/button"
import Link from "next/link"
import { MemberCreateForm } from "@/features/forms/member-forms"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/features/workspace/page-shell"
import { updateMemberStatusAction } from "@/lib/dashboard-actions"
import { getDashboardServerContext } from "@/lib/server-context"
import { hasAnyRole, memberManagementRoles } from "@/lib/workspace-access"

export default async function MembersPage() {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const canManageMembers = hasAnyRole(context.auth.membership?.role, memberManagementRoles)

  if (!context.tenant || runtime.status !== "database-configured") {
    return (
      <WorkspacePageShell
        eyebrow="Members"
        title="Member registry"
        description="Review member onboarding and cooperative identity records from one workspace-owned page."
      >
        <WorkspaceEmptyState
          title="Database-backed member records are not available yet."
          body="Configure the database runtime to load the tenant member registry here. The role-aware route and navigation foundation are already in place."
        />
      </WorkspacePageShell>
    )
  }

  const members = await listMembers(context.tenant.id, { page: 1, pageSize: 20 })

  return (
    <WorkspacePageShell
      eyebrow="Members"
      title="Member registry"
      description="Operational member records, status, and membership types for the active cooperative."
    >
      {canManageMembers ? <MemberCreateForm devMode={process.env.NODE_ENV !== "production"} /> : null}

      <div className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-background/92 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
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
            {members.items.map((member) => (
              <tr key={member.id} className="border-t border-border/60">
                <td className="px-4 py-3">
                  <div className="font-medium text-foreground">{member.fullName}</div>
                  <div className="text-xs text-muted-foreground">{member.user?.email ?? "No linked user"}</div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{member.memberNumber}</td>
                <td className="px-4 py-3 capitalize text-muted-foreground">{member.memberType.replace(/_/g, " ")}</td>
                <td className="px-4 py-3 capitalize text-muted-foreground">{member.status}</td>
                <td className="px-4 py-3 capitalize text-muted-foreground">{member.kycStatus.replace(/_/g, " ")}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {member.joinedAt.toISOString().slice(0, 10)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/members/${member.id}`}
                      className="inline-flex h-7 items-center rounded-md border border-input px-2.5 text-xs font-medium text-foreground shadow-xs transition hover:bg-accent hover:text-accent-foreground"
                    >
                      View details
                    </Link>
                    {canManageMembers ? (
                      <form action={updateMemberStatusAction} className="flex flex-wrap gap-2">
                        <input type="hidden" name="memberId" value={member.id} />
                        {member.status !== "active" ? (
                          <Button size="xs" type="submit" name="status" value="active" variant="outline">
                            Activate
                          </Button>
                        ) : null}
                        {member.status !== "suspended" ? (
                          <Button size="xs" type="submit" name="status" value="suspended" variant="outline">
                            Suspend
                          </Button>
                        ) : null}
                        {member.status !== "inactive" ? (
                          <Button size="xs" type="submit" name="status" value="inactive" variant="outline">
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
    </WorkspacePageShell>
  )
}
