import { headers } from "next/headers"
import {
  createDbRuntime,
  getTenantMemberSignupSettings,
  listMemberSignupLinks,
} from "@halaalvest/db"
import { buildTenantDashboardUrl } from "@halaalvest/utils"
import {
  DashboardActionLink,
  DashboardSectionCard,
  DashboardSectionHeader,
  DashboardStatCard,
} from "@/components/dashboard"
import { MemberSignupLinkManager } from "@/components/signup-links/member-signup-link-manager"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"
import { createMemberSignupLinkToken } from "@/lib/member-signup-link-token"
import { getDashboardServerContext } from "@/lib/server-context"
import { hasAnyRole, memberManagementRoles } from "@/lib/workspace-access"

export default async function MemberSignupLinksPage() {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const canManage = hasAnyRole(context.auth.membership?.role, memberManagementRoles)

  if (!context.tenant || runtime.status !== "database-configured") {
    return (
      <WorkspacePageShell
        eyebrow="Membership"
        title="Member signup links"
        description="Manage the member signup gate and issue controlled remote signup links."
      >
        <WorkspaceEmptyState
          title="Member signup links need the database runtime."
          body="Once the database runtime is configured, you can manage signup access, link expiry, and link analytics here."
        />
      </WorkspacePageShell>
    )
  }

  if (!canManage) {
    return (
      <WorkspacePageShell
        eyebrow="Membership"
        title="Member signup links"
        description="Manage the member signup gate and issue controlled remote signup links."
      >
        <WorkspaceEmptyState
          title="Signup link management is limited to member-management roles."
          body="Cooperative admins and operations officers can manage member signup access and issue staff links."
        />
      </WorkspacePageShell>
    )
  }

  const headerStore = await headers()
  const [settings, links] = await Promise.all([
    getTenantMemberSignupSettings(context.tenant.id),
    listMemberSignupLinks(context.tenant.id),
  ])

  const serializedLinks = links.map((link) => {
    const token = createMemberSignupLinkToken({
      linkId: link.id,
      tenantId: context.tenant!.id,
      tokenVersion: link.tokenVersion,
    })

    return {
      analytics: link.analytics,
      createdAt: link.createdAt.toISOString().slice(0, 10),
      expiresAt: link.expiresAt?.toISOString().slice(0, 10) ?? null,
      id: link.id,
      isEnabled: link.isEnabled,
      lastUsedAt: link.lastUsedAt?.toISOString().slice(0, 10) ?? null,
      maxSignups: link.maxSignups,
      name: link.name,
      notes: link.notes,
      signupUrl: buildTenantDashboardUrl(context.tenant!.slug, {
        currentOrigin: headerStore.get("origin") ?? undefined,
        pathname: `/signup/members?token=${encodeURIComponent(token)}`,
        tenantHostname: headerStore.get("x-tenant-hostname"),
      }),
    }
  })

  const enabledLinks = serializedLinks.filter((link) => link.isEnabled).length
  const totalSignups = serializedLinks.reduce((sum, link) => sum + link.analytics.totalRequests, 0)
  const totalApproved = serializedLinks.reduce((sum, link) => sum + link.analytics.approvedCount, 0)
  const accessModeLabels = {
    disabled: "Disabled",
    hidden: "Hidden",
    in_office: "In-office",
    public: "Public",
  } as const
  const accessModeTone =
    settings.memberSignupAccessMode === "public"
      ? "positive"
      : "warning"

  return (
    <WorkspacePageShell
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <DashboardActionLink href="#create-signup-link" className="px-4">
            Create link
          </DashboardActionLink>
          <DashboardActionLink href="#signup-access-mode" className="px-4">
            Signup gate
          </DashboardActionLink>
        </div>
      }
      eyebrow="Membership"
      title="Member signup links"
      description="Keep member signup in-office by default, issue controlled signup links when needed, and watch how each link performs."
    >
      <section className="grid gap-4 md:grid-cols-4">
        <DashboardStatCard
          label="Signup access"
          value={accessModeLabels[settings.memberSignupAccessMode]}
          detail="Current cooperative-wide signup gate."
          tone={accessModeTone}
        />
        <DashboardStatCard
          label="Enabled links"
          value={enabledLinks.toString()}
          detail="Staff-issued links that can still be used right now."
        />
        <DashboardStatCard
          label="Link signups"
          value={totalSignups.toString()}
          detail="All onboarding requests created through staff links."
        />
        <DashboardStatCard
          label="Approved via links"
          value={totalApproved.toString()}
          detail="Link-driven applicants who have already been approved."
          tone="positive"
        />
      </section>

      <DashboardSectionCard>
        <DashboardSectionHeader
          eyebrow="Control center"
          title="Gate and link management"
          description="Adjust the cooperative signup gate, create staff links, regenerate compromised tokens, and update expiry or capacity without reopening public signup."
        />
        <div className="mt-5">
          <MemberSignupLinkManager
            defaultMode={settings.memberSignupAccessMode}
            links={serializedLinks}
          />
        </div>
      </DashboardSectionCard>
    </WorkspacePageShell>
  )
}
