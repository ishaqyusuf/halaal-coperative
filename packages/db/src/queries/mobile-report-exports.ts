import type { MobileReportKey } from "@halaalvest/domain/mobile-reports"
import { ExpectedQueryError } from "../query-error"
import { listActivityReportEvents } from "./audit"
import { listChargeApplications } from "./charges"
import { listContributions } from "./contributions"
import { listFoodPurchaseApplications } from "./food-purchase"
import { listLoans, listLoanRequests, listRepayments } from "./loans"
import {
  listMembers,
  listMemberStatementSummaries,
} from "./members"
import { getMobileMemberStatementSnapshot } from "./mobile-member-statement"
import { listMemberOpeningBalances } from "./opening-balances"
import { listMemberPaymentReceipts } from "./payment-receipts"
import { listProcurementRequests } from "./procurement"
import { listProjectFinancingRequests } from "./project-financing"
import { listSupportCases } from "./support"
import {
  listBusinessProfitSeasonReviews,
  listMemberShareApplications,
} from "./tenant-finance"

type CsvValue = boolean | Date | null | number | string | undefined | unknown
type Column = { header: string; path: string }
type ReportRow = Record<string, unknown>

export type MobileReportExportFilters = {
  fromDate?: Date
  toDate?: Date
}

export type MobileReportExportResult = {
  content: string
  filename: string
  mimeType: "text/csv"
  rowCount: number
}

function getPath(row: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null
    return (value as Record<string, unknown>)[key]
  }, row)
}

function formatCsvValue(value: CsvValue): string {
  if (value == null) return ""
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(formatCsvValue).join("; ")
  if (typeof value === "object") {
    if ("toISOString" in value && typeof value.toISOString === "function") {
      return String(value.toISOString())
    }
    if ("toString" in value && typeof value.toString === "function") {
      return String(value.toString())
    }
  }
  return String(value)
}

