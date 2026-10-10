export const SUBSCRIPTION_PLAN_CODES = [
  "free_beta",
  "starter",
  "standard",
  "growth",
  "enterprise",
] as const

export const SUBSCRIPTION_STATUSES = [
  "free_beta",
  "trialing",
  "active",
  "past_due",
  "grace",
  "cancelled",
  "suspended",
  "manual",
  "enterprise",
] as const

export const SUBSCRIPTION_SOURCES = [
  "system_default",
  "free_beta",
  "manual",
  "billing_provider",
  "enterprise_contract",
] as const

export type SubscriptionPlanCode = (typeof SUBSCRIPTION_PLAN_CODES)[number]
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number]
export type SubscriptionSource = (typeof SUBSCRIPTION_SOURCES)[number]

export type SubscriptionEntitlements = {
  auditDepth: "basic" | "full" | "advanced" | "custom"
  coreFinance: true
  customDomain: boolean
  emailNotifications:
    | "admin_setup"
    | "admin_only"
    | "member_and_admin"
    | "advanced"
    | "custom"
  memberLogin: boolean
  memberStatements: "admin_generated" | "member_and_admin"
  reportDepth: "basic" | "full" | "advanced" | "custom"
  roleDepth: "basic_admin" | "finance_operations" | "advanced" | "custom"
  whatsAppNotifications:
    | "pilot"
    | "addon"
    | "addon_enabled"
    | "setup_included"
    | "custom"
  whiteLabel: "unavailable" | "addon" | "contract"
}

export type SubscriptionAddonDefinition = {
  billingCategory: "separate_addon"
  code: string
  description: string
  displayName: string
  pricing: "quoted_separately"
}

export type SubscriptionPassThroughCostDefinition = {
  billingCategory: "provider_pass_through"
  code: string
  description: string
  displayName: string
  pricing: "provider_usage_rate"
}

export type SubscriptionPlanDefinition = {
  activeMemberLimit: number | null
  addonDefinitions: SubscriptionAddonDefinition[]
  availableAddonCodes: string[]
  code: SubscriptionPlanCode
  description: string
  displayName: string
  entitlements: SubscriptionEntitlements
  isPublic: boolean
  monthlyPrice: {
    billingCategory: "subscription_fee"
    billingInterval: "month"
    currencyCode: "NGN"
    maximum: number | null
    minimum: number | null
  }
  passThroughCostDefinitions: SubscriptionPassThroughCostDefinition[]
  setupFee: {
    billingCategory: "setup_fee"
    billingInterval: "one_time"
    currencyCode: "NGN"
    maximum: number | null
    minimum: number | null
  }
  sortOrder: number
}

const BASIC_ENTITLEMENTS = {
  auditDepth: "basic",
  coreFinance: true,
  customDomain: false,
  emailNotifications: "admin_setup",
  memberLogin: false,
  memberStatements: "admin_generated",
  reportDepth: "basic",
  roleDepth: "basic_admin",
  whatsAppNotifications: "pilot",
  whiteLabel: "unavailable",
} satisfies SubscriptionEntitlements

const ADDONS = {
  advanced_audit_exports: addon(
    "advanced_audit_exports",
    "Advanced audit exports",
    "Additional audit and report export depth."
  ),
  custom_domain: addon(
    "custom_domain",
    "Custom domain",
    "Cooperative-owned domain configuration and support."
  ),
  custom_integrations: addon(
    "custom_integrations",
    "Custom integrations",
    "Contracted CBA, ERP, payroll, or provider integrations."
  ),
  dedicated_support: addon(
    "dedicated_support",
    "Dedicated support",
    "Contracted support ownership and response targets."
  ),
  member_login: addon(
    "member_login",
    "Member login",
    "Direct member access for eligible cooperative accounts."
  ),
  whatsapp_notifications: addon(
    "whatsapp_notifications",
    "WhatsApp notifications",
    "WhatsApp notification setup; provider delivery remains pass-through."
  ),
  white_label: addon(
    "white_label",
    "White-label mobile app",
    "Brand configuration, store handling, and release support."
  ),
} as const

