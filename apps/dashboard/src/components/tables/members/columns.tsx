import Link from "next/link"
import { Badge } from "@halaal-vest/ui/components/badge"
import { Button } from "@halaal-vest/ui/components/button"
import { updateMemberStatusAction } from "@/lib/dashboard-actions"
import type { TableColumn } from "@/components/tables/core"

export type MemberTableRow = {
  canManageMembers: boolean
  fullName: string
  id: string
  joinedAt: Date
  kycStatus: string
  memberNumber: string
  memberType: string
  status: string
  user?: { email: string | null } | null
}

export const memberColumns: Array<TableColumn<MemberTableRow>> = [
  {
    key: "member",
    label: "Member",
    render: (member) => (
      <div>
        <p className="font-medium text-foreground">{member.fullName}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {member.user?.email ?? "No linked user"}
        </p>
      </div>
    ),
  },
  {
    key: "number",
    label: "Number",
    render: (member) => member.memberNumber,
  },
  {
    key: "type",
    label: "Type",
    render: (member) => (
      <span className="capitalize">{member.memberType.replace(/_/g, " ")}</span>
    ),
  },
  {
    key: "status",
    label: "Status",
    render: (member) => (
      <Badge
        variant="outline"
        className={
          member.status === "active"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-amber-200 bg-amber-50 text-amber-700"
        }
      >
        {member.status}
      </Badge>
    ),
  },
  {
    key: "kyc",
    label: "KYC",
    render: (member) => (
      <Badge
        variant="outline"
        className={
          member.kycStatus === "verified"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-amber-200 bg-amber-50 text-amber-700"
        }
      >
        {member.kycStatus.replace(/_/g, " ")}
      </Badge>
    ),
  },
  {
    key: "joined",
    label: "Joined",
    render: (member) => member.joinedAt.toISOString().slice(0, 10),
  },
  {
    key: "actions",
    label: "Actions",
    render: (member) => (
      <div className="flex flex-wrap gap-2">
        <Link
          className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-medium text-foreground transition hover:bg-accent"
          href={`/members/${member.id}`}
        >
          View details
        </Link>
        {member.canManageMembers ? (
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
    ),
  },
]
