import {
  SUBSCRIPTION_PLAN_DEFINITIONS,
  type SubscriptionPlanCode,
} from "@halaalvest/domain/subscriptions"

function formatPlanPrice(planCode: SubscriptionPlanCode) {
  const { currencyCode, minimum, maximum } =
    SUBSCRIPTION_PLAN_DEFINITIONS[planCode].monthlyPrice
  if (minimum === null && maximum === null) return "Custom"
  if (minimum === null || maximum === null)
    throw new Error(`Incomplete public price for ${planCode}.`)
  const formatValue = (value: number) => {
    if (value < 1000) return value.toLocaleString("en-NG")

    const thousands = value / 1000
    return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(2).replace(/\.?0+$/, "")}k`
  }

  return minimum === maximum
    ? `${currencyCode} ${formatValue(minimum)}`
    : `${currencyCode} ${formatValue(minimum)}–${formatValue(maximum)}`
}

export const freeBetaMonthlyPriceLabel = formatPlanPrice("free_beta")
export const standardMonthlyPriceLabel = formatPlanPrice("standard")

export const pricingPlans = [
  {
    name: "Free Beta",
    price: freeBetaMonthlyPriceLabel,
    cadence: "while beta is active",
    members: "Up to 100 active members",
    description:
      "For selected cooperatives validating guided setup and live operating workflows.",
    features: [
      "Guided cooperative setup",
      "Member import and records",
      "Contributions, charges, and statements",
      "Admin-only beta workspace",
    ],
  },
  {
    name: "Starter",
    price: formatPlanPrice("starter"),
    cadence: "per month",
    members: "Up to 250 active members",
    description:
      "For small societies moving from spreadsheets into accountable records.",
    features: [
      "Core finance workspace",
      "Admin-only by default",
      "Email notifications for admins",
      "Member login as a paid add-on",
    ],
  },
  {
    name: "Standard",
    price: standardMonthlyPriceLabel,
    cadence: "per month",
    members: "Up to 1,000 active members",
    description:
      "For established cooperatives running monthly contribution operations.",
    features: [
      "Member login included",
      "Custom domain included",
      "Email notifications for members",
      "Audit history",
    ],
  },
  {
    name: "Growth",
    price: formatPlanPrice("growth"),
    cadence: "per month",
    members: "Up to 3,000 active members",
    description:
      "For larger employer, civil-service, or multi-group cooperative programs.",
    features: [
      "WhatsApp setup included",
      "Advanced email templates",
      "Bulk operations and exports",
      "White-label app as an add-on",
    ],
  },
  {
    name: "Enterprise",
    price: formatPlanPrice("enterprise"),
    cadence: "quoted monthly",
    members: "Custom active-member band",
    description:
      "For multi-branch, integration-heavy, or SLA-backed cooperative deployments.",
    features: [
      "White-label app options",
      "Custom domains and branding",
      "WhatsApp and email workflows",
      "Dedicated success support",
    ],
  },
] as const

export const homepagePricingPlans = pricingPlans.filter((plan) =>
  ["Free Beta", "Standard", "Enterprise"].includes(plan.name)
)

export const pricingFeatureMatrix = [
  {
    feature: "Member login",
    values: ["No", "Add-on", "Included", "Included", "Included"],
  },
  {
    feature: "Custom domain",
    values: ["No", "Add-on", "Included", "Included", "Included"],
  },
  {
    feature: "Email notifications",
    values: [
      "Admin setup",
      "Admin only",
      "Admin + member",
      "Advanced",
      "Custom",
    ],
  },
  {
    feature: "WhatsApp notifications",
    values: ["Pilot only", "Add-on", "Add-on", "Setup included", "Custom"],
  },
  {
    feature: "White-label app",
    values: ["No", "No", "No", "Add-on", "Custom"],
  },
] as const

export const pricingFeePrinciples = [
  "No percentage of member savings, financing, repayments, dividends, or profits.",
  "SMS, KYC, payment gateway, transfer, and direct-debit costs remain transparent pass-throughs.",
  "Setup, migration, integrations, training, and white-label work are quoted separately.",
] as const
