import type { Metadata } from "next"
import { notFound } from "next/navigation"
import {
  createDbRuntime,
  getBusinessProfitMigrationWorksheet,
  getTenantInitialMigrationState,
  listInitialMigrationMemberReview,
} from "@halaalvest/db"
import {
  type BusinessProfitMigrationWorksheetData,
} from "@/components/business-profit-migration-worksheet"
import { FinanceBusinessProfitMigrationView } from "@/components/finance-business-profit-migration-view"
import { getDashboardServerContext } from "@/lib/server-context"

export const metadata: Metadata = {
  title: "Migrate Business Profit | Finance Settings",
}

function toDateString(value: Date | string) {
  return typeof value === "string"
    ? value.slice(0, 10)
    : value.toISOString().slice(0, 10)
}

type SerializedExpenseLine =
  BusinessProfitMigrationWorksheetData["expenseLines"][number]

function serializeWorksheet(
  worksheet: Awaited<ReturnType<typeof getBusinessProfitMigrationWorksheet>>
): BusinessProfitMigrationWorksheetData {
  return {
    allocatedTotal: worksheet.allocatedTotal,
    allocations: worksheet.allocations.map((allocation) => ({
      allocatedProfitAmount: allocation.allocatedProfitAmount,
      joinedAt: toDateString(allocation.joinedAt),
      memberId: allocation.memberId,
      memberName: allocation.memberName,
      memberNumber: allocation.memberNumber,
      shareBalance: allocation.shareBalance,
      sharePercentage: allocation.sharePercentage,
      status: allocation.status,
    })),
    eligibleMemberCount: worksheet.eligibleMemberCount,
    expenseLines: worksheet.expenseLines.map((line: SerializedExpenseLine) => ({
      amount: line.amount,
      id: line.id,
      reason: line.reason,
    })),
    expenseTotal: worksheet.expenseTotal,
    profitEntry: {
      hasPublishedAllocations: worksheet.profitEntry.hasPublishedAllocations,
      id: worksheet.profitEntry.id,
      linkedDividendPeriod: worksheet.profitEntry.linkedDividendPeriod,
      profitAmount: worksheet.profitEntry.profitAmount,
      profitDate: toDateString(worksheet.profitEntry.profitDate),
      status: worksheet.profitEntry.status,
    },
    remainingAmount: worksheet.remainingAmount,
    shareableDividend: worksheet.shareableDividend,
    shareBusiness: {
      id: worksheet.shareBusiness.id,
      name: worksheet.shareBusiness.name,
      startDate: toDateString(worksheet.shareBusiness.startDate),
    },
    totalShareBalance: worksheet.totalShareBalance,
  }
}

export default async function BusinessProfitMigrationPage({
  params,
}: {
  params: Promise<{ profitEntryId: string }>
}) {
  const { profitEntryId } = await params
  const context = await getDashboardServerContext()
  const runtime = createDbRuntime()

  if (!context.tenant || runtime.status !== "database-configured") {
    notFound()
  }

  const [migrationState, migrationMemberReview, worksheet] =
    await Promise.all([
      getTenantInitialMigrationState(context.tenant.id),
      listInitialMigrationMemberReview(context.tenant.id),
      getBusinessProfitMigrationWorksheet({
        profitEntryId,
        tenantId: context.tenant.id,
      }),
    ])
  const hasAppliedMemberBackfill = migrationMemberReview.some(
    (member) =>
      member.status === "backfill_applied" ||
      member.appliedBackfillBatches > 0 ||
      member.appliedBackfillMonths > 0
  )
  const isLocked =
    !migrationState.snapshot.canUseMigrationTools ||
    hasAppliedMemberBackfill ||
    worksheet.profitEntry.hasPublishedAllocations

  return (
    <FinanceBusinessProfitMigrationView
      isLocked={isLocked}
      worksheet={serializeWorksheet(worksheet)}
    />
  )
}
