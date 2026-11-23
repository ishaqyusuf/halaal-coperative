import { normalizeRole } from "@halaalvest/auth/roles"
import {
  createDbRuntime,
  getMemberHomeSnapshot,
  isMemberOperationallyReady,
} from "@halaalvest/db"
import { getRequestMemberReceiptSubmissionAccess } from "@/lib/navigation/operation-profile"
import { findRequestMemberByUserId } from "@/lib/request-lookups"
import {
  getDashboardServerContext,
  hasVerifiedDashboardSession,
} from "@/lib/server-context"

export async function loadTenantHomePageData() {
  // Anonymous traffic needs only the tenant-aware login redirect. Login
  // resolves the workspace when it renders its tenant-specific form.
  if (!(await hasVerifiedDashboardSession())) {
    return { state: "redirect" as const, href: "/login" }
  }

  const context = await getDashboardServerContext()

  if (context.auth.sessionToken && context.auth.membership) {
    const role = normalizeRole(context.auth.membership.role)
    const tenantName = context.tenant?.name ?? "Platform Demo Workspace"
    const userName = context.auth.user?.fullName ?? "Anonymous Workspace User"
    const runtime = createDbRuntime()
    // The `(sidebar)` layout already ran the setup gate (redirects and the
    // pre-go-live card) and built the shell; home only needs its own data.
    const shell = { role, tenantName, userName }

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

    const member = await findRequestMemberByUserId({
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
    const [snapshot, isReady, canSendReceipt] = await Promise.all([
      getMemberHomeSnapshot({
        memberId: member.id,
        tenantId: context.tenant.id,
      }),
      isMemberOperationallyReady({
        member,
        tenantId: context.tenant.id,
      }),
      getRequestMemberReceiptSubmissionAccess(context.tenant.id, context.auth.user.id),
    ])

    if (!snapshot) {
      return {
        state: "member-profile-missing" as const,
        ...shell,
      }
    }

    return {
      state: "member-ready" as const,
      canSendReceipt,
      isReady,
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