function escapeCsv(value: CsvValue) {
  const formatted = formatCsvValue(value)
  const normalized = /^[=+\-@]/.test(formatted) ? `'${formatted}` : formatted
  return /[",\n]/.test(normalized)
    ? `"${normalized.replace(/"/g, '""')}"`
    : normalized
}

function toCsv(rows: unknown[], columns: Column[]) {
  return [
    columns.map((column) => escapeCsv(column.header)).join(","),
    ...rows.map((row) =>
      columns.map((column) => escapeCsv(getPath(row, column.path))).join(","),
    ),
  ].join("\n")
}

function withinDateRange(
  row: unknown,
  paths: string[],
  filters: MobileReportExportFilters,
) {
  if (!filters.fromDate && !filters.toDate) return true
  const value = paths.map((path) => getPath(row, path)).find(Boolean)
  const date = value instanceof Date ? value : value ? new Date(String(value)) : null
  if (!date || Number.isNaN(date.getTime())) return false
  if (filters.fromDate && date < filters.fromDate) return false
  if (filters.toDate && date > filters.toDate) return false
  return true
}

export function finalizeMobileReportExport(input: {
  columns: Column[]
  filename: string
  rowLimit: number
  rows: unknown[]
}): MobileReportExportResult {
  if (input.rows.length > input.rowLimit) {
    throw ExpectedQueryError.validation(
      `This export exceeds the ${input.rowLimit.toLocaleString("en")} row limit for the active subscription. Narrow the date range and retry.`,
    )
  }

  return {
    content: toCsv(input.rows, input.columns),
    filename: input.filename,
    mimeType: "text/csv",
    rowCount: input.rows.length,
  }
}

async function listMembersBounded(tenantId: string, rowLimit: number) {
  const rows: unknown[] = []
  let page = 1
  while (rows.length <= rowLimit) {
    const result = await listMembers(tenantId, { page, pageSize: 500 })
    rows.push(...result.items)
    if (rows.length >= result.total || result.items.length === 0) break
    page += 1
  }
  return rows
}

async function listContributionsBounded(input: {
  filters: MobileReportExportFilters
  rowLimit: number
  specialSavingsOnly?: boolean
  tenantId: string
}) {
  const rows: unknown[] = []
  let page = 1
  while (rows.length <= input.rowLimit) {
    const result = await listContributions(input.tenantId, {
      fromDate: input.filters.fromDate,
      page,
      pageSize: 500,
      specialSavingsOnly: input.specialSavingsOnly,
      toDate: input.filters.toDate,
    })
    rows.push(...result.items)
    if (rows.length >= result.total || result.items.length === 0) break
    page += 1
  }
  return rows
}

const memberColumns: Column[] = [
  { header: "Member", path: "fullName" },
  { header: "Member Number", path: "memberNumber" },
  { header: "Email", path: "email" },
  { header: "Member Type", path: "memberType" },
  { header: "Status", path: "status" },
  { header: "KYC Status", path: "kycStatus" },
  { header: "Joined At", path: "joinedAt" },
  { header: "Savings Snapshot", path: "totalSavingsSnapshot" },
]

const contributionColumns: Column[] = [
  { header: "Posted At", path: "postedAt" },
  { header: "Member", path: "member.fullName" },
  { header: "Member Number", path: "member.memberNumber" },
  { header: "Amount", path: "amount" },
  { header: "Committed Amount", path: "committedAmount" },
  { header: "Extra Savings Amount", path: "extraSavingsAmount" },
  { header: "Channel", path: "channel" },
  { header: "Status", path: "status" },
  { header: "Reference", path: "reference" },
]

export async function createMobileAdminReportExport(input: {
  filters: MobileReportExportFilters
  key: MobileReportKey
  rowLimit: number
  tenantId: string
  tenantSlug: string
}): Promise<MobileReportExportResult> {
  const filename = `${input.tenantSlug}-${input.key}-report.csv`
  const take = input.rowLimit + 1

  if (input.key === "members") {
    return finalizeMobileReportExport({
      columns: memberColumns,
      filename,
      rowLimit: input.rowLimit,
      rows: (await listMembersBounded(input.tenantId, input.rowLimit)).filter(
        (row) => withinDateRange(row, ["joinedAt", "createdAt"], input.filters),
      ),
    })
  }

  if (input.key === "memberStatements") {
    return finalizeMobileReportExport({
      columns: [
        ...memberColumns.slice(0, 5),
        { header: "Savings Snapshot", path: "totalSavingsSnapshot" },
        { header: "Total Contributions", path: "totalContributions" },
        { header: "Special Savings", path: "totalExtraSavingsContributions" },
        { header: "Outstanding Principal", path: "totalOutstandingPrincipal" },
        { header: "Published Dividends", path: "totalDividendAllocations" },
      ],
      filename,
      rowLimit: input.rowLimit,
      rows: (await listMemberStatementSummaries(input.tenantId)).filter((row) =>
        withinDateRange(row, ["joinedAt"], input.filters),
      ),
    })
  }

  if (input.key === "contributions" || input.key === "specialSavings") {
    return finalizeMobileReportExport({
      columns: contributionColumns,
      filename,
      rowLimit: input.rowLimit,
      rows: await listContributionsBounded({
        filters: input.filters,
        rowLimit: input.rowLimit,
        specialSavingsOnly: input.key === "specialSavings",
        tenantId: input.tenantId,
      }),
    })
  }

  if (input.key === "charges") {
    return finalizeMobileReportExport({
      columns: [
        { header: "Assessed At", path: "assessedAt" },
        { header: "Member", path: "member.fullName" },
        { header: "Member Number", path: "member.memberNumber" },
        { header: "Charge", path: "chargeDefinition.name" },
        { header: "Amount", path: "amount" },
        { header: "Status", path: "status" },
        { header: "Collection Mode", path: "collectionMode" },
      ],
      filename,
      rowLimit: input.rowLimit,
      rows: await listChargeApplications(input.tenantId, {
        fromDate: input.filters.fromDate,
        limit: take,
        toDate: input.filters.toDate,
      }),
    })
  }

  if (input.key === "financing") {
    const [requests, loans] = await Promise.all([
      listLoanRequests(input.tenantId),
      listLoans(input.tenantId),
    ])
    const rows = [
      ...requests.map((row) => ({ ...row, recordType: "request" })),
      ...loans.map((row) => ({ ...row, recordType: "facility" })),
    ].filter((row) =>
      withinDateRange(row, ["requestedAt", "createdAt"], input.filters),
    )
    return finalizeMobileReportExport({
      columns: [
        { header: "Record Type", path: "recordType" },
        { header: "Member", path: "member.fullName" },
        { header: "Member Number", path: "member.memberNumber" },
        { header: "Product", path: "loanProduct.name" },
        { header: "Requested Amount", path: "requestedAmount" },
        { header: "Principal", path: "principalAmount" },
        { header: "Outstanding Principal", path: "outstandingPrincipal" },
        { header: "Status", path: "status" },
      ],
      filename,
      rowLimit: input.rowLimit,
      rows,
    })
  }

  if (input.key === "repayments") {
    return finalizeMobileReportExport({
      columns: [
        { header: "Paid At", path: "paidAt" },
        { header: "Member", path: "member.fullName" },
        { header: "Member Number", path: "member.memberNumber" },
        { header: "Product", path: "loan.loanProduct.name" },
        { header: "Amount", path: "amount" },
        { header: "Status", path: "status" },
        { header: "Reference", path: "reference" },
      ],
      filename,
      rowLimit: input.rowLimit,
      rows: await listRepayments(input.tenantId, {
        fromDate: input.filters.fromDate,
        limit: take,
        toDate: input.filters.toDate,
      }),
    })
  }

  if (input.key === "paymentReceipts") {
    return finalizeMobileReportExport({
      columns: [
        { header: "Submitted At", path: "submittedAt" },
        { header: "Member", path: "member.fullName" },
        { header: "Member Number", path: "member.memberNumber" },
        { header: "Amount", path: "totalAmount" },
        { header: "Channel", path: "paymentChannel" },
        { header: "Status", path: "status" },
        { header: "Payment Reference", path: "paymentReference" },
      ],
      filename,
      rowLimit: input.rowLimit,
      rows: await listMemberPaymentReceipts(input.tenantId, {
        limit: take,
        submittedFrom: input.filters.fromDate,
        submittedTo: input.filters.toDate,
      }),
    })
  }

  if (input.key === "procurement") {
    const rows = (await listProcurementRequests({
      limit: take,
      tenantId: input.tenantId,
    })).filter((row) =>
      withinDateRange(row, ["requestedAt", "createdAt"], input.filters),
    )
    return finalizeMobileReportExport({
      columns: [
        { header: "Requested At", path: "requestedAt" },
        { header: "Member", path: "member.fullName" },
        { header: "Member Number", path: "member.memberNumber" },
        { header: "Item", path: "itemName" },
        { header: "Amount", path: "requestedAmount" },
        { header: "Status", path: "status" },
      ],
      filename,
      rowLimit: input.rowLimit,
      rows,
    })
  }

  if (input.key === "foodPurchase") {
    const rows = (await listFoodPurchaseApplications({
      limit: take,
      tenantId: input.tenantId,
    })).filter((row) =>
      withinDateRange(row, ["requestedAt", "createdAt"], input.filters),
    )
    return finalizeMobileReportExport({
      columns: [
        { header: "Requested At", path: "requestedAt" },
        { header: "Member", path: "member.fullName" },
        { header: "Member Number", path: "member.memberNumber" },
        { header: "Requested Amount", path: "requestedAmount" },
        { header: "Approved Amount", path: "approvedAmount" },
        { header: "Status", path: "status" },
        { header: "Cycle", path: "cycle.label" },
      ],
      filename,
      rowLimit: input.rowLimit,
      rows,
    })
  }

  if (input.key === "projectFinancing") {
    const rows = (await listProjectFinancingRequests({
      limit: take,
      tenantId: input.tenantId,
    })).filter((row) =>
      withinDateRange(row, ["requestedAt", "createdAt"], input.filters),
    )
    return finalizeMobileReportExport({
      columns: [
        { header: "Requested At", path: "requestedAt" },
        { header: "Member", path: "member.fullName" },
        { header: "Member Number", path: "member.memberNumber" },
        { header: "Business", path: "businessName" },
        { header: "Structure", path: "structureType" },
        { header: "Requested Amount", path: "requestedAmount" },
        { header: "Status", path: "status" },
      ],
      filename,
      rowLimit: input.rowLimit,
      rows,
    })
  }

  if (input.key === "shares") {
    const rows = (await listMemberShareApplications({
      tenantId: input.tenantId,
    })).filter((row) =>
      withinDateRange(row, ["requestedAt", "createdAt"], input.filters),
    )
    return finalizeMobileReportExport({
      columns: [
        { header: "Requested At", path: "requestedAt" },
        { header: "Member", path: "member.fullName" },
        { header: "Member Number", path: "member.memberNumber" },
        { header: "Requested Units", path: "requestedUnits" },
        { header: "Approved Units", path: "approvedUnits" },
        { header: "Status", path: "status" },
      ],
      filename,
      rowLimit: input.rowLimit,
      rows,
    })
  }

  if (input.key === "profit") {
    const rows = (await listBusinessProfitSeasonReviews(input.tenantId)).filter(
      (row) => withinDateRange(row, ["periodStart"], input.filters),
    )
    return finalizeMobileReportExport({
      columns: [
        { header: "Period", path: "label" },
        { header: "Period Start", path: "periodStart" },
        { header: "Period End", path: "periodEnd" },
        { header: "Businesses", path: "businessNames" },
        { header: "Gross Profit", path: "grossProfitAmount" },
        { header: "Deductions", path: "deductionAmount" },
        { header: "Distributable", path: "distributableAmount" },
        { header: "Status", path: "status" },
      ],
      filename,
      rowLimit: input.rowLimit,
      rows,
    })
  }

  if (input.key === "support") {
    return finalizeMobileReportExport({
      columns: [
        { header: "Created At", path: "createdAt" },
        { header: "Member", path: "member.fullName" },
        { header: "Member Number", path: "member.memberNumber" },
        { header: "Subject", path: "subject" },
        { header: "Category", path: "category" },
        { header: "Priority", path: "priority" },
        { header: "Status", path: "status" },
      ],
      filename,
      rowLimit: input.rowLimit,
      rows: await listSupportCases({
        fromDate: input.filters.fromDate,
        limit: take,
        tenantId: input.tenantId,
        toDate: input.filters.toDate,
      }),
    })
  }

  if (input.key === "openingBalances") {
    return finalizeMobileReportExport({
      columns: [
        { header: "Opening Date", path: "openingDate" },
        { header: "Member", path: "member.fullName" },
        { header: "Member Number", path: "member.memberNumber" },
        { header: "Savings", path: "savingsBalance" },
        { header: "Financing", path: "financingBalance" },
        { header: "Shares", path: "shareBalance" },
        { header: "Status", path: "status" },
      ],
      filename,
      rowLimit: input.rowLimit,
      rows: await listMemberOpeningBalances({
        fromDate: input.filters.fromDate,
        limit: take,
        tenantId: input.tenantId,
        toDate: input.filters.toDate,
      }),
    })
  }

  const events = await listActivityReportEvents(input.tenantId, {
    fromDate: input.filters.fromDate,
    limit: take,
    toDate: input.filters.toDate,
  })
  const rows: ReportRow[] = events.map((event) => ({
    action: event.actionLabel,
    actor: event.actorLabel,
    authorizationRole: event.authorizationRole,
    authorizer: event.authorizerLabel,
    details: event.metadataSummary.join("; "),
    entityId: event.entityId,
    entityType: event.entityType,
    occurredAt: event.occurredAt,
  }))
  return finalizeMobileReportExport({
    columns: [
      { header: "Occurred At", path: "occurredAt" },
      { header: "Action", path: "action" },
      { header: "Performed By", path: "actor" },
      { header: "Authorizer Role", path: "authorizationRole" },
      { header: "Authorizer", path: "authorizer" },
      { header: "Entity Type", path: "entityType" },
      { header: "Entity Id", path: "entityId" },
      { header: "Redacted Details", path: "details" },
    ],
    filename,
    rowLimit: input.rowLimit,
    rows,
  })
}

export async function createMobileMemberStatementExport(input: {
  tenantId: string
  tenantSlug: string
  userId: string
}): Promise<MobileReportExportResult> {
  const statement = await getMobileMemberStatementSnapshot({
    tenantId: input.tenantId,
    userId: input.userId,
  })
  if (!statement.member) {
    throw ExpectedQueryError.notFound("Member statement was not found.")
  }

  const rows = statement.sections.flatMap((section) =>
    section.rows.map((row) => ({
      detail: row.detail,
      label: row.label,
      section: section.title,
      status: row.status,
      value: row.value,
    })),
  )
  return finalizeMobileReportExport({
    columns: [
      { header: "Section", path: "section" },
      { header: "Item", path: "label" },
      { header: "Value", path: "value" },
      { header: "Status", path: "status" },
      { header: "Detail", path: "detail" },
    ],
    filename: `${input.tenantSlug}-${statement.member.memberNumber}-statement.csv`,
    rowLimit: 500,
    rows,
  })
}