const PROVIDER_PASS_THROUGH_COSTS = [
  passThrough(
    "sms_delivery",
    "SMS delivery",
    "Message delivery is billed at the active provider usage rate."
  ),
  passThrough(
    "whatsapp_delivery",
    "WhatsApp delivery",
    "Conversation or template delivery is billed at the active provider rate."
  ),
  passThrough(
    "kyc_verification",
    "KYC verification",
    "Identity checks are billed at the verification provider rate."
  ),
  passThrough(
    "payment_processing",
    "Payment processing",
    "Gateway, transfer, or direct-debit charges follow the selected provider."
  ),
] satisfies SubscriptionPassThroughCostDefinition[]

export const SUBSCRIPTION_PLAN_DEFINITIONS: Record<
  SubscriptionPlanCode,
  SubscriptionPlanDefinition
> = {
  free_beta: plan({
    activeMemberLimit: 100,
    addons: [],
    code: "free_beta",
    description: "Time-bound pilot access for guided cooperative validation.",
    displayName: "Free Beta",
    entitlements: BASIC_ENTITLEMENTS,
    monthlyPrice: [0, 0],
    setupFee: [150000, 500000],
    sortOrder: 10,
  }),
  starter: plan({
    activeMemberLimit: 250,
    addons: [
      ADDONS.member_login,
      ADDONS.custom_domain,
      ADDONS.whatsapp_notifications,
    ],
    code: "starter",
    description:
      "Admin-first operations for small cooperatives leaving spreadsheets.",
    displayName: "Starter",
    entitlements: {
      ...BASIC_ENTITLEMENTS,
      emailNotifications: "admin_only",
      whatsAppNotifications: "addon",
    },
    monthlyPrice: [12500, 18750],
    setupFee: [150000, 500000],
    sortOrder: 20,
  }),
  standard: plan({
    activeMemberLimit: 1000,
    addons: [ADDONS.whatsapp_notifications, ADDONS.advanced_audit_exports],
    code: "standard",
    description: "Member and staff operations for established cooperatives.",
    displayName: "Standard",
    entitlements: {
      ...BASIC_ENTITLEMENTS,
      auditDepth: "full",
      customDomain: true,
      emailNotifications: "member_and_admin",
      memberLogin: true,
      memberStatements: "member_and_admin",
      reportDepth: "full",
      roleDepth: "finance_operations",
      whatsAppNotifications: "addon",
    },
    monthlyPrice: [50000, 75000],
    setupFee: [150000, 500000],
    sortOrder: 30,
  }),
  growth: plan({
    activeMemberLimit: 3000,
    addons: [ADDONS.white_label, ADDONS.dedicated_support],
    code: "growth",
    description:
      "Advanced operations for large employer or multi-group programs.",
    displayName: "Growth",
    entitlements: {
      ...BASIC_ENTITLEMENTS,
      auditDepth: "advanced",
      customDomain: true,
      emailNotifications: "advanced",
      memberLogin: true,
      memberStatements: "member_and_admin",
      reportDepth: "advanced",
      roleDepth: "advanced",
      whatsAppNotifications: "setup_included",
      whiteLabel: "addon",
    },
    monthlyPrice: [150000, 225000],
    setupFee: [150000, 1000000],
    sortOrder: 40,
  }),
  enterprise: plan({
    activeMemberLimit: null,
    addons: [
      ADDONS.white_label,
      ADDONS.dedicated_support,
      ADDONS.custom_integrations,
    ],
    code: "enterprise",
    description: "Contracted capacity, integrations, reporting, and support.",
    displayName: "Enterprise",
    entitlements: {
      ...BASIC_ENTITLEMENTS,
      auditDepth: "custom",
      customDomain: true,
      emailNotifications: "custom",
      memberLogin: true,
      memberStatements: "member_and_admin",
      reportDepth: "custom",
      roleDepth: "custom",
      whatsAppNotifications: "custom",
      whiteLabel: "contract",
    },
    monthlyPrice: [null, null],
    setupFee: [1000000, null],
    sortOrder: 50,
  }),
}

export type SubscriptionSnapshotInput = {
  activeAddonCodes: string[]
  activeMemberCount: number
  activeMemberLimitOverride?: number | null
  billingInfrastructureAvailable: boolean
  cancelAtPeriodEnd?: boolean
  currentPeriodEndsAt?: Date | null
  currentPeriodStartsAt?: Date | null
  graceEndsAt?: Date | null
  now: Date
  planCode: SubscriptionPlanCode
  source: SubscriptionSource
  sourceState?: Record<string, unknown> | null
  status: SubscriptionStatus
  trialEndsAt?: Date | null
  trialStartsAt?: Date | null
}

