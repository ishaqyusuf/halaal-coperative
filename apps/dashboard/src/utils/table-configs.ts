import type { StickyColumnConfig, TableConfig } from "@/components/tables/core"
import type { TableId } from "./table-settings"

export const STICKY_COLUMNS: Record<TableId, StickyColumnConfig[]> = {
  members: [{ id: "member", width: 320 }],
  contributions: [{ id: "member", width: 300 }],
  charges: [{ id: "charge", width: 300 }],
  shares: [{ id: "name", width: 280 }],
  business: [{ id: "name", width: 280 }],
  imports: [{ id: "createdAt", width: 180 }],
  loanPortfolio: [{ id: "member", width: 300 }],
  loanRequests: [{ id: "member", width: 300 }],
  membershipApprovals: [{ id: "applicant", width: 300 }],
  notifications: [{ id: "subject", width: 320 }],
  audit: [{ id: "action", width: 300 }],
}

export const SORT_FIELD_MAPS: Record<TableId, Record<string, string>> = {
  members: {
    member: "fullName",
    number: "memberNumber",
    type: "memberType",
    status: "status",
    kyc: "kycStatus",
    joined: "joinedAt",
  },
  contributions: {
    member: "member",
    savings: "amount",
    committed: "committedAmount",
    extraSavings: "extraSavingsAmount",
    posted: "postedAt",
  },
  charges: {
    charge: "name",
    status: "status",
    kind: "kind",
    currentDate: "currentDate",
    currentAmount: "currentAmount",
  },
  shares: {},
  business: {},
  imports: {
    createdAt: "createdAt",
    status: "status",
    type: "importType",
  },
  loanPortfolio: {
    member: "member",
    loan: "loanProduct",
    status: "status",
    servicing: "servicing",
  },
  loanRequests: {
    member: "member",
    request: "requestedAt",
    status: "status",
    review: "review",
  },
  membershipApprovals: {
    applicant: "fullName",
    status: "status",
    submitted: "submittedAt",
  },
  notifications: {
    subject: "subject",
    status: "status",
    createdAt: "createdAt",
  },
  audit: {
    action: "action",
    createdAt: "createdAt",
  },
}

export const NON_REORDERABLE_COLUMNS: Record<TableId, Set<string>> = {
  members: new Set(["member", "actions"]),
  contributions: new Set(["member", "actions"]),
  charges: new Set(["charge", "actions"]),
  shares: new Set(["name", "actions"]),
  business: new Set(["name", "actions"]),
  imports: new Set(["createdAt", "actions"]),
  loanPortfolio: new Set(["member", "actions"]),
  loanRequests: new Set(["member", "actions"]),
  membershipApprovals: new Set(["applicant", "actions"]),
  notifications: new Set(["subject", "actions"]),
  audit: new Set(["action", "actions"]),
}

export const ROW_HEIGHTS: Record<TableId, number> = {
  members: 56,
  contributions: 56,
  charges: 56,
  shares: 56,
  business: 56,
  imports: 56,
  loanPortfolio: 64,
  loanRequests: 64,
  membershipApprovals: 64,
  notifications: 56,
  audit: 56,
}

export const SUMMARY_GRID_HEIGHTS: Partial<Record<TableId, number>> = {
  members: 180,
  contributions: 180,
  charges: 180,
  shares: 180,
  business: 180,
  loanPortfolio: 180,
  loanRequests: 180,
}

