import { cooperativeMobileAccessTerms } from "@halaalvest/domain/cooperative-mobile-access"
import { platformBillingPrices } from "@halaalvest/domain/platform-billing"

export type PublicPrice = {
  detail: string
  highlight?: boolean
  item: string
  note?: string
  price: string
}

/** Whole-naira amount as public copy, e.g. 1000 → "₦1,000". */
export function formatNaira(amount: number) {
  return `₦${amount.toLocaleString("en-US")}`
}

const seatFee = formatNaira(platformBillingPrices.seatFee)
const assistantFreeMessages =
  platformBillingPrices.assistantFreeMessages.toLocaleString("en-US")
const assistantMessagePrice = formatNaira(
  platformBillingPrices.assistantMessagePrice
)
const mobileAccessPrice = formatNaira(cooperativeMobileAccessTerms.amount)
const mobileAccessMonths = cooperativeMobileAccessTerms.termMonths

/**
 * The public price list. Amounts come from the same constants the dashboard
 * bills with (ADR-20261115-public-pricing-matches-platform-bill).
 */
export const publicPriceList: readonly PublicPrice[] = [
  {
    detail:
      "The web workspace for admins, finance officers and members. Your cooperative pays, or charges each member.",
    item: "Seat fee",
    note: "per active member, each month",
    price: seatFee,
  },
  {
    detail: `Shared by your staff each month. Extra messages only if your cooperative turns on assistant billing and sets a monthly cap.`,
    item: "Website assistant",
    note: `then ${assistantMessagePrice} a message, up to your cap`,
    price: `${assistantFreeMessages} free`,
  },
  {
    detail:
      "Optional. Members request access and your cooperative approves it.",
    item: "Mobile app access",
    note: `per member, for ${mobileAccessMonths} months`,
    price: mobileAccessPrice,
  },
  {
    detail: "We never take a percentage of member funds.",
    highlight: true,
    item: "Share of savings, financing, repayments or profits",
    price: "None",
  },
]

/** One-sentence summary for section ledes. */
export const publicPricingSummary = `${seatFee} per active member a month, with ${assistantFreeMessages} website assistant messages included. Mobile access is optional, at ${mobileAccessPrice} per member for ${mobileAccessMonths} months.`

export const monthlyBillTerms = [
  "Halaalvest sends your cooperative one bill a month for seats, assistant messages and mobile access.",
  `A seat is a member who is active when the month closes. Your cooperative pays the ${seatFee}, or charges it to each counted member's savings.`,
  "Members request mobile access from your cooperative, which approves each request and shares the charge first.",
  "Admins pay the bill from the dashboard and record which fund paid it.",
] as const

export const pricingFeePrinciples = [
  "No percentage of member savings, financing, repayments, dividends, or profits.",
  "SMS, KYC, payment gateway, transfer, and direct-debit costs remain transparent pass-throughs.",
  "Setup, migration, integrations, training, and white-label work are quoted separately.",
] as const
