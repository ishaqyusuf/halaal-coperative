import type { PrismaClient } from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { listActivityReportEvents } from "./audit"
import { getTenantOperationProfile } from "./operation-profile"
import {
  getLateLoanPayments,
  getMoneyMovement,
  getReportAttentionCounts,
} from "./report-figures"

export type ReportsSummaryInput = {
  tenantId: string
  fromDate?: Date
  toDate?: Date
}

export type ReportsSummary = {
  period: {
    from: string | null
    to: string | null
  }
  /** Money that moved in the period, plus what is late today. */
  figures: {
    lateLoanCount: number
    latePayments: number
    loanRepayments: number
    loansPaidOut: number
    savingsPaidIn: number
  }
  /** Only items with something to look at (count above zero). */
  needsALook: Array<{
    count: number
    href: string
    key: string
    label: string
  }>
  recentActivity: Array<{
    actionLabel: string
    actorLabel: string
    entityLabel: string
    id: string
    occurredAt: string
  }>
  /** Export routes to hide for optional services the cooperative never used. */
  exportVisibility: Record<string, boolean>
}

function getEmptyReportsSummary(input: ReportsSummaryInput): ReportsSummary {
  return {
    exportVisibility: {},
    figures: {
      lateLoanCount: 0,
      latePayments: 0,
      loanRepayments: 0,
      loansPaidOut: 0,
      savingsPaidIn: 0,
    },
    needsALook: [],
    period: {
      from: input.fromDate?.toISOString() ?? null,
      to: input.toDate?.toISOString() ?? null,
    },
    recentActivity: [],
  }
}

export async function getReportsSummary(
  input: ReportsSummaryInput,
  prismaOverride?: PrismaClient
): Promise<ReportsSummary> {
  const prisma = prismaOverride ?? createPrismaClient()

  if (!prisma) {
    return getEmptyReportsSummary(input)
  }

  const range = {
    fromDate: input.fromDate,
    tenantId: input.tenantId,
    toDate: input.toDate,
  }
  const [money, late, attention, activity, operationProfile] =
    await Promise.all([
      getMoneyMovement(prisma, range),
      getLateLoanPayments(prisma, { tenantId: input.tenantId }),
      getReportAttentionCounts(prisma, range),
      listActivityReportEvents(
        input.tenantId,
        { fromDate: input.fromDate, limit: 5, toDate: input.toDate },
        prisma
      ),
      getTenantOperationProfile(input.tenantId, prisma),
    ])
  const services = operationProfile.services
  const needsALook = [
    {
      count: attention.lateCasesOpen,
      href: "/repayments",
      key: "late-cases",
      label: "Late payment cases still open",
    },
    {
      count: attention.idChecksToReview,
      href: "/members?kycStatus=pending",
      key: "id-checks",
      label: "ID checks to review",
    },
    {
      count: attention.documentsToReview,
      href: "/members",
      key: "documents",
      label: "Documents to review",
    },
    {
      count: attention.emailsFailed,
      href: "/notifications",
      key: "emails-failed",
      label: "Emails that failed to send",
    },
    {
      count: attention.importsFailed,
      href: "/settings/imports/batches",
      key: "imports-failed",
      label: "Imports that failed",
    },
  ].filter((item) => item.count > 0)

  return {
    exportVisibility: {
      "/reports/food-purchase-export":
        services.food_purchase.shouldShowInStaffNav ||
        attention.hasFoodPurchase,
      "/reports/payment-receipts-export":
        services.payment_receipts.shouldShowInStaffNav ||
        attention.hasPaymentReceipts,
      "/reports/procurement-export":
        services.procurement.shouldShowInStaffNav || attention.hasProcurement,
      "/reports/support-export":
        services.support_cases.shouldShowInStaffNav ||
        attention.hasSupportCases,
    },
    figures: {
      lateLoanCount: late.loanCount,
      latePayments: late.amount,
      loanRepayments: money.loanRepayments,
      loansPaidOut: money.loansPaidOut,
      savingsPaidIn: money.savingsPaidIn,
    },
    needsALook,
    period: {
      from: input.fromDate?.toISOString() ?? null,
      to: input.toDate?.toISOString() ?? null,
    },
    recentActivity: activity.map((event) => ({
      actionLabel: event.actionLabel,
      actorLabel: event.actorLabel,
      entityLabel: event.entityLabel,
      id: event.id,
      occurredAt: event.occurredAt.toISOString(),
    })),
  }
}
