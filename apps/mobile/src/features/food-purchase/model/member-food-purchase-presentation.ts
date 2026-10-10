import type {
  MobileFoodPurchaseApplication,
  MobileWorkflowChargeOption,
} from "./member-food-purchase-types"

const currencyFormatters = new Map<string, Intl.NumberFormat>()
const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  year: "numeric",
})
const monthFormatter = new Intl.DateTimeFormat("en", {
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

export function parseFoodPurchaseAmount(value: string) {
  const amount = Number(value.replace(/,/g, "").trim())
  return Number.isFinite(amount) ? amount : 0
}

export function parseFoodPurchasePositiveInteger(value: string) {
  const amount = Number(value.trim())
  return Number.isInteger(amount) && amount > 0 ? amount : 0
}

export function formatFoodPurchaseCurrency(
  value: number,
  currencyCode: string
) {
  return getCurrencyFormatter(currencyCode).format(value)
}

export function formatFoodPurchaseDate(value: string | null) {
  return value ? dateFormatter.format(new Date(value)) : "Not recorded"
}

export function formatFoodPurchaseMonth(value: string) {
  return monthFormatter.format(new Date(value))
}

export function formatFoodPurchaseStatus(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function estimateFoodPurchaseChargeAmount(
  charge: MobileWorkflowChargeOption,
  basisAmount: number
) {
  if (charge.chargeValueType === "percentage") {
    return Number(((Math.max(0, basisAmount) * charge.amount) / 100).toFixed(2))
  }

  return charge.amount
}

export function presentFoodPurchaseCharges(
  charges: MobileWorkflowChargeOption[],
  basisAmount: number
) {
  const items = charges
    .map((charge) => ({
      ...charge,
      estimatedAmount: estimateFoodPurchaseChargeAmount(charge, basisAmount),
    }))
    .filter((charge) => charge.estimatedAmount > 0)

  return {
    items,
    total: items.reduce((sum, charge) => sum + charge.estimatedAmount, 0),
  }
}

export function presentFoodPurchaseApplication(
  application: MobileFoodPurchaseApplication,
  currencyCode: string
) {
  const approvedAmount = application.approvedAmount ?? 0
  const remainingAmount = Math.max(0, approvedAmount - application.paidAmount)
  const amount = approvedAmount || application.requestedAmount
  const status = formatFoodPurchaseStatus(application.status)

  return {
    accessibilityLabel: `View ${application.itemDescription || "Foodstuff Purchase"} application details. ${status}. ${formatFoodPurchaseCurrency(amount, currencyCode)}.`,
    amount: formatFoodPurchaseCurrency(amount, currencyCode),
    amountLabel: approvedAmount > 0 ? "approved" : "requested",
    cycle: `${formatFoodPurchaseMonth(application.cycle.periodMonth)} cycle`,
    detail:
      application.paidAmount > 0
        ? `${formatFoodPurchaseCurrency(application.paidAmount, currencyCode)} paid${application.paidAt ? ` · ${formatFoodPurchaseDate(application.paidAt)}` : ""}`
        : `Requested ${formatFoodPurchaseDate(application.requestedAt)}`,
    remaining:
      approvedAmount > 0
        ? formatFoodPurchaseCurrency(remainingAmount, currencyCode)
        : `${application.requestedPaybackMonths} ${application.requestedPaybackMonths === 1 ? "month" : "months"}`,
    remainingLabel: approvedAmount > 0 ? "remaining" : "payback",
    status,
    title: application.itemDescription || "Foodstuff Purchase request",
  }
}

export function presentFoodPurchaseObligation(
  application: MobileFoodPurchaseApplication,
  currencyCode: string
) {
  const approvedAmount = application.approvedAmount ?? 0
  const remainingAmount = Math.max(0, approvedAmount - application.paidAmount)
  const progressPercent =
    approvedAmount > 0
      ? Math.min(
          100,
          Math.max(0, (application.paidAmount / approvedAmount) * 100)
        )
      : 0
  const paybackMonths =
    application.approvedPaybackMonths ?? application.requestedPaybackMonths

  return {
    accessibilityValue: {
      max: approvedAmount,
      min: 0,
      now: application.paidAmount,
    },
    approved: formatFoodPurchaseCurrency(approvedAmount, currencyCode),
    item: application.itemDescription || "Foodstuff Purchase",
    paid: formatFoodPurchaseCurrency(application.paidAmount, currencyCode),
    paidSummary: `${formatFoodPurchaseCurrency(application.paidAmount, currencyCode)} paid of ${formatFoodPurchaseCurrency(approvedAmount, currencyCode)}`,
    payback: `${paybackMonths} ${paybackMonths === 1 ? "month" : "months"}`,
    progressPercent,
    remaining: formatFoodPurchaseCurrency(remainingAmount, currencyCode),
    status: formatFoodPurchaseStatus(application.status),
  }
}
