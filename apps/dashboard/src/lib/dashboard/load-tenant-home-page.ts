import { normalizeRole } from "@halaalvest/auth/roles"
import {
  createDbRuntime,
  getMemberByUserId,
  getMemberHomeSnapshot,
  getMemberOperationalReadiness,
} from "@halaalvest/db"
import {
  getOperationProfileHiddenNavPaths,
  getRequestTenantOperationProfile,
} from "@/lib/navigation/operation-profile"
import { getDashboardServerContext } from "@/lib/server-context"
import { resolveInitialMigrationSetupGate } from "@/lib/setup-gate"

export async function loadTenantHomePageData() {
  const context = await getDashboardServerContext()

  if (context.auth.sessionToken && context.auth.membership) {
    const role = normalizeRole(context.auth.membership.role)
    const tenantName = context.tenant?.name ?? "Platform Demo Workspace"
    const userName = context.auth.user?.fullName ?? "Anonymous Workspace User"
    const runtime = createDbRuntime()
    const shell = {
      hiddenNavPaths: await getOperationProfileHiddenNavPaths({
        role,
        tenantId: context.tenant?.id,
        userId: context.auth.user?.id,
      }),
      role,
      tenantName,
      userName,
    }

    if (context.tenant && runtime.status === "database-configured") {
      const setupGate = await resolveInitialMigrationSetupGate({
        role: context.auth.membership.role,
        tenantId: context.tenant.id,
      })

      if (setupGate.shouldRedirectAdminToSetup) {
        return {
          state: "redirect" as const,
          href: "/getting-started",
        }
      }
    }

    if (context.auth.membership.role !== "member") {
      return {
        state: "staff-ready" as const,
        ...shell,
      }
    }

    if (
      !context.tenant ||
      !context.auth.user ||
      runtime.status !== "database-configured"
    ) {
      return {
        state: "member-unavailable" as const,
        ...shell,
      }
    }

    const member = await getMemberByUserId({
      tenantId: context.tenant.id,
      userId: context.auth.user.id,
    })

    if (!member) {
      return {
        state: "member-profile-missing" as const,
        ...shell,
      }
    }

    // One lean snapshot instead of the full statement (75 → about 26
    // statements on 14 Nov 2026).
    const [snapshot, operationalReadiness, operationProfile] =
      await Promise.all([
        getMemberHomeSnapshot({
          memberId: member.id,
          tenantId: context.tenant.id,
        }),
        getMemberOperationalReadiness({
          memberId: member.id,
          tenantId: context.tenant.id,
        }),
        getRequestTenantOperationProfile(context.tenant.id),
      ])

    if (!snapshot || !operationalReadiness) {
      return {
        state: "member-profile-missing" as const,
        ...shell,
      }
    }

    return {
      state: "member-ready" as const,
      canSendReceipt:
        operationProfile.services.payment_receipts.shouldShowInMemberNav,
      operationalReadiness,
      snapshot,
      ...shell,
    }
  }

  if (context.auth.sessionToken && context.auth.pendingMemberOnboarding) {
    return {
      state: "redirect" as const,
      href: "/awaiting-approval",
    }
  }

  return {
    state: "redirect" as const,
    href: "/login",
  }
}