export function resolveSubscriptionSnapshot(input: SubscriptionSnapshotInput) {
  const planDefinition = SUBSCRIPTION_PLAN_DEFINITIONS[input.planCode]
  const status = resolveEffectiveSubscriptionStatus(input)
  const activeMemberLimit =
    input.activeMemberLimitOverride ?? planDefinition.activeMemberLimit
  const remainingActiveMembers =
    activeMemberLimit === null
      ? null
      : Math.max(0, activeMemberLimit - input.activeMemberCount)
  const isOverCapacity =
    activeMemberLimit !== null && input.activeMemberCount > activeMemberLimit
  const isAtCapacity =
    activeMemberLimit !== null && input.activeMemberCount >= activeMemberLimit
  const accessEnabled = isSubscriptionAccessEnabled({
    currentPeriodEndsAt: input.currentPeriodEndsAt,
    now: input.now,
    status,
  })
  const expansionEnabled = isSubscriptionExpansionEnabled(status)
  const entitlements = applyAddonEntitlements(
    planDefinition.entitlements,
    input.activeAddonCodes
  )

  return {
    addons: input.activeAddonCodes.map((code) => ({
      code,
      status: "active" as const,
    })),
    availablePlans: SUBSCRIPTION_PLAN_CODES.map(
      (code) => SUBSCRIPTION_PLAN_DEFINITIONS[code]
    ),
    billingPeriod: {
      cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
      currentPeriodEndsAt: input.currentPeriodEndsAt?.toISOString() ?? null,
      currentPeriodStartsAt: input.currentPeriodStartsAt?.toISOString() ?? null,
      graceEndsAt: input.graceEndsAt?.toISOString() ?? null,
      trialEndsAt: input.trialEndsAt?.toISOString() ?? null,
      trialStartsAt: input.trialStartsAt?.toISOString() ?? null,
    },
    enforcement: {
      accessEnabled,
      canActivateMember: accessEnabled && expansionEnabled && !isAtCapacity,
      memberLoginEnabled: accessEnabled && entitlements.memberLogin,
      reason: subscriptionEnforcementReason({
        accessEnabled,
        expansionEnabled,
        isAtCapacity,
        status,
      }),
    },
    entitlements,
    plan: planDefinition,
    source: input.source,
    sourceState: {
      billingInfrastructureAvailable: input.billingInfrastructureAvailable,
      fallbackApplied: !input.billingInfrastructureAvailable,
      ...(input.sourceState ?? {}),
    },
    status,
    usage: {
      activeMemberCount: input.activeMemberCount,
      activeMemberLimit,
      isAtCapacity,
      isOverCapacity,
      remainingActiveMembers,
      usagePercent:
        activeMemberLimit === null || activeMemberLimit === 0
          ? null
          : Math.round((input.activeMemberCount / activeMemberLimit) * 10000) /
            100,
    },
  }
}

export function resolveEffectiveSubscriptionStatus(
  input: Pick<
    SubscriptionSnapshotInput,
    "graceEndsAt" | "now" | "status" | "trialEndsAt"
  > & Partial<Pick<SubscriptionSnapshotInput, "source" | "currentPeriodEndsAt">>
): SubscriptionStatus {
  const now = input.now.getTime()
  const graceActive = (input.graceEndsAt?.getTime() ?? 0) > now

  if (
    (input.status === "free_beta" || input.status === "trialing") &&
    input.trialEndsAt &&
    input.trialEndsAt.getTime() <= now
  ) {
    return graceActive ? "grace" : "suspended"
  }
  if (input.source === "billing_provider" && input.status === "active" && input.currentPeriodEndsAt && input.currentPeriodEndsAt.getTime() <= now) {
    return graceActive ? "grace" : "suspended"
  }
  if (input.status === "past_due") {
    return graceActive ? "grace" : "suspended"
  }
  if (input.status === "grace" && !graceActive) return "suspended"
  return input.status
}

