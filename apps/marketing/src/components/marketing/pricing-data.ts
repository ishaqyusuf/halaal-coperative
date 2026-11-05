// Owner-approved USD base prices for personal mobile app access (ADR-20261007).
// The web workspace is free; store checkout shows the localized final price.
export const mobileAppAccessPrices = {
  oneYear: "US$1.99",
  sixMonths: "US$0.99",
} as const

export type PublicPrice = {
  detail: string
  highlight?: boolean
  item: string
  note?: string
  price: string
}

// Public pricing follows the free-web, per-user-app direction (ADR-20260928).
// The domain's tenant plan bands are historical billing records and are not
// published.
export const publicPriceList: readonly PublicPrice[] = [
  {
    detail: "For admins, finance officers and members.",
    item: "Web workspace",
    price: "Free",
  },
  {
    detail:
      "Optional, per user, on iOS and Android. Each person pays through their own store account.",
    item: "Mobile app access",
    note: `or ${mobileAppAccessPrices.sixMonths} for six months`,
    price: `${mobileAppAccessPrices.oneYear} / year`,
  },
  {
    detail: "We never take a percentage of member funds.",
    highlight: true,
    item: "Share of savings, financing, repayments or profits",
    price: "None",
  },
]

export const mobileAppAccessTerms = [
  "Six months and one year unlock the same app features.",
  "Members, staff and admins each buy their own access in the App Store or Google Play.",
  "Your store shows the final local price, taxes and renewal terms before you pay.",
  "Manage or cancel renewal through the store account you paid with.",
] as const

export const pricingFeePrinciples = [
  "No percentage of member savings, financing, repayments, dividends, or profits.",
  "SMS, KYC, payment gateway, transfer, and direct-debit costs remain transparent pass-throughs.",
  "Setup, migration, integrations, training, and white-label work are quoted separately.",
] as const
