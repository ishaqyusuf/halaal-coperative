import {
  createDbRuntime,
  getMemberByUserId,
  getMemberPaymentReceiptSummary,
  getMemberScopedPaymentReceiptSummary,
  listMemberContributionPlans,
  listFoodPurchaseApplications,
  listMemberLoans,
  listContributionPlans,
  listLoans,
  listMemberPaymentReceipts,
  listMembers,
  listProcurementRequests,
  listProjectFinancingRequests,
} from "@halaalvest/db"
import { WorkspaceEmptyState, WorkspacePageShell } from "@/components/dashboard"
import {
  MemberPaymentReceiptsView,
  PaymentReceiptsView,
} from "@/components/payment-receipts-view"
import { getDashboardServerContext } from "@/lib/server-context"
import { allStaffRoles, hasAnyRole } from "@/lib/workspace-access"

const payableProcurementScheduleStatuses = new Set([
  "due",
  "overdue",
  "partially_paid",
  "pending",
])

function buildProcurementScheduleOptions(
  requests: Awaited<ReturnType<typeof listProcurementRequests>>
) {
  return requests.flatMap((request) =>
    request.repaymentScheduleItems
      .filter((schedule) => {
        const outstanding = Number(schedule.amount) - Number(schedule.paidAmount)

        return (
          payableProcurementScheduleStatuses.has(schedule.status) &&
          outstanding > 0
        )
      })
      .map((schedule) => {
        const outstanding = Number(schedule.amount) - Number(schedule.paidAmount)

        return {
          id: schedule.id,
          label: `${request.member.fullName} - ${request.itemName} #${schedule.installmentNumber} - ${outstanding.toLocaleString("en-NG")}`,
          memberId: request.memberId,
        }
      })
  )
}

function buildFoodPurchaseApplicationOptions(
  applications: Awaited<ReturnType<typeof listFoodPurchaseApplications>>
) {
  return applications
    .filter((application) => {
      const approvedAmount = Number(application.approvedAmount ?? 0)
      const outstanding = approvedAmount - Number(application.paidAmount)

      return application.status === "approved" && outstanding > 0
    })
    .map((application) => {
      const approvedAmount = Number(application.approvedAmount ?? 0)
      const outstanding = approvedAmount - Number(application.paidAmount)
      const itemLabel =
        application.itemDescription ??
        application.cycle.periodMonth.toISOString().slice(0, 7)

      return {
        id: application.id,
        label: `${application.member.fullName} - ${itemLabel} - ${outstanding.toLocaleString("en-NG")}`,
        memberId: application.memberId,
      }
    })
}

function buildProjectFinancingRequestOptions(
  requests: Awaited<ReturnType<typeof listProjectFinancingRequests>>
) {
  return requests
    .filter((request) => {
      const approvedAmount = Number(request.approvedAmount ?? 0)
      const outstanding = approvedAmount - Number(request.paidAmount)

      return (
        request.approvedStructure === "repayable_facility" &&
        ["approved", "active"].includes(request.status) &&
        outstanding > 0
      )
    })
    .map((request) => {
      const approvedAmount = Number(request.approvedAmount ?? 0)
      const outstanding = approvedAmount - Number(request.paidAmount)

      return {
        id: request.id,
        label: `${request.member.fullName} - ${request.businessName} - ${outstanding.toLocaleString("en-NG")}`,
        memberId: request.memberId,
      }
    })
}

