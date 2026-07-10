import { normalizeRole } from "@halaalvest/auth/roles"
import {
  createDbRuntime,
  getMemberByUserId,
  getMemberStatementDetail,
  getMemberUnitSharePosition,
  getTenantSharePolicy,
  listFoodPurchaseApplications,
  listMemberPaymentReceipts,
  listMemberShareApplications,
  listProcurementRequests,
  listProjectFinancingRequests,
  listSupportCases,
} from "@halaalvest/db"
import { getDashboardServerContext } from "@/lib/server-context"
import { resolveInitialMigrationSetupGate } from "@/lib/setup-gate"

export async function loadTenantHomePageData() {
  const context = await getDashboardServerContext()

  if (context.auth.sessionToken && context.auth.membership) {
    const role = normalizeRole(context.auth.membership.role)
    const tenantName = context.tenant?.name ?? "Platform Demo Workspace"
    const userName = context.auth.user?.fullName ?? "Anonymous Workspace User"
    const runtime = createDbRuntime()

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
        role,
        tenantName,
        userName,
      }
    }

    const shell = {
      role,
      tenantName,
      userName,
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

    const [detail, receipts, supportCases, sharePolicy] = await Promise.all([
      getMemberStatementDetail(context.tenant.id, member.id),
      listMemberPaymentReceipts(context.tenant.id, {
        memberId: member.id,
      }),
      listSupportCases({
        limit: 5,
        memberId: member.id,
        tenantId: context.tenant.id,
      }),
      getTenantSharePolicy(context.tenant.id),
    ])

    if (!detail) {
      return {
        state: "member-profile-missing" as const,
        ...shell,
      }
    }

    const [
      shareApplications,
      sharePosition,
      procurementRequests,
      projectFinancingRequests,
      foodPurchaseApplications,
    ] = await Promise.all([
      listMemberShareApplications({
        memberId: member.id,
        tenantId: context.tenant.id,
      }),
      sharePolicy.configurationMode === "unit_based"
        ? getMemberUnitSharePosition({
            memberId: member.id,
            tenantId: context.tenant.id,
          })
        : Promise.resolve(null),
      listProcurementRequests({
        limit: 5,
        memberId: member.id,
        tenantId: context.tenant.id,
      }),
      listProjectFinancingRequests({
        limit: 5,
        memberId: member.id,
        tenantId: context.tenant.id,
      }),
      listFoodPurchaseApplications({
        limit: 5,
        memberId: member.id,
        tenantId: context.tenant.id,
      }),
    ])

    return {
      state: "member-ready" as const,
      detail,
      foodPurchaseApplications,
      procurementRequests,
      projectFinancingRequests,
      receipts: receipts.slice(0, 5),
      shareApplications: shareApplications.slice(0, 5),
      sharePolicy,
      sharePosition,
      supportCases,
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