export const TABLE_CONFIGS: Record<TableId, TableConfig> = {
  members: {
    tableId: "members",
    stickyColumns: STICKY_COLUMNS.members,
    sortFieldMap: SORT_FIELD_MAPS.members,
    nonReorderableColumns: NON_REORDERABLE_COLUMNS.members,
    rowHeight: ROW_HEIGHTS.members,
    summaryGridHeight: SUMMARY_GRID_HEIGHTS.members,
  },
  contributions: {
    tableId: "contributions",
    stickyColumns: STICKY_COLUMNS.contributions,
    sortFieldMap: SORT_FIELD_MAPS.contributions,
    nonReorderableColumns: NON_REORDERABLE_COLUMNS.contributions,
    rowHeight: ROW_HEIGHTS.contributions,
    summaryGridHeight: SUMMARY_GRID_HEIGHTS.contributions,
  },
  charges: {
    tableId: "charges",
    stickyColumns: STICKY_COLUMNS.charges,
    sortFieldMap: SORT_FIELD_MAPS.charges,
    nonReorderableColumns: NON_REORDERABLE_COLUMNS.charges,
    rowHeight: ROW_HEIGHTS.charges,
    summaryGridHeight: SUMMARY_GRID_HEIGHTS.charges,
  },
  shares: {
    tableId: "shares",
    stickyColumns: STICKY_COLUMNS.shares,
    sortFieldMap: SORT_FIELD_MAPS.shares,
    nonReorderableColumns: NON_REORDERABLE_COLUMNS.shares,
    rowHeight: ROW_HEIGHTS.shares,
    summaryGridHeight: SUMMARY_GRID_HEIGHTS.shares,
  },
  business: {
    tableId: "business",
    stickyColumns: STICKY_COLUMNS.business,
    sortFieldMap: SORT_FIELD_MAPS.business,
    nonReorderableColumns: NON_REORDERABLE_COLUMNS.business,
    rowHeight: ROW_HEIGHTS.business,
    summaryGridHeight: SUMMARY_GRID_HEIGHTS.business,
  },
  imports: {
    tableId: "imports",
    stickyColumns: STICKY_COLUMNS.imports,
    sortFieldMap: SORT_FIELD_MAPS.imports,
    nonReorderableColumns: NON_REORDERABLE_COLUMNS.imports,
    rowHeight: ROW_HEIGHTS.imports,
  },
  loanPortfolio: {
    tableId: "loanPortfolio",
    stickyColumns: STICKY_COLUMNS.loanPortfolio,
    sortFieldMap: SORT_FIELD_MAPS.loanPortfolio,
    nonReorderableColumns: NON_REORDERABLE_COLUMNS.loanPortfolio,
    rowHeight: ROW_HEIGHTS.loanPortfolio,
    summaryGridHeight: SUMMARY_GRID_HEIGHTS.loanPortfolio,
  },
  loanRequests: {
    tableId: "loanRequests",
    stickyColumns: STICKY_COLUMNS.loanRequests,
    sortFieldMap: SORT_FIELD_MAPS.loanRequests,
    nonReorderableColumns: NON_REORDERABLE_COLUMNS.loanRequests,
    rowHeight: ROW_HEIGHTS.loanRequests,
    summaryGridHeight: SUMMARY_GRID_HEIGHTS.loanRequests,
  },
  membershipApprovals: {
    tableId: "membershipApprovals",
    stickyColumns: STICKY_COLUMNS.membershipApprovals,
    sortFieldMap: SORT_FIELD_MAPS.membershipApprovals,
    nonReorderableColumns: NON_REORDERABLE_COLUMNS.membershipApprovals,
    rowHeight: ROW_HEIGHTS.membershipApprovals,
  },
  notifications: {
    tableId: "notifications",
    stickyColumns: STICKY_COLUMNS.notifications,
    sortFieldMap: SORT_FIELD_MAPS.notifications,
    nonReorderableColumns: NON_REORDERABLE_COLUMNS.notifications,
    rowHeight: ROW_HEIGHTS.notifications,
  },
  audit: {
    tableId: "audit",
    stickyColumns: STICKY_COLUMNS.audit,
    sortFieldMap: SORT_FIELD_MAPS.audit,
    nonReorderableColumns: NON_REORDERABLE_COLUMNS.audit,
    rowHeight: ROW_HEIGHTS.audit,
  },
}

export function getTableConfig(tableId: TableId): TableConfig {
  return TABLE_CONFIGS[tableId]
}
