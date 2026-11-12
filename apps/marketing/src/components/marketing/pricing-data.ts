export type PublicPrice = {
  detail: string
  highlight?: boolean
  item: string
  note?: string
  price: string
}

export const publicPriceList: readonly PublicPrice[] = [
  {
    detail: "For admins, finance officers and members.",
    item: "Web workspace",
    price: "Free",
  },
  {
    detail: "Members can request access from their cooperative.",
    item: "Mobile app access",
    price: "Through your cooperative",
  },
  {
    detail: "We never take a percentage of member funds.",
    highlight: true,
    item: "Share of savings, financing, repayments or profits",
    price: "None",
  },
]

export const mobileAppAccessTerms = [
  "Your cooperative reviews mobile access requests.",
  "Your cooperative shares the applicable charge before you request access.",
  "Halaalvest bills your cooperative directly.",
] as const

export const pricingFeePrinciples = [
  "No percentage of member savings, financing, repayments, dividends, or profits.",
  "SMS, KYC, payment gateway, transfer, and direct-debit costs remain transparent pass-throughs.",
  "Setup, migration, integrations, training, and white-label work are quoted separately.",
] as const
