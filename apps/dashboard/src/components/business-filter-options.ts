export const businessStatusFilters = [
  { id: "planned", name: "Planned" },
  { id: "active", name: "Active" },
  { id: "completed", name: "Completed" },
  { id: "archived", name: "Archived" },
]

export const businessProfitStatusFilters = [
  { id: "draft", name: "Draft" },
  { id: "pending", name: "Pending" },
  { id: "reviewed", name: "Reviewed" },
  { id: "completed", name: "Completed" },
  { id: "approved", name: "Approved" },
  { id: "archived", name: "Archived" },
]

export const businessSourceTypeFilters = [
  { id: "manual", name: "Manual" },
  { id: "backfill", name: "Backfill" },
  { id: "import", name: "Import" },
]

export const businessHasProfitEntryFilters = [
  { id: "true", name: "Has profit entries" },
  { id: "false", name: "No profit entries" },
]

export const businessSortOptions = [
  { id: "startDate,desc", name: "Newest start date" },
  { id: "startDate,asc", name: "Oldest start date" },
  { id: "name,asc", name: "Business name A–Z" },
  { id: "capitalAmount,desc", name: "Highest capital" },
  { id: "profitAmount,desc", name: "Highest recorded profit" },
  { id: "status,asc", name: "Status A–Z" },
] as const
