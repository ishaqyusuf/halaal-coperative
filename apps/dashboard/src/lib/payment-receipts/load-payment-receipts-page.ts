import {
  createDbRuntime,
  getMemberByUserId,
  getMemberPaymentReceiptSummary,
  getMemberScopedPaymentReceiptSummary,
  listContributionPlans,
  listFoodPurchaseApplications,
  listLoans,
  listMemberContributionPlans,
  listMemberLoans,
  listMemberPaymentReceipts,
  listMembers,
  listProcurementRequests,
  listProjectFinancingRequests,
} from "@halaalvest/db"
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

function buildCommitmentPlanOptions(
  plans: Awaited<ReturnType<typeof listContributionPlans>>
) {
  return plans
    .filter((plan) => plan.isActive)
    .map((plan) => ({
      id: plan.id,
      label: `${plan.member.fullName} - ${Number(plan.amount).toLocaleString("en-NG")}`,
      memberId: plan.member.id,
    }))
}

function buildMemberCommitmentPlanOptions(
  plans: Awaited<ReturnType<typeof listMemberContributionPlans>>
) {
  return plans
    .filter((plan) => plan.isActive)
    .map((plan) => ({
      id: plan.id,
      label: `${plan.member.fullName} - ${Number(plan.amount).toLocaleString("en-NG")}`,
      memberId: plan.member.id,
    }))
}

function buildLoanOptions(loans: Awaited<ReturnType<typeof listLoans>>) {
  return loans
    .filter((loan) =>
      ["approved", "disbursed", "active"].includes(loan.status)
    )
    .map((loan) => ({
      id: loan.id,
      label: `${loan.member.fullName} - ${loan.loanProduct.name} - ${Number(loan.outstandingPrincipal).toLocaleString("en-NG")}`,
      memberId: loan.member.id,
    }))
}

function buildMemberLoanOptions(
  loans: Awaited<ReturnType<typeof listMemberLoans>>
) {
  return loans
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
}

export async function loadPaymentReceiptsPageData() {
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()
  const tenantId = context.tenant?.id
  const canView = hasAnyRole(context.auth.membership?.role, allStaffRoles)
  const canUseMemberReceipts = context.auth.membership?.role === "member"

  if (!canView && !canUseMemberReceipts) {
    return { state: "restricted" as const }
  }

  if (!tenantId || runtime.status !== "database-configured") {
    return { state: "unavailable" as const }
  }

  if (canUseMemberReceipts) {
    if (!context.auth.user) {
      return { state: "member-sign-in-required" as const }
    }

    const member = await getMemberByUserId({
      tenantId,
      userId: context.auth.user.id,
    })

    if (!member) {
      return { state: "member-profile-missing" as const }
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
    ] = await Promise.all([
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

    return {
      state: "member-ready" as const,
      commitmentPlans: buildMemberCommitmentPlanOptions(plans),
      foodPurchaseApplications:
        buildFoodPurchaseApplicationOptions(foodPurchaseApplications),
      loans: buildMemberLoanOptions(loans),
      member,
      procurementSchedules:
        buildProcurementScheduleOptions(procurementRequests),
      projectFinancingRequests: buildProjectFinancingRequestOptions([
        ...activeProjectFinancingRequests,
        ...approvedProjectFinancingRequests,
      ]),
      receipts,
      summary,
    }
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
  ] = await Promise.all([
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

  return {
    state: "staff-ready" as const,
    commitmentPlans: buildCommitmentPlanOptions(plans),
    foodPurchaseApplications:
      buildFoodPurchaseApplicationOptions(foodPurchaseApplications),
    loans: buildLoanOptions(loans),
    members: members.items.map((member) => ({
      id: member.id,
      label: `${member.fullName} (${member.memberNumber})`,
    })),
    procurementSchedules: buildProcurementScheduleOptions(procurementRequests),
    projectFinancingRequests: buildProjectFinancingRequestOptions([
      ...activeProjectFinancingRequests,
      ...approvedProjectFinancingRequests,
    ]),
    receipts,
    summary,
  }
}
