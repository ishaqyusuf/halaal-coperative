import type { MobileMemberCooperativeServiceQaState } from "@/features/member-cooperative-services/public/member-cooperative-service-qa-state"
import type { RequestFilter } from "./public/request-filter"
import { formatMoney } from "@/lib/money"
import type { MobileReadCacheState } from "@/lib/read-cache"
import type { MobileProjectFinancingStructure } from "@/features/project-financing/public/member-project-financing-requests"

export type ServiceKind = "procurement" | "project-financing" | "food-purchase"
export type ServiceQaState =
  | MobileMemberCooperativeServiceQaState
  | "no-cycle"
  | "quote-error"
  | null
export type RequestStatus =
  | "pending"
  | "approved"
  | "active"
  | "completed"
  | "rejected"
  | "cancelled"

export type RequestPayment = {
  id: string
  number: number
  date: string
  amount: number
  paid: number
  status: string
}

export type ServiceRequest = {
  id: string
  title: string
  subtitle: string | null
  date: string
  amount: number
  months: number | null
  monthly: number | null
  outstanding: number | null
  repaymentTotal?: number
  paid: number
  status: RequestStatus
  details: [string, string | null][]
  reviewNotes: string | null
  payments?: RequestPayment[]
  /** Submitted payment still with finance; set only when a read reports it. */
  checkingAmount?: number
}

export type ServiceCharge = {
  id: string
  name: string
  collectionMode: string
  amount: number
}

export type ServiceWorkspace = {
  accessMode?: "disabled" | "office_only" | "member_self_service" | "read_only"
  activeRequest?: ServiceRequest | null
  activeCount?: number
  cache?: MobileReadCacheState
  canCreate: boolean
  chargeOptions: (ServiceCharge & {
    chargeValueType: "fixed_amount" | "percentage"
  })[]
  cycles?: { id: string; label: string }[]
  maxMonths?: number
  nextCursor: string | null
  pendingCount: number
  reasons: string[]
  requests: ServiceRequest[]
  state: "available" | "database_unavailable" | "member_profile_missing"
  structures?: {
    value: MobileProjectFinancingStructure
    requiresPaybackMonths: boolean
  }[]
  totalCount: number
}

export type RequestDraft = {
  amount: string
  awaitingConfirmation?: boolean
  cycleId: string
  months: string
  name: string
  notes: string
  secondary: string
  structure: MobileProjectFinancingStructure
  submissionKey: string
}

export type ServiceQuote = {
  chargeQuoteHash: string
  charges: ServiceCharge[]
  requestedAmount: number
}

export type { RequestFilter } from "./public/request-filter"

export type ServiceRequestPage = {
  requests: ServiceRequest[]
  nextCursor: string | null
}

export type ServiceAdapter = {
  kind: ServiceKind
  list: (qa: ServiceQaState) => Promise<ServiceWorkspace>
  page: (input: {
    cursor?: string
    filter?: RequestFilter
    search?: string
  }) => Promise<ServiceRequestPage>
  detail: (id: string) => Promise<ServiceRequest | null>
  submit: (draft: RequestDraft, quote?: ServiceQuote) => Promise<ServiceRequest>
  quote?: (amount: number) => Promise<ServiceQuote>
  quickFill: Partial<RequestDraft>
}

export const serviceDesign = {
  procurement: {
    title: "Procurement",
    noun: "request",
    icon: "Package",
    tile: "bg-accent",
    iconColor: "text-accent-foreground",
    newLabel: "New request",
    formTitle: "New procurement request",
    amountLabel: "Item cost",
    termLabel: "Repayment",
    activeLabel: "Repaying",
    completedLabel: "Fully repaid",
    monthOptions: [3, 4, 6, 8, 10],
    steps: ["Submitted", "Approved", "Purchased", "Repaying", "Repaid"],
  },
  "project-financing": {
    title: "Project financing",
    noun: "request",
    icon: "BriefcaseBusiness",
    tile: "bg-tint-sky",
    iconColor: "text-tint-sky-foreground",
    newLabel: "New project request",
    formTitle: "New project request",
    amountLabel: "Amount needed",
    termLabel: "Payback",
    activeLabel: "Paying back",
    completedLabel: "Completed",
    monthOptions: [6, 12, 18, 24],
    steps: ["Submitted", "Approved", "Disbursed", "Paying back", "Completed"],
  },
  "food-purchase": {
    title: "Foodstuff purchase",
    noun: "application",
    icon: "ShoppingBasket",
    tile: "bg-tint-warm",
    iconColor: "text-tint-warm-foreground",
    newLabel: "New application",
    formTitle: "New foodstuff application",
    amountLabel: "Amount",
    termLabel: "Payback",
    activeLabel: "Paying back",
    completedLabel: "Paid",
    monthOptions: [2, 3, 4, 6],
    steps: ["Submitted", "Approved", "Released", "Paying back", "Paid"],
  },
} as const

