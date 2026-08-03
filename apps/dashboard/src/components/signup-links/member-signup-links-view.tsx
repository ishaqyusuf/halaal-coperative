import {
  DashboardStatCard,
  WorkspaceEmptyState,
  WorkspacePageShell,
} from "@/components/dashboard"
import { MemberSignupLinkManager } from "@/components/signup-links/member-signup-link-manager"
import { MemberSignupLinksHeaderActions } from "@/components/signup-links/member-signup-links-header-actions"
import {
  signupAccessModeLabels,
  type MemberSignupLinkView,
  type SignupAccessMode,
} from "@/lib/signup-links/member-signup-links"

export function MemberSignupLinksUnavailableView({
  body,
  title,
}: {
  body: string
  title: string
}) {
  return (
    <WorkspacePageShell
      eyebrow="Membership"
      title="Member signup links"
      description="Manage the member signup gate and issue controlled remote signup links."
    >
      <WorkspaceEmptyState title={title} body={body} />
    </WorkspacePageShell>
  )
}

export function MemberSignupLinksView({
  availableLinks,
  defaultMode,
  links,
  totalApproved,
  totalSignups,
}: {
  availableLinks: number
  defaultMode: SignupAccessMode
  links: MemberSignupLinkView[]
  totalApproved: number
  totalSignups: number
}) {
  return (
    <WorkspacePageShell
      actions={<MemberSignupLinksHeaderActions />}
      description="Keep member signup in-office by default, issue controlled signup links when needed, and watch how each link performs."
      eyebrow="Membership"
      title="Member signup links"
    >
      <section className="hidden gap-4 md:grid md:grid-cols-4">
        <DashboardStatCard
          detail="Current cooperative-wide signup gate."
          label="Signup access"
          tone={defaultMode === "public" ? "positive" : "warning"}
          value={signupAccessModeLabels[defaultMode]}
        />
        <DashboardStatCard
          detail="Staff-issued links that applicants can use right now."
          label="Available links"
          value={availableLinks.toString()}
        />
        <DashboardStatCard
          detail="All onboarding requests created through staff links."
          label="Link signups"
          value={totalSignups.toString()}
        />
        <DashboardStatCard
          detail="Link-driven applicants who have already been approved."
          label="Approved via links"
          tone="positive"
          value={totalApproved.toString()}
        />
      </section>

      <section aria-labelledby="signup-link-management-title">
        <div className="pb-4">
          <p className="text-xs font-medium text-muted-foreground">
            Control center
          </p>
          <h2
            className="mt-1 text-base font-semibold text-foreground"
            id="signup-link-management-title"
          >
            Gate and link management
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Adjust the cooperative signup gate, create staff links, regenerate
            compromised tokens, and update expiry or capacity without reopening
            public signup.
          </p>
        </div>
        <MemberSignupLinkManager defaultMode={defaultMode} links={links} />
      </section>
    </WorkspacePageShell>
  )
}
