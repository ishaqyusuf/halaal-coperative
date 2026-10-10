import type { MobileGuarantorRequest } from "./member-guarantor-types"

const currencyFormatters = new Map<string, Intl.NumberFormat>()
const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
})

function getCurrencyFormatter(currencyCode: string) {
  const existing = currencyFormatters.get(currencyCode)
  if (existing) return existing

  const formatter = new Intl.NumberFormat("en", {
    currency: currencyCode,
    maximumFractionDigits: 0,
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
