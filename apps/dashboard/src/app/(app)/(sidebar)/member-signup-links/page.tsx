import { headers } from "next/headers"
import {
  createDbRuntime,
  getTenantMemberSignupSettings,
  listMemberSignupLinks,
} from "@halaalvest/db"
import { buildTenantDashboardUrl } from "@halaalvest/utils"
import {
  MemberSignupLinksUnavailableView,
  MemberSignupLinksView,
} from "@/components/signup-links/member-signup-links-view"
import { createMemberSignupLinkToken } from "@/lib/member-signup-link-token"
import { getDashboardServerContext } from "@/lib/server-context"
import { hasAnyRole, memberManagementRoles } from "@/lib/workspace-access"

export default async function MemberSignupLinksPage() {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const canManage = hasAnyRole(context.auth.membership?.role, memberManagementRoles)

  if (!context.tenant || runtime.status !== "database-configured") {
    return (
      <MemberSignupLinksUnavailableView
        title="Member signup links need the database runtime."
        body="Once the database runtime is configured, you can manage signup access, link expiry, and link analytics here."
      />
    )
  }

  if (!canManage) {
    return (
      <MemberSignupLinksUnavailableView
        title="Signup link management is limited to member-management roles."
        body="Cooperative admins and operations officers can manage member signup access and issue staff links."
      />
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
  const totalSignups = serializedLinks.reduce(
    (sum, link) => sum + link.analytics.totalRequests,
    0
  )
  const totalApproved = serializedLinks.reduce(
    (sum, link) => sum + link.analytics.approvedCount,
    0
  )

  return (
    <MemberSignupLinksView
      defaultMode={settings.memberSignupAccessMode}
      enabledLinks={enabledLinks}
      links={serializedLinks}
      totalApproved={totalApproved}
      totalSignups={totalSignups}
    />
  )
}
