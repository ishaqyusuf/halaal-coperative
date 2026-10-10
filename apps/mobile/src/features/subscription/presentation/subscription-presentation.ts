import type {
  MobilePlanChangeIntent,
  MobileSubscriptionPlan,
  MobileSubscriptionSnapshot,
} from "@/lib/mobile-subscription-api"

const dateFormatter = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  year: "numeric",
})
const integerFormatter = new Intl.NumberFormat("en-NG")
const moneyFormatters = new Map<string, Intl.NumberFormat>()

export function formatSubscriptionDate(value: string | null) {
  if (!value) return "Not scheduled"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Not scheduled"
  return dateFormatter.format(date)
}

export function formatSubscriptionMoney(
  value: number | null,
  currencyCode = "NGN"
) {
  if (value === null) return "Custom quote"
  let formatter = moneyFormatters.get(currencyCode)
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-NG", {
      currency: currencyCode,
      maximumFractionDigits: 0,
      style: "currency",
    })
    moneyFormatters.set(currencyCode, formatter)
  }
  return formatter.format(value)
}

export function formatSubscriptionPlanPrice(plan: MobileSubscriptionPlan) {
  const { maximum, minimum } = plan.monthlyPrice
  if (minimum === null) return "Custom quote"
  if (minimum === maximum) {
    return minimum === 0
      ? "Free during beta"
      : `${formatSubscriptionMoney(minimum)}/month`
  }
  return `${formatSubscriptionMoney(minimum)}–${formatSubscriptionMoney(maximum)}/month`
}

export function formatSubscriptionPlanCapacity(plan: MobileSubscriptionPlan) {
  return plan.activeMemberLimit === null
    ? "Custom active-member capacity"
    : `Up to ${integerFormatter.format(plan.activeMemberLimit)} active members`
}

export function formatSubscriptionPlanCapacityShort(
  plan: MobileSubscriptionPlan
) {
  return plan.activeMemberLimit === null
    ? "Custom capacity"
    : `${integerFormatter.format(plan.activeMemberLimit)} members`
}

function formatCompactMoney(value: number) {
  if (value >= 1_000_000) {
    const compactValue = value / 1_000_000
    return `₦${Number.isInteger(compactValue) ? compactValue : Number(compactValue.toFixed(2))}m`
  }
  if (value >= 1000) {
    const compactValue = value / 1000
    return `₦${Number.isInteger(compactValue) ? compactValue : Number(compactValue.toFixed(2))}k`
  }
  return formatSubscriptionMoney(value)
}

export function formatSubscriptionPlanRowPrice(plan: MobileSubscriptionPlan) {
  const { maximum, minimum } = plan.monthlyPrice
  if (minimum === null) return "Custom"
  if (minimum === 0 && maximum === 0) return "Free"
  if (minimum === maximum) return `${formatCompactMoney(minimum)}/mo`
  return `${formatCompactMoney(minimum)}–${formatCompactMoney(maximum ?? minimum)}`
}

export function formatSubscriptionSetupFee(plan: MobileSubscriptionPlan) {
  const { maximum, minimum } = plan.setupFee
  if (minimum === null) return "Quoted separately"
  if (maximum === null || maximum === minimum) {
    return maximum === minimum
      ? formatSubscriptionMoney(minimum)
      : `From ${formatSubscriptionMoney(minimum)}`
  }
  return `${formatSubscriptionMoney(minimum)}–${formatSubscriptionMoney(maximum)}`
}

export function formatCompactSubscriptionSetupFee(
  plan: MobileSubscriptionPlan
) {
  const { maximum, minimum } = plan.setupFee
  if (minimum === null) return "Quoted separately"
  if (maximum === null || maximum === minimum) {
    return maximum === minimum
      ? formatCompactMoney(minimum)
      : `From ${formatCompactMoney(minimum)}`
  }
  return `${formatCompactMoney(minimum)}–${formatCompactMoney(maximum)}`
}