export function createFailSafeSubscriptionSnapshot(input: {
  activeMemberCount: number
  now: Date
  usageAvailable?: boolean
}) {
  const snapshot = resolveSubscriptionSnapshot({
    activeAddonCodes: [],
    activeMemberCount: input.activeMemberCount,
    billingInfrastructureAvailable: false,
    now: input.now,
    planCode: "free_beta",
    source: "system_default",
    sourceState: {
      reason: "billing_infrastructure_unavailable",
      usageAvailable: input.usageAvailable ?? false,
    },
    status: "manual",
  })

  return {
    ...snapshot,
    enforcement: {
      accessEnabled: true,
      canActivateMember: false,
      memberLoginEnabled: false,
      reason: "billing_infrastructure_unavailable",
    },
    invoices: [],
  }
}

function plan(input: {
  activeMemberLimit: number | null
  addons: SubscriptionAddonDefinition[]
  code: SubscriptionPlanCode
  description: string
  displayName: string
  entitlements: SubscriptionEntitlements
  monthlyPrice: [number | null, number | null]
  setupFee: [number | null, number | null]
  sortOrder: number
}): SubscriptionPlanDefinition {
  return {
    activeMemberLimit: input.activeMemberLimit,
    addonDefinitions: input.addons,
    availableAddonCodes: input.addons.map(({ code }) => code),
    code: input.code,
    description: input.description,
    displayName: input.displayName,
    entitlements: input.entitlements,
    isPublic: true,
    monthlyPrice: {
      billingCategory: "subscription_fee",
      billingInterval: "month",
      currencyCode: "NGN",
      maximum: input.monthlyPrice[1],
      minimum: input.monthlyPrice[0],
    },
    passThroughCostDefinitions: PROVIDER_PASS_THROUGH_COSTS,
    setupFee: {
      billingCategory: "setup_fee",
      billingInterval: "one_time",
      currencyCode: "NGN",
      maximum: input.setupFee[1],
      minimum: input.setupFee[0],
    },
    sortOrder: input.sortOrder,
  }
}

function addon(
  code: string,
  displayName: string,
  description: string
): SubscriptionAddonDefinition {
  return {
    billingCategory: "separate_addon",
    code,
    description,
    displayName,
    pricing: "quoted_separately",
  }
}

function passThrough(
  code: string,
  displayName: string,
  description: string
): SubscriptionPassThroughCostDefinition {
  return {
    billingCategory: "provider_pass_through",
    code,
    description,
    displayName,
    pricing: "provider_usage_rate",
  }
}

function isSubscriptionAccessEnabled(input: {
  currentPeriodEndsAt?: Date | null
  now: Date
  status: SubscriptionStatus
}) {
  if (input.status === "suspended") return false
  if (input.status === "cancelled") {
    return Boolean(
      input.currentPeriodEndsAt && input.currentPeriodEndsAt > input.now
    )
  }
  return true
}

function isSubscriptionExpansionEnabled(status: SubscriptionStatus) {
  return !["cancelled", "grace", "past_due", "suspended"].includes(status)
}

function subscriptionEnforcementReason(input: {
  accessEnabled: boolean
  expansionEnabled: boolean
  isAtCapacity: boolean
  status: SubscriptionStatus
}) {
  if (!input.accessEnabled) {
    return input.status === "cancelled"
      ? "subscription_cancelled"
      : "subscription_suspended"
  }
  if (!input.expansionEnabled) {
    return input.status === "grace"
      ? "subscription_grace_read_only"
      : "subscription_cancelled"
  }
  return input.isAtCapacity ? "active_member_capacity_reached" : null
}

function applyAddonEntitlements(
  base: SubscriptionEntitlements,
  addonCodes: string[]
): SubscriptionEntitlements {
  const entitlements = { ...base }
  const addons = new Set(addonCodes)

  if (addons.has("member_login")) entitlements.memberLogin = true
  if (addons.has("custom_domain")) entitlements.customDomain = true
  if (addons.has("whatsapp_notifications")) {
    entitlements.whatsAppNotifications = "addon_enabled"
  }
  if (addons.has("white_label")) entitlements.whiteLabel = "addon"
  if (addons.has("advanced_audit_exports")) {
    entitlements.auditDepth = "advanced"
    entitlements.reportDepth = "advanced"
  }

  return entitlements
}
