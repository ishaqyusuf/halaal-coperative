import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { getAuditSummary, listAuditLogs } from "./audit"
import { getOverviewSummary } from "./dashboard"
import { getCollectionFollowUpSummary, listCollectionFollowUps } from "./loans"
import { getMemberKycSummary } from "./members"
import { getTenantOperationProfile } from "./operation-profile"

export type ReportsSummaryInput = {
  tenantId: string
  fromDate?: Date
  toDate?: Date
}

export type ReportsSummary = {
  workspace: {
    tenantId: string
    tenantName: string
    currencyCode: string
    generatedAt: string
    from: string | null
    to: string | null
  }
  financeSnapshot: {
    deployableFunds: number
    collectionCoverage: number
    portfolioAtRiskAmount: number
    portfolioAtRiskRate: number
    outstandingPrincipal: number
    overdueAmount: number
    pendingDisbursementCount: number
  }
  governanceMetrics: {
    auditEvents30d: number
    auditEventsInRange: number
    userEvents30d: number
    systemEvents30d: number
    collectionFollowUps: number
    openCollectionCases: number
    highPriorityCollectionCases: number
    kycPending: number
    failedImports: number
  }
  notificationDelivery: {
    total: number
    sent: number
    queued: number
    failed: number
  }
  exportVisibility: Record<string, boolean>
  complianceWatch: Array<{
    key: string
    label: string
    count: number
    href: string
    tone: "neutral" | "positive" | "warning"
  }>
  auditPreview: Array<{
    id: string
    action: string
    actorLabel: string
    actorType: string
    entityType: string
    occurredAt: string
    href: string
  }>
  collectionsPreview: Array<{
    id: string
    caseStage: string
    createdAt: string
    loanProductName: string
    memberName: string
    memberNumber: string
    nextActionAt: string | null
    note: string
    priority: string
    resolutionStatus: string
    status: string
    href: string
  }>
}

function buildDateRange(input: ReportsSummaryInput) {
  return input.fromDate || input.toDate
    ? {
        ...(input.fromDate ? { gte: input.fromDate } : {}),
        ...(input.toDate ? { lte: input.toDate } : {}),
      }
    : undefined
}

function getEmptyReportsSummary(input: {
  currencyCode?: string
  fromDate?: Date
  tenantId: string
  tenantName?: string
  toDate?: Date
}): ReportsSummary {
  return {
    workspace: {
      currencyCode: input.currencyCode ?? "NGN",
      from: input.fromDate?.toISOString() ?? null,
      generatedAt: new Date().toISOString(),
      tenantId: input.tenantId,
      tenantName: input.tenantName ?? "Workspace",
      to: input.toDate?.toISOString() ?? null,
    },
    auditPreview: [],
    collectionsPreview: [],
    complianceWatch: [],
    financeSnapshot: {
      collectionCoverage: 0,
      deployableFunds: 0,
      outstandingPrincipal: 0,
      overdueAmount: 0,
      pendingDisbursementCount: 0,
      portfolioAtRiskAmount: 0,
      portfolioAtRiskRate: 0,
    },
    governanceMetrics: {
      auditEvents30d: 0,
      auditEventsInRange: 0,
      collectionFollowUps: 0,
      failedImports: 0,
      highPriorityCollectionCases: 0,
      kycPending: 0,
      openCollectionCases: 0,
      systemEvents30d: 0,
      userEvents30d: 0,
    },
    notificationDelivery: {
      failed: 0,
      queued: 0,
      sent: 0,
      total: 0,
    },
    exportVisibility: {},
  }
}

