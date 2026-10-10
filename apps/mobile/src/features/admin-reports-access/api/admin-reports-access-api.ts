import {
  generateDevAdminReport,
  getDevAdminAccess,
  getDevAdminReportActivity,
  getDevAdminReports,
  inviteDevAdminAccess,
} from "@/dev/mobile-dev-fixtures"
import { isMobileDevFixtureSession } from "@/dev/mobile-dev-session"
import { readCachedMobileQuery } from "@/lib/read-cache"
import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
import type {
  AdminAccess,
  AdminAccessInviteInput,
  AdminAccessInviteResult,
  AdminGeneratedReportPayload,
  AdminReportActivityFilters,
  AdminReportActivityPage,
  AdminReportFilters,
  AdminReportKey,
  AdminReports,
} from "../model/admin-reports-access-types"

function toApiDateTime(value: string | null, endOfDay = false) {
  if (!value) return undefined
  if (value.includes("T")) return value
  return `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`
}

export async function getAdminReports() {
  if (isMobileDevFixtureSession()) return getDevAdminReports() as AdminReports
  const client = createMobileTrpcClient()
  return readCachedMobileQuery("admin.reports", () =>
    client.mobile.admin.reports.overview.query()
  ) as Promise<AdminReports>
}

export async function getAdminReportActivity(input: {
  cursor: string | null
  filters: AdminReportActivityFilters
  limit?: number
}): Promise<AdminReportActivityPage> {
  if (isMobileDevFixtureSession()) {
    return getDevAdminReportActivity(input)
  }
  const client = createMobileTrpcClient()
  return client.mobile.admin.reports.activity.query({
    action: input.filters.action ?? undefined,
    cursor: input.cursor ?? undefined,
    entityType: input.filters.entityType ?? undefined,
    fromDate: toApiDateTime(input.filters.fromDate),
    limit: input.limit ?? 25,
    search: input.filters.search ?? undefined,
    toDate: toApiDateTime(input.filters.toDate, true),
  }) as Promise<AdminReportActivityPage>
}

export async function generateAdminReport(input: {
  filters: AdminReportFilters
  key: AdminReportKey
  requestId: string
}): Promise<AdminGeneratedReportPayload> {
  if (isMobileDevFixtureSession()) return generateDevAdminReport(input)
  const client = createMobileTrpcClient()
  return client.mobile.admin.reports.generate.mutate({
    fromDate: toApiDateTime(input.filters.fromDate),
    key: input.key,
    requestId: input.requestId,
    toDate: toApiDateTime(input.filters.toDate, true),
  }) as Promise<AdminGeneratedReportPayload>
}

export async function getAdminAccess() {
  if (isMobileDevFixtureSession()) return getDevAdminAccess() as AdminAccess
  const client = createMobileTrpcClient()
  return readCachedMobileQuery("admin.access", () =>
    client.mobile.admin.access.overview.query()
  ) as Promise<AdminAccess>
}

export async function inviteAdminAccessUser(
  input: AdminAccessInviteInput
): Promise<AdminAccessInviteResult> {
  if (isMobileDevFixtureSession()) return inviteDevAdminAccess(input)
  const client = createMobileTrpcClient()
  return client.mobile.admin.access.invite.mutate(input)
}