export type ServiceDesign = (typeof serviceDesign)[ServiceKind]

export const structureLabels: Record<
  MobileProjectFinancingStructure,
  { title: string; description: string }
> = {
  undecided: {
    title: "Undecided",
    description: "Let the finance team suggest a structure",
  },
  repayable_facility: {
    title: "Repayable",
    description: "Pay back the amount over a set term",
  },
  investment_partnership: {
    title: "Partnership",
    description: "Investment partnership, accounted separately",
  },
  profit_sharing: {
    title: "Profit sharing",
    description: "Share profits as agreed after review",
  },
}

export function getServiceStatus(status: string): RequestStatus {
  switch (status) {
    case "purchased":
    case "active":
      return "active"
    case "approved":
    case "completed":
    case "rejected":
    case "cancelled":
      return status
    default:
      return "pending"
  }
}

export function matchesRequestFilter(
  row: ServiceRequest,
  filter: RequestFilter
) {
  switch (filter) {
    case "all":
      return true
    case "active":
      return row.status === "active"
    case "pending":
      return row.status === "pending"
    case "closed":
      return (
        row.status === "completed" ||
        row.status === "rejected" ||
        row.status === "cancelled"
      )
  }
}

export function formatServiceDate(value: string, monthOnly = false) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("en-GB", {
        ...(monthOnly ? {} : { day: "numeric" }),
        month: monthOnly ? "long" : "short",
        timeZone: "UTC",
        year: "numeric",
      }).format(date)
}

export function formatServiceMoney(amount: number, currency: string) {
  return formatMoney(amount, {
    currencyCode: currency,
    fractionDigits: Number.isInteger(amount) ? 0 : 2,
  })
}

export function restoreServiceDraft(
  kind: ServiceKind,
  saved: unknown,
  clean: RequestDraft
) {
  if (!saved || typeof saved !== "object") return clean
  const record = saved as Record<string, unknown>
  const text = (field: string, oldField = field) => {
    const value = record[field] ?? record[oldField]
    return typeof value === "string" ? value : ""
  }
  const project = kind === "project-financing"
  const procurement = kind === "procurement"
  const oldStructure = text("structure", "proposedStructure")
  return {
    amount: text(
      "amount",
      procurement ? "requestedCost" : "requestedAmount"
    ).replaceAll(",", ""),
    awaitingConfirmation: record.awaitingConfirmation === true,
    cycleId: text("cycleId"),
    months: text(
      "months",
      procurement ? "requestedRepaymentMonths" : "requestedPaybackMonths"
    ),
    name: text("name", project ? "businessName" : "itemName"),
    notes: text(
      "notes",
      project
        ? "businessDescription"
        : procurement
          ? "itemDescription"
          : "requestNotes"
    ),
    secondary: text(
      "secondary",
      project
        ? "projectPurpose"
        : procurement
          ? "vendorName"
          : "itemDescription"
    ),
    structure: Object.hasOwn(structureLabels, oldStructure)
      ? (oldStructure as RequestDraft["structure"])
      : clean.structure,
    submissionKey: text("submissionKey") || clean.submissionKey,
  }
}

export function validateRequest(
  draft: RequestDraft,
  kind: ServiceKind,
  workspace: ServiceWorkspace | undefined
) {
  const errors: Partial<Record<keyof RequestDraft, string>> = {}
  const amount = Number(draft.amount)
  const months = Number(draft.months)
  if (amount <= 0 || !Number.isFinite(amount))
    errors.amount = "Enter an amount greater than zero."
  if (kind !== "food-purchase" && draft.name.trim().length < 2) {
    errors.name =
      kind === "procurement"
        ? "Enter the item name."
        : "Enter the business name."
  }
  if (
    kind === "food-purchase" &&
    !workspace?.cycles?.some((cycle) => cycle.id === draft.cycleId)
  ) {
    errors.cycleId = "Choose an open cycle."
  }
  if (
    kind === "project-financing" &&
    !workspace?.structures?.some(({ value }) => value === draft.structure)
  ) {
    errors.structure = "Choose an available structure."
  }
  if (
    kind !== "project-financing" ||
    draft.structure === "repayable_facility"
  ) {
    const max = workspace?.maxMonths
    if (max !== undefined && months > max)
      errors.months = `Choose up to ${max} months.`
    else if (!Number.isSafeInteger(months) || months < 1)
      errors.months = "Enter a whole number of months."
  }
  return errors
}
