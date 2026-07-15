import type { getMemberOnboardingRequestById } from "@halaalvest/db"
import {
  DashboardSectionCard,
  DashboardSectionHeader,
  DashboardStatCard,
  TrendPill,
  WorkspaceEmptyState,
  WorkspacePageShell,
} from "@/components/dashboard"
import { MembershipApprovalContent } from "@/components/membership-approval-content"

type MembershipApprovalRequest = NonNullable<
  Awaited<ReturnType<typeof getMemberOnboardingRequestById>>
>

export function MembershipApprovalDetailUnavailableView() {
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

export function MembershipApprovalDetailView({
  request,
}: {
  request: MembershipApprovalRequest
}) {
  return (
    <WorkspacePageShell
      description="Confirm submitted identity details, set member financial state, and finalize cooperative approval."
      eyebrow="Membership"
      title={request.fullName}
    >
      <section className="grid gap-4 md:grid-cols-4">
        <DashboardStatCard
          detail={
            request.emailVerifiedAt
              ? request.emailVerifiedAt.toISOString().slice(0, 10)
              : "Email has not been verified yet."
          }
          label="Email verification"
          tone={request.emailVerifiedAt ? "positive" : "warning"}
          value={request.emailVerifiedAt ? "Verified" : "Pending"}
        />
        <DashboardStatCard
          detail="Current approval state for this signup."
          label="Request status"
          value={request.status.replace(/_/g, " ")}
        />
        <DashboardStatCard
          detail="Submitted UID or cooperative number."
          label="Cooperative number"
          value={request.memberNumber}
        />
        <DashboardStatCard
          detail="Submitted phone number for contact follow-up."
          label="Phone number"
          value={request.phoneNumber ?? "Not provided"}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(320px,0.8fr)]">
        <DashboardSectionCard>
          <DashboardSectionHeader
            actions={
              <TrendPill
                tone={
                  request.status === "pending_approval" ? "warning" : "neutral"
                }
              >
                {request.status.replace(/_/g, " ")}
              </TrendPill>
            }
            eyebrow="Submitted profile"
            title="Applicant details"
          />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">
                Name
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {request.fullName}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">
                Email
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {request.email}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">
                Phone number
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {request.phoneNumber ?? "Not provided"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">
                Cooperative number
              </p>
              <p className="mt-2 text-sm font-medium text-foreground">
                {request.memberNumber}
              </p>
            </div>
          </div>
        </DashboardSectionCard>

        <DashboardSectionCard>
          <DashboardSectionHeader
            description="Only email-verified requests should move into final approval."
            eyebrow="Verification"
            title="Approval workflow"
          />
          <div className="mt-5 space-y-3 text-sm text-muted-foreground">
            <p>
              Email verification:{" "}
              {request.emailVerifiedAt
                ? `verified on ${request.emailVerifiedAt.toISOString().slice(0, 10)}`
                : "not verified yet"}
            </p>
            <p>Submitted: {request.createdAt.toISOString().slice(0, 10)}</p>
            {request.rejectionReason ? (
              <p>Rejection reason: {request.rejectionReason}</p>
            ) : null}
          </div>
        </DashboardSectionCard>
      </div>

      <MembershipApprovalContent requestId={request.id} />
    </WorkspacePageShell>
  )
}
