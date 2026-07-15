import {
  DashboardActionLink,
  DashboardSectionCard,
  DashboardSectionHeader,
  DashboardStatCard,
  WorkspacePageShell,
} from "@/components/dashboard"
import { MemberSignupLinkManager } from "@/components/signup-links/member-signup-link-manager"
import type {
  MemberSignupLinkView,
  SignupAccessMode,
} from "@/components/signup-links/member-signup-link-content"

const accessModeLabels = {
  disabled: "Disabled",
  hidden: "Hidden",
  in_office: "In-office",
  public: "Public",
} as const

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
  defaultMode,
  enabledLinks,
  links,
  totalApproved,
  totalSignups,
}: {
  defaultMode: SignupAccessMode
  enabledLinks: number
  links: MemberSignupLinkView[]
  totalApproved: number
  totalSignups: number
}) {
  return (
    <WorkspacePageShell
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <DashboardActionLink className="px-4" href="#create-signup-link">
            Create link
          </DashboardActionLink>
          <DashboardActionLink className="px-4" href="#signup-access-mode">
            Signup gate
          </DashboardActionLink>
        </div>
      }
      description="Keep member signup in-office by default, issue controlled signup links when needed, and watch how each link performs."
      eyebrow="Membership"
      title="Member signup links"
    >
      <section className="grid gap-4 md:grid-cols-4">
        <DashboardStatCard
          detail="Current cooperative-wide signup gate."
          label="Signup access"
          tone={defaultMode === "public" ? "positive" : "warning"}
          value={accessModeLabels[defaultMode]}
        />
        <DashboardStatCard
          detail="Staff-issued links that can still be used right now."
          label="Enabled links"
          value={enabledLinks.toString()}
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

      <DashboardSectionCard>
        <DashboardSectionHeader
          description="Adjust the cooperative signup gate, create staff links, regenerate compromised tokens, and update expiry or capacity without reopening public signup."
          eyebrow="Control center"
          title="Gate and link management"
        />
        <div className="mt-5">
          <MemberSignupLinkManager defaultMode={defaultMode} links={links} />
        </div>
      </DashboardSectionCard>
    </WorkspacePageShell>
  )
}