export default async function PaymentReceiptsPage() {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const tenantId = context.tenant?.id
  const canView = hasAnyRole(context.auth.membership?.role, allStaffRoles)
  const canUseMemberReceipts = context.auth.membership?.role === "member"

  if (!canView && !canUseMemberReceipts) {
    return (
      <WorkspacePageShell
        description="Receipt review is available to cooperative staff."
        eyebrow="Payments"
        title="Payment receipts"
      >
        <WorkspaceEmptyState
          body="Your current role does not include access to receipt review."
          title="Receipt workspace unavailable"
        />
      </WorkspacePageShell>
    )
  }

  if (!tenantId || runtime.status !== "database-configured") {
    return (
      <WorkspacePageShell
        description="Stage transfer proofs and review allocation before posting."
        eyebrow="Payments"
        title="Payment receipts"
      >
        <WorkspaceEmptyState
          body="Once the database-backed environment is active, receipt submissions and review status will appear here."
          title="Receipt review is waiting for the database runtime."
        />
      </WorkspacePageShell>
    )
  }

  if (canUseMemberReceipts) {
    if (!context.auth.user) {
      return (
        <WorkspacePageShell
          description="Submit transfer proofs and track finance review status."
          eyebrow="Payments"
          title="My payment receipts"
        >
          <WorkspaceEmptyState
            body="Sign in with your member account to submit and track payment receipts."
            title="Member sign-in required."
          />
        </WorkspacePageShell>
      )
    }

    const member = await getMemberByUserId({
      tenantId,
      userId: context.auth.user.id,
    })

    if (!member) {
      return (
        <WorkspacePageShell
          description="Submit transfer proofs and track finance review status."
          eyebrow="Payments"
          title="My payment receipts"
        >
          <WorkspaceEmptyState
            body="Your user account is not linked to a member profile in this cooperative."
            title="Member profile not linked."
          />
        </WorkspacePageShell>
      )
    }

    const [
      receipts,
      summary,
      plans,
      loans,
      procurementRequests,
      foodPurchaseApplications,
      activeProjectFinancingRequests,
      approvedProjectFinancingRequests,
    ] =
      await Promise.all([
        listMemberPaymentReceipts(tenantId, { memberId: member.id }),
        getMemberScopedPaymentReceiptSummary({
          memberId: member.id,
          tenantId,
        }),
        listMemberContributionPlans({
          memberId: member.id,
          tenantId,
        }),
        listMemberLoans({
          memberId: member.id,
          tenantId,
        }),
        listProcurementRequests({
          limit: 100,
          memberId: member.id,
          status: "active",
          tenantId,
        }),
        listFoodPurchaseApplications({
          limit: 100,
          memberId: member.id,
          status: "approved",
          tenantId,
        }),
        listProjectFinancingRequests({
          limit: 100,
          memberId: member.id,
          status: "active",
          tenantId,
        }),
        listProjectFinancingRequests({
          limit: 100,
          memberId: member.id,
          status: "approved",
          tenantId,
        }),
      ])

    const commitmentPlans = plans
      .filter((plan) => plan.isActive)
      .map((plan) => ({
        id: plan.id,
        label: `${plan.member.fullName} - ${Number(plan.amount).toLocaleString("en-NG")}`,
        memberId: plan.member.id,
      }))
    const serviceableLoans = loans
      .filter((loan) =>
        ["approved", "disbursed", "active"].includes(loan.status)
      )
      .map((loan) => ({
        id: loan.id,
        label: `${loan.loanProduct.name} - ${Number(
          loan.outstandingPrincipal
        ).toLocaleString("en-NG")}`,
        memberId: loan.member.id,
      }))

    return (
      <WorkspacePageShell
        description="Submit transfer proofs and track finance review status."
        eyebrow="Payments"
        title="My payment receipts"
      >
        <MemberPaymentReceiptsView
          commitmentPlans={commitmentPlans}
          foodPurchaseApplications={buildFoodPurchaseApplicationOptions(
            foodPurchaseApplications
          )}
          loans={serviceableLoans}
          member={member}
          projectFinancingRequests={buildProjectFinancingRequestOptions(
            [
              ...activeProjectFinancingRequests,
              ...approvedProjectFinancingRequests,
            ]
          )}
          procurementSchedules={buildProcurementScheduleOptions(
            procurementRequests
          )}
          receipts={receipts}
          summary={summary}
        />
      </WorkspacePageShell>
    )
  }

  const [
    receipts,
    summary,
    members,
    plans,
    loans,
    procurementRequests,
    foodPurchaseApplications,
    activeProjectFinancingRequests,
    approvedProjectFinancingRequests,
  ] =
    await Promise.all([
      listMemberPaymentReceipts(tenantId),
      getMemberPaymentReceiptSummary(tenantId),
      listMembers(tenantId, { page: 1, pageSize: 200 }),
      listContributionPlans(tenantId),
      listLoans(tenantId),
      listProcurementRequests({
        limit: 1000,
        status: "active",
        tenantId,
      }),
      listFoodPurchaseApplications({
        limit: 1000,
        status: "approved",
        tenantId,
      }),
      listProjectFinancingRequests({
        limit: 1000,
        status: "active",
        tenantId,
      }),
      listProjectFinancingRequests({
        limit: 1000,
        status: "approved",
        tenantId,
      }),
    ])

  const memberOptions = members.items.map((member) => ({
    id: member.id,
    label: `${member.fullName} (${member.memberNumber})`,
  }))
  const commitmentPlans = plans
    .filter((plan) => plan.isActive)
    .map((plan) => ({
      id: plan.id,
      label: `${plan.member.fullName} - ${Number(plan.amount).toLocaleString("en-NG")}`,
      memberId: plan.member.id,
    }))
  const serviceableLoans = loans
    .filter((loan) =>
      ["approved", "disbursed", "active"].includes(loan.status)
    )
    .map((loan) => ({
      id: loan.id,
      label: `${loan.member.fullName} - ${loan.loanProduct.name} - ${Number(loan.outstandingPrincipal).toLocaleString("en-NG")}`,
      memberId: loan.member.id,
    }))

  return (
    <WorkspacePageShell
      description="Review staged transfer proofs, allocate payments by category and period, then post supported savings and loan-servicing rows through the existing ledgers."
      eyebrow="Payments"
      title="Payment receipts"
    >
      <PaymentReceiptsView
        commitmentPlans={commitmentPlans}
        foodPurchaseApplications={buildFoodPurchaseApplicationOptions(
          foodPurchaseApplications
        )}
        loans={serviceableLoans}
        members={memberOptions}
        projectFinancingRequests={buildProjectFinancingRequestOptions([
          ...activeProjectFinancingRequests,
          ...approvedProjectFinancingRequests,
        ])}
        procurementSchedules={buildProcurementScheduleOptions(
          procurementRequests
        )}
        receipts={receipts}
        summary={summary}
      />
    </WorkspacePageShell>
  )
}