export async function getReportsSummary(
  input: ReportsSummaryInput,
  prismaOverride?: PrismaClient,
): Promise<ReportsSummary> {
  const prisma = prismaOverride ?? createPrismaClient()

  if (!prisma) {
    return getEmptyReportsSummary(input)
  }

  const tenant = await prisma.tenant.findUnique({
    select: {
      currencyCode: true,
      id: true,
      name: true,
    },
    where: { id: input.tenantId },
  })

  if (!tenant) {
    return getEmptyReportsSummary(input)
  }

  const dateRange = buildDateRange(input)
  const [
    overview,
    auditSummary,
    auditLogs,
    auditEventsInRange,
    collectionSummary,
    collectionFollowUps,
    kycSummary,
    failedImports,
    notificationTotal,
    notificationsSent,
    notificationsQueued,
    notificationsFailed,
    operationProfile,
    procurementRecordCount,
    foodPurchaseRecordCount,
    supportRecordCount,
    paymentReceiptRecordCount,
  ] = await Promise.all([
    getOverviewSummary(input.tenantId, prisma),
    getAuditSummary(input.tenantId, prisma),
    listAuditLogs(
      input.tenantId,
      { fromDate: input.fromDate, limit: 20, toDate: input.toDate },
      prisma,
    ),
    prisma.auditLog.count({
      where: {
        tenantId: input.tenantId,
        ...(dateRange ? { occurredAt: dateRange } : {}),
      },
    }),
    getCollectionFollowUpSummary(input.tenantId, prisma),
    listCollectionFollowUps(
      input.tenantId,
      { fromDate: input.fromDate, limit: 12, toDate: input.toDate },
      prisma,
    ),
    getMemberKycSummary(input.tenantId, prisma),
    prisma.importBatch.count({
      where: {
        status: "failed",
        tenantId: input.tenantId,
        ...(dateRange ? { createdAt: dateRange } : {}),
      },
    }),
    prisma.auditLog.count({
      where: {
        action: {
          startsWith: "notification.email_",
        },
        tenantId: input.tenantId,
        ...(dateRange ? { occurredAt: dateRange } : {}),
      },
    }),
    prisma.auditLog.count({
      where: {
        action: "notification.email_sent",
        tenantId: input.tenantId,
        ...(dateRange ? { occurredAt: dateRange } : {}),
      },
    }),
    prisma.auditLog.count({
      where: {
        action: "notification.email_queued",
        tenantId: input.tenantId,
        ...(dateRange ? { occurredAt: dateRange } : {}),
      },
    }),
    prisma.auditLog.count({
      where: {
        action: "notification.email_failed",
        tenantId: input.tenantId,
        ...(dateRange ? { occurredAt: dateRange } : {}),
      },
    }),
    getTenantOperationProfile(input.tenantId, prisma),
    prisma.procurementRequest.count({
      where: { tenantId: input.tenantId },
    }),
    prisma.foodPurchaseApplication.count({
      where: { tenantId: input.tenantId },
    }),
    prisma.supportCase.count({
      where: { tenantId: input.tenantId },
    }),
    prisma.memberPaymentReceipt.count({
      where: { tenantId: input.tenantId },
    }),
  ])
  const exportVisibility = {
    "/reports/food-purchase-export":
      operationProfile.services.food_purchase.shouldShowInStaffNav ||
      foodPurchaseRecordCount > 0,
    "/reports/payment-receipts-export":
      operationProfile.services.payment_receipts.shouldShowInStaffNav ||
      paymentReceiptRecordCount > 0,
    "/reports/procurement-export":
      operationProfile.services.procurement.shouldShowInStaffNav ||
      procurementRecordCount > 0,
    "/reports/support-export":
      operationProfile.services.support_cases.shouldShowInStaffNav ||
      supportRecordCount > 0,
  }

  return {
    workspace: {
      currencyCode: tenant.currencyCode,
      from: input.fromDate?.toISOString() ?? null,
      generatedAt: new Date().toISOString(),
      tenantId: tenant.id,
      tenantName: tenant.name,
      to: input.toDate?.toISOString() ?? null,
    },
    auditPreview: auditLogs.map((log) => ({
      action: log.action,
      actorLabel: log.actorUser?.fullName ?? log.actorType,
      actorType: log.actorType,
      entityType: log.entityType,
      href: "/reports/audit",
      id: log.id,
      occurredAt: log.occurredAt.toISOString(),
    })),
    collectionsPreview: collectionFollowUps.map((followUp) => ({
      caseStage: followUp.caseStage,
      createdAt: followUp.createdAt.toISOString(),
      href: "/repayments",
      id: followUp.id,
      loanProductName: followUp.loan.loanProduct.name,
      memberName: followUp.member.fullName,
      memberNumber: followUp.member.memberNumber,
      nextActionAt: followUp.nextActionAt?.toISOString() ?? null,
      note: followUp.note,
      priority: followUp.priority,
      resolutionStatus: followUp.resolutionStatus,
      status: followUp.status,
    })),
    complianceWatch: [
      {
        count: kycSummary.pending + kycSummary.rejected,
        href: "/members?kycStatus=pending",
        key: "kyc-review",
        label: "KYC pending or rejected",
        tone:
          kycSummary.pending + kycSummary.rejected > 0 ? "warning" : "positive",
      },
      {
        count: Math.max(0, kycSummary.memberDocuments - kycSummary.approvedDocuments),
        href: "/members",
        key: "document-review",
        label: "Documents not yet approved",
        tone:
          kycSummary.memberDocuments - kycSummary.approvedDocuments > 0
            ? "warning"
            : "positive",
      },
      {
        count: failedImports,
        href: "/settings/imports/batches",
        key: "failed-imports",
        label: "Failed imports in range",
        tone: failedImports > 0 ? "warning" : "positive",
      },
      {
        count: overview.shareAndProfitPosition.profitPendingAllocation > 0 ? 1 : 0,
        href: "/settings/finance/business",
        key: "profit-review",
        label: "Profit allocation pending review",
        tone:
          overview.shareAndProfitPosition.profitPendingAllocation > 0
            ? "warning"
            : "positive",
      },
    ],
    financeSnapshot: {
      collectionCoverage: overview.primaryMetrics.collectionCoverage,
      deployableFunds: overview.primaryMetrics.deployableFunds,
      outstandingPrincipal: overview.financingRisk.outstandingPrincipal,
      overdueAmount: overview.financingRisk.overdueAmount,
      pendingDisbursementCount:
        overview.financingRisk.pendingDisbursementCount,
      portfolioAtRiskAmount: overview.primaryMetrics.portfolioAtRiskAmount,
      portfolioAtRiskRate: overview.primaryMetrics.portfolioAtRiskRate,
    },
    governanceMetrics: {
      auditEvents30d: auditSummary.recentActionsCount,
      auditEventsInRange,
      collectionFollowUps: collectionSummary.total,
      failedImports,
      highPriorityCollectionCases: collectionSummary.highPriority,
      kycPending: kycSummary.pending,
      openCollectionCases: collectionSummary.activeCases,
      systemEvents30d: auditSummary.systemEventsCount,
      userEvents30d: auditSummary.userEventsCount,
    },
    notificationDelivery: {
      failed: notificationsFailed,
      queued: notificationsQueued,
      sent: notificationsSent,
      total: notificationTotal,
    },
    exportVisibility,
  }
}
