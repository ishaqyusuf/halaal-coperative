import type { MobileGuarantorRequest } from "./member-guarantor-types"

const currencyFormatters = new Map<string, Intl.NumberFormat>()
const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
})

function getCurrencyFormatter(currencyCode: string) {
  const existing = currencyFormatters.get(currencyCode)
  if (existing) return existing

  const formatter = new Intl.NumberFormat("en-NG", {
    currency: currencyCode,
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    style: "currency",
  })
  currencyFormatters.set(currencyCode, formatter)
  return formatter
}

export function formatGuarantorCurrency(value: number, currencyCode: string) {
  return getCurrencyFormatter(currencyCode).format(value)
}

export function formatGuarantorDate(value: string | null) {
  return value ? dateFormatter.format(new Date(value)) : "Not recorded"
}

export function formatGuarantorStatus(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function presentGuarantorApproval(
  approval: MobileGuarantorRequest,
  currencyCode: string
) {
  const status = formatGuarantorStatus(approval.status)
  const requestedAmount = formatGuarantorCurrency(
    approval.loanRequest.requestedAmount,
    currencyCode
  )
  const monthlyServicing = formatGuarantorCurrency(
    approval.loanRequest.estimatedMonthlyServicing,
    currencyCode
  )
  const term = `${approval.loanRequest.requestedTermMonths} ${
    approval.loanRequest.requestedTermMonths === 1 ? "month" : "months"
  }`

  return {
    accessibilityLabel: `${approval.loanRequest.borrowerName}. ${status}. Requested ${requestedAmount}. ${monthlyServicing} monthly for ${term}.`,
    borrower: approval.loanRequest.borrowerName,
    borrowerContext: `${approval.loanRequest.borrowerMemberNumber} · ${approval.loanRequest.loanProductName}`,
    monthlyServicing,
    purpose: approval.loanRequest.purpose,
    requestedAmount,
    requestedDate: formatGuarantorDate(approval.requestedAt),
    resolvedContext: `${approval.loanRequest.loanProductName} · ${requestedAmount}`,
    respondedDate: formatGuarantorDate(approval.respondedAt),
    responseNotes: approval.responseNotes,
    status,
    term,
  }
}

export function getGuarantorAnswer(approval: MobileGuarantorRequest) {
  if (approval.status === "pending") {
    return { label: "Waiting for you", tone: "warning" } as const
  }
  if (approval.answeredByMember === false) {
    return { label: "Recorded by your cooperative", tone: "info" } as const
  }
  return approval.status === "approved"
    ? ({ label: "You agreed", tone: "success" } as const)
    : ({ label: "You declined", tone: "danger" } as const)
}

export function matchesGuarantorSearch(
  approval: MobileGuarantorRequest,
  term: string
) {
  const { borrowerName, borrowerMemberNumber, loanProductName } =
    approval.loanRequest
  return `${borrowerName} ${borrowerMemberNumber} ${loanProductName}`
    .toLowerCase()
    .includes(term.toLowerCase())
}
