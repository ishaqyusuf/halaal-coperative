import {
  createDbRuntime,
  getMemberByUserId,
  listFoodPurchaseApplications,
  listFoodPurchaseCycles,
  listMembers,
} from "@halaalvest/db"
import {
  WorkspaceEmptyState,
  WorkspacePageShell,
} from "@/components/dashboard"
import {
  FoodPurchaseView,
  MemberFoodPurchaseView,
} from "@/components/food-purchase-view"
import { getDashboardServerContext } from "@/lib/server-context"
import {
  allStaffRoles,
  financeManagementRoles,
  hasAnyRole,
} from "@/lib/workspace-access"

export default async function FoodPurchasePage() {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const canSubmitApplications = hasAnyRole(
    context.auth.membership?.role,
    allStaffRoles
  )
  const canUseMemberFoodPurchase = context.auth.membership?.role === "member"
  const canReleaseFunds = hasAnyRole(
    context.auth.membership?.role,
    financeManagementRoles
  )

  if (!canSubmitApplications && !canUseMemberFoodPurchase) {
    return (
      <WorkspacePageShell
        eyebrow="Foodstuff Purchase"
        title="Foodstuff Purchase"
        description="Track monthly committee funds, member applications, approvals, and accounting."
      >
        <WorkspaceEmptyState
          body="Foodstuff Purchase is available to cooperative staff and linked members."
          title="Foodstuff Purchase access is restricted."
        />
      </WorkspacePageShell>
    )
  }

  if (!context.tenant || runtime.status !== "database-configured") {
    return (
      <WorkspacePageShell
        eyebrow="Foodstuff Purchase"
        title="Foodstuff Purchase"
        description="Track monthly committee funds, member applications, approvals, and accounting."
      >
        <WorkspaceEmptyState
          body="Once the database-backed environment is active, this route will show Foodstuff Purchase cycles, applications, reviews, and accounting."
          title="Foodstuff Purchase needs the database runtime."
        />
      </WorkspacePageShell>
    )
  }

  if (canUseMemberFoodPurchase) {
    if (!context.auth.user) {
      return (
        <WorkspacePageShell
          eyebrow="Foodstuff Purchase"
          title="My Foodstuff Purchase"
          description="Apply for an open monthly Foodstuff Purchase cycle and track committee review."
        >
          <WorkspaceEmptyState
            body="Sign in with your member account to apply for Foodstuff Purchase."
            title="Member sign-in required."
          />
        </WorkspacePageShell>
      )
    }

    const member = await getMemberByUserId({
      tenantId: context.tenant.id,
      userId: context.auth.user.id,
    })

    if (!member) {
      return (
        <WorkspacePageShell
          eyebrow="Foodstuff Purchase"
          title="My Foodstuff Purchase"
          description="Apply for an open monthly Foodstuff Purchase cycle and track committee review."
        >
          <WorkspaceEmptyState
            body="Your user account is not linked to a member profile in this cooperative."
            title="Member profile not linked."
          />
        </WorkspacePageShell>
      )
    }

    const [cycles, applications] = await Promise.all([
      listFoodPurchaseCycles({ tenantId: context.tenant.id }),
      listFoodPurchaseApplications({
        memberId: member.id,
        tenantId: context.tenant.id,
      }),
    ])

    return (
      <WorkspacePageShell
        eyebrow="Foodstuff Purchase"
        title="My Foodstuff Purchase"
        description="Apply for an open monthly Foodstuff Purchase cycle and track committee review."
      >
        <MemberFoodPurchaseView
          applications={applications}
          cycles={cycles}
          member={member}
        />
      </WorkspacePageShell>
    )
  }

  const [cycles, applications, members] = await Promise.all([
    listFoodPurchaseCycles({ tenantId: context.tenant.id }),
    listFoodPurchaseApplications({ tenantId: context.tenant.id }),
    listMembers(context.tenant.id, { page: 1, pageSize: 200 }),
  ])
  const summary = {
    approvedApplications: applications.filter(
      (application) => application.status === "approved"
    ).length,
    openCycles: cycles.filter((cycle) => cycle.status === "open").length,
    pendingApplications: applications.filter((application) =>
      ["submitted", "under_review"].includes(application.status)
    ).length,
    reportedProfit: cycles.reduce(
      (total, cycle) => total + (cycle.profitAmount ?? 0),
      0
    ),
    submittedAccounting: cycles.filter(
      (cycle) => cycle.status === "accounting_submitted"
    ).length,
    totalReleasedAmount: cycles.reduce(
      (total, cycle) => total + cycle.releasedAmount,
      0
    ),
  }

  return (
    <WorkspacePageShell
      eyebrow="Foodstuff Purchase"
      title="Foodstuff Purchase"
      description="Manage committee fund releases, member Foodstuff Purchase applications, and month-end accounting."
    >
      <FoodPurchaseView
        applications={applications}
        canRecordAccounting={canSubmitApplications}
        canReviewAccounting={canReleaseFunds}
        canReleaseFunds={canReleaseFunds}
        canReviewApplications={canSubmitApplications}
        canSubmitApplications={canSubmitApplications}
        cycles={cycles}
        memberOptions={members.items.map((member) => ({
          id: member.id,
          label: `${member.fullName} (${member.memberNumber})`,
        }))}
        summary={summary}
      />
    </WorkspacePageShell>
  )
}