export function getSubscriptionPlanHighlights(plan: MobileSubscriptionPlan) {
  const reportDepth = plan.entitlements.reportDepth.replace(/_/g, " ")
  return [
    {
      label: "Member login",
      value: plan.entitlements.memberLogin ? "Included" : "Admin managed",
    },
    {
      label: "Statements",
      value:
        plan.entitlements.memberStatements === "member_and_admin"
          ? "Member + admin"
          : "Admin generated",
    },
    {
      label: "Reports",
      value: `${reportDepth.charAt(0).toUpperCase()}${reportDepth.slice(1)}`,
    },
  ]
}

export function getSubscriptionRenewalMetric(
  snapshot: MobileSubscriptionSnapshot
) {
  if (snapshot.status === "suspended" || snapshot.status === "cancelled") {
    return {
      label: "Plan status",
      value: snapshot.status === "suspended" ? "Suspended" : "Cancelled",
    }
  }
  if (snapshot.status === "grace" && snapshot.billingPeriod.graceEndsAt) {
    return {
      label: "Grace ends",
      value: formatSubscriptionDate(snapshot.billingPeriod.graceEndsAt),
    }
  }
  if (
    ["free_beta", "trialing"].includes(snapshot.status) &&
    snapshot.billingPeriod.trialEndsAt
  ) {
    return {
      label: "Trial ends",
      value: formatSubscriptionDate(snapshot.billingPeriod.trialEndsAt),
    }
  }
  if (snapshot.billingPeriod.currentPeriodEndsAt) {
    return {
      label: snapshot.billingPeriod.cancelAtPeriodEnd
        ? "Access until"
        : snapshot.status === "active" && snapshot.source === "billing_provider"
          ? "Renews"
          : "Current period ends",
      value: formatSubscriptionDate(snapshot.billingPeriod.currentPeriodEndsAt),
    }
  }
  return { label: "Billing", value: "Managed" }
}

export function getSubscriptionBrowsePresentation(
  snapshot: MobileSubscriptionSnapshot
) {
  const activeMemberCount = snapshot.usage.activeMemberCount
  const remaining = snapshot.usage.remainingActiveMembers
  const dueInvoices = snapshot.invoices.filter((invoice) =>
    ["open", "past_due"].includes(invoice.status)
  ).length
  const rawUsagePercent =
    snapshot.usage.usagePercent ??
    (snapshot.usage.activeMemberLimit
      ? (activeMemberCount / snapshot.usage.activeMemberLimit) * 100
      : 0)
  const renewal = getSubscriptionRenewalMetric(snapshot)

  return {
    activeMembers: `${integerFormatter.format(activeMemberCount)} active ${activeMemberCount === 1 ? "member" : "members"}`,
    currentPlan: snapshot.plan.displayName,
    currentPrice: formatSubscriptionPlanPrice(snapshot.plan),
    isAtCapacity: snapshot.usage.isAtCapacity,
    metrics: [
      renewal,
      { label: "Add-ons", value: String(snapshot.addons.length) },
      { label: "Invoices", value: String(dueInvoices) },
    ],
    remainingMembers:
      remaining === null
        ? "Custom capacity"
        : `${integerFormatter.format(remaining)} ${remaining === 1 ? "space" : "spaces"} left`,
    usagePercent: Math.min(100, Math.max(0, rawUsagePercent)),
  }
}

export function presentSubscriptionPlanRow(plan: MobileSubscriptionPlan) {
  return {
    capacity: formatSubscriptionPlanCapacityShort(plan),
    price: formatSubscriptionPlanRowPrice(plan),
  }
}

export function getSubscriptionRecordedMessage(
  snapshot: MobileSubscriptionSnapshot,
  intent: MobilePlanChangeIntent
) {
  const requestedPlan = snapshot.availablePlans.find(
    (plan) => plan.code === intent.requestedPlanCode
  )
  const requestedName = requestedPlan?.displayName ?? "Requested plan"
  return `${requestedName} is pending billing review. ${snapshot.plan.displayName} remains active.`
}
