import { notFound } from "next/navigation"
import { createDbRuntime, getMemberOnboardingRequestById } from "@halaal-vest/db"
import { DashboardSectionCard, DashboardSectionHeader, DashboardStatCard, TrendPill } from "@/components/dashboard/primitives"
import { MembershipApprovalForm } from "@/features/member-onboarding/components/membership-approval-form"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/features/workspace/page-shell"
import { getDashboardServerContext } from "@/lib/server-context"

export default async function MembershipApprovalDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>
}) {
  const resolvedParams = await params
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()

  if (!context.tenant || runtime.status !== "database-configured") {
    return (
      <WorkspacePageShell
        eyebrow="Membership"
        title="Approval request"
        description="Review and finalize a member onboarding request."
      >
        <WorkspaceEmptyState
          title="Approval review needs the database runtime."
          body="Once the database runtime is configured, verified membership requests can be reviewed here."
        />
      </WorkspacePageShell>
    )
  }

  const request = await getMemberOnboardingRequestById(context.tenant.id, resolvedParams.requestId)

  if (!request) {
    notFound()
  }

  return (
    <WorkspacePageShell
      eyebrow="Membership"
      title={request.fullName}
      description="Confirm submitted identity details, set member financial state, and finalize cooperative approval."
    >
      <section className="grid gap-4 md:grid-cols-4">
        <DashboardStatCard label="Email verification" value={request.emailVerifiedAt ? "Verified" : "Pending"} detail={request.emailVerifiedAt ? request.emailVerifiedAt.toISOString().slice(0, 10) : "Email has not been verified yet."} tone={request.emailVerifiedAt ? "positive" : "warning"} />
        <DashboardStatCard label="Request status" value={request.status.replace(/_/g, " ")} detail="Current approval state for this signup." />
        <DashboardStatCard label="Cooperative number" value={request.memberNumber} detail="Submitted UID or cooperative number." />
        <DashboardStatCard label="Phone number" value={request.phoneNumber ?? "Not provided"} detail="Submitted phone number for contact follow-up." />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(320px,0.8fr)]">
        <DashboardSectionCard>
          <DashboardSectionHeader
            eyebrow="Submitted profile"
            title="Applicant details"
            actions={<TrendPill tone={request.status === "pending_approval" ? "warning" : "neutral"}>{request.status.replace(/_/g, " ")}</TrendPill>}
          />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Name</p>
              <p className="mt-2 text-sm font-medium text-foreground">{request.fullName}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Email</p>
              <p className="mt-2 text-sm font-medium text-foreground">{request.email}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Phone number</p>
              <p className="mt-2 text-sm font-medium text-foreground">{request.phoneNumber ?? "Not provided"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Cooperative number</p>
              <p className="mt-2 text-sm font-medium text-foreground">{request.memberNumber}</p>
            </div>
          </div>
        </DashboardSectionCard>

        <DashboardSectionCard>
          <DashboardSectionHeader
            eyebrow="Verification"
            title="Approval workflow"
            description="Only email-verified requests should move into final approval."
          />
          <div className="mt-5 space-y-3 text-sm text-muted-foreground">
            <p>Email verification: {request.emailVerifiedAt ? `verified on ${request.emailVerifiedAt.toISOString().slice(0, 10)}` : "not verified yet"}</p>
            <p>Submitted: {request.createdAt.toISOString().slice(0, 10)}</p>
            {request.rejectionReason ? <p>Rejection reason: {request.rejectionReason}</p> : null}
          </div>
        </DashboardSectionCard>
      </div>

      <DashboardSectionCard>
        <DashboardSectionHeader
          eyebrow="Approval form"
          title="Finalize member access"
          description="Set the member’s balance, contribution commitment, and optional active loan before approving dashboard access."
        />
        <div className="mt-5">
          <MembershipApprovalForm requestId={request.id} />
        </div>
      </DashboardSectionCard>
    </WorkspacePageShell>
  )
}
