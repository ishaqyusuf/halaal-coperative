import { headers } from "next/headers"
import {
  createDbRuntime,
  getTenantMemberSignupSettings,
  listMemberSignupLinks,
} from "@halaalvest/db"
import { buildTenantDashboardUrl } from "@halaalvest/utils"
import { createMemberSignupLinkToken } from "@/lib/member-signup-link-token"
import { getDashboardServerContext } from "@/lib/server-context"
import {
  getSignupLinkAvailability,
  type MemberSignupLinkView,
  type SignupAccessMode,
} from "@/lib/signup-links/member-signup-links"
import { hasAnyRole, memberManagementRoles } from "@/lib/workspace-access"

type MemberSignupLinksUnavailableState = {
  body: string
  status: "unavailable"
  title: string
}

type MemberSignupLinksReadyState = {
  defaultMode: SignupAccessMode
  links: MemberSignupLinkView[]
  status: "ready"
}

export type MemberSignupLinksPageState =
  | MemberSignupLinksReadyState
  | MemberSignupLinksUnavailableState

export async function loadMemberSignupLinksPage(): Promise<MemberSignupLinksPageState> {
  const context = await getDashboardServerContext()

  if (!context.tenant) {
    return {
      body: "Open your cooperative's workspace to manage joining links.",
      status: "unavailable",
      title: "No cooperative open",
    }
  }
  const tenant = context.tenant

  if (!hasAnyRole(context.auth.membership?.role, memberManagementRoles)) {
    return {
      body: "Ask a cooperative admin to give you member access.",
      status: "unavailable",
      title: "You cannot manage joining links",
    }
  }

  if (createDbRuntime().status !== "database-configured") {
    return {
      body: "Joining links are not available right now. Try again later.",
      status: "unavailable",
      title: "Links are not available",
    }
  }

  const headerStore = await headers()
  const [settings, records] = await Promise.all([
    getTenantMemberSignupSettings(tenant.id),
    listMemberSignupLinks(tenant.id),
  ])
  const now = new Date()
  const links = records.map((link): MemberSignupLinkView => {
    const token = createMemberSignupLinkToken({
      linkId: link.id,
      tenantId: tenant.id,
      tokenVersion: link.tokenVersion,
    })
    const availability = getSignupLinkAvailability({
      expiresAt: link.expiresAt,
      isEnabled: link.isEnabled,
      now,
      remainingSlots: link.analytics.remainingSlots,
      signupAccessMode: settings.memberSignupAccessMode,
    })

    return {
      analytics: link.analytics,
      availability,
      createdAt: link.createdAt.toISOString().slice(0, 10),
      expiresAt: link.expiresAt?.toISOString().slice(0, 10) ?? null,
      id: link.id,
      isEnabled: link.isEnabled,
      lastUsedAt: link.lastUsedAt?.toISOString().slice(0, 10) ?? null,
      maxSignups: link.maxSignups,
      name: link.name,
      notes: link.notes,
      signupUrl: buildTenantDashboardUrl(tenant.slug, {
        currentOrigin: headerStore.get("origin") ?? undefined,
        pathname: `/signup/members?token=${encodeURIComponent(token)}`,
        tenantHostname: headerStore.get("x-tenant-hostname"),
      }),
    }
  })

  return {
    defaultMode: settings.memberSignupAccessMode,
    links,
    status: "ready",
  }
}
